# RFC 0002 — Evidence Model (E+ / E−)

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

---

## Summary

This RFC formalizes the evidence model used by Janus Core Lite.

The model distinguishes between explicit recorded evidence (E+) and
verified omission evidence (E−).

This distinction allows governance systems to reason not only from
recorded facts but also from verified absences of expected records.

---

## Motivation

Traditional systems treat missing records as undefined states.

In governance contexts, however, the absence of an expected record may
itself represent a meaningful signal.

Janus introduces a formal distinction between:

- explicit evidence (E+)
- omission evidence (E−)

This allows systems to detect procedural failures, structural gaps,
and governance breakdowns.

---

## Specification

### Explicit evidence (E+)

E+ represents evidence explicitly recorded in a system of record.

A claim supported by E+ references a recorded artifact that can be
retrieved and inspected.

### Omission evidence (E−)

E− represents evidence derived from a verified absence of an expected record.

E− requires:

- a defined expectation
- a deterministic search scope
- a reproducible observation that the expected record is missing
- referenceable schema context from SCHEMA_LOG

Evidence is evaluated by governance flows. Evaluation may produce governance events recorded in AUDIT_LOG.

### Relationship with governance events

Omission evidence may generate the governance event:

OMISSION_DETECTED

Interpretation of evidence may require human evaluation, which is
recorded through the event:

HUMAN_DECISION

---

## Rationale

Governance systems must account for both presence and absence of records.

Without omission evidence, structural failures may remain invisible.

The E+ / E− model enables systems to reason about procedural compliance,
missing actions, and institutional responsibility.

---

## Backwards compatibility

Not applicable (initial evidence model specification).

---

## Security considerations

Incorrect omission detection may result from:

- incomplete search scope
- inconsistent schema interpretation
- corrupted or incomplete logs

Implementations must ensure deterministic search scopes and schema
consistency when deriving E−.

---

## License

MIT License
