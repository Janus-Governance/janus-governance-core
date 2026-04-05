# How to Use Janus Core

## Overview

Janus Core provides a minimal governance model to track:
- structural issues (`OMISSION_DETECTED`)
- human accountability (`HUMAN_DECISION`)

It does not enforce implementation details, but defines how governance
events should be recorded and interpreted.

## Basic flow

A typical usage flow:

1. Perform an action or evaluation
2. Detect conditions:
   - if a required element is missing → record `OMISSION_DETECTED`
3. If interpretation or responsibility is required:
   - record a `HUMAN_DECISION`
4. Persist events in an audit log

## Key principles

- Detection is not decision
- Systems can detect conditions, but only humans assert responsibility
- Governance events must remain reconstructable

## Minimal example

Example sequence:

- system evaluates input → detects missing field  
- event recorded: `OMISSION_DETECTED`  
- human reviews situation  
- event recorded: `HUMAN_DECISION`  

This creates a complete governance trace.

## Notes

- Semantic drift may be observed during evaluation
- Drift does not imply error, but signals need for review
