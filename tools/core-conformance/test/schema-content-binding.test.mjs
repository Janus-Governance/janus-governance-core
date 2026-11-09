import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConformanceProfileSchemaBindings,loadSchemaContentBindingsForTest,SchemaContentBindingError } from '../lib/schema-content-binding.mjs';

const testDir=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(testDir,'../../..');
const sourceProfile=path.join(repoRoot,'conformance/core-lite-v0.2');
const manifestPath=path.join(sourceProfile,'schemas/manifest.json');
const loadJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const digest=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const schemaNames=['audit-event.schema.json','expectation.schema.json','human-decision.schema.json','omission-detected.schema.json','profile-defs.schema.json','search-scope.schema.json'];
const envelopeKeys=['authoritative','binding_domain','canonical_output','canonical_sha256','manifest_schema_version','schemas','toctou_boundary'];
const bindingKeys=['algorithm','dialect','digest','path','role','schema','schema_id','size_bytes'];
const prohibitedSiblingKeys=['schema_history','schema_context_ref','observation','replay','cutoff','promotion','conformance_claimed'];
const errorCode=(action,code)=>assert.throws(action,error=>error instanceof SchemaContentBindingError&&error.code===code);

function createWorkspace(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'janus-schema-binding-')),schemas=path.join(root,'schemas');fs.mkdirSync(schemas);
 for(const name of schemaNames)fs.copyFileSync(path.join(sourceProfile,'schemas',name),path.join(schemas,name));
 return{root,manifest:loadJson(manifestPath)};
}

function withWorkspace(action){
 const workspace=createWorkspace();
 try{return action(workspace);}finally{fs.rmSync(workspace.root,{recursive:true,force:true});assert.equal(fs.existsSync(workspace.root),false);}
}

function entryFor(manifest,name){return manifest.schemas.find(entry=>entry.path===`schemas/${name}`);}
function rebind(workspace,name){const buffer=fs.readFileSync(path.join(workspace.root,'schemas',name)),entry=entryFor(workspace.manifest,name);entry.size_bytes=buffer.length;entry.digest=digest(buffer);}
function writeSchema(workspace,name,change){const file=path.join(workspace.root,'schemas',name),schema=loadJson(file);change(schema);fs.writeFileSync(file,`${JSON.stringify(schema,null,2)}\n`);rebind(workspace,name);}
function bindTest(workspace){return loadSchemaContentBindingsForTest({profileRoot:workspace.root,manifest:workspace.manifest});}
function assertDeepFrozen(value){if(value&&typeof value==='object'){assert.equal(Object.isFrozen(value),true);for(const child of Object.values(value))assertDeepFrozen(child);}}

test('governed entry point binds the exact six-schema inventory deterministically',()=>{
 const first=loadConformanceProfileSchemaBindings(),second=loadConformanceProfileSchemaBindings();
 assert.equal(first.binding_domain,'CONFORMANCE_PROFILE_SCHEMA_BINDING');assert.equal(first.authoritative,true);assert.equal(first.schemas.length,6);
 assert.deepEqual(first.schemas.map(item=>item.path),[...first.schemas.map(item=>item.path)].sort());
 assert.equal(first.canonical_output,second.canonical_output);assert.equal(first.canonical_sha256,second.canonical_sha256);assert.match(first.canonical_sha256,/^[a-f0-9]{64}$/);
 assert.equal(first.toctou_boundary,'QUIESCENT_GOVERNED_WORKTREE_REQUIRED_RESIDUAL_MULTICOMPONENT_TOCTOU');assertDeepFrozen(first);
 assert.deepEqual(Object.keys(first).sort(),envelopeKeys);for(const binding of first.schemas){assert.deepEqual(Object.keys(binding).sort(),bindingKeys);for(const key of prohibitedSiblingKeys)assert.equal(Object.hasOwn(binding,key),false);}for(const key of prohibitedSiblingKeys)assert.equal(Object.hasOwn(first,key),false);
 const searchScope=first.schemas.find(item=>item.path==='schemas/search-scope.schema.json');assert.equal(Object.hasOwn(searchScope.schema.properties,'cutoff'),true);
});

test('manifest top-level identity is exact and cutoff remains opaque governed content',()=>withWorkspace(workspace=>{
 const valid=bindTest(workspace),searchScope=valid.schemas.find(item=>item.path==='schemas/search-scope.schema.json');assert.equal(Object.hasOwn(searchScope.schema.properties,'cutoff'),true);
 for(const field of ['schema_version','profile','authority_boundary','json_schema_dialect'])withWorkspace(copy=>{copy.manifest[field]=`${copy.manifest[field]}-changed`;errorCode(()=>bindTest(copy),'MANIFEST_IDENTITY_MISMATCH');});
 withWorkspace(copy=>{copy.manifest.extra=true;errorCode(()=>bindTest(copy),'MANIFEST_TOP_LEVEL_FIELDS_INVALID');});
}));

test('governed entry point rejects caller overrides and test helper cannot become authoritative',()=>withWorkspace(workspace=>{
 errorCode(()=>loadConformanceProfileSchemaBindings({root:workspace.root}),'GOVERNED_ENTRYPOINT_REJECTS_CALLER_OVERRIDES');
 const result=bindTest(workspace);assert.equal(result.binding_domain,'TEST_ONLY_NON_AUTHORITATIVE_SCHEMA_BINDING');assert.equal(result.authoritative,false);
 errorCode(()=>loadSchemaContentBindingsForTest({profileRoot:workspace.root,manifest:workspace.manifest,binding_domain:'CONFORMANCE_PROFILE_SCHEMA_BINDING'}),'TEST_HELPER_OPTIONS_INVALID');
}));

test('manifest digest size algorithm dialect role and ID assertions fail closed',()=>{
 const cases=[
  [entry=>entry.digest='0'.repeat(64),'SCHEMA_DIGEST_MISMATCH'],[entry=>entry.size_bytes++,'SCHEMA_SIZE_MISMATCH'],
  [entry=>entry.algorithm='sha512','MANIFEST_BINDING_METADATA_INVALID'],[entry=>entry.dialect='https://example.invalid/dialect','MANIFEST_BINDING_METADATA_INVALID'],
  [entry=>entry.role='PROJECTION_ONLY','GOVERNED_SCHEMA_POLICY_MISMATCH'],[entry=>entry.schema_id='https://example.invalid/wrong.schema.json','SCHEMA_ID_MISMATCH']
 ];
 for(const[change,code]of cases)withWorkspace(workspace=>{change(entryFor(workspace.manifest,'audit-event.schema.json'));errorCode(()=>bindTest(workspace),code);});
});

test('duplicate IDs paths and physical file identities fail closed',()=>{
 withWorkspace(workspace=>{workspace.manifest.schemas[1].schema_id=workspace.manifest.schemas[0].schema_id;errorCode(()=>bindTest(workspace),'DUPLICATE_SCHEMA_ID');});
 withWorkspace(workspace=>{workspace.manifest.schemas[1].path=workspace.manifest.schemas[0].path;workspace.manifest.schemas.sort((a,b)=>a.path.localeCompare(b.path));errorCode(()=>bindTest(workspace),'DUPLICATE_SCHEMA_PATH');});
 withWorkspace(workspace=>{const target=path.join(workspace.root,'schemas','expectation.schema.json');fs.rmSync(target);fs.linkSync(path.join(workspace.root,'schemas','audit-event.schema.json'),target);errorCode(()=>bindTest(workspace),'DUPLICATE_SCHEMA_FILE_IDENTITY');});
});

test('swapped paths and noncanonical or escaping paths fail closed',()=>{
 withWorkspace(workspace=>{const a=workspace.manifest.schemas[0],b=workspace.manifest.schemas[1],aPath=a.path;a.path=b.path;b.path=aPath;workspace.manifest.schemas.sort((x,y)=>x.path.localeCompare(y.path));errorCode(()=>bindTest(workspace),'GOVERNED_SCHEMA_POLICY_MISMATCH');});
 const values=['../schemas/audit-event.schema.json','/tmp/audit-event.schema.json','C:\\audit-event.schema.json','schemas\\audit-event.schema.json','schemas/../audit-event.schema.json','schemas/./audit-event.schema.json','schemas/\0audit-event.schema.json'];
 for(const value of values)withWorkspace(workspace=>{workspace.manifest.schemas[0].path=value;workspace.manifest.schemas.sort((a,b)=>a.path.localeCompare(b.path));assert.throws(()=>bindTest(workspace),SchemaContentBindingError);});
});

test('extra and missing schema inventory entries fail closed',()=>{
 withWorkspace(workspace=>{fs.copyFileSync(path.join(workspace.root,'schemas','audit-event.schema.json'),path.join(workspace.root,'schemas','extra.schema.json'));errorCode(()=>bindTest(workspace),'SCHEMA_INVENTORY_MISMATCH');});
 withWorkspace(workspace=>{fs.rmSync(path.join(workspace.root,'schemas','audit-event.schema.json'));errorCode(()=>bindTest(workspace),'SCHEMA_INVENTORY_MISMATCH');});
});

test('final and intermediate symlinks and nonregular targets fail closed',()=>{
 withWorkspace(workspace=>{const target=path.join(workspace.root,'schemas','audit-event.schema.json'),outside=path.join(workspace.root,'outside.json');fs.renameSync(target,outside);fs.symlinkSync(outside,target);assert.throws(()=>bindTest(workspace),SchemaContentBindingError);});
 withWorkspace(workspace=>{const schemas=path.join(workspace.root,'schemas'),real=path.join(workspace.root,'real-schemas');fs.renameSync(schemas,real);fs.symlinkSync(real,schemas);errorCode(()=>bindTest(workspace),'UNSAFE_SCHEMA_DIRECTORY');});
 withWorkspace(workspace=>{const target=path.join(workspace.root,'schemas','audit-event.schema.json');fs.rmSync(target);fs.mkdirSync(target);errorCode(()=>bindTest(workspace),'UNSAFE_SCHEMA_INVENTORY_ENTRY');});
});

test('one-byte mutation and invalid UTF-8 or JSON fail closed',()=>{
 withWorkspace(workspace=>{const file=path.join(workspace.root,'schemas','audit-event.schema.json'),buffer=fs.readFileSync(file);buffer[0]^=1;fs.writeFileSync(file,buffer);errorCode(()=>bindTest(workspace),'SCHEMA_DIGEST_MISMATCH');});
 withWorkspace(workspace=>{const file=path.join(workspace.root,'schemas','audit-event.schema.json');fs.writeFileSync(file,Buffer.from([0xff]));rebind(workspace,'audit-event.schema.json');errorCode(()=>bindTest(workspace),'SCHEMA_UTF8_INVALID');});
 withWorkspace(workspace=>{const file=path.join(workspace.root,'schemas','audit-event.schema.json');fs.writeFileSync(file,'{');rebind(workspace,'audit-event.schema.json');errorCode(()=>bindTest(workspace),'SCHEMA_JSON_INVALID');});
});

test('$id $schema and local reference resolution are bound without network',()=>{
 withWorkspace(workspace=>{writeSchema(workspace,'audit-event.schema.json',schema=>{schema.$id='https://example.invalid/wrong';});errorCode(()=>bindTest(workspace),'SCHEMA_ID_MISMATCH');});
 withWorkspace(workspace=>{writeSchema(workspace,'audit-event.schema.json',schema=>{schema.$schema='https://example.invalid/dialect';});errorCode(()=>bindTest(workspace),'SCHEMA_DIALECT_MISMATCH');});
 withWorkspace(workspace=>{writeSchema(workspace,'audit-event.schema.json',schema=>{schema.properties.event_id.$ref='https://remote.invalid/schema.json';});errorCode(()=>bindTest(workspace),'SCHEMA_REF_EXTERNAL_OR_UNRESOLVED');});
 withWorkspace(workspace=>{writeSchema(workspace,'audit-event.schema.json',schema=>{schema.properties.event_id.$ref='https://janus.invalid/conformance/core-lite-v0.2/profile-defs.schema.json#/$defs/missing';});errorCode(()=>bindTest(workspace),'SCHEMA_REF_UNRESOLVED');});
});

test('observable concurrent mutation is detected without claiming universal atomicity',()=>withWorkspace(workspace=>{
 const target=path.join(workspace.root,'schemas','audit-event.schema.json'),original=fs.readFileSync;
 let mutated=false;fs.readFileSync=function(file,...args){const buffer=original.call(this,file,...args);if(typeof file==='number'&&!mutated){mutated=true;fs.appendFileSync(target,' ');}return buffer;};
 try{errorCode(()=>bindTest(workspace),'SCHEMA_CONCURRENT_MUTATION_DETECTED');}finally{fs.readFileSync=original;}
}));

test('bindings and parsed schemas are deeply immutable',()=>withWorkspace(workspace=>{
 const result=bindTest(workspace);assertDeepFrozen(result);assert.throws(()=>{result.schemas[0].role='changed';});assert.throws(()=>{result.schemas[0].schema.title='changed';});
}));

test('temporary workspace cleanup occurs after success and failure',()=>{
 let successRoot;withWorkspace(workspace=>{successRoot=workspace.root;bindTest(workspace);});assert.equal(fs.existsSync(successRoot),false);
 let failureRoot;assert.throws(()=>withWorkspace(workspace=>{failureRoot=workspace.root;workspace.manifest.schemas[0].digest='0'.repeat(64);bindTest(workspace);}),SchemaContentBindingError);assert.equal(fs.existsSync(failureRoot),false);
});
