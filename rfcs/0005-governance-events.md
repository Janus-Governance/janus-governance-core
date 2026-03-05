# RFC 0005 — Governance Event Model

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

---

## Summary

This RFC defines the governance event model used by Janus systems.

Governance events represent auditable records that capture
evaluations, findings, and accountable decisions.

These events are recorded in AUDIT_LOG.

---

## Motivation

Janus governance relies on explicit records to ensure traceability
and accountability.

Without a defined event model, governance actions may become
ambiguous or inconsistent across implementations.

This RFC defines the minimal structure and purpose of governance
events within the Janus model.

---

## Specification

### Governance events

A governance event is a record representing a governance-relevant
observation, evaluation, or decision.

Governance events are outputs of governance evaluation flows applied to evidence (E+ and/or E−).

Governance events are appended to `AUDIT_LOG` exclusively through the Audit Writer mechanism (RFC 0007).

Governance events MUST be written to:

AUDIT_LOG

### Canonical governance events

Janus Core Lite defines the following canonical governance events:

- OMISSION_DETECTED
- HUMAN_DECISION

Future specifications MAY introduce additional governance events.

### Event context

Governance events SHOULD reference the relevant operational context,
including:

- related domain events in MANAGEMENT_LOG
- relevant schema context from SCHEMA_LOG
- supporting evidence (E+ or E−)

### Event responsibility

Governance events represent accountable records.

Systems MUST ensure that governance events cannot be generated
outside authorized governance flows.

---

## Rationale

Governance systems require explicit event records in order to
reconstruct decision processes and audit institutional actions.

By defining governance events explicitly, Janus ensures that
evaluations, omissions, and human decisions are consistently
recorded across implementations.

---

## Backwards compatibility

Not applicable (initial governance event model specification).

---

## Security considerations

Risks related to governance events include:

- unauthorized event generation
- incomplete event context
- tampered event records

Implementations must ensure append-only event recording and
traceable governance flows.

---

## License

MIT License
