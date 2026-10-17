# Janus Demo — 60 Second Walkthrough

## 1. What this illustrates

This demo illustrates:
- governance evaluation
- omission detection
- human authority registration
- audit writing
- deterministic rebuild

It does not establish conformity with Janus Core Lite v0.2. The demo is an illustrative technical artifact and does not redefine the Core.

## 2. Run

node runtimes/demo-node/demo.js

## 3. Expected output

FLOW A — omission case
{
  "requiredEvent": "HUMAN_DECISION",
  "proposedChanges": 1,
  "humanDecisionPresent": false,
  "auditEventsWritten": [
    "OMISSION_DETECTED"
  ]
}

REBUILD STATE
{
  "proposedChanges": 1,
  "humanDecisionPresent": false,
  "omissionsDetected": 1,
  "auditEvents": 1
}

FLOW B — approved case
{
  "requiredEvent": "HUMAN_DECISION",
  "proposedChanges": 1,
  "humanDecisionPresent": true,
  "auditEventsWritten": [
    "HUMAN_DECISION_REGISTERED"
  ]
}

FLOW C — rebuild
{
  "proposedChanges": 1,
  "humanDecisionPresent": true,
  "omissionsDetected": 0,
  "auditEvents": 1
}

## 4. Interpretation

- Janus does not only log activity
- it evaluates governance conditions
- records omission as structured evidence
- preserves human authority
- rebuilds state from logs
