# Janus Runtime Model

## 1. Purpose

Janus defines a governance core; runtimes execute the model in concrete environments.

## 2. Reference Runtime

The current Node demo runtime is a reference implementation proving:
- governance evaluation
- omission detection
- evidence model (E+ / E-)
- audit writer boundary
- deterministic rebuild

Location:

runtimes/demo-node/

It is intentionally minimal and designed for demonstration.

## Canonical Logs

All runtimes must produce canonical logs as defined in the audit model. These include:
- Audit log (recording all governance events)
- Management log (system-level actions)
- Schema log (structure and evidence schemas)

Logs must be append-only, verifiable, and reconstructable, ensuring alignment with Janus Core invariants.

## 3. Future Runtimes

Production runtimes may implement the same model in different environments, for example:
- Node runtime
- Python runtime
- Apps Script runtime
- Database-backed runtime

All runtimes must explicitly preserve and enforce Janus Core invariants, including evidence integrity, deterministic evaluation, and canonical log structure.

## 4. Adapters

Runtimes may use adapters for:
- storage
- databases
- message systems
- APIs

Examples:

filesystem adapter  
postgres adapter  
event-stream adapter

## 5. Governance Pipeline

The runtime executes the governance pipeline as defined:

1. Events are ingested and transformed into evidence.
2. Evidence is evaluated according to Janus Core semantics.
3. Governance events are emitted and recorded in canonical logs.
4. The system state and verdicts are updated based on evaluation results.
