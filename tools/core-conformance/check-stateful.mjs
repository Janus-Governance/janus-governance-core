#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stable,validateScenarioBundle } from './lib/stateful-validator.mjs';
import { statefulCoverageIds,statefulProjectionIds,validateCatalog } from './lib/contract.mjs';

const toolDir=path.dirname(fileURLToPath(import.meta.url)),repoRoot=path.resolve(toolDir,'../..');
const load=relative=>JSON.parse(fs.readFileSync(path.join(repoRoot,relative),'utf8'));
try{
 const manifest=load('conformance/core-lite-v0.2/scenarios/manifest.json');
 const cases=load('conformance/core-lite-v0.2/scenarios/history-reference.cases.json');
 const results=validateScenarioBundle(manifest,cases);
 const {catalog}=validateCatalog();
 const byId=new Map(cases.scenarios.map(item=>[item.scenario_id,item]));
 for(const requirement of catalog.requirements){
  for(const [field,polarity] of [['stateful_positive_scenario_refs','POSITIVE'],['stateful_negative_scenario_refs','NEGATIVE']])for(const ref of requirement[field]){const scenario=byId.get(ref);if(!scenario)throw new Error(`Unknown stateful scenario ${ref}`);if(!scenario.classification.includes(polarity))throw new Error(`Stateful scenario polarity mismatch ${ref}`);}
 }
 for(const scenario of cases.scenarios){const expected=catalog.requirements.filter(requirement=>[...requirement.stateful_positive_scenario_refs,...requirement.stateful_negative_scenario_refs].includes(scenario.scenario_id)).map(requirement=>requirement.requirement_id);if(JSON.stringify(scenario.requirement_ids)!==JSON.stringify(expected))throw new Error(`Scenario/catalog reciprocity mismatch ${scenario.scenario_id}`);}
 const output={classification:'STATEFUL_HISTORY_REFERENCE_FOUNDATION',scenario_count:results.length,scenario_runs_passed:results.length,stateful_complete_requirements:statefulCoverageIds.length,stateful_projection_requirements:statefulProjectionIds.length,operations:manifest.operations,logs:manifest.logs,technical_verdict:'NOT_EVALUATED',conformance_claimed:false,results};
 process.stdout.write(stable(output));
}catch(error){process.stderr.write(String(error?.stack||error)+'\n');process.exitCode=1;}
