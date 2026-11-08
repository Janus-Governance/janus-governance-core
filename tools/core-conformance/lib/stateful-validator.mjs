import crypto from 'node:crypto';
import { types } from 'node:util';

export const logNames=Object.freeze(['MANAGEMENT_LOG','SCHEMA_LOG','AUDIT_LOG']);
export const operationNames=Object.freeze(['APPEND','RESET','REPLACE','DELETE','CHECK_OBJECT_REFS','ORIGINATE_HUMAN_DECISION']);

const preconditionKeys=Object.freeze(['authorized_audit_writer_refs','reference_aliases','expectations','scopes','procedures','schema_contexts','observations','evidence_artifacts']);
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

export function createState(preconditions={}){const safe=normalizeData(preconditions,'INVALID_PRECONDITIONS_DATA'),logs=nullObject(),normalizedPreconditions=nullObject();for(const name of logNames)defineData(logs,name,[]);for(const key of preconditionKeys)defineData(normalizedPreconditions,key,clone(ownValue(safe,key,[])));const state=nullObject([['logs',logs],['preconditions',normalizedPreconditions]]);return trustState(normalizeData(state,'INVALID_INTERNAL_STATE'));}
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
const hasPreconditionOverride=value=>preconditionKeys.some(key=>hasOwnData(value,key));
const sameArray=(left,right)=>Array.isArray(left)&&Array.isArray(right)&&serializeTrusted(left)===serializeTrusted(right);
function resolveVersioned(registry,refKey,ref,version,{notFound,versionMismatch,ambiguous}){const referenced=registry.filter(item=>item?.[refKey]===ref);if(!referenced.length)return{ok:false,code:notFound};const matched=referenced.filter(item=>item.version===version);if(!matched.length)return{ok:false,code:versionMismatch};if(matched.length!==1)return{ok:false,code:ambiguous};return{ok:true,value:matched[0]};}
function validateOmission(state,payload){
 const registry=state.preconditions,expectations=registry.expectations,scopes=registry.scopes,procedures=registry.procedures,schemas=registry.schema_contexts,observations=registry.observations,evidence=registry.evidence_artifacts;
 if(![expectations,scopes,procedures,schemas,observations,evidence].every(Array.isArray))return{ok:false,code:'INVALID_OMISSION_REGISTRY'};
 const referencedExpectations=expectations.filter(item=>item?.expectation_ref===payload.expectation_ref);if(!referencedExpectations.length)return{ok:false,code:'EXPECTATION_NOT_FOUND'};
 if(referencedExpectations.every(item=>item.referenceable!==true||item.resolvable!==true))return{ok:false,code:'EXPECTATION_UNRESOLVED'};
 if(typeof payload.expectation_version!=='string'||!payload.expectation_version.length)return{ok:false,code:'EXPECTATION_VERSION_REQUIRED'};
 const expectationResolution=resolveVersioned(expectations,'expectation_ref',payload.expectation_ref,payload.expectation_version,{notFound:'EXPECTATION_NOT_FOUND',versionMismatch:'EXPECTATION_VERSION_NOT_FOUND',ambiguous:'EXPECTATION_VERSION_AMBIGUOUS'});if(!expectationResolution.ok)return expectationResolution;const expectation=expectationResolution.value;
 if(expectation.referenceable!==true||expectation.resolvable!==true)return{ok:false,code:'EXPECTATION_UNRESOLVED'};
 const matchingObservations=observations.filter(item=>item?.observation_ref===payload.observation_ref);if(!matchingObservations.length)return{ok:false,code:'OBSERVATION_NOT_FOUND'};if(matchingObservations.length!==1)return{ok:false,code:'OBSERVATION_AMBIGUOUS'};const observation=matchingObservations[0];
 if(!Number.isInteger(expectation.recorded_ordinal)||!Number.isInteger(observation.observation_ordinal)||expectation.recorded_ordinal>=observation.observation_ordinal)return{ok:false,code:'EXPECTATION_VERSION_NOT_PRIOR_TO_OBSERVATION'};
 const temporal=expectation.temporal_applicability,due=expectation.due;if(typeof expectation.provenance_ref!=='string'||!expectation.provenance_ref.length||!temporal||typeof temporal!=='object'||!Number.isInteger(temporal.from_ordinal)||!Number.isInteger(temporal.through_ordinal)||temporal.from_ordinal>temporal.through_ordinal||!due||due.kind!=='ORDINAL'||!Number.isInteger(due.ordinal)||due.ordinal<temporal.from_ordinal||due.ordinal>temporal.through_ordinal)return{ok:false,code:'EXPECTATION_QUALIFICATION_INCOMPLETE'};
 if(expectation.due_status_determinable!==true)return{ok:false,code:'DUE_STATUS_INDETERMINATE'};
 const matchingScopes=scopes.filter(item=>item?.scope_ref===payload.scope_ref);if(!matchingScopes.length||matchingScopes.every(item=>item.resolvable!==true))return{ok:false,code:'SCOPE_UNRESOLVED'};if(matchingScopes.length!==1)return{ok:false,code:'SCOPE_AMBIGUOUS'};const scope=matchingScopes[0];
 const window=scope.window;if(!Array.isArray(scope.sources)||!scope.sources.length||scope.sources.some(source=>typeof source!=='string'||!source.length)||new Set(scope.sources).size!==scope.sources.length||typeof scope.subject_ref!=='string'||!scope.subject_ref.length||!scope.filters||typeof scope.filters!=='object'||Array.isArray(scope.filters)||!window||typeof window!=='object'||!Number.isInteger(window.from_ordinal)||!Number.isInteger(window.through_ordinal)||window.from_ordinal>window.through_ordinal||!Number.isInteger(scope.cutoff_ordinal)||scope.cutoff_ordinal<window.from_ordinal||scope.cutoff_ordinal>window.through_ordinal||typeof scope.procedure_ref!=='string'||!scope.procedure_ref.length||typeof scope.procedure_version!=='string'||!scope.procedure_version.length)return{ok:false,code:'SCOPE_INCOMPLETE'};
 if(scope.cutoff_ordinal<temporal.from_ordinal||scope.cutoff_ordinal>temporal.through_ordinal)return{ok:false,code:'EXPECTATION_NOT_APPLICABLE_AT_CUTOFF'};
 if(scope.cutoff_ordinal<expectation.due.ordinal)return{ok:false,code:'CUTOFF_PRECEDES_EXPECTATION_DUE'};
 const procedureResolution=resolveVersioned(procedures,'procedure_ref',scope.procedure_ref,scope.procedure_version,{notFound:'PROCEDURE_NOT_FOUND',versionMismatch:'PROCEDURE_VERSION_MISMATCH',ambiguous:'PROCEDURE_VERSION_AMBIGUOUS'});if(!procedureResolution.ok)return procedureResolution;
 if(payload.procedure_ref!==scope.procedure_ref||payload.procedure_version!==scope.procedure_version)return{ok:false,code:'OMISSION_EVENT_REFS_MISMATCH'};
 if(!Array.isArray(scope.schema_context_refs)||!scope.schema_context_refs.length)return{ok:false,code:'SCHEMA_CONTEXT_MISSING'};
 for(const ref of scope.schema_context_refs){const matches=schemas.filter(item=>item?.schema_context_ref===ref);if(!matches.length)return{ok:false,code:'SCHEMA_CONTEXT_MISSING'};if(matches.length!==1)return{ok:false,code:'SCHEMA_CONTEXT_AMBIGUOUS'};const schema=matches[0];if(schema.source_log!=='SCHEMA_LOG'||schema.covers_considered_records!==true||!Number.isInteger(schema.applicable_through_ordinal)||schema.applicable_through_ordinal<scope.cutoff_ordinal)return{ok:false,code:'SCHEMA_CONTEXT_INAPPLICABLE'};}
 if(observation.reproducible!==true)return{ok:false,code:'OBSERVATION_NOT_REPRODUCIBLE'};
 if(observation.outcome==='PRESENT')return{ok:false,code:'EXPECTATION_SATISFIED'};
 if(observation.outcome!=='ABSENT')return{ok:false,code:'OBSERVATION_OUTCOME_INDETERMINATE'};
 if(observation.scope_ref!==scope.scope_ref||observation.cutoff_ordinal!==scope.cutoff_ordinal||observation.procedure_ref!==scope.procedure_ref||observation.procedure_version!==scope.procedure_version)return{ok:false,code:'OBSERVATION_SCOPE_MISMATCH'};
 if(!Array.isArray(payload.evidence_refs)||!payload.evidence_refs.length)return{ok:false,code:'EVIDENCE_REFS_REQUIRED'};
 for(const ref of payload.evidence_refs){const resolved=resolveVersioned(evidence,'evidence_ref',ref?.evidence_ref,ref?.version,{notFound:'EVIDENCE_UNRESOLVED',versionMismatch:'EVIDENCE_VERSION_MISMATCH',ambiguous:'EVIDENCE_VERSION_AMBIGUOUS'});if(!resolved.ok)return resolved;const artifact=resolved.value;if(artifact.resolvable!==true)return{ok:false,code:'EVIDENCE_UNRESOLVED'};if(artifact.immutable!==true)return{ok:false,code:'EVIDENCE_NOT_IMMUTABLE'};}
 if(!sameArray(payload.evidence_refs,observation.evidence_refs)||!sameArray(payload.schema_context_refs,scope.schema_context_refs)||payload.expectation_ref!==expectation.expectation_ref||payload.expectation_version!==expectation.version||payload.observation_ref!==observation.observation_ref)return{ok:false,code:'OMISSION_EVENT_REFS_MISMATCH'};
 if(!payload.assertion_boundary||payload.assertion_boundary.scope_ref!==scope.scope_ref||payload.assertion_boundary.cutoff_ordinal!==scope.cutoff_ordinal||payload.cutoff_ordinal!==scope.cutoff_ordinal)return{ok:false,code:'OMISSION_ASSERTION_OUTSIDE_SCOPE_CUTOFF'};
 return{ok:true,code:'QUALIFIED_E_MINUS'};
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
function materializeOperation(operation,foundationEvent){if(operation?.omission_event_profile!=='QUALIFIED_E_MINUS_V1')return clone(operation);const payload=mergeData(foundationEvent,ownValue(operation,'payload_overrides',Object.create(null))),identity=operation.identity;defineData(payload,'event_id',identity);return nullObject([['operation','APPEND'],['log',operation.log],['record',nullObject([['identity',identity],['payload',payload]])]]);}
export function runScenario(scenario,foundationPreconditions={},foundationEvent={}){
 scenario=normalizeData(scenario,'INVALID_SCENARIO_DATA');foundationPreconditions=normalizeData(foundationPreconditions,'INVALID_FOUNDATION_PRECONDITIONS_DATA');foundationEvent=normalizeData(foundationEvent,'INVALID_FOUNDATION_EVENT_DATA');
 const scenarioPreconditions=ownValue(scenario,'preconditions',Object.create(null)),mergedPreconditions=scenario.foundation_profile==='E_MINUS_OMISSION_V1'?mergeData(foundationPreconditions,scenarioPreconditions):scenarioPreconditions;let state=createState(mergedPreconditions);const results=[];
 for(const safeStep of scenario.steps){const step=normalizeData(safeStep,'INVALID_SCENARIO_STEP_DATA'),inputState=clone(state),inputOperation=normalizeData(step.operation,'INVALID_OPERATION_DATA'),inputContext=normalizeData(step.context??{},'INVALID_CONTEXT_DATA'),operation=materializeOperation(inputOperation,foundationEvent),context=clone(inputContext),expected=normalizeData(step.expected,'INVALID_EXPECTED_DATA'),outcome=applyOperation(state,operation,context);if(stableTrusted(state)!==stableTrusted(inputState)||stableTrusted(inputOperation)!==stableTrusted(step.operation)||stableTrusted(context)!==stableTrusted(inputContext))throw new Error('Scenario input mutation');if(outcome.accepted!==expected.accepted||outcome.code!==expected.code||outcome.history_delta!==expected.history_delta)throw new Error('Scenario expectation mismatch');if(expected.before_equals_after!==undefined&&((outcome.before_hash===outcome.after_hash)!==expected.before_equals_after))throw new Error('Scenario hash expectation mismatch');state=outcome.next_state;results.push(outcome);}
 const logSizes=Object.create(null);for(const name of logNames)defineData(logSizes,name,state.logs[name].length);return nullObject([['scenario_id',scenario.scenario_id],['classification',scenario.classification],['step_count',results.length],['accepted_steps',results.filter(item=>item.accepted).length],['rejected_steps',results.filter(item=>!item.accepted).length],['final_history_hash',historyHash(state)],['log_sizes',logSizes]]);
}
export function validateScenarioBundle(manifest,cases){
 manifest=normalizeData(manifest,'INVALID_MANIFEST_DATA');cases=normalizeData(cases,'INVALID_CASES_DATA');
 if(manifest.schema_version!=='janus-stateful-scenario-manifest-v1'||cases.schema_version!=='janus-stateful-history-reference-cases-v1')throw new Error('Stateful scenario schema version mismatch');if(cases.manifest_ref!==manifest.manifest_id||manifest.cases_file!=='conformance/core-lite-v0.2/scenarios/history-reference.cases.json')throw new Error('Stateful manifest reference mismatch');if(serializeTrusted(manifest.logs)!==serializeTrusted(logNames)||serializeTrusted(manifest.operations)!==serializeTrusted(operationNames))throw new Error('Stateful operation profile mismatch');const ids=cases.scenarios.map(item=>item.scenario_id);if(new Set(ids).size!==ids.length||serializeTrusted(ids)!==serializeTrusted(manifest.scenario_ids)||cases.scenario_count!==ids.length)throw new Error('Stateful manifest/cases reciprocity mismatch');for(const scenario of cases.scenarios){if(!Array.isArray(scenario.requirement_ids)||new Set(scenario.requirement_ids).size!==scenario.requirement_ids.length)throw new Error(`Scenario requirement attribution invalid ${scenario.scenario_id}`);if(scenario.foundation_profile&&scenario.foundation_profile!=='E_MINUS_OMISSION_V1')throw new Error(`Unknown foundation profile ${scenario.scenario_id}`);}return cases.scenarios.map(scenario=>runScenario(scenario,ownValue(cases,'omission_foundation_preconditions',Object.create(null)),ownValue(cases,'omission_foundation_event',Object.create(null))));
}
