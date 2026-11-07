#!/usr/bin/env node
import { baselineResult, stable } from './lib/contract.mjs';
try { const result=baselineResult(); process.stdout.write(stable(result)); process.exitCode=result.baseline_classification==='COMPLETE'?0:1; } catch(error) { process.stderr.write(String(error?.stack||error)+'\n'); process.exitCode=2; }
