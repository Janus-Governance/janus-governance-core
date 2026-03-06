# Janus Demo — 60 Second Proof

## 1. What this proves

This demo validates:
- governance evaluation
- omission detection
- human authority registration
- audit writing
- deterministic rebuild

## 2. Run

node runtime/demo-node/demo.js

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
