import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

const moduleDir=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(moduleDir,'../../..');
const governedProfileRoot=path.join(repoRoot,'conformance/core-lite-v0.2');
const governedManifestPath=path.join(governedProfileRoot,'schemas/manifest.json');
const governedDialect='https://json-schema.org/draft/2020-12/schema';
const governedManifestIdentity={
 schema_version:'janus-core-conformance-schema-manifest-v1',
 profile:'CORE_LITE_V0_2_TEST_VECTOR_PROFILE',
 authority_boundary:'Janus JSON conformance test-vector profile subordinate to Core Lite v0.2. Not a universal Core serialization, new canonical semantics, replacement for Core, runtime contract, Framework identity or competence resolver, or proof of conformance.',
 json_schema_dialect:governedDialect
};
const governedPolicy=new Map([
 ['https://janus.invalid/conformance/core-lite-v0.2/audit-event.schema.json',['schemas/audit-event.schema.json','STRUCTURAL_PROFILE']],
 ['https://janus.invalid/conformance/core-lite-v0.2/expectation.schema.json',['schemas/expectation.schema.json','PROJECTION_ONLY']],
 ['https://janus.invalid/conformance/core-lite-v0.2/human-decision.schema.json',['schemas/human-decision.schema.json','STRUCTURAL_PROFILE']],
 ['https://janus.invalid/conformance/core-lite-v0.2/omission-detected.schema.json',['schemas/omission-detected.schema.json','STRUCTURAL_PROFILE']],
 ['https://janus.invalid/conformance/core-lite-v0.2/profile-defs.schema.json',['schemas/profile-defs.schema.json','STRUCTURAL_PROFILE']],
 ['https://janus.invalid/conformance/core-lite-v0.2/search-scope.schema.json',['schemas/search-scope.schema.json','PROJECTION_ONLY']]
]);
const authoritativeDomain='CONFORMANCE_PROFILE_SCHEMA_BINDING';
const testDomain='TEST_ONLY_NON_AUTHORITATIVE_SCHEMA_BINDING';
const payloadKeys=['authoritative','binding_domain','manifest_schema_version','schemas'];
const envelopeKeys=['authoritative','binding_domain','canonical_output','canonical_sha256','manifest_schema_version','schemas','toctou_boundary'];
const bindingKeys=['algorithm','dialect','digest','path','role','schema','schema_id','size_bytes'];

export class SchemaContentBindingError extends Error{
 constructor(code,detail=''){super(detail?`${code}: ${detail}`:code);this.name='SchemaContentBindingError';this.code=code;}
}

const fail=(code,detail)=>{throw new SchemaContentBindingError(code,detail);};
const dataObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const sha256=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const canonical=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?`[${value.map(canonical).join(',')}]`:`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}return value;};
const metadataEqual=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.ctimeMs===b.ctimeMs;

function validateRelativeSchemaPath(relative){
 if(typeof relative!=='string'||!relative||relative.includes('\0')||relative.includes('\\')||path.posix.isAbsolute(relative)||path.win32.isAbsolute(relative))fail('UNSAFE_SCHEMA_PATH',String(relative));
 const segments=relative.split('/');
 if(segments.some(segment=>segment===''||segment==='.'||segment==='..')||path.posix.normalize(relative)!==relative||!/^schemas\/[^/]+\.schema\.json$/.test(relative))fail('NONCANONICAL_SCHEMA_PATH',relative);
 return segments;
}

function validateRoot(profileRoot){
 if(typeof profileRoot!=='string'||!path.isAbsolute(profileRoot))fail('INVALID_PROFILE_ROOT');
 const stat=fs.lstatSync(profileRoot);
 if(stat.isSymbolicLink()||!stat.isDirectory())fail('UNSAFE_PROFILE_ROOT');
 return fs.realpathSync(profileRoot);
}

function exactInventory(rootReal){
 const directory=path.join(rootReal,'schemas'),stat=fs.lstatSync(directory);
 if(stat.isSymbolicLink()||!stat.isDirectory())fail('UNSAFE_SCHEMA_DIRECTORY');
 return fs.readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.name.endsWith('.schema.json')).map(entry=>{
  if(entry.isSymbolicLink()||!entry.isFile())fail('UNSAFE_SCHEMA_INVENTORY_ENTRY',entry.name);
  return `schemas/${entry.name}`;
 }).sort();
}

function readExactBuffer(rootReal,relative){
 const segments=validateRelativeSchemaPath(relative);
 let current=rootReal;
 for(let index=0;index<segments.length;index++){
  current=path.join(current,segments[index]);
  const stat=fs.lstatSync(current);
  if(stat.isSymbolicLink())fail('SCHEMA_PATH_SYMLINK',relative);
  if(index<segments.length-1&&!stat.isDirectory())fail('SCHEMA_PATH_COMPONENT_NOT_DIRECTORY',relative);
  if(index===segments.length-1&&!stat.isFile())fail('SCHEMA_TARGET_NOT_REGULAR',relative);
 }
 const lexical=path.resolve(rootReal,...segments),resolved=fs.realpathSync(lexical);
 if(!lexical.startsWith(`${rootReal}${path.sep}`)||!resolved.startsWith(`${rootReal}${path.sep}`))fail('SCHEMA_PATH_ESCAPES_ROOT',relative);
 const flags=fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0);
 let descriptor;
 try{
  descriptor=fs.openSync(lexical,flags);
  const before=fs.fstatSync(descriptor);
  if(!before.isFile())fail('SCHEMA_TARGET_NOT_REGULAR',relative);
  const buffer=fs.readFileSync(descriptor);
  const after=fs.fstatSync(descriptor);
  if(!metadataEqual(before,after)||buffer.length!==after.size)fail('SCHEMA_CONCURRENT_MUTATION_DETECTED',relative);
  return{buffer,stat:after,resolved};
 }finally{if(descriptor!==undefined)fs.closeSync(descriptor);}
}

function decodeJson(buffer,label){
 let text;
 try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{fail('SCHEMA_UTF8_INVALID',label);}
 try{return JSON.parse(text);}catch{fail('SCHEMA_JSON_INVALID',label);}
}

function collectRefs(value,refs=[]){
 if(Array.isArray(value)){for(const item of value)collectRefs(item,refs);return refs;}
 if(value&&typeof value==='object')for(const [key,item] of Object.entries(value)){if(key==='$ref')refs.push(item);else collectRefs(item,refs);}
 return refs;
}

function resolvePointer(document,fragment,label){
 if(fragment===''||fragment==='#')return document;
 if(!fragment.startsWith('#/'))fail('SCHEMA_REF_UNRESOLVED',label);
 let tokens;
 try{tokens=fragment.slice(2).split('/').map(token=>decodeURIComponent(token).replace(/~1/g,'/').replace(/~0/g,'~'));}catch{fail('SCHEMA_REF_UNRESOLVED',label);}
 let current=document;
 for(const token of tokens){if(current===null||typeof current!=='object'||!Object.prototype.hasOwnProperty.call(current,token))fail('SCHEMA_REF_UNRESOLVED',label);current=current[token];}
 return current;
}

function validateReferences(bindings){
 const byId=new Map(bindings.map(binding=>[binding.schema_id,binding.schema]));
 for(const binding of bindings)for(const ref of collectRefs(binding.schema)){
  if(typeof ref!=='string'||!ref)fail('SCHEMA_REF_INVALID',binding.schema_id);
  const hashIndex=ref.indexOf('#'),base=hashIndex<0?ref:ref.slice(0,hashIndex),fragment=hashIndex<0?'':ref.slice(hashIndex);
  const target=base===''?binding.schema:byId.get(base);
  if(!target)fail('SCHEMA_REF_EXTERNAL_OR_UNRESOLVED',ref);
  resolvePointer(target,fragment,ref);
 }
}

function validateManifest(manifest,{authoritative}){
 if(!dataObject(manifest)||!Array.isArray(manifest.schemas))fail('MANIFEST_INVALID');
 const topLevelKeys=['authority_boundary','json_schema_dialect','profile','schema_version','schemas'];
 if(JSON.stringify(Object.keys(manifest).sort())!==JSON.stringify(topLevelKeys))fail('MANIFEST_TOP_LEVEL_FIELDS_INVALID');
 for(const[key,value]of Object.entries(governedManifestIdentity))if(manifest[key]!==value)fail('MANIFEST_IDENTITY_MISMATCH',key);
 if(authoritative&&manifest.schemas.length!==governedPolicy.size)fail('GOVERNED_SCHEMA_COUNT_INVALID');
 const sorted=[...manifest.schemas].sort((a,b)=>String(a.path).localeCompare(String(b.path)));
 if(manifest.schemas.some((entry,index)=>entry!==sorted[index]))fail('MANIFEST_ORDER_INVALID');
 const ids=new Set(),paths=new Set();
 for(const entry of manifest.schemas){
  if(!dataObject(entry))fail('MANIFEST_ENTRY_INVALID');
  const expectedKeys=['algorithm','dialect','digest','path','role','schema_id','size_bytes'];
  if(JSON.stringify(Object.keys(entry).sort())!==JSON.stringify(expectedKeys))fail('MANIFEST_ENTRY_FIELDS_INVALID',String(entry.path));
  if(typeof entry.schema_id!=='string'||!entry.schema_id||ids.has(entry.schema_id))fail(ids.has(entry.schema_id)?'DUPLICATE_SCHEMA_ID':'SCHEMA_ID_INVALID',String(entry.schema_id));
  validateRelativeSchemaPath(entry.path);if(paths.has(entry.path))fail('DUPLICATE_SCHEMA_PATH',entry.path);
  if(typeof entry.role!=='string'||!entry.role||entry.dialect!==governedDialect||entry.algorithm!=='sha256'||!Number.isSafeInteger(entry.size_bytes)||entry.size_bytes<0||typeof entry.digest!=='string'||!/[a-f0-9]{64}/.test(entry.digest))fail('MANIFEST_BINDING_METADATA_INVALID',entry.path);
  const expected=governedPolicy.get(entry.schema_id);
  if(expected&&(entry.path!==expected[0]||entry.role!==expected[1]))fail('GOVERNED_SCHEMA_POLICY_MISMATCH',entry.schema_id);
  if(authoritative&&!expected)fail('GOVERNED_SCHEMA_POLICY_MISMATCH',entry.schema_id);
  ids.add(entry.schema_id);paths.add(entry.path);
 }
}

function validateSynthesizedShape(value,expectedKeys,code){
 if(!dataObject(value)||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(expectedKeys))fail(code);
}

function buildBindings({profileRoot,manifest,authoritative}){
 const rootReal=validateRoot(profileRoot);validateManifest(manifest,{authoritative});
 const declared=manifest.schemas.map(entry=>entry.path),inventory=exactInventory(rootReal);
 if(JSON.stringify(declared)!==JSON.stringify(inventory))fail('SCHEMA_INVENTORY_MISMATCH');
 const identities=new Set(),realpaths=new Set(),bindings=[];
 for(const entry of manifest.schemas){
  const{buffer,stat,resolved}=readExactBuffer(rootReal,entry.path),identity=`${stat.dev}:${stat.ino}`;
  if(identities.has(identity)||realpaths.has(resolved))fail('DUPLICATE_SCHEMA_FILE_IDENTITY',entry.path);
  identities.add(identity);realpaths.add(resolved);
  if(buffer.length!==entry.size_bytes)fail('SCHEMA_SIZE_MISMATCH',entry.path);
  const digest=sha256(buffer);if(digest!==entry.digest)fail('SCHEMA_DIGEST_MISMATCH',entry.path);
  const schema=decodeJson(buffer,entry.path);
  if(!dataObject(schema)||schema.$id!==entry.schema_id)fail('SCHEMA_ID_MISMATCH',entry.path);
  if(schema.$schema!==entry.dialect)fail('SCHEMA_DIALECT_MISMATCH',entry.path);
  bindings.push({schema_id:entry.schema_id,path:entry.path,role:entry.role,dialect:entry.dialect,algorithm:entry.algorithm,digest,size_bytes:entry.size_bytes,schema});
 }
 validateReferences(bindings);
 const payload={binding_domain:authoritative?authoritativeDomain:testDomain,authoritative,manifest_schema_version:manifest.schema_version,schemas:bindings};
 validateSynthesizedShape(payload,payloadKeys,'BINDING_PAYLOAD_SHAPE_INVALID');
 for(const binding of bindings)validateSynthesizedShape(binding,bindingKeys,'BINDING_METADATA_SHAPE_INVALID');
 const canonical_output=canonical(payload),canonical_sha256=sha256(Buffer.from(canonical_output,'utf8'));
 const envelope={...payload,canonical_output,canonical_sha256,toctou_boundary:'QUIESCENT_GOVERNED_WORKTREE_REQUIRED_RESIDUAL_MULTICOMPONENT_TOCTOU'};
 validateSynthesizedShape(envelope,envelopeKeys,'BINDING_ENVELOPE_SHAPE_INVALID');
 return deepFreeze(envelope);
}

function readGovernedManifest(){
 const stat=fs.lstatSync(governedManifestPath);if(stat.isSymbolicLink()||!stat.isFile())fail('GOVERNED_MANIFEST_UNSAFE');
 const buffer=fs.readFileSync(governedManifestPath);return decodeJson(buffer,'schemas/manifest.json');
}

export function loadConformanceProfileSchemaBindings(){
 if(arguments.length!==0)fail('GOVERNED_ENTRYPOINT_REJECTS_CALLER_OVERRIDES');
 return buildBindings({profileRoot:governedProfileRoot,manifest:readGovernedManifest(),authoritative:true});
}

export function loadSchemaContentBindingsForTest(options){
 if(!dataObject(options)||typeof options.profileRoot!=='string'||!dataObject(options.manifest)||Object.keys(options).some(key=>!['profileRoot','manifest'].includes(key)))fail('TEST_HELPER_OPTIONS_INVALID');
 return buildBindings({profileRoot:options.profileRoot,manifest:structuredClone(options.manifest),authoritative:false});
}
