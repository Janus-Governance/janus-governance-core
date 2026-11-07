#!/usr/bin/env node
import { schemaFoundationOutput } from './lib/schema-validator.mjs';
try{process.stdout.write(schemaFoundationOutput());}catch(error){process.stderr.write(String(error?.stack||error)+'\n');process.exitCode=2;}
