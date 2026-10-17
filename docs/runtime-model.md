# Janus Runtime Model

## 1. Purpose

Janus Core Lite v0.2 is the normative source. Runtimes are technical implementations that execute the model in concrete environments; they do not redefine the Core.

## 2. Reference Runtime

The current Node demo runtime is an illustrative implementation demonstrating:
- governance evaluation
- omission detection
- evidence model (E+ / E−)
- audit writer boundary
- deterministic rebuild

Location:

runtimes/demo-node/

It is intentionally minimal and designed for demonstration.

Its output does not by itself establish conformity with Janus Core Lite v0.2.

## Canonical Logs

Implementations preserve the three canonical logs and their separation as defined in Core §§3–4. These include:
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

Runtimes implement the applicable Janus Core invariants defined in Core §4, including append-only canonical logs, separation of domain and governance activity, evidence integrity, Audit Writer authority, and deterministic rebuildability.

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
4. Governance-relevant views and findings are deterministically rebuilt from the recorded history, schemas, and referenced evidence.
