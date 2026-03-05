# RFC 0008 — Log Reference Model

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

---

## Summary

This RFC defines the reference relationships between the canonical
append-only logs defined in Janus Core Lite.

The model ensures that governance events can be traced to the domain
records, schema context, and evidence artifacts that support them.

---

## Motivation

Janus governance relies on multiple append-only logs:

- MANAGEMENT_LOG
- SCHEMA_LOG
- AUDIT_LOG

Without explicit reference rules, relationships between these logs may
become ambiguous.

This RFC defines the minimal reference model required to maintain
traceability and deterministic reconstruction of governance outcomes.

---

## Specification

### Canonical logs

Janus Core Lite defines three canonical logs:

- MANAGEMENT_LOG
- SCHEMA_LOG
- AUDIT_LOG

Each log records a different class of information:

- Domain activity → MANAGEMENT_LOG
- Schema evolution → SCHEMA_LOG
- Governance outcomes → AUDIT_LOG

---

### Reference relationships

Governance events recorded in AUDIT_LOG SHOULD reference relevant
records that support their evaluation context.

These references may include:

- domain records from MANAGEMENT_LOG
- schema definitions from SCHEMA_LOG
- supporting evidence artifacts

References allow governance events to be interpreted and validated
within the correct historical and structural context.

---

### Evidence linkage

When governance events rely on explicit evidence (E+) or omission
evidence (E−), the event SHOULD reference the relevant evidence
artifacts or the deterministic search scope used during evaluation.

---

### Rebuildability

The reference model supports the deterministic rebuildability
principle defined in RFC 0001.

Given:

- canonical logs
- schema definitions
- referenced evidence artifacts

an implementation should be able to reconstruct the governance
interpretation associated with a recorded event.

---

## Rationale

Explicit reference relationships ensure that governance outcomes remain
traceable to the domain activity and schema context from which they
were derived.

This model prevents governance events from becoming detached from the
records required to interpret them.

---

## Backwards compatibility

Not applicable (initial log reference model specification).

---

## Security considerations

Risks related to log references include:

- missing or incomplete references
- inconsistent schema interpretation
- evidence artifacts that cannot be retrieved

Implementations must ensure that governance events preserve sufficient
reference context to allow later verification and reconstruction.

---

## License

MIT License
