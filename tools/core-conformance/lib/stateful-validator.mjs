import crypto from 'node:crypto';

export const logNames=Object.freeze(['MANAGEMENT_LOG','SCHEMA_LOG','AUDIT_LOG']);
export const operationNames=Object.freeze(['APPEND','RESET','REPLACE','DELETE','CHECK_OBJECT_REFS','ORIGINATE_HUMAN_DECISION']);

const sort=value=>Array.isArray(value)?value.map(sort):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sort(value[key])])):value;
export const stable=value=>JSON.stringify(sort(value))+'\n';
const hash=value=>crypto.createHash('sha256').update(stable(value),'utf8').digest('hex');
const clone=value=>structuredClone(value);

export const createState=(preconditions={})=>({logs:Object.fromEntries(logNames.map(name=>[name,[]])),preconditions:{authorized_audit_writer_refs:clone(preconditions.authorized_audit_writer_refs??[]),reference_aliases:clone(preconditions.reference_aliases??[])}});
export const historyHash=state=>hash(state);
function result(state,beforeHash,accepted,code,historyDelta){const nextState=clone(state);return{accepted,code,before_hash:beforeHash,after_hash:historyHash(nextState),history_delta:historyDelta,next_state:nextState};}
const reject=(state,beforeHash,code)=>result(state,beforeHash,false,code,0);

function aliasRegistry(state){
 const aliases=state.preconditions?.reference_aliases;if(!Array.isArray(aliases))return{ok:false,code:'INVALID_ALIAS_REGISTRY'};const byAlias=new Map();
 for(const entry of aliases){if(!entry||typeof entry.alias!=='string'||!entry.alias.length||!entry.target||typeof entry.target!=='object')return{ok:false,code:'INVALID_ALIAS_REGISTRY'};if(byAlias.has(entry.alias))return{ok:false,code:'DUPLICATE_ALIAS_KEY'};byAlias.set(entry.alias,entry.target);}
 for(const [alias,target] of byAlias){
  if(target.ref_type==='ALIAS'){const seen=new Set([alias]);let cursor=target.alias;while(typeof cursor==='string'&&byAlias.has(cursor)){if(seen.has(cursor))return{ok:false,code:'ALIAS_CYCLE_FORBIDDEN'};seen.add(cursor);const next=byAlias.get(cursor);if(next.ref_type!=='ALIAS')break;cursor=next.alias;}return{ok:false,code:'ALIAS_CHAIN_FORBIDDEN'};}
  if(target.ref_type!=='CANONICAL'||!logNames.includes(target.origin_log)||typeof target.identity!=='string'||!target.identity.length)return{ok:false,code:'INVALID_ALIAS_TARGET'};
  if(logNames.some(log=>state.logs[log].some(record=>record.identity===alias)))return{ok:false,code:'ALIAS_SHADOWING_FORBIDDEN'};
 }
 return{ok:true,byAlias};
}
function canonicalizeRef(ref,registry){
 if(!ref||typeof ref!=='object')return{ok:false,code:'INVALID_OBJECT_REF'};
 if(ref.ref_type==='CANONICAL'){if(!logNames.includes(ref.origin_log)||typeof ref.identity!=='string'||!ref.identity.length)return{ok:false,code:'INVALID_OBJECT_REF'};return{ok:true,target:{origin_log:ref.origin_log,identity:ref.identity}};}
 if(ref.ref_type==='ALIAS'){if(typeof ref.alias!=='string'||!ref.alias.length)return{ok:false,code:'INVALID_OBJECT_REF'};const target=registry.byAlias.get(ref.alias);if(!target)return{ok:false,code:'ALIAS_NOT_FOUND'};return{ok:true,target:{origin_log:target.origin_log,identity:target.identity}};}
 return{ok:false,code:'INVALID_OBJECT_REF'};
}
function validateObjectRefs(state,refs,{selfLog=null,selfIdentity=null}={}){
 if(!Array.isArray(refs))return{ok:false,code:'OBJECT_REFS_NOT_ARRAY'};const registry=aliasRegistry(state);if(!registry.ok)return registry;const resolved=new Set();
 for(const ref of refs){const canonical=canonicalizeRef(ref,registry);if(!canonical.ok)return canonical;const{origin_log,identity}=canonical.target,key=`${origin_log}\u0000${identity}`;if(origin_log===selfLog&&identity===selfIdentity)return{ok:false,code:'SELF_REFERENCE'};if(resolved.has(key))return{ok:false,code:'DUPLICATE_TARGET'};resolved.add(key);if(!state.logs[origin_log].some(record=>record.identity===identity))return{ok:false,code:'UNRESOLVED_REFERENCE'};}
 return{ok:true,code:'REFERENCES_RESOLVED'};
}
function humanDecisionShape(payload){const fields=['event_type','event_id','actor_ref','scope_ref','object_refs','occurred_at','recorded_at'];if(fields.some(field=>!(field in payload))||payload.event_type!=='HUMAN_DECISION'||typeof payload.event_id!=='string'||!payload.event_id.length||!Array.isArray(payload.object_refs)||typeof payload.occurred_at!=='string'||typeof payload.recorded_at!=='string')return false;return payload.actor_ref!==null&&payload.scope_ref!==null;}

export function applyOperation(state,operation,context={}){
 const beforeHash=historyHash(state);
 if(!operation||typeof operation!=='object'||!operationNames.includes(operation.operation))return reject(state,beforeHash,'INVALID_OPERATION');
 if(operation.operation==='ORIGINATE_HUMAN_DECISION')return reject(state,beforeHash,'UNSUPPORTED_HUMAN_ORIGINATION');
 if('authorized_audit_writer_refs' in operation||'reference_aliases' in operation)return reject(state,beforeHash,'OPERATION_PRECONDITION_OVERRIDE_FORBIDDEN');
 if('authorized_audit_writer_refs' in context||'reference_aliases' in context)return reject(state,beforeHash,'CONTEXT_PRECONDITION_OVERRIDE_FORBIDDEN');
 if(['RESET','REPLACE','DELETE'].includes(operation.operation))return reject(state,beforeHash,'FORBIDDEN_MUTATION');
 if(operation.operation==='CHECK_OBJECT_REFS'){const checked=validateObjectRefs(state,operation.object_refs??[],{selfLog:operation.origin_log??null,selfIdentity:operation.identity??null});return checked.ok?result(state,beforeHash,true,checked.code,0):reject(state,beforeHash,checked.code);}
 const{log,record}=operation;if(!logNames.includes(log))return reject(state,beforeHash,'INVALID_LOG');
 if(!record||typeof record!=='object'||typeof record.identity!=='string'||!record.identity.length||!record.payload||typeof record.payload!=='object'||Array.isArray(record.payload))return reject(state,beforeHash,'INVALID_RECORD_WRAPPER');
 if(state.logs[log].some(item=>item.identity===record.identity))return reject(state,beforeHash,'IDENTITY_ALREADY_USED_IN_LOG');
 const registry=aliasRegistry(state);if(!registry.ok)return reject(state,beforeHash,registry.code);if(registry.byAlias.has(record.identity))return reject(state,beforeHash,'ALIAS_SHADOWING_FORBIDDEN');
 const isHumanDecision=record.payload.event_type==='HUMAN_DECISION';if(isHumanDecision&&!humanDecisionShape(record.payload))return reject(state,beforeHash,'INVALID_HUMAN_DECISION_SHAPE');if(isHumanDecision&&log!=='AUDIT_LOG')return reject(state,beforeHash,'HUMAN_DECISION_WRONG_LOG');
 if(log==='AUDIT_LOG'&&'event_type' in record.payload){if(context.channel!=='AUDIT_WRITER')return reject(state,beforeHash,'AUDIT_WRITER_BYPASS');const writers=state.preconditions?.authorized_audit_writer_refs;if(typeof context.writer_ref!=='string'||!Array.isArray(writers)||!writers.includes(context.writer_ref))return reject(state,beforeHash,'AUDIT_WRITER_NOT_AUTHORIZED');}
 const objectRefs=record.payload.object_refs??[],checked=validateObjectRefs(state,objectRefs,{selfLog:log,selfIdentity:record.identity});if(!checked.ok)return reject(state,beforeHash,checked.code);
 if(['CORRECTION','SUPERSESSION','VOID'].includes(record.payload.kind)){if(!record.payload.antecedent_ref)return reject(state,beforeHash,'REVISION_REQUIRES_ANTECEDENT_REF');const antecedent=validateObjectRefs(state,[record.payload.antecedent_ref],{selfLog:log,selfIdentity:record.identity});if(!antecedent.ok)return reject(state,beforeHash,antecedent.code);}
 const nextState=clone(state);nextState.logs[log].push(clone(record));return{accepted:true,code:'APPENDED',before_hash:beforeHash,after_hash:historyHash(nextState),history_delta:1,next_state:nextState};
}

export function runScenario(scenario){
 let state=createState(scenario.preconditions??{});const results=[];
 for(const step of scenario.steps){const inputState=clone(state),inputOperation=clone(step.operation),inputContext=clone(step.context??{}),operation=clone(step.operation),context=clone(step.context??{}),outcome=applyOperation(state,operation,context),expected=step.expected;if(stable(state)!==stable(inputState)||stable(operation)!==stable(inputOperation)||stable(context)!==stable(inputContext))throw new Error(`Scenario ${scenario.scenario_id} input mutation`);if(outcome.accepted!==expected.accepted||outcome.code!==expected.code||outcome.history_delta!==expected.history_delta)throw new Error(`Scenario ${scenario.scenario_id} expectation mismatch`);if(expected.before_equals_after!==undefined&&((outcome.before_hash===outcome.after_hash)!==expected.before_equals_after))throw new Error(`Scenario ${scenario.scenario_id} hash expectation mismatch`);state=outcome.next_state;results.push(outcome);}
 return{scenario_id:scenario.scenario_id,classification:scenario.classification,step_count:results.length,accepted_steps:results.filter(item=>item.accepted).length,rejected_steps:results.filter(item=>!item.accepted).length,final_history_hash:historyHash(state),log_sizes:Object.fromEntries(logNames.map(name=>[name,state.logs[name].length]))};
}
export function validateScenarioBundle(manifest,cases){
 if(manifest.schema_version!=='janus-stateful-scenario-manifest-v1'||cases.schema_version!=='janus-stateful-history-reference-cases-v1')throw new Error('Stateful scenario schema version mismatch');if(cases.manifest_ref!==manifest.manifest_id||manifest.cases_file!=='conformance/core-lite-v0.2/scenarios/history-reference.cases.json')throw new Error('Stateful manifest reference mismatch');if(JSON.stringify(manifest.logs)!==JSON.stringify(logNames)||JSON.stringify(manifest.operations)!==JSON.stringify(operationNames))throw new Error('Stateful operation profile mismatch');const ids=cases.scenarios.map(item=>item.scenario_id);if(new Set(ids).size!==ids.length||JSON.stringify(ids)!==JSON.stringify(manifest.scenario_ids)||cases.scenario_count!==ids.length)throw new Error('Stateful manifest/cases reciprocity mismatch');for(const scenario of cases.scenarios){if(!Array.isArray(scenario.requirement_ids)||new Set(scenario.requirement_ids).size!==scenario.requirement_ids.length)throw new Error(`Scenario requirement attribution invalid ${scenario.scenario_id}`);}return cases.scenarios.map(runScenario);
}
