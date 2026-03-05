# RFC 0001 — Janus Core Lite v0.1

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

---

## Summary

This RFC defines the minimal governance core for AI-assisted systems.

Janus Core Lite introduces a stack-agnostic governance model based on
append-only logs, explicit evidence handling, and traceable human authority.

---

## Motivation

AI-assisted systems increasingly participate in decision processes.

Without explicit governance primitives, systems risk:

- opaque decisions
- untraceable omissions
- shadow sources of truth
- autonomous authority violations

Janus Core Lite provides the minimal ontology required to make
governance auditable and reconstructable.

---

## Specification

This RFC formalizes the following components:

- Three canonical append-only logs:
  - MANAGEMENT_LOG
  - SCHEMA_LOG
  - AUDIT_LOG

- Evidence model:
  - E+ explicit evidence
  - E− omission evidence

- Governance events:
  - HUMAN_DECISION
  - OMISSION_DETECTED

- Core invariants:
  - append-only logs
  - separation of domain and governance
  - deterministic rebuildability

Normative definitions are specified in:

core/lite/JANUS_CORE_LITE_v0.1.md

---

## Rationale

Core Lite intentionally limits scope to governance primitives.

It does not define runtimes, identity systems, or distributed audit
architectures.

Those concerns are addressed in the framework and runtime layers.

---

## Backwards compatibility

Not applicable (initial specification).

---

## Security considerations

Threats addressed in Core Lite include:

- log tampering
- shadow sources of truth
- schema drift
- silent failure
- unauthorized audit writers
- autonomous authority violations

---

## License

MIT License
