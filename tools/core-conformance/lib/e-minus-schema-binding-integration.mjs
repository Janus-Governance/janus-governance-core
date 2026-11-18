import fs from 'node:fs';
import { types } from 'node:util';
import { fileURLToPath } from 'node:url';
import { loadConformanceProfileSchemaBindings } from './schema-content-binding.mjs';
import { E_MINUS_PROFILE_VERSION,digestEvaluationData,evaluateConstitutiveEMinus,replayConstitutiveEMinus } from './e-minus-evaluator.mjs';

export const E_MINUS_SCHEMA_BINDING_INTEGRATION_VERSION='E_MINUS_SCHEMA_BINDING_INTEGRATION_V1';
export const E_MINUS_SCHEMA_APPLICABILITY_VERSION='E_MINUS_SCHEMA_APPLICABILITY_TEST_PROFILE_V1';
const authoritativeDomain='CONFORMANCE_PROFILE_SCHEMA_BINDING';
const expectationId='https://janus.invalid/conformance/core-lite-v0.2/expectation.schema.json';
const searchScopeId='https://janus.invalid/conformance/core-lite-v0.2/search-scope.schema.json';
const profileDefsId='https://janus.invalid/conformance/core-lite-v0.2/profile-defs.schema.json';
const expectedInventory=new Map([
 ['https://janus.invalid/conformance/core-lite-v0.2/audit-event.schema.json','STRUCTURAL_PROFILE'],
 [expectationId,'PROJECTION_ONLY'],
 ['https://janus.invalid/conformance/core-lite-v0.2/human-decision.schema.json','STRUCTURAL_PROFILE'],
 ['https://janus.invalid/conformance/core-lite-v0.2/omission-detected.schema.json','STRUCTURAL_PROFILE'],
 [profileDefsId,'STRUCTURAL_PROFILE'],
 [searchScopeId,'PROJECTION_ONLY']
]);
const mappingPolicy=new Map([['EXPECTATION',expectationId],['SEARCH_SCOPE',searchScopeId]]);
const inputKeys=['profile_version','evaluation','applicability_contexts','projection_mappings'];
const evaluationKeys=['profile_version','evaluation_ref','observation_ref','expectation_ref','expectation_version','scope_ref','scope_version','snapshot','prior_snapshots','expectations','provenance_artifacts','scopes','procedures'];
const scopeKeys=['scope_ref','version','sources','subject_ref','filters','procedure_ref','procedure_version'];
const contextKeys=['schema_context_ref','source_ref','applicable_from_ordinal','applicable_through_ordinal'];
const mappingKeys=['purpose','schema_id'];
const forbiddenKeys=new Set(['schemas','schema_history','validator','authority','authoritative','binding_domain','canonical_output','canonical_sha256','outcome','replay','due_status_determinable','reproducible','covers_considered_records']);
const claimBoundary='PREPARATORY_PROJECTION_BINDING_AND_E_MINUS_EVALUATION_NOT_CONFORMANCE_NOT_D076_SCHEMA_LOG_CONTENT_VALIDATION';

class IntegrationError extends Error{constructor(code){super(code);this.name='IntegrationError';this.code=code;}}
const fail=code=>{throw new IntegrationError(code);};
const descriptorValue=(descriptor,key)=>Object.getOwnPropertyDescriptor(descriptor,key)?.value;
const dataObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.length>0;
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const exactKeys=(value,keys,code)=>{if(!dataObject(value)||JSON.stringify(Object.keys(value).sort())!==JSON.stringify([...keys].sort()))fail(code);};

function normalize(value,seen=new Set()){
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(Number.isFinite(value)&&!Object.is(value,-0))return value;fail('HOSTILE_INPUT');}
 if(typeof value!=='object'||types.isProxy(value))fail('HOSTILE_INPUT');
 if(seen.has(value))fail('HOSTILE_INPUT');seen.add(value);
 const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
 if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)fail('HOSTILE_INPUT');
 const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors),copy=array?new Array(value.length):Object.create(null);
 for(const key of keys){
  if(array&&key==='length')continue;
  if(typeof key==='symbol'||forbiddenKeys.has(key))fail(forbiddenKeys.has(key)?'CALLER_GOVERNED_FIELD_REJECTED':'HOSTILE_INPUT');
  const descriptor=descriptorValue(descriptors,key);
  if(!descriptor||!Object.hasOwn(descriptor,'value')||Object.hasOwn(descriptor,'get')||Object.hasOwn(descriptor,'set')||descriptor.enumerable!==true)fail('HOSTILE_INPUT');
  if(array&&(!/^(0|[1-9]\d*)$/.test(key)||Number(key)>=value.length))fail('HOSTILE_INPUT');
  Object.defineProperty(copy,key,{value:normalize(descriptor.value,seen),enumerable:true,writable:true,configurable:true});
 }
 if(array&&Object.keys(descriptors).filter(key=>key!=='length').length!==value.length)fail('HOSTILE_INPUT');
 seen.delete(value);return copy;
}
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if(Object.hasOwn(descriptor,'value'))freeze(descriptor.value);Object.freeze(value);}return value;}
const object=entries=>Object.fromEntries(entries);
function failure(code){return freeze(object([['profile_version',E_MINUS_SCHEMA_BINDING_INTEGRATION_VERSION],['status','INDETERMINATE'],['code',code],['qualified_absence',false],['candidate',null],['claim_boundary',claimBoundary]]));}

function validateEnvelope(envelope){
 if(!dataObject(envelope)||envelope.authoritative!==true||envelope.binding_domain!==authoritativeDomain||!text(envelope.manifest_schema_version)||!text(envelope.canonical_sha256)||!Array.isArray(envelope.schemas)||envelope.schemas.length!==expectedInventory.size)fail('BINDING_ENVELOPE_NOT_AUTHORITATIVE');
 const byId=new Map();for(const schema of envelope.schemas){if(!dataObject(schema)||!text(schema.schema_id)||byId.has(schema.schema_id)||expectedInventory.get(schema.schema_id)!==schema.role||!text(schema.digest)||!text(schema.path)||!dataObject(schema.schema))fail('BINDING_INVENTORY_MISMATCH');byId.set(schema.schema_id,schema);}
 if([...expectedInventory.keys()].some(id=>!byId.has(id)))fail('BINDING_INVENTORY_MISMATCH');
 return{byId,dependency:byId.get(profileDefsId)};
}
function projectionBindings(input,envelope,inventory){
 if(!Array.isArray(input.projection_mappings)||input.projection_mappings.length!==2)fail('PROJECTION_MAPPING_CARDINALITY');
 const mappings=new Map();for(const mapping of input.projection_mappings){exactKeys(mapping,mappingKeys,'PROJECTION_MAPPING_FIELDS');if(!text(mapping.purpose)||!text(mapping.schema_id)||mappings.has(mapping.purpose)||!mappingPolicy.has(mapping.purpose))fail('PROJECTION_MAPPING_AMBIGUOUS');if(mappingPolicy.get(mapping.purpose)!==mapping.schema_id)fail('PROJECTION_MAPPING_POLICY');mappings.set(mapping.purpose,mapping.schema_id);}
 if([...mappingPolicy.keys()].some(purpose=>!mappings.has(purpose)))fail('PROJECTION_MAPPING_INCOMPLETE');
 return[...mappingPolicy.keys()].map(purpose=>{const schema=inventory.byId.get(mappings.get(purpose));if(schema.role!=='PROJECTION_ONLY')fail('PROJECTION_ROLE_MISMATCH');return object([['purpose',purpose],['schema_id',schema.schema_id],['schema_path',schema.path],['schema_role',schema.role],['schema_content_sha256',schema.digest],['schema_size_bytes',schema.size_bytes],['governed_envelope_sha256',envelope.canonical_sha256],['dependency_schema_id',inventory.dependency.schema_id],['dependency_content_sha256',inventory.dependency.digest]]);});
}
function evaluatorInput(input){
 exactKeys(input,inputKeys,'INTEGRATION_INPUT_FIELDS');exactKeys(input.evaluation,evaluationKeys,'EVALUATION_INPUT_FIELDS');
 if(input.profile_version!==E_MINUS_SCHEMA_BINDING_INTEGRATION_VERSION||input.evaluation.profile_version!==E_MINUS_PROFILE_VERSION)fail('PROFILE_VERSION_MISMATCH');
 if(!Array.isArray(input.applicability_contexts)||input.applicability_contexts.length!==1)fail('APPLICABILITY_CONTEXT_CARDINALITY');
 const applicability=input.applicability_contexts[0];exactKeys(applicability,contextKeys,'APPLICABILITY_CONTEXT_FIELDS');
 if(!text(applicability.schema_context_ref)||!text(applicability.source_ref)||!integer(applicability.applicable_from_ordinal)||!integer(applicability.applicable_through_ordinal)||applicability.applicable_from_ordinal>applicability.applicable_through_ordinal)fail('APPLICABILITY_CONTEXT_INVALID');
 if(!Array.isArray(input.evaluation.scopes))fail('SCOPE_REGISTRY_INVALID');for(const scope of input.evaluation.scopes)exactKeys(scope,scopeKeys,'CALLER_SCOPE_FIELDS');
 const targets=input.evaluation.scopes.filter(scope=>scope.scope_ref===input.evaluation.scope_ref&&scope.version===input.evaluation.scope_version);if(targets.length!==1)fail('SCOPE_TARGET_AMBIGUOUS');
 const scope=targets[0];if(!Array.isArray(scope.sources)||scope.sources.filter(source=>source?.source_ref===applicability.source_ref).length!==1)fail('APPLICABILITY_SOURCE_MISMATCH');
 const material=object([['schema_context_ref',applicability.schema_context_ref],['version',E_MINUS_SCHEMA_APPLICABILITY_VERSION],['source_ref',applicability.source_ref],['applicable_from_ordinal',applicability.applicable_from_ordinal],['applicable_through_ordinal',applicability.applicable_through_ordinal]]),digest=digestEvaluationData(material),schemaHistory=object([...Object.entries(material),['digest',digest]]);
 const evaluation=structuredClone(input.evaluation),target=evaluation.scopes.find(item=>item.scope_ref===evaluation.scope_ref&&item.version===evaluation.scope_version);target.schema_ref=applicability.schema_context_ref;target.schema_version=E_MINUS_SCHEMA_APPLICABILITY_VERSION;target.schema_context_refs=[applicability.schema_context_ref];evaluation.schema_history=[schemaHistory];
 return{evaluation,applicability:object([['schema_context_ref',applicability.schema_context_ref],['schema_context_version',E_MINUS_SCHEMA_APPLICABILITY_VERSION],['source_ref',applicability.source_ref],['applicable_from_ordinal',applicability.applicable_from_ordinal],['applicable_through_ordinal',applicability.applicable_through_ordinal],['applicability_material_sha256',digest]])};
}
function complete(envelope,projections,applicability,evaluation,replay){
 const safeCandidate=evaluation.status==='ABSENT'&&evaluation.qualified_absence===true&&replay.matches===true?evaluation.candidate:null;
 if(evaluation.status==='ABSENT'&&safeCandidate===null)return failure('EVALUATOR_REPLAY_MISMATCH');
 const base=object([['profile_version',E_MINUS_SCHEMA_BINDING_INTEGRATION_VERSION],['status',evaluation.status],['code',evaluation.code],['qualified_absence',safeCandidate!==null],['candidate',safeCandidate],['claim_boundary',claimBoundary],['governed_binding',object([['binding_domain',envelope.binding_domain],['manifest_schema_version',envelope.manifest_schema_version],['canonical_sha256',envelope.canonical_sha256],['projection_bindings',projections]])],['schema_log_applicability',applicability],['evaluation',evaluation],['replay',replay]]),integrationDigest=digestEvaluationData(base);
 return freeze(object([...Object.entries(base),['integration_sha256',integrationDigest]]));
}

export function evaluateEMinusWithGovernedSchemaBinding(input){
 let envelope;try{envelope=loadConformanceProfileSchemaBindings();}catch{return failure('GOVERNED_BINDER_REJECTED');}
 try{
  const safe=normalize(input),inventory=validateEnvelope(envelope),projections=projectionBindings(safe,envelope,inventory),derived=evaluatorInput(safe),evaluation=evaluateConstitutiveEMinus(derived.evaluation);
  if(!['ABSENT','PRESENT'].includes(evaluation.status))return complete(envelope,projections,derived.applicability,evaluation,freeze(object([['matches',false],['expected_replay_digest',null],['actual_replay_digest',null],['result_status',evaluation.status]])));
  const expected=evaluation.proof?.replay_digest,replay=evaluation.proof?replayConstitutiveEMinus(derived.evaluation,expected):freeze(object([['matches',false],['expected_replay_digest',null],['actual_replay_digest',null],['result',evaluation]]));
  if(!replay.matches)return failure('EVALUATOR_REPLAY_MISMATCH');
  const replaySummary=freeze(object([['matches',true],['expected_replay_digest',replay.expected_replay_digest],['actual_replay_digest',replay.actual_replay_digest],['result_status',replay.result.status]]));return complete(envelope,projections,derived.applicability,evaluation,replaySummary);
 }catch(error){return failure(error instanceof IntegrationError?error.code:'INTEGRATION_COMPONENT_REJECTED');}
}

// This source-level invariant is tested without exposing an injectable authority path.
export const governedBinderInvocationCount=()=>{const source=fs.readFileSync(fileURLToPath(import.meta.url),'utf8');return(source.match(/envelope=loadConformanceProfileSchemaBindings\(\)/g)||[]).length;};
