#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCatalog } from './lib/contract.mjs';
import { deriveGate2Controller,renderGate2ControllerMarkdown,stableJson } from './lib/gate-2-controller.mjs';

const toolDir=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(toolDir,'../..');
const INPUTS={
 requirements:'conformance/core-lite-v0.2/requirements.json',
 matrix:'conformance/core-lite-v0.2/coverage-matrix.json',
 profile:'conformance/core-lite-v0.2/profile.json',
 scenarios:'conformance/core-lite-v0.2/scenarios/manifest.json'
};
function readRegular(relative){const file=path.join(repoRoot,relative),stat=fs.lstatSync(file);if(stat.isSymbolicLink()||!stat.isFile())throw new Error('NONREGULAR_INPUT');return fs.readFileSync(file);}
function formatFromArgs(args){if(args.length!==2||args[0]!=='--format'||!['json','markdown'].includes(args[1]))throw new Error('USAGE');return args[1];}
export function main(args=process.argv.slice(2)){
 const format=formatFromArgs(args);validateCatalog();
 const document=deriveGate2Controller(readRegular(INPUTS.requirements),readRegular(INPUTS.matrix),readRegular(INPUTS.profile),readRegular(INPUTS.scenarios));
 process.stdout.write(format==='json'?stableJson(document):renderGate2ControllerMarkdown(document));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(error){process.stderr.write(`gate-2-status: ${error?.code||error?.message||'FAILED'}\n`);process.exitCode=2;}}
