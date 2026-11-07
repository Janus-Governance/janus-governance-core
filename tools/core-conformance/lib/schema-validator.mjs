import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { repoRoot, stable } from './contract.mjs';

const load=rel=>JSON.parse(fs.readFileSync(path.join(repoRoot,rel),'utf8'));
const schemaRootRel='conformance/core-lite-v0.2';
const allowedPackages=['ajv','fast-deep-equal','fast-uri','json-schema-traverse','require-from-string'];
const collectRefs=value=>Array.isArray(value)?value.flatMap(collectRefs):value&&typeof value==='object'?Object.entries(value).flatMap(([key,item])=>key==='$ref'?[item]:collectRefs(item)):[];
const familyPatterns={schema:/^schemas\/[^/]+\.schema\.json$/,fixture:/^fixtures\/[^/]+\.cases\.json$/};
const strictDescendant=(root,target)=>target.startsWith(root+path.sep)&&target!==root;

// Residual TOCTOU boundary: lstat/realpath/open cannot make a multi-component path
// transaction atomic. Validate only while the governed worktree is not concurrently
// mutated. O_NOFOLLOW and descriptor fstat close the final-component gap.
export function readContainedJson(root,relative,family=null){
 if(typeof relative!=='string'||relative.length===0||relative.includes('\0')||relative.includes('\\')||path.posix.isAbsolute(relative)||path.win32.isAbsolute(relative))throw new Error('Unsafe manifest path '+String(relative));
 const segments=relative.split('/');if(segments.some(segment=>segment===''||segment==='.'||segment==='..')||path.posix.normalize(relative)!==relative)throw new Error('Noncanonical manifest path '+relative);
 if(family&&(!familyPatterns[family]||!familyPatterns[family].test(relative)))throw new Error('Manifest path outside '+family+' family '+relative);
 const rootReal=fs.realpathSync(root),lexical=path.resolve(rootReal,...segments);if(!strictDescendant(rootReal,lexical))throw new Error('Manifest path escapes root '+relative);
 let current=rootReal;for(let index=0;index<segments.length;index++){current=path.join(current,segments[index]);const stat=fs.lstatSync(current);if(stat.isSymbolicLink())throw new Error('Manifest path contains symlink '+relative);if(index<segments.length-1&&!stat.isDirectory())throw new Error('Manifest intermediate is not a directory '+relative);if(index===segments.length-1&&!stat.isFile())throw new Error('Manifest target is not a regular file '+relative);}
 const finalReal=fs.realpathSync(lexical);if(!strictDescendant(rootReal,finalReal))throw new Error('Manifest realpath escapes root '+relative);
 const flags=fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0);let descriptor;try{descriptor=fs.openSync(lexical,flags);const stat=fs.fstatSync(descriptor);if(!stat.isFile())throw new Error('Opened manifest target is not a regular file '+relative);return JSON.parse(fs.readFileSync(descriptor,'utf8'));}finally{if(descriptor!==undefined)fs.closeSync(descriptor);}
}

function exactFamilyInventory(rootReal,directory,suffix){
 const directoryPath=path.join(rootReal,directory),directoryStat=fs.lstatSync(directoryPath);if(directoryStat.isSymbolicLink()||!directoryStat.isDirectory())throw new Error('Unsafe manifest family directory '+directory);
 return fs.readdirSync(directoryPath,{withFileTypes:true}).filter(entry=>entry.name.endsWith(suffix)).map(entry=>{if(entry.isSymbolicLink()||!entry.isFile())throw new Error('Unsafe manifest family entry '+directory+'/'+entry.name);return directory+'/'+entry.name;}).sort();
}

export function loadManifestFoundation(root,schemaManifest,fixtureManifest,{enforceInventory=true}={}){
 const rootReal=fs.realpathSync(root),schemaPaths=schemaManifest.schemas.map(entry=>entry.path),fixturePaths=fixtureManifest.fixture_files;
 if(new Set(schemaPaths).size!==schemaPaths.length)throw new Error('Duplicate schema path');if(new Set(fixturePaths).size!==fixturePaths.length)throw new Error('Duplicate fixture path');
 if(enforceInventory&&JSON.stringify([...schemaPaths].sort())!==JSON.stringify(exactFamilyInventory(rootReal,'schemas','.schema.json')))throw new Error('Schema manifest inventory mismatch');
 if(enforceInventory&&JSON.stringify([...fixturePaths].sort())!==JSON.stringify(exactFamilyInventory(rootReal,'fixtures','.cases.json')))throw new Error('Fixture manifest inventory mismatch');
 const schemas=schemaManifest.schemas.map(entry=>{const schema=readContainedJson(rootReal,entry.path,'schema');if(entry.schema_id!==schema.$id)throw new Error('Manifest schema ID mismatch '+entry.path);if(schema.$schema!=='https://json-schema.org/draft/2020-12/schema')throw new Error('Dialect mismatch '+schema.$id);return schema;});
 const schemaIds=schemas.map(schema=>schema.$id);if(new Set(schemaIds).size!==schemaIds.length)throw new Error('Duplicate schema ID');const localIds=new Set(schemaIds);
 for(const schema of schemas)for(const ref of collectRefs(schema)){if(typeof ref!=='string')throw new Error('Non-string schema ref');if(ref.startsWith('#'))continue;const base=ref.split('#',1)[0];if(!localIds.has(base))throw new Error('Remote or unresolved ref '+ref);}
 const fixtureFiles=fixturePaths.map(relative=>readContainedJson(rootReal,relative,'fixture')),cases=fixtureFiles.flatMap(file=>file.cases);
 const caseIds=cases.map(item=>item.case_id);if(new Set(caseIds).size!==caseIds.length)throw new Error('Duplicate fixture case ID');if(cases.length!==fixtureManifest.case_count||JSON.stringify([...caseIds].sort())!==JSON.stringify(fixtureManifest.case_ids))throw new Error('Fixture manifest mismatch');
 return{rootReal,schemas,fixtureFiles,cases};
}

export function validateDependencyLock(){
 const pkg=load('tools/core-conformance/package.json'),lock=load('tools/core-conformance/package-lock.json');if(lock.lockfileVersion!==3)throw new Error('lockfileVersion must be 3');if(JSON.stringify(pkg.dependencies)!==JSON.stringify({ajv:'8.20.0'})||JSON.stringify(lock.packages[''].dependencies)!==JSON.stringify({ajv:'8.20.0'}))throw new Error('Direct dependency envelope mismatch');const entries=Object.entries(lock.packages).filter(([key])=>key).map(([key,value])=>({name:key.split('/').at(-1),...value}));if(entries.map(item=>item.name).sort().join()!==[...allowedPackages].sort().join())throw new Error('Package graph mismatch');for(const item of entries)if(!item.resolved?.startsWith('https://registry.npmjs.org/')||!item.integrity?.startsWith('sha512-')||item.hasInstallScript)throw new Error('Unsafe lock entry '+item.name);return{lockfileVersion:lock.lockfileVersion,packages:entries.map(({name,version,resolved,integrity})=>({name,version,resolved,integrity})).sort((a,b)=>a.name.localeCompare(b.name))};
}

export function runSchemaFoundation(){
 const lock=validateDependencyLock(),manifest=load(schemaRootRel+'/schemas/manifest.json'),fixtureManifest=load(schemaRootRel+'/fixtures/manifest.json'),root=fs.realpathSync(path.join(repoRoot,schemaRootRel));
 const{schemas,cases}=loadManifestFoundation(root,manifest,fixtureManifest);for(const schema of schemas)if(JSON.stringify(schema).includes('additionalProperties":false')||JSON.stringify(schema).includes('uniqueItems'))throw new Error('Forbidden schema closure/uniqueness claim');
 const ajv=new Ajv2020({strict:true,allErrors:true,validateSchema:true,$data:false,coerceTypes:false,useDefaults:false,removeAdditional:false});for(const schema of schemas){if(!ajv.validateSchema(schema))throw new Error('Schema meta-validation failed '+schema.$id+' '+ajv.errorsText());ajv.addSchema(schema,schema.$id);}for(const schema of schemas)ajv.getSchema(schema.$id)||ajv.compile(schema);
 const catalog=load(schemaRootRel+'/requirements.json'),requirements=new Map(catalog.requirements.map(requirement=>[requirement.requirement_id,requirement])),caseMap=new Map(cases.map(item=>[item.case_id,item]));
 const results=[];for(const item of cases){for(const field of ['case_id','schema_id','polarity','requirement_ids','instance','expected_keyword','expected_instance_path','expected_schema_path_predicate'])if(!(field in item))throw new Error('Fixture field missing '+field+' '+item.case_id);for(const requirementId of item.requirement_ids){const requirement=requirements.get(requirementId);if(!requirement)throw new Error('Fixture references unknown requirement '+requirementId);const refs=item.polarity==='VALID'?requirement.positive_fixture_refs:requirement.negative_fixture_refs;if(!refs.includes(item.case_id))throw new Error('Fixture/catalog attribution is not reciprocal '+item.case_id+' '+requirementId);}const validate=ajv.getSchema(item.schema_id);if(!validate)throw new Error('Unknown fixture schema '+item.schema_id);const ok=validate(item.instance),errors=validate.errors||[];if(item.polarity==='VALID'){if(!ok||errors.length)throw new Error('Positive fixture failed '+item.case_id);}else{if(ok)throw new Error('Negative fixture passed '+item.case_id);const matched=errors.some(error=>error.keyword===item.expected_keyword&&error.instancePath===item.expected_instance_path&&(item.expected_schema_path_predicate==='NO_ERRORS'||item.expected_schema_path_predicate.startsWith('ENDS_WITH:')&&error.schemaPath.endsWith(item.expected_schema_path_predicate.slice(10))));if(!matched)throw new Error('Expected error absent '+item.case_id);if(errors.some(error=>!item.allowed_keywords.includes(error.keyword)||!item.allowed_instance_paths.includes(error.instancePath)))throw new Error('Negative fixture has unrelated error '+item.case_id);}results.push({case_id:item.case_id,polarity:item.polarity,result:'PASS',requirement_ids:[...item.requirement_ids].sort()});}
 for(const requirement of catalog.requirements){for(const caseId of requirement.positive_fixture_refs){const fixture=caseMap.get(caseId);if(!fixture||fixture.polarity!=='VALID'||!fixture.requirement_ids.includes(requirement.requirement_id))throw new Error('Positive catalog/fixture attribution is not reciprocal '+requirement.requirement_id+' '+caseId);}for(const caseId of requirement.negative_fixture_refs){const fixture=caseMap.get(caseId);if(!fixture||fixture.polarity!=='INVALID'||!fixture.requirement_ids.includes(requirement.requirement_id))throw new Error('Negative catalog/fixture attribution is not reciprocal '+requirement.requirement_id+' '+caseId);}}
 return{classification:'SCHEMA_FOUNDATION_PASS_NOT_CONFORMANCE',conformance_claimed:false,reciprocal_traceability:true,dialect:'2020-12',schema_count:schemas.length,fixture_count:cases.length,valid_cases:cases.filter(item=>item.polarity==='VALID').length,invalid_cases:cases.filter(item=>item.polarity==='INVALID').length,lock,results:results.sort((a,b)=>a.case_id.localeCompare(b.case_id))};
}

export const schemaFoundationOutput=()=>stable(runSchemaFoundation());
