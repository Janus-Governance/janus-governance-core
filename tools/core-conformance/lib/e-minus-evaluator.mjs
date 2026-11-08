import crypto from 'node:crypto';
import { types } from 'node:util';

export const E_MINUS_PROFILE_VERSION='E_MINUS_CONSTITUTIVE_TEST_PROFILE_V1';
const forbiddenOracleKeys=new Set(['outcome','reproducible','due_status_determinable','covers_considered_records']);
const fail=code=>{throw new TypeError(code);};
const dataObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const ownDescriptor=(value,key)=>value!==null&&(typeof value==='object'||typeof value==='function')?Object.getOwnPropertyDescriptor(value,key):undefined;
const descriptorHasValue=descriptor=>Boolean(descriptor&&ownDescriptor(descriptor,'value'));
const descriptorValue=descriptor=>ownDescriptor(descriptor,'value')?.value;
const ownValue=(value,key,fallback=undefined)=>{const descriptor=ownDescriptor(value,key);return descriptorHasValue(descriptor)?descriptorValue(descriptor):fallback;};
const hasOwn=(value,key)=>descriptorHasValue(ownDescriptor(value,key));
function defineData(target,key,value){Object.defineProperty(target,key,{value,enumerable:true,writable:true,configurable:true});return target;}
function object(entries=[]){const value=Object.create(null);for(const[key,entry]of entries)defineData(value,key,entry);return value;}

function normalize(value,seen=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(Number.isFinite(value)&&!Object.is(value,-0))return value;fail('INVALID_E_MINUS_INPUT');}
 if(typeof value!=='object'||types.isProxy(value))fail('INVALID_E_MINUS_INPUT');
 if(seen.has(value))fail('INVALID_E_MINUS_INPUT');seen.add(value);
 const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
 if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)fail('INVALID_E_MINUS_INPUT');
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors),normalized=array?new Array(value.length):Object.create(null);
 for(const key of keys){
  if(array&&key==='length')continue;
  if(typeof key==='symbol'||forbiddenOracleKeys.has(key))fail(forbiddenOracleKeys.has(key)?'PROHIBITED_E_MINUS_ORACLE':'INVALID_E_MINUS_INPUT');
  const descriptor=ownValue(descriptors,key);
  if(!descriptor||!descriptorHasValue(descriptor)||ownDescriptor(descriptor,'get')!==undefined||ownDescriptor(descriptor,'set')!==undefined||ownValue(descriptor,'enumerable')!==true)fail('INVALID_E_MINUS_INPUT');
  if(array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length))fail('INVALID_E_MINUS_INPUT');
  defineData(normalized,key,normalize(descriptorValue(descriptor),seen));
 }
 if(array&&Object.keys(descriptors).filter(key=>key!=='length').length!==value.length)fail('INVALID_E_MINUS_INPUT');
 seen.delete(value);return normalized;
}
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if(descriptorHasValue(descriptor))freeze(descriptorValue(descriptor));Object.freeze(value);}return value;}
function serialize(value){
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return JSON.stringify(value);
 if(Array.isArray(value))return'['+value.map(serialize).join(',')+']';
 const keys=Reflect.ownKeys(value);if(keys.some(key=>typeof key==='symbol'))fail('INVALID_E_MINUS_INPUT');keys.sort();return'{'+keys.map(key=>JSON.stringify(key)+':'+serialize(ownValue(value,key))).join(',')+'}';
}
export const stableEvaluationData=value=>serialize(normalize(value))+'\n';
export const digestEvaluationData=value=>crypto.createHash('sha256').update(stableEvaluationData(value),'utf8').digest('hex');
const text=(value)=>typeof value==='string'&&value.length>0;
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const compareText=(left,right)=>left<right?-1:left>right?1:0;
const schemaMaterialDigest=schema=>digestEvaluationData(object([['schema_context_ref',schema.schema_context_ref],['version',schema.version],['source_ref',schema.source_ref],['applicable_from_ordinal',schema.applicable_from_ordinal],['applicable_through_ordinal',schema.applicable_through_ordinal]]));
const onlyKeys=(value,allowed)=>dataObject(value)&&Reflect.ownKeys(value).every(key=>typeof key==='string'&&allowed.includes(key));
const checkKeys=(value,allowed)=>{if(dataObject(value)&&!onlyKeys(value,allowed))fail('UNKNOWN_E_MINUS_INPUT_FIELD');};
const eachRecord=(value,visit)=>{if(Array.isArray(value))for(const item of value)if(dataObject(item))visit(item);};
function assertProfileKeys(input){
 checkKeys(input,['profile_version','evaluation_ref','observation_ref','expectation_ref','expectation_version','scope_ref','scope_version','snapshot','prior_snapshots','expectations','provenance_artifacts','scopes','procedures','schema_history']);
 const snapshot=ownValue(input,'snapshot');checkKeys(snapshot,['snapshot_ref','version','predecessor_snapshot_refs','sources']);
 eachRecord(ownValue(snapshot,'predecessor_snapshot_refs'),ref=>checkKeys(ref,['snapshot_ref','version','digest']));
 eachRecord(ownValue(snapshot,'sources'),source=>{checkKeys(source,['source_ref','complete_through_ordinal','records']);eachRecord(ownValue(source,'records'),record=>checkKeys(record,['identity','ordinal','subject_ref','fields']));});
 eachRecord(ownValue(input,'prior_snapshots'),prior=>{checkKeys(prior,['snapshot_ref','version','digest','expectation_records']);eachRecord(ownValue(prior,'expectation_records'),record=>{checkKeys(record,['expectation_ref','expectation_version','record_position','provenance_ref','provenance_version']);checkKeys(ownValue(record,'record_position'),['source_ref','ordinal']);});});
 eachRecord(ownValue(input,'expectations'),item=>{checkKeys(item,['expectation_ref','version','referenceable','registered_snapshot_ref','registered_snapshot_version','record_position','provenance_ref','provenance_version','temporal_applicability','due']);checkKeys(ownValue(item,'record_position'),['source_ref','ordinal']);checkKeys(ownValue(item,'temporal_applicability'),['source_ref','from_ordinal','through_ordinal']);checkKeys(ownValue(item,'due'),['kind','source_ref','ordinal']);});
 eachRecord(ownValue(input,'provenance_artifacts'),item=>checkKeys(item,['provenance_ref','version','digest']));
 eachRecord(ownValue(input,'scopes'),item=>{checkKeys(item,['scope_ref','version','sources','subject_ref','filters','procedure_ref','procedure_version','schema_ref','schema_version','schema_context_refs']);eachRecord(ownValue(item,'sources'),source=>{checkKeys(source,['source_ref','window','cutoff_ordinal']);checkKeys(ownValue(source,'window'),['from_ordinal','through_ordinal']);});});
 eachRecord(ownValue(input,'procedures'),item=>checkKeys(item,['procedure_ref','version','kind']));
 eachRecord(ownValue(input,'schema_history'),item=>checkKeys(item,['schema_context_ref','version','source_ref','applicable_from_ordinal','applicable_through_ordinal','digest']));
}
const exact=(registry,key,ref,version,codes)=>{if(!Array.isArray(registry)||registry.some(item=>!dataObject(item)||!text(ownValue(item,key))||!text(ownValue(item,'version'))))return object([['ok',false],['code',codes.invalid]]);const referenced=registry.filter(item=>ownValue(item,key)===ref);if(!referenced.length)return object([['ok',false],['code',codes.missing]]);const versioned=referenced.filter(item=>ownValue(item,'version')===version);if(!versioned.length)return object([['ok',false],['code',codes.version]]);if(versioned.length!==1)return object([['ok',false],['code',codes.ambiguous]]);return object([['ok',true],['value',versioned[0]]]);};
const indeterminate=(code,base=[])=>freeze(object([...base,['status','INDETERMINATE'],['code',code],['qualified_absence',false],['candidate',null]]));

function evaluateSafe(input){
 assertProfileKeys(input);
 const base=[['profile_version',E_MINUS_PROFILE_VERSION],['evaluation_ref',ownValue(input,'evaluation_ref',null)],['observation_ref',ownValue(input,'observation_ref',null)]];
 if(ownValue(input,'profile_version')!==E_MINUS_PROFILE_VERSION||!text(ownValue(input,'evaluation_ref'))||!text(ownValue(input,'observation_ref')))return indeterminate('EVALUATION_IDENTITY_INCOMPLETE',base);
 const expectationRef=ownValue(input,'expectation_ref'),expectationVersion=ownValue(input,'expectation_version');
 if(!text(expectationRef)||!text(expectationVersion))return indeterminate('EXPECTATION_REFERENCE_INCOMPLETE',base);
 const expectationResolution=exact(ownValue(input,'expectations'),'expectation_ref',expectationRef,expectationVersion,{invalid:'EXPECTATION_REGISTRY_INVALID',missing:'EXPECTATION_NOT_FOUND',version:'EXPECTATION_VERSION_NOT_FOUND',ambiguous:'EXPECTATION_VERSION_AMBIGUOUS'});
 if(!expectationResolution.ok)return indeterminate(expectationResolution.code,base);const expectation=expectationResolution.value;
 if(ownValue(expectation,'referenceable')!==true)return indeterminate('EXPECTATION_UNRESOLVED',base);
 const snapshot=ownValue(input,'snapshot');
 if(!dataObject(snapshot)||!text(ownValue(snapshot,'snapshot_ref'))||!text(ownValue(snapshot,'version'))||!Array.isArray(ownValue(snapshot,'predecessor_snapshot_refs'))||!snapshot.predecessor_snapshot_refs.every(ref=>dataObject(ref)&&text(ownValue(ref,'snapshot_ref'))&&text(ownValue(ref,'version'))&&text(ownValue(ref,'digest')))||!Array.isArray(ownValue(snapshot,'sources'))||!snapshot.sources.every(source=>dataObject(source)&&text(ownValue(source,'source_ref'))))return indeterminate('SNAPSHOT_INCOMPLETE',base);
 const registeredSnapshot=ownValue(expectation,'registered_snapshot_ref'),registeredSnapshotVersion=ownValue(expectation,'registered_snapshot_version');
 if(!text(registeredSnapshot)||!text(registeredSnapshotVersion))return indeterminate('EXPECTATION_VERSION_NOT_PRIOR_TO_OBSERVATION',base);
 const priorResolution=exact(ownValue(input,'prior_snapshots'),'snapshot_ref',registeredSnapshot,registeredSnapshotVersion,{invalid:'PRIOR_SNAPSHOT_REGISTRY_INVALID',missing:'PRIOR_SNAPSHOT_NOT_FOUND',version:'PRIOR_SNAPSHOT_VERSION_MISMATCH',ambiguous:'PRIOR_SNAPSHOT_AMBIGUOUS'});if(!priorResolution.ok)return indeterminate(priorResolution.code,base);const priorSnapshot=priorResolution.value;
 if(!text(ownValue(priorSnapshot,'digest'))||!Array.isArray(ownValue(priorSnapshot,'expectation_records'))||priorSnapshot.expectation_records.some(record=>!dataObject(record)||!text(ownValue(record,'expectation_ref'))||!text(ownValue(record,'expectation_version'))||!dataObject(ownValue(record,'record_position'))||!text(ownValue(record.record_position,'source_ref'))||!integer(ownValue(record.record_position,'ordinal'))||!text(ownValue(record,'provenance_ref'))||!text(ownValue(record,'provenance_version'))))return indeterminate('PRIOR_SNAPSHOT_INCOMPLETE',base);
 const priorSnapshotMaterial=object([['snapshot_ref',priorSnapshot.snapshot_ref],['version',priorSnapshot.version],['expectation_records',priorSnapshot.expectation_records]]),computedPriorSnapshotDigest=digestEvaluationData(priorSnapshotMaterial);if(priorSnapshot.digest!==computedPriorSnapshotDigest)return indeterminate('PRIOR_SNAPSHOT_DIGEST_MISMATCH',base);
 const predecessorRefs=snapshot.predecessor_snapshot_refs.filter(ref=>ref?.snapshot_ref===priorSnapshot.snapshot_ref&&ref?.version===priorSnapshot.version&&ref?.digest===priorSnapshot.digest);if(predecessorRefs.length!==1)return indeterminate('PRIOR_SNAPSHOT_REFERENCE_MISMATCH',base);
 const position=ownValue(expectation,'record_position');
 if(!position||!text(ownValue(position,'source_ref'))||!integer(ownValue(position,'ordinal')))return indeterminate('EXPECTATION_QUALIFICATION_INCOMPLETE',base);
 const provenanceRef=ownValue(expectation,'provenance_ref'),provenanceVersion=ownValue(expectation,'provenance_version');
 const provenanceResolution=exact(ownValue(input,'provenance_artifacts'),'provenance_ref',provenanceRef,provenanceVersion,{invalid:'PROVENANCE_REGISTRY_INVALID',missing:'PROVENANCE_NOT_FOUND',version:'PROVENANCE_VERSION_MISMATCH',ambiguous:'PROVENANCE_AMBIGUOUS'});
 if(!provenanceResolution.ok||!text(ownValue(provenanceResolution.value,'digest')))return indeterminate(provenanceResolution.ok?'PROVENANCE_INCOMPLETE':provenanceResolution.code,base);
 const priorExpectationRecords=priorSnapshot.expectation_records.filter(record=>record.expectation_ref===expectation.expectation_ref&&record.expectation_version===expectation.version&&serialize(record.record_position)===serialize(position)&&record.provenance_ref===expectation.provenance_ref&&record.provenance_version===expectation.provenance_version);if(priorExpectationRecords.length!==1)return indeterminate(priorExpectationRecords.length?'PRIOR_EXPECTATION_AMBIGUOUS':'PRIOR_EXPECTATION_NOT_FOUND',base);
 const temporal=ownValue(expectation,'temporal_applicability'),due=ownValue(expectation,'due');
 if(!temporal||!text(ownValue(temporal,'source_ref'))||!integer(ownValue(temporal,'from_ordinal'))||!integer(ownValue(temporal,'through_ordinal'))||temporal.from_ordinal>temporal.through_ordinal||!due||ownValue(due,'kind')!=='SOURCE_LOCAL_ORDINAL_AT_LEAST_V1'||!text(ownValue(due,'source_ref'))||!integer(ownValue(due,'ordinal'))||due.source_ref!==temporal.source_ref||due.ordinal<temporal.from_ordinal||due.ordinal>temporal.through_ordinal)return indeterminate('EXPECTATION_QUALIFICATION_INCOMPLETE',base);
 const scopeRef=ownValue(input,'scope_ref'),scopeVersion=ownValue(input,'scope_version');
 const scopeResolution=exact(ownValue(input,'scopes'),'scope_ref',scopeRef,scopeVersion,{invalid:'SCOPE_REGISTRY_INVALID',missing:'SCOPE_NOT_FOUND',version:'SCOPE_VERSION_MISMATCH',ambiguous:'SCOPE_AMBIGUOUS'});
 if(!scopeResolution.ok)return indeterminate(scopeResolution.code,base);const scope=scopeResolution.value;
 const filters=ownValue(scope,'filters'),schemaContextRefs=ownValue(scope,'schema_context_refs');
 if(!text(ownValue(scope,'subject_ref'))||filters===undefined||filters===null||Array.isArray(filters)||!Array.isArray(ownValue(scope,'sources'))||!scope.sources.length||scope.sources.some(source=>!dataObject(source))||!text(ownValue(scope,'procedure_ref'))||!text(ownValue(scope,'procedure_version'))||!text(ownValue(scope,'schema_ref'))||!text(ownValue(scope,'schema_version'))||!Array.isArray(schemaContextRefs)||!schemaContextRefs.length||schemaContextRefs.some(ref=>!text(ref))||new Set(schemaContextRefs).size!==schemaContextRefs.length||schemaContextRefs.filter(ref=>ref===scope.schema_ref).length!==1)return indeterminate('SCOPE_INCOMPLETE',base);
 if(!dataObject(filters))return indeterminate('SCOPE_FILTERS_UNSUPPORTED',base);
 const filterDescriptors=Reflect.ownKeys(filters);if(filterDescriptors.some(key=>typeof key==='symbol'||!text(key)||!['string','number','boolean'].includes(typeof ownValue(filters,key))))return indeterminate('SCOPE_FILTERS_UNSUPPORTED',base);
 const sourceRefs=scope.sources.map(item=>ownValue(item,'source_ref'));
 if(sourceRefs.some(ref=>!text(ref))||new Set(sourceRefs).size!==sourceRefs.length)return indeterminate('SCOPE_SOURCES_INVALID',base);
 for(const sourceScope of scope.sources){const window=ownValue(sourceScope,'window'),cutoff=ownValue(sourceScope,'cutoff_ordinal');if(!window||!integer(ownValue(window,'from_ordinal'))||!integer(ownValue(window,'through_ordinal'))||window.from_ordinal>window.through_ordinal||!integer(cutoff)||cutoff<window.from_ordinal||cutoff>window.through_ordinal)return indeterminate('SCOPE_INCOMPLETE',base);}
 const procedureResolution=exact(ownValue(input,'procedures'),'procedure_ref',scope.procedure_ref,scope.procedure_version,{invalid:'PROCEDURE_REGISTRY_INVALID',missing:'PROCEDURE_NOT_FOUND',version:'PROCEDURE_VERSION_MISMATCH',ambiguous:'PROCEDURE_VERSION_AMBIGUOUS'});
 if(!procedureResolution.ok)return indeterminate(procedureResolution.code,base);const procedure=procedureResolution.value;
 if(ownValue(procedure,'kind')!=='EXACT_SUBJECT_AND_FILTERS_V1')return indeterminate('PROCEDURE_UNSUPPORTED',base);
 const schemaRegistry=ownValue(input,'schema_history');if(!Array.isArray(schemaRegistry)||schemaRegistry.some(schema=>!dataObject(schema)))return indeterminate('SCHEMA_REGISTRY_INVALID',base);const effectiveSchemas=[];
 for(const schema of schemaRegistry){
  const schemaContextRef=ownValue(schema,'schema_context_ref'),schemaSourceRef=ownValue(schema,'source_ref');if(!text(schemaContextRef)||!text(schemaSourceRef))return indeterminate('SCHEMA_CONTEXT_MATERIAL_INVALID',base);const sourceScope=scope.sources.find(item=>item.source_ref===schemaSourceRef);if(!sourceScope)continue;const from=ownValue(schema,'applicable_from_ordinal'),through=ownValue(schema,'applicable_through_ordinal'),fromComparable=typeof from==='number'&&Number.isFinite(from),throughComparable=typeof through==='number'&&Number.isFinite(through);
  if(fromComparable&&from>sourceScope.cutoff_ordinal)continue;
  if(throughComparable&&through<sourceScope.window.from_ordinal)continue;
  if(!fromComparable||!throughComparable||!integer(from)||!integer(through)||from>through)return indeterminate('SCHEMA_CONTEXT_TEMPORAL_INDETERMINATE',base);
  if(!text(ownValue(schema,'version'))||!text(ownValue(schema,'digest'))||schema.digest!==schemaMaterialDigest(schema))return indeterminate('SCHEMA_CONTEXT_MATERIAL_INVALID',base);if(!schemaContextRefs.includes(schemaContextRef))continue;effectiveSchemas.push(schema);
 }
 effectiveSchemas.sort((a,b)=>sourceRefs.indexOf(a.source_ref)-sourceRefs.indexOf(b.source_ref)||a.applicable_from_ordinal-b.applicable_from_ordinal||a.applicable_through_ordinal-b.applicable_through_ordinal||compareText(a.schema_context_ref,b.schema_context_ref)||compareText(a.version,b.version));
 const rootSchemaResolution=exact(effectiveSchemas,'schema_context_ref',scope.schema_ref,scope.schema_version,{invalid:'SCHEMA_REGISTRY_INVALID',missing:'SCHEMA_ROOT_NOT_FOUND',version:'SCHEMA_ROOT_VERSION_MISMATCH',ambiguous:'SCHEMA_ROOT_AMBIGUOUS'});if(!rootSchemaResolution.ok||!text(ownValue(rootSchemaResolution.value,'digest')))return indeterminate(rootSchemaResolution.ok?'SCHEMA_ROOT_INCOMPLETE':rootSchemaResolution.code,base);if(rootSchemaResolution.value.digest!==schemaMaterialDigest(rootSchemaResolution.value))return indeterminate('SCHEMA_ROOT_DIGEST_MISMATCH',base);
 const dueSourceScope=scope.sources.find(item=>item.source_ref===due.source_ref),dueSnapshotSources=snapshot.sources.filter(item=>item?.source_ref===due.source_ref);
 if(!dueSourceScope||dueSnapshotSources.length!==1)return indeterminate('DUE_SOURCE_INDETERMINATE',base);
 const dueCutoff=ownValue(dueSourceScope,'cutoff_ordinal');
 if(!integer(dueCutoff))return indeterminate('DUE_SOURCE_INDETERMINATE',base);
 if(dueCutoff<due.ordinal)return freeze(object([...base,['status','NOT_DUE'],['code','EXPECTATION_NOT_DUE'],['qualified_absence',false],['candidate',null]]));
 if(dueCutoff<temporal.from_ordinal||dueCutoff>temporal.through_ordinal)return indeterminate('EXPECTATION_NOT_APPLICABLE_AT_CUTOFF',base);
 const inspected=[],considered=[],matches=[],schemaBindings=[],cutoffs=[],effectiveSources=[];
 for(const sourceScope of scope.sources){
  const sourceRef=sourceScope.source_ref,window=ownValue(sourceScope,'window'),cutoff=ownValue(sourceScope,'cutoff_ordinal');
  const sources=snapshot.sources.filter(item=>item.source_ref===sourceRef);if(sources.length!==1)return indeterminate(sources.length?'SOURCE_AMBIGUOUS':'SOURCE_NOT_FOUND',base);const source=sources[0];
  if(!integer(ownValue(source,'complete_through_ordinal'))||source.complete_through_ordinal<cutoff||!Array.isArray(ownValue(source,'records')))return indeterminate('SOURCE_INCOMPLETE',base);
  const consulted=[];for(const record of source.records){const ordinal=ownValue(record,'ordinal');if(typeof ordinal!=='number'||!Number.isFinite(ordinal))return indeterminate('SOURCE_RECORD_ORDINAL_INDETERMINATE',base);if(ordinal<window.from_ordinal||ordinal>cutoff)continue;if(!integer(ordinal))return indeterminate('SOURCE_RECORD_ORDINAL_INDETERMINATE',base);consulted.push(record);}consulted.sort((a,b)=>a.ordinal-b.ordinal);
  const identities=new Set(),ordinals=new Set();for(const record of consulted){if(!text(ownValue(record,'identity'))||identities.has(record.identity)||ordinals.has(record.ordinal))return indeterminate('SOURCE_RECORD_IDENTITY_UNSTABLE',base);identities.add(record.identity);ordinals.add(record.ordinal);}
  const sourceSchemas=effectiveSchemas.filter(schema=>schema.source_ref===sourceRef);
  const coveringSchemas=sourceSchemas.filter(schema=>schema.applicable_from_ordinal<=window.from_ordinal&&schema.applicable_through_ordinal>=cutoff);
  if(coveringSchemas.length!==1)return indeterminate(coveringSchemas.length?'SCHEMA_CONTEXT_AMBIGUOUS':'SCHEMA_CONTEXT_INAPPLICABLE',base);
  for(const record of consulted){
   const fields=ownValue(record,'fields');if(!text(ownValue(record,'subject_ref'))||!dataObject(fields))return indeterminate('SOURCE_RECORD_INCOMPLETE',base);const recordDigest=digestEvaluationData(record),recordBinding=object([['source_ref',sourceRef],['identity',record.identity],['ordinal',record.ordinal],['record_digest',recordDigest]]);inspected.push(recordBinding);considered.push(recordBinding);
   const applicable=sourceSchemas.filter(schema=>schema.applicable_from_ordinal<=record.ordinal&&schema.applicable_through_ordinal>=record.ordinal);
   if(applicable.length!==1)return indeterminate(applicable.length?'SCHEMA_CONTEXT_AMBIGUOUS':'SCHEMA_CONTEXT_MISSING',base);
   const schema=applicable[0];schemaBindings.push(object([['source_ref',sourceRef],['identity',record.identity],['schema_context_ref',schema.schema_context_ref],['schema_version',schema.version],['schema_digest',schema.digest]]));
   if(record.subject_ref===scope.subject_ref&&filterDescriptors.every(key=>hasOwn(fields,key)&&ownValue(fields,key)===ownValue(scope.filters,key)))matches.push(object([['source_ref',sourceRef],['identity',record.identity],['ordinal',record.ordinal],['record_digest',recordDigest]]));
  }
  cutoffs.push(object([['source_ref',sourceRef],['cutoff_ordinal',cutoff]]));
  effectiveSources.push(object([['source_ref',sourceRef],['window',object([['from_ordinal',window.from_ordinal],['through_ordinal',window.through_ordinal]])],['cutoff_ordinal',cutoff],['complete_through_cutoff',true],['records',consulted]]));
 }
 const effectiveSnapshot=object([['snapshot_ref',snapshot.snapshot_ref],['version',snapshot.version],['predecessor_snapshot_ref',object([['snapshot_ref',priorSnapshot.snapshot_ref],['version',priorSnapshot.version],['digest',priorSnapshot.digest]])],['sources',effectiveSources]]),priorExpectationBinding=object([['snapshot_ref',priorSnapshot.snapshot_ref],['version',priorSnapshot.version],['digest',priorSnapshot.digest],['expectation_record',priorExpectationRecords[0]]]);
 const expectationDigest=digestEvaluationData(expectation),priorExpectationDigest=digestEvaluationData(priorExpectationBinding),provenanceDigest=digestEvaluationData(provenanceResolution.value),scopeDigest=digestEvaluationData(scope),procedureDigest=digestEvaluationData(procedure),effectiveSnapshotDigest=digestEvaluationData(effectiveSnapshot),effectiveSchemasDigest=digestEvaluationData(effectiveSchemas),inspectedDigest=digestEvaluationData(inspected),consideredDigest=digestEvaluationData(considered),matchesDigest=digestEvaluationData(matches),cutoffsDigest=digestEvaluationData(cutoffs);
 const status=matches.length?'PRESENT':'ABSENT',code=matches.length?'MATCH_PRESENT':'QUALIFIED_ABSENCE_PREPARED';
 const observation=object([['observation_ref',input.observation_ref],['evaluation_ref',input.evaluation_ref],['status',status],['due_status','DUE'],['schema_ref',scope.schema_ref],['schema_version',scope.schema_version],['cutoffs',cutoffs],['inspected_records',inspected],['considered_records',considered],['matches',matches],['schema_bindings',schemaBindings],['component_digests',object([['expectation',expectationDigest],['prior_expectation',priorExpectationDigest],['provenance',provenanceDigest],['scope',scopeDigest],['procedure',procedureDigest],['effective_snapshot',effectiveSnapshotDigest],['effective_schemas',effectiveSchemasDigest],['inspected_records',inspectedDigest],['considered_records',consideredDigest],['matches',matchesDigest],['cutoffs',cutoffsDigest]])]]);
 const observationDigest=digestEvaluationData(observation),proofRef=`${input.evaluation_ref}:proof:v1`,proofBase=object([['proof_ref',proofRef],['profile_version',E_MINUS_PROFILE_VERSION],['evaluation_ref',input.evaluation_ref],['observation_ref',input.observation_ref],['status',status],['schema_ref',scope.schema_ref],['schema_version',scope.schema_version],['observation_digest',observationDigest],['component_digests',observation.component_digests],['cutoffs',cutoffs],['inspected_records',inspected],['considered_records',considered],['matches',matches],['schema_bindings',schemaBindings]]),replayDigest=digestEvaluationData(proofBase);
 const proof=object([...Object.entries(proofBase),['replay_digest',replayDigest]]);
 let candidate=null;
 if(status==='ABSENT')candidate=object([['event_type','OMISSION_DETECTED'],['evaluation_ref',input.evaluation_ref],['proof_ref',proofRef],['expectation_ref',expectation.expectation_ref],['expectation_version',expectation.version],['scope_ref',scope.scope_ref],['scope_version',scope.version],['procedure_ref',scope.procedure_ref],['procedure_version',scope.procedure_version],['schema_ref',scope.schema_ref],['schema_context_refs',[...scope.schema_context_refs]],['observation_ref',input.observation_ref],['evidence_refs',[object([['evidence_ref',input.observation_ref],['version','v1'],['digest',observationDigest]])]],['assertion_boundary',object([['scope_ref',scope.scope_ref],['cutoffs',cutoffs]])],['replay_digest',replayDigest]]);
 return freeze(object([...base,['status',status],['code',code],['qualified_absence',status==='ABSENT'],['observation',observation],['proof',proof],['candidate',candidate]]));
}

export function evaluateConstitutiveEMinus(input){const safe=normalize(input);return evaluateSafe(safe);}
export function replayConstitutiveEMinus(input,expectedReplayDigest){const safeExpected=normalize(expectedReplayDigest),expected=typeof safeExpected==='string'&&/^[a-f0-9]{64}$/.test(safeExpected)?safeExpected:null,result=evaluateConstitutiveEMinus(input),actual=ownValue(ownValue(result,'proof',Object.create(null)),'replay_digest',null);return freeze(object([['matches',expected!==null&&actual===expected],['expected_replay_digest',expected],['actual_replay_digest',actual],['result',result]]));}
