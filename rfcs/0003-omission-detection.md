# RFC 0003 — Omission Detection

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

---

## Summary

This RFC defines the governance mechanism used to detect and record
verified omissions within Janus systems.

Omission detection produces the canonical governance event:

OMISSION_DETECTED

The event is recorded in AUDIT_LOG when a verified absence of an
expected record is observed.

---

## Motivation

Governance failures often occur not through incorrect actions but
through missing actions.

Traditional systems frequently treat missing records as undefined states.

Janus introduces a formal mechanism to detect and record verified
omissions so that governance systems can reason about procedural
failures and accountability gaps.

---

## Specification

### Omission detection

An omission is detected when an expected record cannot be found within
a deterministic search scope.

Omission detection is a form of governance evaluation applied to evidence expectations and scopes.

The detection process must reference:

- the defined expectation
- the deterministic search scope
- the observation that the expected record is absent
- the relevant schema context from SCHEMA_LOG

### Governance event

When omission evidence (E−) is confirmed, the system records the event:

OMISSION_DETECTED

The event represents the governance recording of verified omission evidence (E−).

The event MUST be written to:

AUDIT_LOG

### Human interpretation

Detection of an omission does not automatically imply fault.

Interpretation, escalation, or resolution MAY require human evaluation.

When human accountability is required, the system records:

HUMAN_DECISION

---

## Rationale

Institutional failures frequently manifest as omissions rather than
incorrect actions.

By explicitly recording omissions, governance systems can detect
structural failures that would otherwise remain invisible.

---

## Backwards compatibility

Not applicable (initial omission detection specification).

---

## Security considerations

Incorrect omission detection may occur due to:

- incomplete search scope
- inconsistent schema interpretation
- corrupted logs
- unauthorized audit writers

Implementations must ensure deterministic search scopes and reliable
schema references when deriving omission evidence.

---

## License

MIT License
