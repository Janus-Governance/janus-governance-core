# RFC 0006 — Governance Evaluation Layer

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

---

## Summary

This RFC defines the governance evaluation layer used in Janus systems.

Governance evaluation flows analyze evidence (E+ and/or E−) within a
defined scope and may produce governance events recorded in AUDIT_LOG.

---

## Motivation

Janus governance separates operational activity from governance
evaluation.

Evidence alone does not produce governance outcomes.

Evaluation flows interpret evidence in context and may produce
auditable governance events.

Defining this layer clarifies the relationship between:

- evidence (RFC 0002)
- omission detection (RFC 0003)
- human authority (RFC 0004)
- governance events (RFC 0005)

---

## Specification

### Governance evaluation

Governance evaluation flows analyze available evidence (E+ and/or E−)
within a defined scope.

Evaluation flows MAY produce governance events recorded in AUDIT_LOG.

Examples of governance events include:

- OMISSION_DETECTED
- HUMAN_DECISION

Evaluation flows themselves are not governance events.

They represent the process that may generate them.

### Evaluation inputs

Evaluation flows may consider:

- explicit evidence (E+) defined in RFC 0002
- omission evidence (E−) defined in RFC 0002
- schema context from SCHEMA_LOG
- domain context from MANAGEMENT_LOG

### Evaluation outputs

Evaluation flows may produce governance events defined in RFC 0005.

Specific evaluation types may be defined in additional RFCs.

RFC 0003 defines one such evaluation type: omission detection.

---

## Rationale

Separating evidence, evaluation, and governance events ensures that
Janus governance remains structurally transparent.

Evidence represents observable facts.

Evaluation interprets those facts.

Governance events record the accountable outcomes of those evaluations.

---

## Backwards compatibility

Not applicable (initial evaluation layer specification).

---

## Security considerations

Risks related to governance evaluation include:

- incorrect evaluation scope
- inconsistent schema interpretation
- unauthorized evaluation execution

Implementations must ensure that governance evaluation flows operate
within authorized governance contexts.

---

## License

MIT License
