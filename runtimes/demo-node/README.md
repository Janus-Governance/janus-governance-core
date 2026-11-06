# Janus Governance Core — Demo Runtime (Node)

Reference Runtime: v0.1.0

Status: `LEGACY_NONCONFORMING_PENDING_GATE_3`

This legacy demo illustrates an earlier implementation. It does not prove or establish Core Lite v0.2 conformance.

## Known semantic divergences

The current JavaScript source:

- emits the noncanonical event label `HUMAN_DECISION_REGISTERED`
- treats the presence of a human decision as E+
- reads human authority from `MANAGEMENT_LOG` instead of recording canonical `HUMAN_DECISION` in `AUDIT_LOG`
- originates a shadow human-authority registration event from evaluation
- uses simplified, effectively exhaustive E+/E− presence-or-absence semantics
- does not implement or prove the complete Core v0.2 event, evidence, reference, or Audit Writer requirements

Source-code migration and validation are deferred to Gate 3. Until that transaction is completed, this directory must be treated only as legacy nonconforming material.

## Run

From this folder:

- `node demo.js`

From repo root:

- `node runtimes/demo-node/demo.js`

## Current legacy behavior

- Flow A appends `CHANGE_PROPOSED` and emits the legacy omission representation.
- Flow B appends a management-side `HUMAN_DECISION` and emits noncanonical `HUMAN_DECISION_REGISTERED`.
- Flow C prints a simplified reconstructed summary.

These descriptions disclose existing behavior; they are not approval, proof, or a conformance claim.
