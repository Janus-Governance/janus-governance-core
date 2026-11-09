#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn,spawnSync } from 'node:child_process';
import { TextDecoder } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const UTF8=new TextDecoder('utf-8',{fatal:true});
const SHA256=/^[a-f0-9]{64}$/;
const GIT_OID=/^[a-f0-9]{40}$/;
const ARTIFACT_DIGEST=/^(?:sha256:)?[a-f0-9]{64}$/;
const SEMVER=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const REPLICAS=new Set(['replica-1','replica-2']);
const EXPECTED_PACKAGES={ajv:'8.20.0','fast-deep-equal':'3.1.3','fast-uri':'3.1.9','json-schema-traverse':'1.0.0','require-from-string':'2.0.2'};
const EXPECTED_TAP={
 'schema-foundation':6,
 'schema-content-binding':13,
 'e-minus-evaluator':41,
 'stateful-history-reference':33,
 baseline:6
};
const COMMANDS=[
 {id:'check-schemas',args:['node','tools/core-conformance/check-schemas.mjs'],exit:0,kind:'schema-json'},
 {id:'schema-foundation',args:['node','--test','--test-reporter=tap','tools/core-conformance/test/schema-foundation.test.mjs'],exit:0,kind:'tap'},
 {id:'schema-content-binding',args:['node','--test','--test-reporter=tap','tools/core-conformance/test/schema-content-binding.test.mjs'],exit:0,kind:'tap'},
 {id:'e-minus-evaluator',args:['node','--test','--test-reporter=tap','tools/core-conformance/test/e-minus-evaluator.test.mjs'],exit:0,kind:'tap'},
 {id:'stateful-history-reference',args:['node','--test','--test-reporter=tap','tools/core-conformance/test/stateful-history-reference.test.mjs'],exit:0,kind:'tap'},
 {id:'baseline',args:['node','--test','--test-reporter=tap','tools/core-conformance/test/baseline.test.mjs'],exit:0,kind:'tap'},
 {id:'check-stateful',args:['node','tools/core-conformance/check-stateful.mjs'],exit:0,kind:'stateful-json'},
 {id:'run',args:['node','tools/core-conformance/run.mjs'],exit:1,kind:'baseline-json'}
];
const OPERATION_COMMAND_IDS=['git-archive','tar-extract','npm-ci','npm-version','npm-ls'];
const GOVERNED_COMMAND_IDS=COMMANDS.map(command=>command.id);
const ALL_COMMAND_IDS=[...OPERATION_COMMAND_IDS,...GOVERNED_COMMAND_IDS];
const TAP_COMMAND_IDS=new Set(COMMANDS.filter(command=>command.kind==='tap').map(command=>command.id));
const SUMMARY_KEYS=['checkout_clean','command_results','commit','dependency_graph','deterministic_outputs','hashes','lockfile_version','normalized_results','package_versions','paths','replica_id','runner_metadata','schema_version','status','timestamps','tree'];
const RUNNER_METADATA_KEYS=['image_os','image_version','node_version','npm_version','runner_arch','runner_environment','runner_name','runner_os'];
const HASH_KEYS=['lock','package','runner','test','workflow'];
const RESULT_KEYS=['ended_utc','exit','expected_exit','output_limit','signal','spawn_error','started_utc','stderr','stdout','timeout'];
const LIFECYCLE_SCRIPTS=['prepublish','preprepare','prepare','postprepare','prepublishOnly','publish','postpublish','preinstall','install','postinstall','prepack','postpack','dependencies'];
const DEFAULT_OUTPUT_LIMIT=8*1024*1024;
const SYNC_TIMEOUT_MAX=30000;
const SYNC_MAX_BUFFER=1024*1024;
const EMPTY_SHA256=crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex');
const SENTINEL_NAME='.janus-ci-work-root-sentinel.json';

export class CIEvidenceError extends Error{constructor(code,message=code){super(message);this.name='CIEvidenceError';this.code=code;}}
const fail=(code,message)=>{throw new CIEvidenceError(code,message||code);};
export const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const stable=value=>JSON.stringify(sortValue(value),null,2)+'\n';
function sortValue(value){if(Array.isArray(value))return value.map(sortValue);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,sortValue(value[key])]));return value;}
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const writeJson=(file,value)=>fs.writeFileSync(file,stable(value));
const ensureDir=dir=>fs.mkdirSync(dir,{recursive:true});
const hashFile=file=>sha256(fs.readFileSync(file));
const assertHash=(value,label)=>{if(!SHA256.test(value))fail('HASH_INVALID',label);};
export const validateGitObjectId=(value,label='git-object-id')=>{if(!GIT_OID.test(value))fail('GIT_OID_INVALID',label);return value;};
const exactKeys=(value,keys,code)=>{if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(Object.keys(value).sort())!==JSON.stringify([...keys].sort()))fail(code);};
const decodeUtf8=(buffer,code)=>{try{return UTF8.decode(buffer);}catch{fail(code);}};

export function parseArgs(argv){
 if(!Array.isArray(argv)||!argv.length)fail('MODE_REQUIRED');
 const mode=argv[0];if(!['replica','compare'].includes(mode))fail('MODE_NOT_ALLOWLISTED');
 const values={mode};
 for(let i=1;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(!key?.startsWith('--')||value===undefined)fail('ARGUMENT_INVALID');const name=key.slice(2);if(Object.hasOwn(values,name))fail('ARGUMENT_DUPLICATE');values[name]=value;}
 const allowed=mode==='replica'?['mode','replica','source','work-root','evidence','expected-workflow-sha','expected-runner-sha','expected-test-sha','expected-tree']:['mode','replica-1','replica-2','replica-1-result','replica-2-result','replica-1-digest','replica-2-digest','expected-runner-sha','output'];
 if(Object.keys(values).some(key=>!allowed.includes(key))||allowed.some(key=>!Object.hasOwn(values,key)))fail('ARGUMENT_NOT_ALLOWLISTED');
 if(mode==='replica'&&!REPLICAS.has(values.replica))fail('REPLICA_NOT_ALLOWLISTED');
 return values;
}

function manifestEntries(root,excluded=new Set(['manifest.json'])){
 const entries=[];
 const visit=dir=>{for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name),relative=path.relative(root,file).split(path.sep).join('/'),stat=fs.lstatSync(file);if(stat.isSymbolicLink())fail('EVIDENCE_SYMLINK',relative);if(stat.isDirectory())visit(file);else if(stat.isFile()&&!excluded.has(relative)){const raw=fs.readFileSync(file);entries.push({sha256:sha256(raw),byte_length:raw.length,relative_path:relative});}else if(!stat.isFile())fail('EVIDENCE_NONREGULAR',relative);}};visit(root);return entries;
}
export function writePartialManifest(root,status='PARTIAL'){ensureDir(root);const value={schema_version:'janus-ci-evidence-manifest-v1',status,entries:manifestEntries(root,new Set(['manifest.json','manifest.partial.json']))};writeJson(path.join(root,'manifest.partial.json'),value);return value;}
export function finalizeManifest(root){const value={schema_version:'janus-ci-evidence-manifest-v1',status:'FINAL',entries:manifestEntries(root)};writeJson(path.join(root,'manifest.json'),value);return value;}
export function verifyManifest(root){
 const file=path.join(root,'manifest.json');if(!fs.existsSync(file))fail('MANIFEST_MISSING');const value=readJson(file);exactKeys(value,['schema_version','status','entries'],'MANIFEST_FIELDS');if(value.schema_version!=='janus-ci-evidence-manifest-v1'||value.status!=='FINAL'||!Array.isArray(value.entries))fail('MANIFEST_IDENTITY');
 const seen=new Set();for(const entry of value.entries){exactKeys(entry,['sha256','byte_length','relative_path'],'MANIFEST_ENTRY_FIELDS');if(seen.has(entry.relative_path))fail('MANIFEST_DUPLICATE');seen.add(entry.relative_path);const target=path.resolve(root,...entry.relative_path.split('/'));if(!target.startsWith(path.resolve(root)+path.sep)||!fs.statSync(target).isFile())fail('MANIFEST_PATH');const raw=fs.readFileSync(target);if(raw.length!==entry.byte_length||sha256(raw)!==entry.sha256)fail('MANIFEST_MISMATCH',entry.relative_path);}
 const actual=manifestEntries(root);if(stable(actual)!==stable(value.entries))fail('MANIFEST_INVENTORY');return value;
}
function verifySuccessfulPartialManifest(root){const file=path.join(root,'manifest.partial.json');if(!fs.existsSync(file))fail('PARTIAL_MANIFEST_MISSING');const value=readJson(file);exactKeys(value,['schema_version','status','entries'],'PARTIAL_MANIFEST_FIELDS');if(value.schema_version!=='janus-ci-evidence-manifest-v1'||value.status!=='PARTIAL'||!Array.isArray(value.entries))fail('PARTIAL_MANIFEST_IDENTITY');const actual=manifestEntries(root,new Set(['manifest.json','manifest.partial.json','summary.json']));if(stable(value.entries)!==stable(actual))fail('PARTIAL_MANIFEST_INVENTORY');return value;}

function terminateProcessGroup(child,signal){try{process.kill(process.platform==='win32'?child.pid:-child.pid,signal);}catch{}}
export async function runRecordedCommand({id,args,cwd,evidenceDir,expectedExit,timeoutMs,maxOutputBytes=DEFAULT_OUTPUT_LIMIT,outcomeErrorCode='COMMAND_EXIT'}){
 if(!id||!Array.isArray(args)||!args.length||args.some(x=>typeof x!=='string'))fail('COMMAND_INVALID');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<=0||!Number.isSafeInteger(maxOutputBytes)||maxOutputBytes<=0)fail('COMMAND_LIMIT_INVALID');
 const dir=path.join(evidenceDir,'commands',id);ensureDir(dir);writeJson(path.join(dir,'command.json'),{args,cwd});
 const started=new Date().toISOString();let timedOut=false,outputLimit=false,timeoutHandle,killHandle;
 const result=await new Promise(resolve=>{
  let settled=false;const finish=value=>{if(!settled){settled=true;resolve(value);}};
  const child=spawn(args[0],args.slice(1),{cwd,env:process.env,shell:false,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});const stdout=[],stderr=[];
  let stdoutBytes=0,stderrBytes=0;
  const retain=(chunks,chunk,stream)=>{const used=stream==='stdout'?stdoutBytes:stderrBytes,remaining=Math.max(0,maxOutputBytes-used);if(remaining)chunks.push(chunk.subarray(0,remaining));if(stream==='stdout')stdoutBytes+=Math.min(chunk.length,remaining);else stderrBytes+=Math.min(chunk.length,remaining);if(chunk.length>remaining&&!outputLimit){outputLimit=true;terminateProcessGroup(child,'SIGTERM');killHandle=setTimeout(()=>terminateProcessGroup(child,'SIGKILL'),1000);}};
  child.stdout.on('data',chunk=>retain(stdout,chunk,'stdout'));child.stderr.on('data',chunk=>retain(stderr,chunk,'stderr'));child.on('error',error=>finish({code:null,signal:null,stdout:Buffer.concat(stdout),stderr:Buffer.concat(stderr),spawnError:String(error.message||error)}));
  timeoutHandle=setTimeout(()=>{timedOut=true;terminateProcessGroup(child,'SIGTERM');killHandle=setTimeout(()=>terminateProcessGroup(child,'SIGKILL'),1000);},timeoutMs);
  child.on('close',(code,signal)=>finish({code,signal,stdout:Buffer.concat(stdout),stderr:Buffer.concat(stderr),spawnError:null}));
 });
 clearTimeout(timeoutHandle);clearTimeout(killHandle);fs.writeFileSync(path.join(dir,'stdout.raw'),result.stdout);fs.writeFileSync(path.join(dir,'stderr.raw'),result.stderr);
 const metadata={exit:result.code,signal:result.signal,timeout:timedOut,output_limit:outputLimit,spawn_error:result.spawnError,expected_exit:expectedExit,started_utc:started,ended_utc:new Date().toISOString(),stdout:{bytes:result.stdout.length,sha256:sha256(result.stdout)},stderr:{bytes:result.stderr.length,sha256:sha256(result.stderr)}};writeJson(path.join(dir,'result.json'),metadata);writePartialManifest(evidenceDir);
 if(result.spawnError)fail('COMMAND_SPAWN',id);if(outputLimit)fail('COMMAND_OUTPUT_LIMIT',id);if(timedOut)fail('COMMAND_TIMEOUT',id);if(result.code!==expectedExit||result.signal!==null)fail(outcomeErrorCode,id);return{...metadata,stdout:result.stdout,stderr:result.stderr};
}

function singleInteger(lines,label){const matches=lines.map(line=>line.match(new RegExp(`^# ${label} (\\d+)$`))).filter(Boolean);if(matches.length!==1)fail('TAP_COUNT_FIELD',label);return Number(matches[0][1]);}
export function parseTap(buffer,expected){
 const text=decodeUtf8(Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer),'TAP_UTF8');const lines=text.split(/\r?\n/);if(lines.some(line=>/^\s*not ok\b/.test(line)))fail('TAP_NOT_OK');
 const plans=lines.map(line=>line.match(/^1\.\.(\d+)$/)).filter(Boolean);if(plans.length!==1)fail('TAP_PLAN');const plan=Number(plans[0][1]);const counts=Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(key=>[key,singleInteger(lines,key)]));
 if(plan!==expected||counts.tests!==expected||counts.pass!==expected||counts.fail||counts.cancelled||counts.skipped||counts.todo)fail('TAP_COUNTS');
 const tests=[];for(const line of lines){const match=line.match(/^(ok|not ok) (\d+) - (.*?)(?: # .*)?$/);if(match)tests.push({status:match[1],ordinal:Number(match[2]),name:match[3]});}
 if(tests.length!==expected||tests.some((item,index)=>item.status!=='ok'||item.ordinal!==index+1))fail('TAP_RESULTS');return{plan,counts,tests};
}
export function validateCheckSchemas(buffer){const value=JSON.parse(decodeUtf8(buffer,'SCHEMA_JSON_UTF8'));if(value.classification!=='SCHEMA_FOUNDATION_PASS_NOT_CONFORMANCE'||value.schema_count!==6||value.fixture_count!==42||value.conformance_claimed!==false||!Array.isArray(value.results)||value.results.length!==42||value.results.some(item=>item.result!=='PASS'))fail('SCHEMA_RESULT');return{classification:value.classification,schema_count:6,fixture_count:42,all_results_pass:true,conformance_claimed:false};}
export function validateCheckStateful(buffer){const value=JSON.parse(decodeUtf8(buffer,'STATEFUL_JSON_UTF8'));if(value.classification!=='STATEFUL_HISTORY_REFERENCE_FOUNDATION'||value.scenario_count!==57||value.scenario_runs_passed!==57||value.stateful_complete_requirements!==31||value.stateful_projection_requirements!==7||value.technical_verdict!=='NOT_EVALUATED'||value.conformance_claimed!==false||!Array.isArray(value.results)||value.results.length!==57)fail('STATEFUL_RESULT');return{classification:value.classification,scenario_count:57,scenario_runs_passed:57,stateful_complete_requirements:31,stateful_projection_requirements:7,technical_verdict:'NOT_EVALUATED',conformance_claimed:false};}
export function validateBaseline(buffer,exit){const value=JSON.parse(decodeUtf8(buffer,'BASELINE_JSON_UTF8'));const expected={baseline_classification:'EXPECTED_INCOMPLETE',atomic_requirements_total:156,structurally_complete_requirements:19,statefully_complete_requirements:31,requirement_complete_total:50,schema_projection_covered_requirements:10,stateful_projection_covered_requirements:7,technical_verdict:'NOT_EVALUATED',conformance_claimed:false};if(exit!==1||Object.entries(expected).some(([key,val])=>value[key]!==val))fail('BASELINE_RESULT');return expected;}
export function validateArtifactDigest(value){if(typeof value!=='string'||!ARTIFACT_DIGEST.test(value))fail('ARTIFACT_DIGEST_INVALID');return value;}
export function validateCommandOutcome(result,expectedExit,{stderrEmpty=true}={}){if(!result||result.exit!==expectedExit||(Object.hasOwn(result,'expected_exit')&&result.expected_exit!==expectedExit)||result.signal!==null||result.timeout!==false||result.output_limit===true||result.spawn_error)fail('COMMAND_OUTCOME');if(stderrEmpty&&result.stderr?.length)fail('COMMAND_STDERR');return true;}
export function validateNpmCiArgs(args){
 const fixed=['ci','--ignore-scripts','--no-audit','--no-fund','--update-notifier=false','--engine-strict','--loglevel=silent'];if(args.length!==14||args[0]!=='npm'||stable(args.slice(1,8))!==stable(fixed)||args[8]!=='--cache'||args[10]!=='--userconfig'||args[12]!=='--globalconfig')fail('NPM_CI_FLAGS');
 for(const flag of fixed.slice(1))if(args.filter(value=>value===flag).length!==1)fail('NPM_CI_FLAGS');
 for(const flag of ['--cache','--userconfig','--globalconfig']){const indexes=args.flatMap((value,index)=>value===flag?[index]:[]);if(indexes.length!==1||!args[indexes[0]+1])fail('NPM_CI_CONFIG');}
 const user=args[args.indexOf('--userconfig')+1],global=args[args.indexOf('--globalconfig')+1];if(user===global)fail('NPM_CI_CONFIG');return true;
}
export function validateNpmCiResult(result){
 if(!result||result.exit!==0||result.expected_exit!==0||result.signal!==null||result.timeout!==false||result.output_limit!==false||result.spawn_error!==null)fail('NPM_CI_OUTCOME_INVALID');
 if(!Buffer.isBuffer(result.stdout)||result.stdout.length!==0)fail('NPM_CI_STDOUT_NONEMPTY');if(!Buffer.isBuffer(result.stderr)||result.stderr.length!==0)fail('NPM_CI_STDERR_NONEMPTY');return true;
}
export function validateNpmVersionResult(result){validateCommandOutcome(result,0);const value=decodeUtf8(result.stdout,'NPM_VERSION_UTF8'),trimmed=value.endsWith('\n')?value.slice(0,-1):value;if(value!==trimmed&&value!==`${trimmed}\n`||!SEMVER.test(trimmed))fail('NPM_VERSION_INVALID');return trimmed;}
function assertNoProblemFlags(value){if(!value||typeof value!=='object'||Array.isArray(value))fail('NPM_LS_VALUE');for(const key of ['missing','invalid','extraneous','problems'])if(Object.hasOwn(value,key))fail('NPM_LS_PROBLEM');}
export function normalizeNpmLs(buffer,expectedRootPath){
 let root;try{root=JSON.parse(decodeUtf8(buffer,'NPM_LS_UTF8'));}catch(error){if(error instanceof CIEvidenceError)throw error;fail('NPM_LS_JSON');}assertNoProblemFlags(root);const rootAllowed=['name','version','dependencies','path'];if(Object.keys(root).some(key=>!rootAllowed.includes(key))||root.name!=='janus-core-conformance'||root.version!=='0.0.0'||!root.dependencies)fail('NPM_LS_ROOT');
 const normalizeDependencies=dependencies=>{if(!dependencies||typeof dependencies!=='object'||Array.isArray(dependencies))fail('NPM_LS_DEPENDENCIES');const result={};for(const name of Object.keys(dependencies).sort()){const item=dependencies[name];assertNoProblemFlags(item);const allowed=['version','resolved','overridden','dependencies'];if(Object.keys(item).some(key=>!allowed.includes(key))||typeof item.version!=='string'||(Object.hasOwn(item,'resolved')&&typeof item.resolved!=='string')||(Object.hasOwn(item,'overridden')&&typeof item.overridden!=='boolean'))fail('NPM_LS_NODE');result[name]={version:item.version};if(Object.hasOwn(item,'resolved'))result[name].resolved=item.resolved;if(Object.hasOwn(item,'overridden'))result[name].overridden=item.overridden;if(item.dependencies)result[name].dependencies=normalizeDependencies(item.dependencies);}return result;};
 const normalized={name:root.name,version:root.version,dependencies:normalizeDependencies(root.dependencies)};if(Object.hasOwn(root,'path')){if(typeof root.path!=='string'||!path.isAbsolute(root.path)||typeof expectedRootPath!=='string'||!path.isAbsolute(expectedRootPath)||path.resolve(root.path)!==path.resolve(expectedRootPath))fail('NPM_LS_ROOT_PATH');normalized.path='ROOT_TEMPORARY_PATH';}return normalized;
}
function validateNpmLsCommand(value){
 exactKeys(value,['args','cwd'],'COMMAND_DOCUMENT_FIELDS');const {args,cwd}=value;if(!Array.isArray(args)||args.some(item=>typeof item!=='string')||typeof cwd!=='string'||!path.isAbsolute(cwd))fail('NPM_LS_COMMAND');
 const fixed=['npm','ls','--all','--json'];if(args.length!==10||stable(args.slice(0,4))!==stable(fixed)||args[4]!=='--cache'||args[6]!=='--userconfig'||args[8]!=='--globalconfig')fail('NPM_LS_COMMAND');
 const configs=[args[5],args[7],args[9]];if(configs.some(item=>!path.isAbsolute(item))||new Set(configs).size!==configs.length)fail('NPM_LS_COMMAND');return cwd;
}
export function validateNpmCiArtifact(root){
 const dir=path.join(root,'commands','npm-ci'),stdoutFile=path.join(dir,'stdout.raw'),stderrFile=path.join(dir,'stderr.raw'),resultFile=path.join(dir,'result.json');if(!fs.existsSync(stdoutFile)||!fs.existsSync(stderrFile))fail('NPM_CI_RAW_MISSING');if(!fs.existsSync(resultFile))fail('NPM_CI_OUTCOME_INVALID');
 let result;try{result=readJson(resultFile);}catch{fail('NPM_CI_OUTCOME_INVALID');}exactKeys(result,RESULT_KEYS,'NPM_CI_OUTCOME_INVALID');exactKeys(result.stdout,['bytes','sha256'],'NPM_CI_STREAM_BINDING_INVALID');exactKeys(result.stderr,['bytes','sha256'],'NPM_CI_STREAM_BINDING_INVALID');const stdout=fs.readFileSync(stdoutFile),stderr=fs.readFileSync(stderrFile);
 if(result.stdout.bytes!==stdout.length||result.stdout.sha256!==sha256(stdout)||result.stderr.bytes!==stderr.length||result.stderr.sha256!==sha256(stderr))fail('NPM_CI_STREAM_BINDING_INVALID');if(result.exit!==0||result.expected_exit!==0||result.signal!==null||result.timeout!==false||result.output_limit!==false||result.spawn_error!==null)fail('NPM_CI_OUTCOME_INVALID');if(stdout.length||result.stdout.sha256!==EMPTY_SHA256)fail('NPM_CI_STDOUT_NONEMPTY');if(stderr.length||result.stderr.sha256!==EMPTY_SHA256)fail('NPM_CI_STDERR_NONEMPTY');return true;
}

function collectGraph(dependencies,result={}){for(const[name,value]of Object.entries(dependencies||{})){if(result[name]&&result[name]!==value.version)fail('DEPENDENCY_VERSION_CONFLICT');result[name]=value.version;collectGraph(value.dependencies,result);}return result;}
function validateDependencyGraph(archiveRoot,npmLs){const lock=readJson(path.join(archiveRoot,'tools/core-conformance/package-lock.json'));if(lock.lockfileVersion!==3)fail('LOCKFILE_VERSION');const graph=collectGraph(npmLs.dependencies);if(stable(graph)!==stable(EXPECTED_PACKAGES))fail('DEPENDENCY_GRAPH');for(const[name,version]of Object.entries(EXPECTED_PACKAGES)){const pkg=readJson(path.join(archiveRoot,'tools/core-conformance/node_modules',name,'package.json'));if(pkg.version!==version)fail('INSTALLED_VERSION');for(const key of LIFECYCLE_SCRIPTS)if(pkg.scripts?.[key])fail('LIFECYCLE_SCRIPT');}return graph;}
export function runSyncBounded({command,args,cwd,timeoutMs=SYNC_TIMEOUT_MAX,maxBuffer=SYNC_MAX_BUFFER,stderrEmpty=true}){if(typeof command!=='string'||!Array.isArray(args)||typeof cwd!=='string'||!path.isAbsolute(cwd)||!Number.isSafeInteger(timeoutMs)||timeoutMs<=0||timeoutMs>SYNC_TIMEOUT_MAX||!Number.isSafeInteger(maxBuffer)||maxBuffer<=0)fail('SYNC_ARGUMENT_INVALID');const sync=spawnSync(command,args,{cwd,encoding:'utf8',shell:false,timeout:timeoutMs,killSignal:'SIGKILL',maxBuffer});if(sync.error){if(sync.error.code==='ETIMEDOUT')fail('SYNC_TIMEOUT');if(sync.error.code==='ENOBUFS')fail('SYNC_MAX_BUFFER');fail('SYNC_EXEC_ERROR');}if(sync.signal)fail('SYNC_SIGNAL');if(sync.status===null)fail('SYNC_STATUS_INVALID');if(stderrEmpty&&sync.stderr!=='')fail('SYNC_STDERR');return{status:sync.status,stdout:sync.stdout,stderr:sync.stderr};}
function currentGitState(root){const result=runSyncBounded({command:'git',args:['status','--porcelain=v1','--untracked-files=all'],cwd:root});if(result.status!==0)fail('GIT_STATUS');return result.stdout;}
function fileHashes(source){const files={workflow:'.github/workflows/gate-2-evidence.yml',runner:'tools/core-conformance/ci-gate2-evidence.mjs',test:'tools/core-conformance/test/ci-gate2-evidence.test.mjs',package:'tools/core-conformance/package.json',lock:'tools/core-conformance/package-lock.json'};return Object.fromEntries(Object.entries(files).map(([key,relative])=>[key,hashFile(path.join(source,relative))]));}
function runnerMetadata(){return{image_os:process.env.ImageOS||'',image_version:process.env.ImageVersion||'',node_version:process.version,npm_version:'',runner_arch:process.env.RUNNER_ARCH||'',runner_environment:process.env.RUNNER_ENVIRONMENT||'',runner_name:process.env.RUNNER_NAME||'',runner_os:process.env.RUNNER_OS||''};}
function verifyExpectedHashes(hashes,args){for(const[key,arg]of [['workflow','expected-workflow-sha'],['runner','expected-runner-sha'],['test','expected-test-sha']]){assertHash(args[arg],arg);if(hashes[key]!==args[arg])fail('REVIEWED_HASH_MISMATCH',key);}}
const sameOrNested=(candidate,root)=>candidate===root||candidate.startsWith(root+path.sep);
function resolvedCandidate(candidate){let ancestor=candidate;const suffix=[];while(!fs.existsSync(ancestor)){const parent=path.dirname(ancestor);if(parent===ancestor)break;suffix.unshift(path.basename(ancestor));ancestor=parent;}const real=fs.realpathSync(ancestor);return path.join(real,...suffix);}
function validateWorkRootPaths({runnerTemp,workRoot,source,evidence}){if(!path.isAbsolute(runnerTemp)||!fs.existsSync(runnerTemp)||!fs.statSync(runnerTemp).isDirectory())fail('RUNNER_TEMP_INVALID');const realRunner=fs.realpathSync(runnerTemp),resolvedWork=path.resolve(workRoot),realCandidate=resolvedCandidate(resolvedWork),sourceResolved=resolvedCandidate(path.resolve(source)),evidenceResolved=resolvedCandidate(path.resolve(evidence));if(resolvedWork===path.parse(resolvedWork).root||['/tmp','/private/tmp'].includes(resolvedWork)||realCandidate===realRunner||!sameOrNested(realCandidate,realRunner)||realCandidate===realRunner)fail('WORK_ROOT_UNSAFE');for(const protectedPath of [sourceResolved,evidenceResolved])if(sameOrNested(realCandidate,protectedPath)||sameOrNested(protectedPath,realCandidate))fail('WORK_ROOT_OVERLAP');return{realRunner,realWorkRoot:realCandidate,sourceResolved,evidenceResolved};}
export function prepareWorkRoot({runnerTemp,workRoot,source,evidence}){const paths=validateWorkRootPaths({runnerTemp,workRoot,source,evidence});if(fs.existsSync(workRoot))fail('WORK_ROOT_EXISTS');fs.mkdirSync(workRoot,{recursive:false,mode:0o700});const stat=fs.statSync(workRoot),token=crypto.randomUUID(),sentinel=path.join(workRoot,SENTINEL_NAME),payload={schema_version:'janus-ci-work-root-sentinel-v1',token,work_root:paths.realWorkRoot};writeJson(sentinel,payload);return{...paths,workRoot:path.resolve(workRoot),sentinel,token,uid:Number.isInteger(stat.uid)?stat.uid:null};}
export function cleanupWorkRoot(guard){if(!guard||!fs.existsSync(guard.workRoot))fail('WORK_ROOT_CLEANUP_GUARD');const stat=fs.lstatSync(guard.workRoot);if(stat.isSymbolicLink()||!stat.isDirectory()||fs.realpathSync(guard.workRoot)!==guard.realWorkRoot||!sameOrNested(guard.realWorkRoot,guard.realRunner)||guard.realWorkRoot===guard.realRunner)fail('WORK_ROOT_CLEANUP_GUARD');if(guard.uid!==null&&stat.uid!==guard.uid)fail('WORK_ROOT_OWNER');if(!fs.existsSync(guard.sentinel)||fs.lstatSync(guard.sentinel).isSymbolicLink()||!fs.statSync(guard.sentinel).isFile())fail('WORK_ROOT_SENTINEL');let value;try{value=readJson(guard.sentinel);}catch{fail('WORK_ROOT_SENTINEL');}if(stable(value)!==stable({schema_version:'janus-ci-work-root-sentinel-v1',token:guard.token,work_root:guard.realWorkRoot}))fail('WORK_ROOT_SENTINEL');validateWorkRootPaths({runnerTemp:guard.realRunner,workRoot:guard.realWorkRoot,source:guard.sourceResolved,evidence:guard.evidenceResolved});fs.rmSync(guard.workRoot,{recursive:true,force:false});if(fs.existsSync(guard.workRoot))fail('WORK_ROOT_CLEANUP');return true;}

async function replicaMode(args){
 const source=path.resolve(args.source),workRoot=path.resolve(args['work-root']),evidence=path.resolve(args.evidence),runnerTemp=process.env.RUNNER_TEMP;if(!runnerTemp||!path.isAbsolute(runnerTemp))fail('RUNNER_TEMP_INVALID');validateWorkRootPaths({runnerTemp,workRoot,source,evidence});if(process.env.GITHUB_RUN_ATTEMPT!=='1')fail('RERUN_REJECTED');
 ensureDir(evidence);writePartialManifest(evidence,'INITIAL');const started=new Date().toISOString();let summary,workGuard;
 try{
  const hashes=fileHashes(source);verifyExpectedHashes(hashes,args);validateGitObjectId(args['expected-tree'],'expected-tree');
  if(process.version!=='v24.13.1')fail('NODE_VERSION_MISMATCH');
  if(currentGitState(source)!=='')fail('CHECKOUT_DIRTY_BEFORE');const commit=validateGitObjectId(process.env.GITHUB_SHA||'','GITHUB_SHA');
  const treeResult=runSyncBounded({command:'git',args:['rev-parse',`${commit}^{tree}`],cwd:source});if(treeResult.status!==0||treeResult.stdout.trim()!==args['expected-tree'])fail('TREE_MISMATCH');
  workGuard=prepareWorkRoot({runnerTemp,workRoot,source,evidence});const archiveTar=path.join(workRoot,'source.tar'),archiveRoot=path.join(workRoot,'archive'),npmCwd=path.join(archiveRoot,'tools/core-conformance'),cache=path.join(workRoot,'npm-cache'),userNpmrc=path.join(workRoot,'user.npmrc'),globalNpmrc=path.join(workRoot,'global.npmrc');ensureDir(archiveRoot);fs.writeFileSync(userNpmrc,'');fs.writeFileSync(globalNpmrc,'');
  await runRecordedCommand({id:'git-archive',args:['git','archive','--format=tar',`--output=${archiveTar}`,commit],cwd:source,evidenceDir:evidence,expectedExit:0,timeoutMs:120000});
  await runRecordedCommand({id:'tar-extract',args:['tar','--extract','--file',archiveTar,'--directory',archiveRoot,'--no-same-owner'],cwd:workRoot,evidenceDir:evidence,expectedExit:0,timeoutMs:120000});
  const archiveHashes=fileHashes(archiveRoot);if(stable(archiveHashes)!==stable(hashes))fail('ARCHIVE_HASH_MISMATCH');
  const npmCiArgs=['npm','ci','--ignore-scripts','--no-audit','--no-fund','--update-notifier=false','--engine-strict','--loglevel=silent','--cache',cache,'--userconfig',userNpmrc,'--globalconfig',globalNpmrc];validateNpmCiArgs(npmCiArgs);const npmCi=await runRecordedCommand({id:'npm-ci',args:npmCiArgs,cwd:npmCwd,evidenceDir:evidence,expectedExit:0,timeoutMs:900000,outcomeErrorCode:'NPM_CI_OUTCOME_INVALID'});validateNpmCiResult(npmCi);
  const npmVersion=await runRecordedCommand({id:'npm-version',args:['npm','--version'],cwd:npmCwd,evidenceDir:evidence,expectedExit:0,timeoutMs:30000});
  const npmLs=await runRecordedCommand({id:'npm-ls',args:['npm','ls','--all','--json','--cache',cache,'--userconfig',userNpmrc,'--globalconfig',globalNpmrc],cwd:npmCwd,evidenceDir:evidence,expectedExit:0,timeoutMs:120000});
  const npmVersionValue=validateNpmVersionResult(npmVersion);validateCommandOutcome(npmLs,0);const normalizedNpmLs=normalizeNpmLs(npmLs.stdout,npmCwd),graph=validateDependencyGraph(archiveRoot,normalizedNpmLs);const normalized={},commandResults={},deterministic={};
  for(const command of COMMANDS){const result=await runRecordedCommand({id:command.id,args:command.args,cwd:archiveRoot,evidenceDir:evidence,expectedExit:command.exit,timeoutMs:300000});validateCommandOutcome(result,command.exit);commandResults[command.id]={exit:result.exit,signal:result.signal,timeout:result.timeout};if(command.kind==='tap')normalized[command.id]=parseTap(result.stdout,EXPECTED_TAP[command.id]);else if(command.kind==='schema-json'){normalized[command.id]=validateCheckSchemas(result.stdout);deterministic[command.id]=sha256(result.stdout);}else if(command.kind==='stateful-json'){normalized[command.id]=validateCheckStateful(result.stdout);deterministic[command.id]=sha256(result.stdout);}else{normalized[command.id]=validateBaseline(result.stdout,result.exit);deterministic[command.id]=sha256(result.stdout);}}
  const postHashes=fileHashes(archiveRoot);if(stable(postHashes)!==stable(hashes))fail('ARCHIVE_SOURCE_CHANGED');if(currentGitState(source)!=='')fail('CHECKOUT_DIRTY_AFTER');
  const metadata=runnerMetadata();metadata.npm_version=npmVersionValue;
  cleanupWorkRoot(workGuard);workGuard=null;
  summary={schema_version:'janus-ci-gate2-replica-summary-v1',status:'PASS_NOT_CONFORMANCE',replica_id:args.replica,commit,tree:args['expected-tree'],hashes,lockfile_version:3,package_versions:EXPECTED_PACKAGES,dependency_graph:graph,runner_metadata:metadata,timestamps:{started_utc:started,ended_utc:new Date().toISOString()},paths:{work_root:'RUNNER_TEMP_TASK_SPECIFIC',evidence:'RUNNER_TEMP_EVIDENCE'},command_results:commandResults,normalized_results:normalized,deterministic_outputs:deterministic,checkout_clean:true};writeJson(path.join(evidence,'summary.json'),summary);finalizeManifest(evidence);return summary;
 }catch(error){let finalError=error;if(workGuard&&fs.existsSync(workRoot)){try{cleanupWorkRoot(workGuard);}catch(cleanupError){finalError=cleanupError;}}try{writeJson(path.join(evidence,'failure.json'),{status:'FAILED',code:finalError.code||'UNEXPECTED',message:String(finalError.message||finalError),ended_utc:new Date().toISOString()});finalizeManifest(evidence);}catch{}throw finalError;}
}

function validateTapSummary(value,expected){exactKeys(value,['counts','plan','tests'],'TAP_SUMMARY_FIELDS');exactKeys(value.counts,['cancelled','fail','pass','skipped','tests','todo'],'TAP_COUNT_FIELDS');if(value.plan!==expected||value.counts.tests!==expected||value.counts.pass!==expected||value.counts.fail!==0||value.counts.cancelled!==0||value.counts.skipped!==0||value.counts.todo!==0||!Array.isArray(value.tests)||value.tests.length!==expected)fail('TAP_SUMMARY_VALUE');for(const[item,index]of value.tests.map((item,index)=>[item,index])){exactKeys(item,['name','ordinal','status'],'TAP_TEST_FIELDS');if(item.status!=='ok'||item.ordinal!==index+1||typeof item.name!=='string')fail('TAP_TEST_VALUE');}}
function validateSummaryShape(summary,expectedReplica){
 exactKeys(summary,SUMMARY_KEYS,'SUMMARY_FIELDS');exactKeys(summary.hashes,HASH_KEYS,'SUMMARY_HASH_FIELDS');exactKeys(summary.package_versions,Object.keys(EXPECTED_PACKAGES),'SUMMARY_PACKAGE_FIELDS');exactKeys(summary.dependency_graph,Object.keys(EXPECTED_PACKAGES),'SUMMARY_GRAPH_FIELDS');exactKeys(summary.runner_metadata,RUNNER_METADATA_KEYS,'RUNNER_METADATA_FIELDS');exactKeys(summary.timestamps,['ended_utc','started_utc'],'SUMMARY_TIMESTAMP_FIELDS');exactKeys(summary.paths,['evidence','work_root'],'SUMMARY_PATH_FIELDS');exactKeys(summary.command_results,GOVERNED_COMMAND_IDS,'SUMMARY_COMMAND_FIELDS');exactKeys(summary.normalized_results,GOVERNED_COMMAND_IDS,'SUMMARY_NORMALIZED_FIELDS');exactKeys(summary.deterministic_outputs,['check-schemas','check-stateful','run'],'SUMMARY_DETERMINISTIC_FIELDS');
 for(const[id,value]of Object.entries(summary.command_results)){exactKeys(value,['exit','signal','timeout'],'SUMMARY_COMMAND_RESULT_FIELDS');const expected=COMMANDS.find(command=>command.id===id).exit;if(value.exit!==expected||value.signal!==null||value.timeout!==false)fail('SUMMARY_COMMAND_RESULT_VALUE');}
 for(const id of TAP_COMMAND_IDS)validateTapSummary(summary.normalized_results[id],EXPECTED_TAP[id]);
 exactKeys(summary.normalized_results['check-schemas'],['all_results_pass','classification','conformance_claimed','fixture_count','schema_count'],'SUMMARY_SCHEMA_FIELDS');
 exactKeys(summary.normalized_results['check-stateful'],['classification','conformance_claimed','scenario_count','scenario_runs_passed','stateful_complete_requirements','stateful_projection_requirements','technical_verdict'],'SUMMARY_STATEFUL_FIELDS');
 exactKeys(summary.normalized_results.run,Object.keys(baselineShape()),'SUMMARY_BASELINE_FIELDS');
 const schema=summary.normalized_results['check-schemas'],stateful=summary.normalized_results['check-stateful'],baseline=summary.normalized_results.run;
 if(schema.classification!=='SCHEMA_FOUNDATION_PASS_NOT_CONFORMANCE'||schema.schema_count!==6||schema.fixture_count!==42||schema.all_results_pass!==true||schema.conformance_claimed!==false)fail('SUMMARY_SCHEMA_VALUE');
 if(stateful.classification!=='STATEFUL_HISTORY_REFERENCE_FOUNDATION'||stateful.scenario_count!==57||stateful.scenario_runs_passed!==57||stateful.stateful_complete_requirements!==31||stateful.stateful_projection_requirements!==7||stateful.technical_verdict!=='NOT_EVALUATED'||stateful.conformance_claimed!==false)fail('SUMMARY_STATEFUL_VALUE');
 const expectedBaseline=validateBaseline(Buffer.from(JSON.stringify(baseline)),1);if(stable(baseline)!==stable(expectedBaseline))fail('SUMMARY_BASELINE_VALUE');
 for(const value of Object.values(summary.hashes))assertHash(value,'summary-hash');for(const value of Object.values(summary.deterministic_outputs))assertHash(value,'deterministic-output');validateGitObjectId(summary.commit,'summary-commit');validateGitObjectId(summary.tree,'summary-tree');
 if(stable(summary.package_versions)!==stable(EXPECTED_PACKAGES)||stable(summary.dependency_graph)!==stable(EXPECTED_PACKAGES)||summary.lockfile_version!==3||summary.checkout_clean!==true||summary.paths.work_root!=='RUNNER_TEMP_TASK_SPECIFIC'||summary.paths.evidence!=='RUNNER_TEMP_EVIDENCE'||summary.runner_metadata.node_version!=='v24.13.1'||!summary.runner_metadata.npm_version)fail('SUMMARY_VALUE');
 if(summary.replica_id!==expectedReplica||summary.schema_version!=='janus-ci-gate2-replica-summary-v1'||summary.status!=='PASS_NOT_CONFORMANCE')fail('SUMMARY_IDENTITY');
}
function baselineShape(){return{baseline_classification:null,atomic_requirements_total:null,structurally_complete_requirements:null,statefully_complete_requirements:null,requirement_complete_total:null,schema_projection_covered_requirements:null,stateful_projection_covered_requirements:null,technical_verdict:null,conformance_claimed:null};}
function expectedEvidencePaths(){return['manifest.partial.json','summary.json',...ALL_COMMAND_IDS.flatMap(id=>['command.json','result.json','stderr.raw','stdout.raw'].map(name=>`commands/${id}/${name}`))].sort();}
function normalizeTemporaryString(value){return value.replaceAll('replica-1','REPLICA').replaceAll('replica-2','REPLICA');}
function normalizeTapDurations(buffer){return decodeUtf8(buffer,'TAP_COMPARE_UTF8').replace(/(^\s*(?:# )?duration_ms(?::|\s))\s*[0-9.]+\s*$/gm,'$1 DURATION');}
function comparableCommand(file,id){const value=readJson(file);exactKeys(value,['args','cwd'],'COMMAND_DOCUMENT_FIELDS');if(!Array.isArray(value.args)||value.args.some(item=>typeof item!=='string')||typeof value.cwd!=='string')fail('COMMAND_DOCUMENT_VALUE');return{args:value.args.map(normalizeTemporaryString),cwd:normalizeTemporaryString(value.cwd),id};}
function readArtifactCommand(root,id){const dir=path.join(root,'commands',id),resultFile=path.join(dir,'result.json'),stdoutFile=path.join(dir,'stdout.raw'),stderrFile=path.join(dir,'stderr.raw');if(!fs.existsSync(resultFile)||!fs.existsSync(stdoutFile)||!fs.existsSync(stderrFile))fail('ARTIFACT_COMMAND_MISSING',id);const result=readJson(resultFile),stdout=fs.readFileSync(stdoutFile),stderr=fs.readFileSync(stderrFile);exactKeys(result,RESULT_KEYS,'RESULT_DOCUMENT_FIELDS');exactKeys(result.stdout,['bytes','sha256'],'RESULT_STDOUT_FIELDS');exactKeys(result.stderr,['bytes','sha256'],'RESULT_STDERR_FIELDS');for(const[stream,raw]of [['stdout',stdout],['stderr',stderr]])if(result[stream].bytes!==raw.length||result[stream].sha256!==sha256(raw))fail('RESULT_STREAM_BINDING');return{...result,stdout,stderr};}
function comparableResult(file,id,commandRoot){const root=path.dirname(path.dirname(commandRoot)),value=readArtifactCommand(root,id),copy=structuredClone(value);delete copy.stdout;delete copy.stderr;const document=readJson(file);copy.stdout=document.stdout;copy.stderr=document.stderr;delete copy.started_utc;delete copy.ended_utc;if(TAP_COMMAND_IDS.has(id)||id==='npm-ls')delete copy.stdout;return copy;}
function validateOperationalArtifact(root){const npmCiCommand=readJson(path.join(root,'commands','npm-ci','command.json'));exactKeys(npmCiCommand,['args','cwd'],'COMMAND_DOCUMENT_FIELDS');validateNpmCiArgs(npmCiCommand.args);validateNpmCiArtifact(root);const version=readArtifactCommand(root,'npm-version');validateNpmVersionResult(version);const npmLsCommand=readJson(path.join(root,'commands','npm-ls','command.json')),npmCwd=validateNpmLsCommand(npmLsCommand),npmLs=readArtifactCommand(root,'npm-ls');validateCommandOutcome(npmLs,0);return normalizeNpmLs(npmLs.stdout,npmCwd);}
function compareClosedArtifacts(leftRoot,rightRoot,leftManifest,rightManifest){
 verifySuccessfulPartialManifest(leftRoot);verifySuccessfulPartialManifest(rightRoot);
 const leftNpmLs=validateOperationalArtifact(leftRoot),rightNpmLs=validateOperationalArtifact(rightRoot);if(stable(leftNpmLs)!==stable(rightNpmLs))fail('NPM_LS_SEMANTIC_DIFFERENCE');
 const expected=expectedEvidencePaths();const leftPaths=leftManifest.entries.map(item=>item.relative_path).sort(),rightPaths=rightManifest.entries.map(item=>item.relative_path).sort();if(stable(leftPaths)!==stable(expected)||stable(rightPaths)!==stable(expected))fail('ARTIFACT_INVENTORY');
 for(const relative of expected){if(relative==='summary.json'||relative==='manifest.partial.json')continue;const leftFile=path.join(leftRoot,...relative.split('/')),rightFile=path.join(rightRoot,...relative.split('/'));let left,right;
  const match=relative.match(/^commands\/([^/]+)\/(.+)$/);const id=match?.[1],name=match?.[2];
  if(name==='command.json'){left=comparableCommand(leftFile,id);right=comparableCommand(rightFile,id);}else if(name==='result.json'){left=comparableResult(leftFile,id,path.dirname(leftFile));right=comparableResult(rightFile,id,path.dirname(rightFile));}else if(name==='stdout.raw'&&TAP_COMMAND_IDS.has(id)){left=normalizeTapDurations(fs.readFileSync(leftFile));right=normalizeTapDurations(fs.readFileSync(rightFile));}else if(name==='stdout.raw'&&id==='npm-ls'){continue;}else{left=fs.readFileSync(leftFile);right=fs.readFileSync(rightFile);}
  if(Buffer.isBuffer(left)?!left.equals(right):stable(left)!==stable(right))fail('ARTIFACT_SEMANTIC_DIFFERENCE',relative);
 }
}
function comparableSummary(summary,expectedReplica){
 validateSummaryShape(summary,expectedReplica);const copy=structuredClone(summary);delete copy.replica_id;delete copy.timestamps;delete copy.paths;delete copy.runner_metadata.runner_name;return copy;
}
export function compareReplicaEvidence({leftRoot,rightRoot,leftDigest,rightDigest,leftResult='success',rightResult='success'}){
 if(leftResult!=='success'||rightResult!=='success')fail('REPLICA_JOB_RESULT');validateArtifactDigest(leftDigest);validateArtifactDigest(rightDigest);validateNpmCiArtifact(leftRoot);validateNpmCiArtifact(rightRoot);const leftManifest=verifyManifest(leftRoot),rightManifest=verifyManifest(rightRoot);compareClosedArtifacts(leftRoot,rightRoot,leftManifest,rightManifest);const left=readJson(path.join(leftRoot,'summary.json')),right=readJson(path.join(rightRoot,'summary.json'));const a=comparableSummary(left,'replica-1'),b=comparableSummary(right,'replica-2');if(stable(a)!==stable(b))fail('REPLICA_SEMANTIC_DIFFERENCE');return{schema_version:'janus-ci-gate2-comparison-v1',status:'CI_AJV_SCHEMA_FOUNDATION_PASS_NOT_CONFORMANCE',commit:left.commit,tree:left.tree,replicas:['replica-1','replica-2'],artifact_digests:{'replica-1':leftDigest,'replica-2':rightDigest},normalized_results:left.normalized_results,deterministic_outputs:left.deterministic_outputs};}
async function compareMode(args){
 if(process.env.GITHUB_RUN_ATTEMPT!=='1')fail('RERUN_REJECTED');assertHash(args['expected-runner-sha'],'expected-runner-sha');const ownHash=hashFile(fileURLToPath(import.meta.url));if(ownHash!==args['expected-runner-sha'])fail('REVIEWED_HASH_MISMATCH');const output=path.resolve(args.output);ensureDir(output);writePartialManifest(output,'INITIAL');
 try{const result=compareReplicaEvidence({leftRoot:path.resolve(args['replica-1']),rightRoot:path.resolve(args['replica-2']),leftDigest:args['replica-1-digest'],rightDigest:args['replica-2-digest'],leftResult:args['replica-1-result'],rightResult:args['replica-2-result']});writeJson(path.join(output,'comparison.json'),result);finalizeManifest(output);return result;}catch(error){writeJson(path.join(output,'failure.json'),{status:'FAILED',code:error.code||'UNEXPECTED',message:String(error.message||error)});finalizeManifest(output);throw error;}
}

async function main(){const args=parseArgs(process.argv.slice(2));const result=args.mode==='replica'?await replicaMode(args):await compareMode(args);process.stdout.write(stable(result));}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked)main().catch(error=>{process.stderr.write(`${error.code||error.name}: ${error.message}\n`);process.exitCode=1;});
