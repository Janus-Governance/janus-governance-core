import crypto from 'node:crypto';
import { TextDecoder } from 'node:util';
import {
 projectionCoverageIds,
 statefulCoverageIds,
 statefulProjectionIds,
 structuralCoverageIds,
 validateMatrixAgainstCatalog
} from './contract.mjs';

const UTF8=new TextDecoder('utf-8',{fatal:true});
const SOURCE_IDENTITY_SHA256='a937a3e39ead4f6c55dd0b738239ae25ef700470ce7399f127f04ac3e406d593';
const PARTITION_SHA256='90d7fdeeadacac937e33a2ff739ca071f3cc96a6f4e8398972bf18ad2e0edbab';
const EVIDENCE_SHA256='40ff4e3bed941ad81ad4ae6d4c5395e8a41b35ec185b3a3221c9c9fd45378ca1';
const SNAPSHOT_SHA256={CATALOG:'40d8a01d8bd78b8140bac1c196952d7b7bd20f61883028ff03839c5bc49b8e99',MATRIX:'3c590ebcb0167f9701e9628fcad1649708f04056c41e79701d10d0c1b9d486aa',PROFILE:'14a3dacce40eae5293d37922ed0b13bb499ac0537179410d4cc290aa9572fe29',SCENARIO_MANIFEST:'87ac6a4b6fa66f2724cba102bf05fd12e8c83a62f7709c66b19888d2930ddd8e'};
const REF_FIELDS=['negative_fixture_refs','positive_fixture_refs','schema_refs','stateful_negative_scenario_refs','stateful_positive_scenario_refs','stateful_test_refs','test_refs'];
const PARTITION_NAMES=['CONSTITUTIVE_COMPLETE','FRAMEWORK_PROFILE_REQUIRED','HUMAN_AND_FRAMEWORK_PENDING','HUMAN_REVIEW_PENDING','NON_GATING_CAPABILITY','TECHNICAL_AND_HUMAN_REVIEW_PENDING','TECHNICAL_NONCONSTITUTIVE_PROJECTION','TECHNICAL_NOT_IMPLEMENTED'];
const DOCUMENTS=new WeakSet();
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const sortValue=value=>Array.isArray(value)?value.map(sortValue):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sortValue(value[key])])):value;
export const stableJson=value=>JSON.stringify(sortValue(value),null,2)+'\n';
const same=(left,right)=>stableJson(left)===stableJson(right);
const byteCompare=(left,right)=>Buffer.from(left).compare(Buffer.from(right));
const fail=code=>{throw new Gate2ControllerError(code);};

export class Gate2ControllerError extends Error {
 constructor(code){super(code);this.name='Gate2ControllerError';this.code=code;}
}

function parseDataBytes(value,label){
 if(typeof value!=='string'&&!ArrayBuffer.isView(value))fail(label+'_BYTES_REQUIRED');
 const byteLength=typeof value==='string'?Buffer.byteLength(value):value.byteLength;if(byteLength===0||byteLength>8*1024*1024)fail(label+'_SIZE');
 let text;try{text=typeof value==='string'?value:UTF8.decode(value);}catch{fail(label+'_UTF8');}
 if(!text.length||text.charCodeAt(0)===0xfeff)fail(label+'_JSON');
 let parsed;try{parsed=JSON.parse(text);}catch{fail(label+'_JSON');}assertDataBudget(parsed,label);return parsed;
}
function assertDataBudget(root,label){const stack=[[root,0]],seen=new Set();let nodes=0;while(stack.length){const[value,depth]=stack.pop();if(++nodes>100000||depth>64)fail(label+'_BUDGET');if(value===null||typeof value==='string'||typeof value==='boolean')continue;if(typeof value==='number'){if(!Number.isFinite(value))fail(label+'_DATA');continue;}if(typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype&&!Array.isArray(value)||seen.has(value))fail(label+'_DATA');seen.add(value);if(Array.isArray(value)){for(let index=0;index<value.length;index++){if(!Object.hasOwn(value,index))fail(label+'_DATA');stack.push([value[index],depth+1]);}}else for(const item of Object.values(value))stack.push([item,depth+1]);}}
function exactKeys(value,keys,code){if(!value||Array.isArray(value)||typeof value!=='object'||!same(Object.keys(value).sort(byteCompare),[...keys].sort(byteCompare)))fail(code);}
function sortedUniqueStrings(value,code){if(!Array.isArray(value)||value.some(item=>typeof item!=='string'||!item.length)||new Set(value).size!==value.length||!same(value,[...value].sort(byteCompare)))fail(code);return value;}
function uniqueStrings(value,code){if(!Array.isArray(value)||value.some(item=>typeof item!=='string'||!item.length)||new Set(value).size!==value.length)fail(code);return value;}
function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const item of Object.values(value))deepFreeze(item);Object.freeze(value);}return value;}
function coverageIds(catalog,marker){return catalog.requirements.filter(item=>item.coverage_markers.includes(marker)).map(item=>item.requirement_id).sort(byteCompare);}
function deriveSourceIdentity(catalog,manifest){
 const identity={
  all_requirement_ids:catalog.requirements.map(item=>item.requirement_id).sort(byteCompare),
  requirement_complete_ids:coverageIds(catalog,'REQUIREMENT_COMPLETE'),
  structural_complete_ids:coverageIds(catalog,'STRUCTURAL_SCHEMA_COVERED'),
  stateful_complete_ids:coverageIds(catalog,'STATEFUL_SCENARIO_COVERED'),
  schema_projection_ids:coverageIds(catalog,'PROJECTION_COVERED'),
  stateful_projection_ids:coverageIds(catalog,'STATEFUL_PROJECTION_COVERED'),
  scenario_ids:manifest.scenario_ids
 };
 return sha256(Buffer.from(JSON.stringify(identity),'utf8'));
}
function classify(item){
 const classes=new Set(item.verification_classes),markers=new Set(item.coverage_markers);
 if(classes.has('NON_GATING_CAPABILITY'))return'NON_GATING_CAPABILITY';
 if(markers.has('REQUIREMENT_COMPLETE'))return'CONSTITUTIVE_COMPLETE';
 if(classes.has('HUMAN_REVIEW')&&classes.has('FRAMEWORK_PROFILE_REQUIRED'))return'HUMAN_AND_FRAMEWORK_PENDING';
 if(classes.has('HUMAN_REVIEW')&&(classes.has('SCHEMA')||classes.has('STATEFUL')))return'TECHNICAL_AND_HUMAN_REVIEW_PENDING';
 if(classes.has('HUMAN_REVIEW'))return'HUMAN_REVIEW_PENDING';
 if(classes.has('FRAMEWORK_PROFILE_REQUIRED'))return'FRAMEWORK_PROFILE_REQUIRED';
 if(markers.has('PROJECTION_COVERED')||markers.has('STATEFUL_PROJECTION_COVERED'))return'TECHNICAL_NONCONSTITUTIVE_PROJECTION';
 return'TECHNICAL_NOT_IMPLEMENTED';
}
function validateCatalogShape(catalog){
 if(catalog.catalog_id!=='JN-CORE-LITE-0_2-REQUIREMENTS-001'||catalog.normative_source?.commit!=='8aae702a1bb11032f86a8a32e164e3a68fc961da'||catalog.normative_source?.sha256!=='709279f32abe18d792c68299b080c349e1ed0c45780775581aacf32484e78b0b'||catalog.atomic_requirement_count!==156||!Array.isArray(catalog.requirements)||catalog.requirements.length!==156)fail('CATALOG_IDENTITY');
 const ids=catalog.requirements.map(item=>item?.requirement_id);if(ids.some(id=>typeof id!=='string')||new Set(ids).size!==ids.length)fail('CATALOG_IDS');
 for(const item of catalog.requirements){
  for(const field of ['verification_classes','coverage_markers','coverage_status',...REF_FIELDS])if(!Array.isArray(item[field])||item[field].some(value=>typeof value!=='string'||!value.length)||new Set(item[field]).size!==item[field].length)fail(field.includes('refs')?'CATALOG_REQUIREMENT_REFS':'CATALOG_REQUIREMENT_SHAPE');
 }
}
function validateContractBindings(catalog){
 const expected=[['STRUCTURAL_SCHEMA_COVERED',structuralCoverageIds],['PROJECTION_COVERED',projectionCoverageIds],['STATEFUL_SCENARIO_COVERED',statefulCoverageIds],['STATEFUL_PROJECTION_COVERED',statefulProjectionIds]];
 for(const[marker,ids]of expected)if(!same(coverageIds(catalog,marker),[...ids].sort(byteCompare)))fail('CONTRACT_COVERAGE_BINDING');
}
function validateProfile(profile){
 if(profile.profile_id!=='JN-CORE-LITE-0_2-GATE_2-BASELINE-001'||profile.inventory?.atomic_requirements_total!==156||profile.inventory?.non_gating_capabilities!==2||profile.gate_state?.gate!==2||profile.gate_state?.lifecycle!=='IN_PROGRESS'||profile.gate_state?.technical_verdict!=='NOT_EVALUATED'||profile.schema_foundation?.structurally_complete_requirements!==20||profile.schema_foundation?.projection_covered_requirements!==10||profile.schema_foundation?.conformance_claimed!==false||profile.stateful_history_reference_foundation?.statefully_complete_requirements!==52||profile.stateful_history_reference_foundation?.projection_covered_requirements!==6||profile.stateful_history_reference_foundation?.conformance_claimed!==false)fail('PROFILE_BINDING');
}
function validateManifest(manifest){
 if(manifest.schema_version!=='janus-stateful-scenario-manifest-v1'||manifest.manifest_id!=='JN-CORE-LITE-0_2-STATEFUL-HISTORY-REFERENCE-001')fail('SCENARIO_MANIFEST_IDENTITY');
 uniqueStrings(manifest.scenario_ids,'SCENARIO_IDS');if(manifest.scenario_ids.length!==64)fail('SCENARIO_COUNT');
}
function evidenceFor(item){
 const refs=Object.fromEntries(REF_FIELDS.map(field=>[field,[...item[field]].sort(byteCompare)]));
 for(const field of REF_FIELDS)sortedUniqueStrings(refs[field],'EVIDENCE_REFS');
 const kind=item.coverage_markers.includes('STRUCTURAL_SCHEMA_COVERED')?'SCHEMA':item.coverage_markers.includes('STATEFUL_SCENARIO_COVERED')?'STATEFUL':null;
 if(!kind||!refs.test_refs.length||(kind==='SCHEMA'&&!refs.schema_refs.length)||(kind==='STATEFUL'&&(!refs.stateful_positive_scenario_refs.length||!refs.stateful_negative_scenario_refs.length||!refs.stateful_test_refs.length)))fail('CONSTITUTIVE_EVIDENCE');
 return{kind,refs,requirement_id:item.requirement_id,resolved:true};
}
export function deriveGate2Controller(requirementsBytes,matrixBytes,profileBytes,scenarioManifestBytes){
 const catalog=parseDataBytes(requirementsBytes,'CATALOG'),matrix=parseDataBytes(matrixBytes,'MATRIX'),profile=parseDataBytes(profileBytes,'PROFILE'),manifest=parseDataBytes(scenarioManifestBytes,'SCENARIO_MANIFEST');
 for(const[label,value]of [['CATALOG',catalog],['MATRIX',matrix],['PROFILE',profile],['SCENARIO_MANIFEST',manifest]])if(sha256(Buffer.from(stableJson(value),'utf8'))!==SNAPSHOT_SHA256[label])fail(label+'_SNAPSHOT');
 validateCatalogShape(catalog);validateContractBindings(catalog);validateManifest(manifest);
 try{validateMatrixAgainstCatalog(catalog,matrix);}catch{fail('MATRIX_BINDING');}
 validateProfile(profile);
 const sourceIdentity=deriveSourceIdentity(catalog,manifest);if(sourceIdentity!==SOURCE_IDENTITY_SHA256)fail('SOURCE_IDENTITY');
 const partitions=Object.fromEntries(PARTITION_NAMES.map(name=>[name,[]]));for(const item of catalog.requirements)partitions[classify(item)].push(item.requirement_id);for(const ids of Object.values(partitions))ids.sort(byteCompare);
 const evidence=catalog.requirements.filter(item=>item.coverage_markers.includes('REQUIREMENT_COMPLETE')).sort((a,b)=>byteCompare(a.requirement_id,b.requirement_id)).map(evidenceFor);
 if(sha256(Buffer.from(stableJson(partitions),'utf8'))!==PARTITION_SHA256)fail('PARTITION_IDENTITY');if(sha256(Buffer.from(stableJson(evidence),'utf8'))!==EVIDENCE_SHA256)fail('EVIDENCE_IDENTITY');
 const total=catalog.requirements.length,nonGating=partitions.NON_GATING_CAPABILITY.length,complete=partitions.CONSTITUTIVE_COMPLETE.length,schemaProjections=coverageIds(catalog,'PROJECTION_COVERED').length,statefulProjections=coverageIds(catalog,'STATEFUL_PROJECTION_COVERED').length,mandatory=total-nonGating;
 const counts={complete,human_and_framework_pending:partitions.HUMAN_AND_FRAMEWORK_PENDING.length,human_review_pending:partitions.HUMAN_REVIEW_PENDING.length,mandatory,mandatory_incomplete:mandatory-complete,non_gating:nonGating,not_implemented:total-complete-schemaProjections-statefulProjections,schema_projections:schemaProjections,stateful_complete:coverageIds(catalog,'STATEFUL_SCENARIO_COVERED').length,stateful_projections:statefulProjections,structural_complete:coverageIds(catalog,'STRUCTURAL_SCHEMA_COVERED').length,technical_and_human_pending:partitions.TECHNICAL_AND_HUMAN_REVIEW_PENDING.length,technical_blockers:partitions.TECHNICAL_NOT_IMPLEMENTED.length+partitions.TECHNICAL_NONCONSTITUTIVE_PROJECTION.length,technical_not_implemented:partitions.TECHNICAL_NOT_IMPLEMENTED.length,technical_projections:partitions.TECHNICAL_NONCONSTITUTIVE_PROJECTION.length,total};
 if(!same(counts,{complete:72,human_and_framework_pending:5,human_review_pending:22,mandatory:154,mandatory_incomplete:82,non_gating:2,not_implemented:68,schema_projections:10,stateful_complete:52,stateful_projections:6,structural_complete:20,technical_and_human_pending:1,technical_blockers:54,technical_not_implemented:38,technical_projections:16,total:156}))fail('DERIVED_COUNTS');
 const model={assessment:'CORE_V0_2_TECHNICALLY_INCOMPLETE',claim_ceiling:'DERIVED_READ_ONLY_OBSERVER_PASS_NOT_CONFORMANCE',counts,diagnostics:[{code:'CORE_LITE_README_HISTORICAL_COUNTS_NOT_INPUT',controller_diagnostic_severity:'P2'}],evidence,observations:{ci:'NOT_OBSERVED',labs:'NOT_OBSERVED',ledger:'NOT_OBSERVED'},partitions,residual:[...partitions.TECHNICAL_NOT_IMPLEMENTED,...partitions.TECHNICAL_NONCONSTITUTIVE_PROJECTION].sort(byteCompare),schema_version:'janus-gate-2-controller-model-v1',source_identity_sha256:sourceIdentity,state:{conformance_claimed:false,execution_authorization_status:'NOT_OBSERVED',gate_2_closed:false,gate_2_status:'IN_PROGRESS',head_decision_status:'NOT_OBSERVED',technical_verdict:'NOT_EVALUATED'}};
 const document=deepFreeze({model,model_sha256:sha256(Buffer.from(stableJson(model),'utf8')),schema_version:'janus-gate-2-controller-output-v1'});DOCUMENTS.add(document);return document;
}

export function renderGate2ControllerMarkdown(document){
 if(!DOCUMENTS.has(document))fail('DOCUMENT_REQUIRED');
 const{model}=document;return`# Gate 2 technical controller\n\nModel SHA-256: ${document.model_sha256}\nAssessment: ${model.assessment}\nTechnical blockers: ${model.counts.technical_blockers}\nMandatory incomplete: ${model.counts.mandatory_incomplete}\nGate 2: ${model.state.gate_2_status}\nTechnical verdict: ${model.state.technical_verdict}\nHead decision: ${model.state.head_decision_status}\nExecution authorization: ${model.state.execution_authorization_status}\nConformance claimed: ${model.state.conformance_claimed}\nGate 2 closed: ${model.state.gate_2_closed}\n`;
}
