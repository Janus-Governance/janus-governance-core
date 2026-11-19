import crypto from 'node:crypto';
import { types } from 'node:util';
import { digestEvaluationData,evaluateConstitutiveEMinus,replayConstitutiveEMinus } from './e-minus-evaluator.mjs';
import { evaluateConstitutiveEPlus } from './e-plus-evaluator.mjs';

export const logNames=Object.freeze(['MANAGEMENT_LOG','SCHEMA_LOG','AUDIT_LOG']);
export const operationNames=Object.freeze(['APPEND','RESET','REPLACE','DELETE','CHECK_OBJECT_REFS','CHECK_E_PLUS_SUPPORT','CHECK_OMISSION_RESOLUTION','ORIGINATE_HUMAN_DECISION']);

const preconditionKeys=Object.freeze(['authorized_audit_writer_refs','reference_aliases','constitutive_evaluations','evidence_artifacts','e_plus_registry']);
const trustedStates=new WeakSet();
const governanceFlowOperations=new WeakSet();
const fail=code=>{throw new TypeError(code);};
const ownDescriptor=(value,key)=>Object.getOwnPropertyDescriptor(value,key);
const descriptorHasValue=descriptor=>ownDescriptor(descriptor,'value')!==undefined;
const descriptorValue=descriptor=>ownDescriptor(descriptor,'value')?.value;
const ownValue=(value,key,fallback=undefined)=>{const descriptor=ownDescriptor(value,key);return descriptor&&descriptorHasValue(descriptor)?descriptorValue(descriptor):fallback;};
const hasOwnData=(value,key)=>{const descriptor=ownDescriptor(value,key);return Boolean(descriptor&&descriptorHasValue(descriptor));};
function defineData(target,key,value){Object.defineProperty(target,key,{value,enumerable:true,writable:true,configurable:true});return target;}
function nullObject(entries=[]){const value=Object.create(null);for(const [key,entry] of entries)defineData(value,key,entry);return value;}
function normalizeData(value,code='INVALID_DATA',tracker={seen:new Set(),nodes:0},depth=0){
 if(depth>64)fail(code+'_DEPTH_LIMIT');tracker.nodes++;if(tracker.nodes>20000)fail(code+'_NODE_LIMIT');
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(Number.isFinite(value))return value;fail(code);}
 if(typeof value!=='object'||types.isProxy(value))fail(code);
 if(tracker.seen.has(value))fail(code);tracker.seen.add(value);
 const isArray=Array.isArray(value),prototype=Object.getPrototypeOf(value);
 if(isArray?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)fail(code);
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors),normalized=isArray?new Array(value.length):Object.create(null);
 if(isArray&&(!Number.isSafeInteger(value.length)||value.length<0))fail(code);
 for(const key of keys){
  if(isArray&&key==='length')continue;
  if(typeof key==='symbol')fail(code);
  const descriptor=ownValue(descriptors,key);if(!descriptor||!descriptorHasValue(descriptor)||ownDescriptor(descriptor,'get')!==undefined||ownDescriptor(descriptor,'set')!==undefined||ownValue(descriptor,'enumerable')!==true)fail(code);
  if(isArray&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length))fail(code);
  defineData(normalized,key,normalizeData(descriptorValue(descriptor),code,tracker,depth+1));
 }
 if(isArray&&Object.keys(descriptors).filter(key=>key!=='length').length!==value.length)fail(code);
 tracker.seen.delete(value);return normalized;
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
export function createState(preconditions={}){const safe=normalizeData(preconditions,'INVALID_PRECONDITIONS_DATA');for(const forbidden of ['expectations','scopes','procedures','schema_contexts','observations','e_minus_proofs'])if(hasOwnData(safe,forbidden))fail('LEGACY_E_MINUS_ORACLE_INPUT_FORBIDDEN');const logs=nullObject(),normalizedPreconditions=nullObject();for(const name of logNames)defineData(logs,name,[]);for(const key of preconditionKeys)if(key!=='e_plus_registry'||hasOwnData(safe,key))defineData(normalizedPreconditions,key,clone(ownValue(safe,key,[])));const evaluations=applyConstitutiveCase(normalizedPreconditions.constitutive_evaluations,ownValue(safe,'constitutive_case'));if(!Array.isArray(evaluations))fail('INVALID_CONSTITUTIVE_EVALUATIONS');const proofs=[];for(const input of evaluations){const evaluated=evaluateConstitutiveEMinus(input),expected=evaluated.proof?.replay_digest??null,replay=expected?replayConstitutiveEMinus(input,expected):null;proofs.push(nullObject([['evaluation_ref',evaluated.evaluation_ref],['status',evaluated.status],['code',evaluated.code],['observation',evaluated.observation??null],['proof',evaluated.proof??null],['candidate',evaluated.candidate??null],['replay_verified',replay?.matches===true]]));}defineData(normalizedPreconditions,'e_minus_proofs',proofs);const state=nullObject([['logs',logs],['preconditions',normalizedPreconditions]]);return trustState(normalizeData(state,'INVALID_INTERNAL_STATE'));}
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
function uniqueBy(items,key,value,missing,ambiguous){const matches=Array.isArray(items)?items.filter(item=>item?.[key]===value):[];if(!matches.length)return{ok:false,code:missing};if(matches.length!==1)return{ok:false,code:ambiguous};return{ok:true,value:matches[0]};}
function resolutionMaterial(input){
 const expectation=uniqueBy(input.expectations,'expectation_ref',input.expectation_ref,'RESOLUTION_EXPECTATION_NOT_FOUND','RESOLUTION_EXPECTATION_AMBIGUOUS');if(!expectation.ok)return expectation;if(expectation.value.version!==input.expectation_version)return{ok:false,code:'RESOLUTION_EXPECTATION_VERSION_MISMATCH'};
 const scope=uniqueBy(input.scopes,'scope_ref',input.scope_ref,'RESOLUTION_SCOPE_NOT_FOUND','RESOLUTION_SCOPE_AMBIGUOUS');if(!scope.ok)return scope;if(scope.value.version!==input.scope_version)return{ok:false,code:'RESOLUTION_SCOPE_VERSION_MISMATCH'};
 const procedure=uniqueBy(input.procedures,'procedure_ref',scope.value.procedure_ref,'RESOLUTION_PROCEDURE_NOT_FOUND','RESOLUTION_PROCEDURE_AMBIGUOUS');if(!procedure.ok||procedure.value.version!==scope.value.procedure_version)return{ok:false,code:procedure.ok?'RESOLUTION_PROCEDURE_VERSION_MISMATCH':procedure.code};
 const priorRecords=[];for(const snapshot of input.prior_snapshots??[])for(const record of snapshot.expectation_records??[])if(record.expectation_ref===input.expectation_ref&&record.expectation_version===input.expectation_version)priorRecords.push({snapshot_ref:snapshot.snapshot_ref,snapshot_version:snapshot.version,snapshot_digest:snapshot.digest,record});if(priorRecords.length!==1)return{ok:false,code:priorRecords.length?'RESOLUTION_PRIOR_EXPECTATION_AMBIGUOUS':'RESOLUTION_PRIOR_EXPECTATION_NOT_FOUND'};
 const provenance=uniqueBy(input.provenance_artifacts,'provenance_ref',expectation.value.provenance_ref,'RESOLUTION_PROVENANCE_NOT_FOUND','RESOLUTION_PROVENANCE_AMBIGUOUS');if(!provenance.ok||provenance.value.version!==expectation.value.provenance_version)return{ok:false,code:provenance.ok?'RESOLUTION_PROVENANCE_VERSION_MISMATCH':provenance.code};
 const scopeMaterial=clone(scope.value);for(const source of scopeMaterial.sources??[]){delete source.cutoff_ordinal;if(source.window)delete source.window.through_ordinal;}
 const value={expectation_ref:input.expectation_ref,expectation_version:input.expectation_version,expectation:expectation.value,prior_expectation:priorRecords[0],provenance:provenance.value,scope:scopeMaterial,procedure:procedure.value,schema_history:input.schema_history};
 return{ok:true,value,digest:crypto.createHash('sha256').update(stableTrusted(value),'utf8').digest('hex')};
}
function resolutionLineage(initial,later){
 const initialScopes=initial.scopes?.find(item=>item?.scope_ref===initial.scope_ref&&item?.version===initial.scope_version)?.sources,laterScopes=later.scopes?.find(item=>item?.scope_ref===later.scope_ref&&item?.version===later.scope_version)?.sources,initialSources=initial.snapshot?.sources,laterSources=later.snapshot?.sources;
 if(!Array.isArray(initialScopes)||!Array.isArray(laterScopes)||!Array.isArray(initialSources)||!Array.isArray(laterSources))return{ok:false,code:'RESOLUTION_HISTORY_FORK'};
 const mapSources=items=>{const mapped=new Map();for(const item of items){if(typeof item?.source_ref!=='string'||mapped.has(item.source_ref))return null;mapped.set(item.source_ref,item);}return mapped;},initialScopeMap=mapSources(initialScopes),laterScopeMap=mapSources(laterScopes),initialSourceMap=mapSources(initialSources),laterSourceMap=mapSources(laterSources);
 if(!initialScopeMap||!laterScopeMap||!initialSourceMap||!laterSourceMap||initialScopeMap.size!==laterScopeMap.size||initialSourceMap.size!==laterSourceMap.size||initialScopeMap.size!==initialSourceMap.size)return{ok:false,code:'RESOLUTION_HISTORY_FORK'};
 const refs=[...initialScopeMap.keys()].sort();if(refs.some(ref=>!laterScopeMap.has(ref)||!initialSourceMap.has(ref)||!laterSourceMap.has(ref)))return{ok:false,code:'RESOLUTION_HISTORY_FORK'};
 for(const ref of refs){
  const before=initialSourceMap.get(ref),after=laterSourceMap.get(ref),beforeScope=initialScopeMap.get(ref),afterScope=laterScopeMap.get(ref);
  if(!Number.isSafeInteger(beforeScope.cutoff_ordinal)||!Number.isSafeInteger(afterScope.cutoff_ordinal)||afterScope.cutoff_ordinal<=beforeScope.cutoff_ordinal)return{ok:false,code:'RESOLUTION_CUTOFF_NOT_LATER'};
  if(!Array.isArray(before.records)||!Array.isArray(after.records)||after.records.length<before.records.length)return{ok:false,code:'RESOLUTION_HISTORY_DELETION'};
  for(let position=0;position<before.records.length;position++)if(serializeTrusted(before.records[position])!==serializeTrusted(after.records[position]))return{ok:false,code:'RESOLUTION_HISTORY_MUTATION'};
  const identities=new Set(),ordinals=new Set();let maximum=-Infinity;for(let position=0;position<after.records.length;position++){const record=after.records[position];if(typeof record?.identity!=='string'||!Number.isSafeInteger(record.ordinal))return{ok:false,code:'RESOLUTION_HISTORY_INVALID'};if(identities.has(record.identity)||ordinals.has(record.ordinal))return{ok:false,code:'RESOLUTION_HISTORY_REUSE'};identities.add(record.identity);ordinals.add(record.ordinal);if(position>=before.records.length&&(record.ordinal<=beforeScope.cutoff_ordinal||record.ordinal<=maximum))return{ok:false,code:'RESOLUTION_HISTORY_RETROACTIVE_INSERTION'};maximum=Math.max(maximum,record.ordinal);}
 }
 return{ok:true};
}
function validateOmissionResolution(state,operation){
 const events=state.logs.AUDIT_LOG.filter(record=>record.identity===operation.omission_event_id&&record.payload?.event_type==='OMISSION_DETECTED');if(!events.length)return{ok:false,code:'OMISSION_EVENT_NOT_FOUND'};if(events.length!==1)return{ok:false,code:'OMISSION_EVENT_AMBIGUOUS'};const event=events[0].payload;
 const initialProof=uniqueBy(state.preconditions.e_minus_proofs,'evaluation_ref',event.evaluation_ref,'INITIAL_EVALUATION_NOT_FOUND','INITIAL_EVALUATION_AMBIGUOUS');if(!initialProof.ok)return initialProof;const laterProof=uniqueBy(state.preconditions.e_minus_proofs,'evaluation_ref',operation.resolution_evaluation_ref,'RESOLUTION_EVALUATION_NOT_FOUND','RESOLUTION_EVALUATION_AMBIGUOUS');if(!laterProof.ok)return laterProof;
 if(initialProof.value.status!=='ABSENT'||!initialProof.value.proof||!initialProof.value.candidate||initialProof.value.replay_verified!==true)return{ok:false,code:'INITIAL_OMISSION_NOT_VERIFIED'};
 const resolved=laterProof.value;if(resolved.status!=='PRESENT'||!resolved.proof||!resolved.observation||resolved.replay_verified!==true)return{ok:false,code:'RESOLUTION_NOT_PRESENT'};
 const initialInput=uniqueBy(state.preconditions.constitutive_evaluations,'evaluation_ref',event.evaluation_ref,'INITIAL_INPUT_NOT_FOUND','INITIAL_INPUT_AMBIGUOUS'),laterInput=uniqueBy(state.preconditions.constitutive_evaluations,'evaluation_ref',operation.resolution_evaluation_ref,'RESOLUTION_INPUT_NOT_FOUND','RESOLUTION_INPUT_AMBIGUOUS');if(!initialInput.ok)return initialInput;if(!laterInput.ok)return laterInput;
 if(laterInput.value.expectation_ref!==event.expectation_ref||laterInput.value.expectation_version!==event.expectation_version)return{ok:false,code:'RESOLUTION_EXPECTATION_VERSION_MISMATCH'};
 const boundComponents=['expectation','prior_expectation','provenance','procedure','effective_schemas'];if(boundComponents.some(key=>typeof initialProof.value.proof.component_digests?.[key]!=='string'||initialProof.value.proof.component_digests[key]!==resolved.proof.component_digests?.[key]))return{ok:false,code:'RESOLUTION_EXPECTATION_MATERIAL_MISMATCH'};
 const initialInspected=initialProof.value.proof.inspected_records,laterInspected=resolved.proof.inspected_records;if(!Array.isArray(initialInspected)||!Array.isArray(laterInspected)||laterInspected.length<initialInspected.length||initialInspected.some((record,index)=>serializeTrusted(record)!==serializeTrusted(laterInspected[index])))return{ok:false,code:'RESOLUTION_PROOF_HISTORY_NOT_PREFIX'};
 const initialMaterial=resolutionMaterial(initialInput.value),laterMaterial=resolutionMaterial(laterInput.value);if(!initialMaterial.ok)return initialMaterial;if(!laterMaterial.ok)return laterMaterial;if(initialMaterial.digest!==laterMaterial.digest)return{ok:false,code:'RESOLUTION_EXPECTATION_MATERIAL_MISMATCH'};
 const lineage=resolutionLineage(initialInput.value,laterInput.value);if(!lineage.ok)return lineage;
 if(resolved.observation.observation_ref===initialProof.value.observation?.observation_ref)return{ok:false,code:'RESOLUTION_OBSERVATION_NOT_LATER'};
 const initialCutoffs=new Map(initialProof.value.proof.cutoffs.map(item=>[item.source_ref,item.cutoff_ordinal]));if(!resolved.proof.matches?.length||!resolved.proof.matches.every(item=>initialCutoffs.has(item.source_ref)&&item.ordinal>initialCutoffs.get(item.source_ref)))return{ok:false,code:'RESOLUTION_MATCH_NOT_AFTER_INITIAL_CUTOFF'};
 const evidence=state.preconditions.evidence_artifacts?.filter(item=>item?.evidence_ref===resolved.observation.observation_ref)??[];if(evidence.length!==1)return{ok:false,code:evidence.length?'RESOLUTION_EVIDENCE_AMBIGUOUS':'RESOLUTION_EVIDENCE_NOT_FOUND'};if(evidence[0].version!=='v1')return{ok:false,code:'RESOLUTION_EVIDENCE_VERSION_MISMATCH'};if(evidence[0].resolvable!==true||evidence[0].immutable!==true)return{ok:false,code:'RESOLUTION_EVIDENCE_NOT_GOVERNED'};if(evidence[0].digest!==resolved.proof.observation_digest)return{ok:false,code:'RESOLUTION_EVIDENCE_DIGEST_MISMATCH'};
 return{ok:true,code:'OMISSION_RESOLUTION_VERIFIED'};
}

export function applyOperation(state,operation,context={}){
 assertTrustedState(state);
 const governanceFlow=governanceFlowOperations.has(operation);
 operation=normalizeData(operation,'INVALID_OPERATION_DATA');context=normalizeData(context,'INVALID_CONTEXT_DATA');
 const beforeHash=trustedHash(state);
 if(!operation||typeof operation!=='object'||!operationNames.includes(operation.operation))return reject(state,beforeHash,'INVALID_OPERATION');
 if(operation.operation==='ORIGINATE_HUMAN_DECISION'){
  if(context.channel!=='AUDIT_WRITER')return reject(state,beforeHash,'AUDIT_WRITER_BYPASS');
  const writers=state.preconditions?.authorized_audit_writer_refs;if(typeof context.writer_ref!=='string'||!Array.isArray(writers)||!writers.includes(context.writer_ref))return reject(state,beforeHash,'AUDIT_WRITER_NOT_AUTHORIZED');
  if(!humanDecisionShape(operation.candidate))return reject(state,beforeHash,'INVALID_HUMAN_DECISION_SHAPE');
  return reject(state,beforeHash,'AUDIT_WRITER_HUMAN_ORIGINATION_FORBIDDEN');
 }
 if(['RESET','REPLACE','DELETE'].includes(operation.operation))return reject(state,beforeHash,'FORBIDDEN_MUTATION');
 if(operation.operation==='CHECK_OBJECT_REFS'){if(hasPreconditionOverride(operation))return reject(state,beforeHash,'OPERATION_PRECONDITION_OVERRIDE_FORBIDDEN');if(hasPreconditionOverride(context))return reject(state,beforeHash,'CONTEXT_PRECONDITION_OVERRIDE_FORBIDDEN');const checked=validateObjectRefs(state,operation.object_refs??[],{selfLog:operation.origin_log??null,selfIdentity:operation.identity??null});return checked.ok?result(state,beforeHash,true,checked.code,0):reject(state,beforeHash,checked.code);}
 if(operation.operation==='CHECK_E_PLUS_SUPPORT'){
  if(hasPreconditionOverride(operation))return reject(state,beforeHash,'OPERATION_PRECONDITION_OVERRIDE_FORBIDDEN');if(hasPreconditionOverride(context))return reject(state,beforeHash,'CONTEXT_PRECONDITION_OVERRIDE_FORBIDDEN');
  if(Object.keys(context).length)return reject(state,beforeHash,'E_PLUS_CONTEXT_FIELDS');
  const allowed=['governance_event_ref','operation','subject_ref','subject_type'];if(Object.keys(operation).some(key=>!allowed.includes(key))||allowed.some(key=>!hasOwnData(operation,key)))return reject(state,beforeHash,'E_PLUS_OPERATION_FIELDS');
  const evaluated=evaluateConstitutiveEPlus({registry:state.preconditions.e_plus_registry,governance_event_ref:operation.governance_event_ref,subject_type:operation.subject_type,subject_ref:operation.subject_ref});
  return evaluated.status==='SUPPORTED'?result(state,beforeHash,true,evaluated.code,0):reject(state,beforeHash,evaluated.code);
 }
 if(operation.operation==='CHECK_OMISSION_RESOLUTION'){
  if(hasPreconditionOverride(operation))return reject(state,beforeHash,'OPERATION_PRECONDITION_OVERRIDE_FORBIDDEN');if(hasPreconditionOverride(context))return reject(state,beforeHash,'CONTEXT_PRECONDITION_OVERRIDE_FORBIDDEN');if(Object.keys(context).length)return reject(state,beforeHash,'RESOLUTION_CONTEXT_FIELDS');
  const allowed=['omission_event_id','operation','resolution_evaluation_ref'];if(Object.keys(operation).some(key=>!allowed.includes(key))||allowed.some(key=>!hasOwnData(operation,key))||typeof operation.omission_event_id!=='string'||!operation.omission_event_id.length||typeof operation.resolution_evaluation_ref!=='string'||!operation.resolution_evaluation_ref.length)return reject(state,beforeHash,'RESOLUTION_OPERATION_FIELDS');
  const checked=validateOmissionResolution(state,operation);return checked.ok?result(state,beforeHash,true,checked.code,0):reject(state,beforeHash,checked.code);
 }
 const{log,record}=operation;if(!logNames.includes(log))return reject(state,beforeHash,'INVALID_LOG');
 if(!record||typeof record!=='object'||typeof record.identity!=='string'||!record.identity.length||!record.payload||typeof record.payload!=='object'||Array.isArray(record.payload))return reject(state,beforeHash,'INVALID_RECORD_WRAPPER');
 if(hasPreconditionOverride(operation))return reject(state,beforeHash,'OPERATION_PRECONDITION_OVERRIDE_FORBIDDEN');
 if(hasPreconditionOverride(context))return reject(state,beforeHash,'CONTEXT_PRECONDITION_OVERRIDE_FORBIDDEN');
 if(log==='AUDIT_LOG'){
  if(typeof record.payload.event_type!=='string'||!record.payload.event_type.length)return reject(state,beforeHash,'AUDIT_EVENT_TYPE_REQUIRED');
  if(typeof record.payload.event_id!=='string'||!record.payload.event_id.length)return reject(state,beforeHash,'AUDIT_EVENT_ID_REQUIRED');
  if(record.identity!==record.payload.event_id)return reject(state,beforeHash,'AUDIT_EVENT_IDENTITY_MISMATCH');
 }
 if(governanceFlow&&record.payload.event_type==='HUMAN_DECISION')return reject(state,beforeHash,'GOVERNANCE_FLOW_HUMAN_ORIGINATION_FORBIDDEN');
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
function materializeOperation(operation,foundationEvent,state){if(operation?.omission_event_profile!=='QUALIFIED_E_MINUS_V1')return clone(operation);const overrides=ownValue(operation,'payload_overrides',Object.create(null)),evaluationRef=ownValue(overrides,'evaluation_ref',ownValue(foundationEvent,'evaluation_ref')),prepared=state.preconditions.e_minus_proofs.find(item=>item?.evaluation_ref===evaluationRef),derived=prepared?.candidate??Object.create(null),payload=mergeData(mergeData(derived,foundationEvent),overrides),identity=operation.identity;defineData(payload,'event_id',identity);const materialized=nullObject([['operation','APPEND'],['log',operation.log],['record',nullObject([['identity',identity],['payload',payload]])]]);governanceFlowOperations.add(materialized);return materialized;}
export function buildResolutionFixturePreconditions(foundation){
 const prepared=clone(foundation),initial=prepared.constitutive_evaluations[0];initial.schema_history[0].applicable_through_ordinal=100;initial.schema_history[0].digest=digestEvaluationData(nullObject([['schema_context_ref',initial.schema_history[0].schema_context_ref],['version',initial.schema_history[0].version],['source_ref',initial.schema_history[0].source_ref],['applicable_from_ordinal',initial.schema_history[0].applicable_from_ordinal],['applicable_through_ordinal',initial.schema_history[0].applicable_through_ordinal]]));initial.snapshot.sources[0].records[1].subject_ref='other-subject';
 const initialResult=evaluateConstitutiveEMinus(initial);prepared.evidence_artifacts[0].digest=initialResult.proof.observation_digest;
 const later=clone(initial);later.evaluation_ref='resolution-evaluation-v1';later.observation_ref='resolution-observation-v1';later.snapshot.snapshot_ref='snapshot-resolution-v1';later.snapshot.sources[0].complete_through_ordinal=70;later.scopes[0].sources[0].cutoff_ordinal=60;later.scopes[0].sources[0].window.through_ordinal=60;later.snapshot.sources[0].records.push(nullObject([['identity','resolution-match-v1'],['ordinal',55],['subject_ref','subject-1'],['fields',nullObject([['record_kind','expected-kind']])]]));
 const otherVersion=clone(later);otherVersion.evaluation_ref='resolution-evaluation-v2';otherVersion.observation_ref='resolution-observation-v2';otherVersion.expectation_version='v2';otherVersion.expectations[0].version='v2';otherVersion.prior_snapshots[0].expectation_records[0].expectation_version='v2';otherVersion.prior_snapshots[0].digest=digestEvaluationData(nullObject([['snapshot_ref',otherVersion.prior_snapshots[0].snapshot_ref],['version',otherVersion.prior_snapshots[0].version],['expectation_records',otherVersion.prior_snapshots[0].expectation_records]]));otherVersion.snapshot.predecessor_snapshot_refs[0].digest=otherVersion.prior_snapshots[0].digest;
 const materialMutation=clone(later);materialMutation.evaluation_ref='resolution-evaluation-material-mutant';materialMutation.observation_ref='resolution-observation-material-mutant';materialMutation.expectations[0].due.ordinal=21;
 const equalCutoff=clone(initial);equalCutoff.evaluation_ref='resolution-evaluation-equal-cutoff';equalCutoff.observation_ref='resolution-observation-equal-cutoff';equalCutoff.snapshot.snapshot_ref='snapshot-resolution-equal-cutoff';equalCutoff.snapshot.sources[0].records.push(nullObject([['identity','retroactive-resolution-match'],['ordinal',30],['subject_ref','subject-1'],['fields',nullObject([['record_kind','expected-kind']])]]));
 const missingEvidence=clone(later);missingEvidence.evaluation_ref='resolution-evaluation-missing-evidence';missingEvidence.observation_ref='resolution-observation-missing-evidence';
 prepared.constitutive_evaluations=[initial,later,otherVersion,materialMutation,equalCutoff,missingEvidence];for(const input of prepared.constitutive_evaluations.slice(1)){const evaluated=evaluateConstitutiveEMinus(input);if(evaluated.proof&&input!==missingEvidence)prepared.evidence_artifacts.push(nullObject([['evidence_ref',input.observation_ref],['version','v1'],['resolvable',true],['immutable',true],['artifact_class','CONSTITUTIVE_OBSERVATION'],['digest',evaluated.proof.observation_digest]]));}return prepared;
}
export function runScenario(scenario,foundationPreconditions={},foundationEvent={}){
 scenario=normalizeData(scenario,'INVALID_SCENARIO_DATA');foundationPreconditions=normalizeData(foundationPreconditions,'INVALID_FOUNDATION_PRECONDITIONS_DATA');foundationEvent=normalizeData(foundationEvent,'INVALID_FOUNDATION_EVENT_DATA');
 const scenarioPreconditions=ownValue(scenario,'preconditions',Object.create(null)),mergedPreconditions=scenario.foundation_profile==='E_MINUS_OMISSION_V1'?mergeData(foundationPreconditions,scenarioPreconditions):scenario.foundation_profile==='E_MINUS_RESOLUTION_V1'?mergeData(buildResolutionFixturePreconditions(foundationPreconditions),scenarioPreconditions):scenarioPreconditions;let state=createState(mergedPreconditions);const results=[];
 for(const safeStep of scenario.steps){const step=normalizeData(safeStep,'INVALID_SCENARIO_STEP_DATA'),inputState=clone(state),inputOperation=normalizeData(step.operation,'INVALID_OPERATION_DATA'),inputContext=normalizeData(step.context??{},'INVALID_CONTEXT_DATA'),operation=materializeOperation(inputOperation,foundationEvent,state),context=clone(inputContext),expected=normalizeData(step.expected,'INVALID_EXPECTED_DATA'),outcome=applyOperation(state,operation,context);if(stableTrusted(state)!==stableTrusted(inputState)||stableTrusted(inputOperation)!==stableTrusted(step.operation)||stableTrusted(context)!==stableTrusted(inputContext))throw new Error('Scenario input mutation');if(outcome.accepted!==expected.accepted||outcome.code!==expected.code||outcome.history_delta!==expected.history_delta)throw new Error('Scenario expectation mismatch');if(expected.before_equals_after!==undefined&&((outcome.before_hash===outcome.after_hash)!==expected.before_equals_after))throw new Error('Scenario hash expectation mismatch');state=outcome.next_state;results.push(outcome);}
 const logSizes=Object.create(null);for(const name of logNames)defineData(logSizes,name,state.logs[name].length);return nullObject([['scenario_id',scenario.scenario_id],['classification',scenario.classification],['step_count',results.length],['accepted_steps',results.filter(item=>item.accepted).length],['rejected_steps',results.filter(item=>!item.accepted).length],['final_history_hash',historyHash(state)],['log_sizes',logSizes]]);
}
export function validateScenarioBundle(manifest,cases){
 manifest=normalizeData(manifest,'INVALID_MANIFEST_DATA');cases=normalizeData(cases,'INVALID_CASES_DATA');
 if(manifest.schema_version!=='janus-stateful-scenario-manifest-v1'||cases.schema_version!=='janus-stateful-history-reference-cases-v1')throw new Error('Stateful scenario schema version mismatch');if(cases.manifest_ref!==manifest.manifest_id||manifest.cases_file!=='conformance/core-lite-v0.2/scenarios/history-reference.cases.json')throw new Error('Stateful manifest reference mismatch');if(serializeTrusted(manifest.logs)!==serializeTrusted(logNames)||serializeTrusted(manifest.operations)!==serializeTrusted(operationNames))throw new Error('Stateful operation profile mismatch');const ids=cases.scenarios.map(item=>item.scenario_id);if(new Set(ids).size!==ids.length||serializeTrusted(ids)!==serializeTrusted(manifest.scenario_ids)||cases.scenario_count!==ids.length)throw new Error('Stateful manifest/cases reciprocity mismatch');for(const scenario of cases.scenarios){if(!Array.isArray(scenario.requirement_ids)||new Set(scenario.requirement_ids).size!==scenario.requirement_ids.length)throw new Error(`Scenario requirement attribution invalid ${scenario.scenario_id}`);if(scenario.foundation_profile&&!['E_MINUS_OMISSION_V1','E_MINUS_RESOLUTION_V1'].includes(scenario.foundation_profile))throw new Error(`Unknown foundation profile ${scenario.scenario_id}`);}return cases.scenarios.map(scenario=>runScenario(scenario,ownValue(cases,'omission_foundation_preconditions',Object.create(null)),ownValue(cases,'omission_foundation_event',Object.create(null))));
}
