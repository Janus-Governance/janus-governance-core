# Janus Governance Core — Demo Runtime (Node)

Reference Runtime: v0.1.0

This minimal demo illustrates:

1) Append domain activity to `MANAGEMENT_LOG`
2) Read `SCHEMA_LOG` as reference
3) Form evidence as `E+` / `E−`
4) Run a governance evaluation layer (beyond omission detection)
5) Write canonical governance events to `AUDIT_LOG` only through an Audit Writer boundary

## Run

From this folder:

- `node demo.js`

From repo root:

- `node runtimes/demo-node/demo.js`

## Expected behavior

- Flow A (omission): appends `CHANGE_PROPOSED`, evaluates, emits `OMISSION_DETECTED` with `E−` into `AUDIT_LOG`
- Flow B (approved): appends `CHANGE_PROPOSED` + `HUMAN_DECISION`, evaluates, emits `HUMAN_DECISION_REGISTERED` with `E+` into `AUDIT_LOG`
- Flow C (rebuild): rebuilds a minimal state only from logs and prints a summary object

This runtime is an illustrative technical implementation, not a production runtime. It does not establish conformity with Janus Core Lite v0.2 and does not redefine the Core.
