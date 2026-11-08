import crypto from 'node:crypto';
import { types } from 'node:util';
import { evaluateConstitutiveEMinus,replayConstitutiveEMinus } from './e-minus-evaluator.mjs';

export const logNames=Object.freeze(['MANAGEMENT_LOG','SCHEMA_LOG','AUDIT_LOG']);
export const operationNames=Object.freeze(['APPEND','RESET','REPLACE','DELETE','CHECK_OBJECT_REFS','ORIGINATE_HUMAN_DECISION']);

const preconditionKeys=Object.freeze(['authorized_audit_writer_refs','reference_aliases','constitutive_evaluations','evidence_artifacts']);
const trustedStates=new WeakSet();
const fail=code=>{throw new TypeError(code);};
const ownDescriptor=(value,key)=>Object.getOwnPropertyDescriptor(value,key);
const descriptorHasValue=descriptor=>ownDescriptor(descriptor,'value')!==undefined;
const descriptorValue=descriptor=>ownDescriptor(descriptor,'value')?.value;
const ownValue=(value,key,fallback=undefined)=>{const descriptor=ownDescriptor(value,key);return descriptor&&descriptorHasValue(descriptor)?descriptorValue(descriptor):fallback;};
const hasOwnData=(value,key)=>{const descriptor=ownDescriptor(value,key);return Boolean(descriptor&&descriptorHasValue(descriptor));};
function defineData(target,key,value){Object.defineProperty(target,key,{value,enumerable:true,writable:true,configurable:true});return target;}
function nullObject(entries=[]){const value=Object.create(null);for(const [key,entry] of entries)defineData(value,key,entry);return value;}
function normalizeData(value,code='INVALID_DATA',seen=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(Number.isFinite(value))return value;fail(code);}
 if(typeof value!=='object'||types.isProxy(value))fail(code);
 if(seen.has(value))fail(code);seen.add(value);
 const isArray=Array.isArray(value),prototype=Object.getPrototypeOf(value);
 if(isArray?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)fail(code);
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors),normalized=isArray?new Array(value.length):Object.create(null);
 if(isArray&&(!Number.isSafeInteger(value.length)||value.length<0))fail(code);
 for(const key of keys){
  if(isArray&&key==='length')continue;
  if(typeof key==='symbol')fail(code);
  const descriptor=ownValue(descriptors,key);if(!descriptor||!descriptorHasValue(descriptor)||ownDescriptor(descriptor,'get')!==undefined||ownDescriptor(descriptor,'set')!==undefined||ownValue(descriptor,'enumerable')!==true)fail(code);
  if(isArray&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length))fail(code);
  defineData(normalized,key,normalizeData(descriptorValue(descriptor),code,seen));
 }
 if(isArray&&Object.keys(descriptors).filter(key=>key!=='length').length!==value.length)fail(code);
 seen.delete(value);return normalized;
}
const clone=value=>normalizeData(value);
function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){const descriptors=Object.getOwnPropertyDescriptors(value);for(const key of Reflect.ownKeys(descriptors)){if(Array.isArray(value)&&key==='length')continue;const descriptor=ownValue(descriptors,key);if(descriptor&&descriptorHasValue(descriptor))deepFreeze(descriptorValue(descriptor));}Object.freeze(value);}return value;}
function serializeTrusted(value){
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return JSON.stringify(value);
 if(Array.isArray(value)){const serialized=[];for(let index=0;index<value.length;index++){const descriptor=ownDescriptor(value,String(index));if(!descriptor||!descriptorHasValue(descriptor))fail('INVALID_SERIALIZATION_DATA');serialized.push(serializeTrusted(descriptorValue(descriptor)));}return'['+serialized.join(',')+']';}
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors);if(keys.some(key=>typeof key==='symbol'))fail('INVALID_SERIALIZATION_DATA');keys.sort();const serialized=[];for(const key of keys){const descriptor=ownValue(descriptors,key);if(!descriptor||!descriptorHasValue(descriptor))fail('INVALID_SERIALIZATION_DATA');serialized.push(JSON.stringify(key)+':'+serializeTrusted(descriptorValue(descriptor)));}return'{'+serialized.join(',')+'}';
}
const stableTrusted=value=>serializeTrusted(value)+'\n';
export const stable=value=>stableTrusted(normalizeData(value,'INVALID_STABLE_DATA'));
function assertTrustedState(state){if((typeof state!=='object'&&typeof state!=='function')||state===null||types.isProxy(state)||!trustedStates.has(state))throw new TypeError('UNTRUSTED_STATE');}
function trustState(state){deepFreeze(state);trustedStates.add(state);return state;}
function trustedHash(state){assertTrustedState(state);if(!Object.isFrozen(state))throw new TypeError('UNTRUSTED_STATE');return crypto.createHash('sha256').update(stableTrusted(state),'utf8').digest('hex');}

function applyConstitutiveCase(evaluations,caseName){if(caseName===undefined)return evaluations;if(typeof caseName!=='string'||evaluations.length!==1)fail('INVALID_CONSTITUTIVE_FIXTURE_CASE');const input=evaluations[0],expectation=input.expectations?.[0],scope=input.scopes?.[0],source=scope?.sources?.[0],snapshotSource=input.snapshot?.sources?.[0];switch(caseName){case'EXPECTATION_NOT_FOUND':input.expectations=[];break;case'EXPECTATION_VERSION_NOT_FOUND':input.expectation_version='missing-version';break;case'EXPECTATION_UNRESOLVED':expectation.referenceable=false;break;case'EXPECTATION_AFTER_OBSERVATION':input.snapshot.predecessor_snapshot_refs=[];break;case'DUE_INDETERMINATE':expectation.due.kind='UNSUPPORTED_DUE_RULE';break;case'NOT_DUE':source.cutoff_ordinal=15;source.window.through_ordinal=15;break;case'SCOPE_INCOMPLETE':delete scope.subject_ref;break;case'PROCEDURE_NOT_FOUND':input.procedures=[];break;case'SCHEMA_INAPPLICABLE':input.schema_history=[];break;case'SNAPSHOT_INCOMPLETE':delete snapshotSource.complete_through_ordinal;break;case'PRESENT':snapshotSource.records.push(nullObject([['identity','matching-record'],['ordinal',30],['subject_ref',scope.subject_ref],['fields',clone(scope.filters)]]));break;default:fail('UNKNOWN_CONSTITUTIVE_FIXTURE_CASE');}return evaluations;}
export function createState(preconditions={}){const safe=normalizeData(preconditions,'INVALID_PRECONDITIONS_DATA');for(const forbidden of ['expectations','scopes','procedures','schema_contexts','observations','e_minus_proofs'])if(hasOwnData(safe,forbidden))fail('LEGACY_E_MINUS_ORACLE_INPUT_FORBIDDEN');const logs=nullObject(),normalizedPreconditions=nullObject();for(const name of logNames)defineData(logs,name,[]);for(const key of preconditionKeys)defineData(normalizedPreconditions,key,clone(ownValue(safe,key,[])));const evaluations=applyConstitutiveCase(normalizedPreconditions.constitutive_evaluations,ownValue(safe,'constitutive_case'));if(!Array.isArray(evaluations))fail('INVALID_CONSTITUTIVE_EVALUATIONS');const proofs=[];for(const input of evaluations){const evaluated=evaluateConstitutiveEMinus(input),expected=evaluated.proof?.replay_digest??null,replay=expected?replayConstitutiveEMinus(input,expected):null;proofs.push(nullObject([['evaluation_ref',evaluated.evaluation_ref],['status',evaluated.status],['code',evaluated.code],['observation',evaluated.observation??null],['proof',evaluated.proof??null],['candidate',evaluated.candidate??null],['replay_verified',replay?.matches===true]]));}defineData(normalizedPreconditions,'e_minus_proofs',proofs);const state=nullObject([['logs',logs],['preconditions',normalizedPreconditions]]);return trustState(normalizeData(state,'INVALID_INTERNAL_STATE'));}
export const historyHash=state=>trustedHash(state);
function result(state,beforeHash,accepted,code,historyDelta){assertTrustedState(state);const nextState=trustState(clone(state));return{accepted,code,before_hash:beforeHash,after_hash:trustedHash(nextState),history_delta:historyDelta,next_state:nextState};}
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
function humanDecisionShape(payload){const fields=['event_type','event_id','actor_ref','scope_ref','object_refs','occurred_at','recorded_at'];if(fields.some(field=>!hasOwnData(payload,field))||payload.event_type!=='HUMAN_DECISION'||typeof payload.event_id!=='string'||!payload.event_id.length||!Array.isArray(payload.object_refs)||!payload.object_refs.length||typeof payload.occurred_at!=='string'||typeof payload.recorded_at!=='string')return false;return payload.actor_ref!==null&&payload.scope_ref!==null;}
const preconditionOverrideKeys=Object.freeze([...preconditionKeys,'e_minus_proofs','expectations','scopes','procedures','schema_contexts','observations']);
const hasPreconditionOverride=value=>preconditionOverrideKeys.some(key=>hasOwnData(value,key));
const sameArray=(left,right)=>Array.isArray(left)&&Array.isArray(right)&&serializeTrusted(left)===serializeTrusted(right);
function resolveVersioned(registry,refKey,ref,version,{notFound,versionMismatch,ambiguous}){const referenced=registry.filter(item=>item?.[refKey]===ref);if(!referenced.length)return{ok:false,code:notFound};const matched=referenced.filter(item=>item.version===version);if(!matched.length)return{ok:false,code:versionMismatch};if(matched.length!==1)return{ok:false,code:ambiguous};return{ok:true,value:matched[0]};}
function validateOmission(state,payload){
 const proofs=state.preconditions.e_minus_proofs,evidence=state.preconditions.evidence_artifacts;if(!Array.isArray(proofs)||!Array.isArray(evidence))return{ok:false,code:'INVALID_OMISSION_REGISTRY'};
 const matching=proofs.filter(item=>item?.evaluation_ref===payload.evaluation_ref);if(!matching.length)return{ok:false,code:'CONSTITUTIVE_EVALUATION_NOT_FOUND'};if(matching.length!==1)return{ok:false,code:'CONSTITUTIVE_EVALUATION_AMBIGUOUS'};const prepared=matching[0];
 if(prepared.status==='PRESENT')return{ok:false,code:'EXPECTATION_SATISFIED'};if(prepared.status==='NOT_DUE')return{ok:false,code:'EXPECTATION_NOT_DUE'};if(prepared.status!=='ABSENT'||!prepared.proof||!prepared.candidate)return{ok:false,code:prepared.code||'CONSTITUTIVE_EVALUATION_INDETERMINATE'};if(prepared.replay_verified!==true)return{ok:false,code:'REPLAY_DIGEST_MISMATCH'};
 const candidate=prepared.candidate;if(typeof payload.schema_ref!=='string'||!payload.schema_ref.length||typeof payload.recorded_at!=='string'||!payload.recorded_at.length)return{ok:false,code:'OMISSION_EVENT_SHAPE_INCOMPLETE'};
 for(const key of ['event_type','evaluation_ref','proof_ref','expectation_ref','expectation_version','scope_ref','scope_version','procedure_ref','procedure_version','schema_ref','observation_ref','replay_digest'])if(payload[key]!==candidate[key])return{ok:false,code:'OMISSION_EVENT_REFS_MISMATCH'};
 if(!Array.isArray(payload.evidence_refs)||!payload.evidence_refs.length)return{ok:false,code:'EVIDENCE_REFS_REQUIRED'};
 for(const ref of payload.evidence_refs){const resolved=resolveVersioned(evidence,'evidence_ref',ref?.evidence_ref,ref?.version,{notFound:'EVIDENCE_UNRESOLVED',versionMismatch:'EVIDENCE_VERSION_MISMATCH',ambiguous:'EVIDENCE_VERSION_AMBIGUOUS'});if(!resolved.ok)return resolved;const artifact=resolved.value;if(artifact.resolvable!==true)return{ok:false,code:'EVIDENCE_UNRESOLVED'};if(artifact.immutable!==true)return{ok:false,code:'EVIDENCE_NOT_IMMUTABLE'};if(artifact.digest!==ref.digest||artifact.digest!==prepared.proof.observation_digest)return{ok:false,code:'EVIDENCE_DIGEST_MISMATCH'};}
 if(!sameArray(payload.schema_context_refs,candidate.schema_context_refs)||!sameArray(payload.evidence_refs,candidate.evidence_refs))return{ok:false,code:'OMISSION_EVENT_REFS_MISMATCH'};
 if(serializeTrusted(payload.assertion_boundary)!==serializeTrusted(candidate.assertion_boundary))return{ok:false,code:'OMISSION_ASSERTION_OUTSIDE_SCOPE_CUTOFF'};
 return{ok:true,code:'OMISSION_CANDIDATE_VERIFIED'};
}

export function applyOperation(state,operation,context={}){
 assertTrustedState(state);
 operation=normalizeData(operation,'INVALID_OPERATION_DATA');context=normalizeData(context,'INVALID_CONTEXT_DATA');
 const beforeHash=trustedHash(state);
 if(!operation||typeof operation!=='object'||!operationNames.includes(operation.operation))return reject(state,beforeHash,'INVALID_OPERATION');
 if(operation.operation==='ORIGINATE_HUMAN_DECISION')return reject(state,beforeHash,'UNSUPPORTED_HUMAN_ORIGINATION');
 if(['RESET','REPLACE','DELETE'].includes(operation.operation))return reject(state,beforeHash,'FORBIDDEN_MUTATION');
 if(operation.operation==='CHECK_OBJECT_REFS'){if(hasPreconditionOverride(operation))return reject(state,beforeHash,'OPERATION_PRECONDITION_OVERRIDE_FORBIDDEN');if(hasPreconditionOverride(context))return reject(state,beforeHash,'CONTEXT_PRECONDITION_OVERRIDE_FORBIDDEN');const checked=validateObjectRefs(state,operation.object_refs??[],{selfLog:operation.origin_log??null,selfIdentity:operation.identity??null});return checked.ok?result(state,beforeHash,true,checked.code,0):reject(state,beforeHash,checked.code);}
 const{log,record}=operation;if(!logNames.includes(log))return reject(state,beforeHash,'INVALID_LOG');
 if(!record||typeof record!=='object'||typeof record.identity!=='string'||!record.identity.length||!record.payload||typeof record.payload!=='object'||Array.isArray(record.payload))return reject(state,beforeHash,'INVALID_RECORD_WRAPPER');
 if(hasPreconditionOverride(operation))return reject(state,beforeHash,'OPERATION_PRECONDITION_OVERRIDE_FORBIDDEN');
 if(hasPreconditionOverride(context))return reject(state,beforeHash,'CONTEXT_PRECONDITION_OVERRIDE_FORBIDDEN');
 if(log==='AUDIT_LOG'){
  if(typeof record.payload.event_type!=='string'||!record.payload.event_type.length)return reject(state,beforeHash,'AUDIT_EVENT_TYPE_REQUIRED');
  if(typeof record.payload.event_id!=='string'||!record.payload.event_id.length)return reject(state,beforeHash,'AUDIT_EVENT_ID_REQUIRED');
  if(record.identity!==record.payload.event_id)return reject(state,beforeHash,'AUDIT_EVENT_IDENTITY_MISMATCH');
 }
 const isHumanDecision=record.payload.event_type==='HUMAN_DECISION';
 if(isHumanDecision&&!humanDecisionShape(record.payload))return reject(state,beforeHash,'INVALID_HUMAN_DECISION_SHAPE');
 if(isHumanDecision&&log!=='AUDIT_LOG')return reject(state,beforeHash,'HUMAN_DECISION_WRONG_LOG');
 if(record.payload.event_type==='OMISSION_DETECTED'&&log!=='AUDIT_LOG')return reject(state,beforeHash,'OMISSION_DETECTED_WRONG_LOG');
 if(log==='AUDIT_LOG'){
  if(context.channel!=='AUDIT_WRITER')return reject(state,beforeHash,'AUDIT_WRITER_BYPASS');
  const writers=state.preconditions?.authorized_audit_writer_refs;if(typeof context.writer_ref!=='string'||!Array.isArray(writers)||!writers.includes(context.writer_ref))return reject(state,beforeHash,'AUDIT_WRITER_NOT_AUTHORIZED');
 }
 if(record.payload.event_type==='OMISSION_DETECTED'){const checked=validateOmission(state,record.payload);if(!checked.ok)return reject(state,beforeHash,checked.code);}
 if(isHumanDecision){const checked=validateObjectRefs(state,record.payload.object_refs,{selfLog:log,selfIdentity:record.identity});if(!checked.ok)return reject(state,beforeHash,checked.code);}
 if(['CORRECTION','SUPERSESSION','VOID'].includes(record.payload.kind)){if(!record.payload.antecedent_ref)return reject(state,beforeHash,'REVISION_REQUIRES_ANTECEDENT_REF');const antecedent=validateObjectRefs(state,[record.payload.antecedent_ref],{selfLog:log,selfIdentity:record.identity});if(!antecedent.ok)return reject(state,beforeHash,antecedent.code);}
 if(state.logs[log].some(item=>item.identity===record.identity))return reject(state,beforeHash,'IDENTITY_ALREADY_USED_IN_LOG');
 const registry=aliasRegistry(state);if(!registry.ok)return reject(state,beforeHash,registry.code);if(registry.byAlias.has(record.identity))return reject(state,beforeHash,'ALIAS_SHADOWING_FORBIDDEN');
 const nextState=clone(state);nextState.logs[log].push(clone(record));trustState(nextState);return{accepted:true,code:'APPENDED',before_hash:beforeHash,after_hash:trustedHash(nextState),history_delta:1,next_state:nextState};
}

function mergeData(left,right){const merged=Object.create(null);for(const source of [left,right]){const descriptors=Object.getOwnPropertyDescriptors(source);for(const key of Reflect.ownKeys(descriptors)){const descriptor=ownValue(descriptors,key);if(typeof key==='symbol'||!descriptor||!descriptorHasValue(descriptor))fail('INVALID_MERGE_DATA');defineData(merged,key,clone(descriptorValue(descriptor)));}}return merged;}
function materializeOperation(operation,foundationEvent,state){if(operation?.omission_event_profile!=='QUALIFIED_E_MINUS_V1')return clone(operation);const overrides=ownValue(operation,'payload_overrides',Object.create(null)),evaluationRef=ownValue(overrides,'evaluation_ref',ownValue(foundationEvent,'evaluation_ref')),prepared=state.preconditions.e_minus_proofs.find(item=>item?.evaluation_ref===evaluationRef),derived=prepared?.candidate??Object.create(null),payload=mergeData(mergeData(derived,foundationEvent),overrides),identity=operation.identity;defineData(payload,'event_id',identity);return nullObject([['operation','APPEND'],['log',operation.log],['record',nullObject([['identity',identity],['payload',payload]])]]);}
export function runScenario(scenario,foundationPreconditions={},foundationEvent={}){
 scenario=normalizeData(scenario,'INVALID_SCENARIO_DATA');foundationPreconditions=normalizeData(foundationPreconditions,'INVALID_FOUNDATION_PRECONDITIONS_DATA');foundationEvent=normalizeData(foundationEvent,'INVALID_FOUNDATION_EVENT_DATA');
 const scenarioPreconditions=ownValue(scenario,'preconditions',Object.create(null)),mergedPreconditions=scenario.foundation_profile==='E_MINUS_OMISSION_V1'?mergeData(foundationPreconditions,scenarioPreconditions):scenarioPreconditions;let state=createState(mergedPreconditions);const results=[];
 for(const safeStep of scenario.steps){const step=normalizeData(safeStep,'INVALID_SCENARIO_STEP_DATA'),inputState=clone(state),inputOperation=normalizeData(step.operation,'INVALID_OPERATION_DATA'),inputContext=normalizeData(step.context??{},'INVALID_CONTEXT_DATA'),operation=materializeOperation(inputOperation,foundationEvent,state),context=clone(inputContext),expected=normalizeData(step.expected,'INVALID_EXPECTED_DATA'),outcome=applyOperation(state,operation,context);if(stableTrusted(state)!==stableTrusted(inputState)||stableTrusted(inputOperation)!==stableTrusted(step.operation)||stableTrusted(context)!==stableTrusted(inputContext))throw new Error('Scenario input mutation');if(outcome.accepted!==expected.accepted||outcome.code!==expected.code||outcome.history_delta!==expected.history_delta)throw new Error('Scenario expectation mismatch');if(expected.before_equals_after!==undefined&&((outcome.before_hash===outcome.after_hash)!==expected.before_equals_after))throw new Error('Scenario hash expectation mismatch');state=outcome.next_state;results.push(outcome);}
 const logSizes=Object.create(null);for(const name of logNames)defineData(logSizes,name,state.logs[name].length);return nullObject([['scenario_id',scenario.scenario_id],['classification',scenario.classification],['step_count',results.length],['accepted_steps',results.filter(item=>item.accepted).length],['rejected_steps',results.filter(item=>!item.accepted).length],['final_history_hash',historyHash(state)],['log_sizes',logSizes]]);
}
export function validateScenarioBundle(manifest,cases){
 manifest=normalizeData(manifest,'INVALID_MANIFEST_DATA');cases=normalizeData(cases,'INVALID_CASES_DATA');
 if(manifest.schema_version!=='janus-stateful-scenario-manifest-v1'||cases.schema_version!=='janus-stateful-history-reference-cases-v1')throw new Error('Stateful scenario schema version mismatch');if(cases.manifest_ref!==manifest.manifest_id||manifest.cases_file!=='conformance/core-lite-v0.2/scenarios/history-reference.cases.json')throw new Error('Stateful manifest reference mismatch');if(serializeTrusted(manifest.logs)!==serializeTrusted(logNames)||serializeTrusted(manifest.operations)!==serializeTrusted(operationNames))throw new Error('Stateful operation profile mismatch');const ids=cases.scenarios.map(item=>item.scenario_id);if(new Set(ids).size!==ids.length||serializeTrusted(ids)!==serializeTrusted(manifest.scenario_ids)||cases.scenario_count!==ids.length)throw new Error('Stateful manifest/cases reciprocity mismatch');for(const scenario of cases.scenarios){if(!Array.isArray(scenario.requirement_ids)||new Set(scenario.requirement_ids).size!==scenario.requirement_ids.length)throw new Error(`Scenario requirement attribution invalid ${scenario.scenario_id}`);if(scenario.foundation_profile&&scenario.foundation_profile!=='E_MINUS_OMISSION_V1')throw new Error(`Unknown foundation profile ${scenario.scenario_id}`);}return cases.scenarios.map(scenario=>runScenario(scenario,ownValue(cases,'omission_foundation_preconditions',Object.create(null)),ownValue(cases,'omission_foundation_event',Object.create(null))));
}
