# RFC 0005 — Governance Event Model

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026  
Aligned with: Core Lite v0.2  
Canonical specification: `core/lite/JANUS_CORE_LITE_v0.2.md`

---

## Authority and scope

Core Lite v0.2 is the primary normative authority. This Draft explains its
governance events. Cross-references to other Draft RFCs are informative
navigation only and do not create normative dependencies.

---

## Summary

Governance events are append-only `AUDIT_LOG` records concerning observation,
evaluation, findings, or accountable human acts. Core Lite v0.2 defines two
canonical event types: `OMISSION_DETECTED` and `HUMAN_DECISION`.

---

## Specification

### Common event rules

Every canonical `AUDIT_LOG` event carries `event_type` and `event_id`.
`event_id` is stable, unique within the log, never reused, and persistent under
compaction. Events are appended exclusively through an authorized Audit Writer.

An event that corrects, supersedes, or voids an earlier event is appended as a
new event with a resolvable backward reference. Existing governance events are
never overwritten or deleted.

### Canonical event types

- `OMISSION_DETECTED` is produced by evaluation only when E− satisfies every
  condition of Core §5. Its required fields are defined by Core §6.
- `HUMAN_DECISION` represents a prior human act. Evaluation, evidence,
  detection, agents, and runtimes do not originate it. Its required fields and
  reference-resolution rules are defined by Core §4.

The two event types are not interchangeable. Evidence is referenced by events;
it does not automatically become an event or a human decision.

This Draft does not expand the canonical event set. Any future canonical event
requires an accepted normative change compatible with Core; a Draft RFC cannot
introduce one unilaterally.

### Log boundary

Domain events and actions belong in `MANAGEMENT_LOG`. Structural definitions
and schema evolution used to interpret records belong in `SCHEMA_LOG`.
Governance events, accountability records, and audit findings belong in
`AUDIT_LOG`. An E− expectation must be a defined, referenceable, versioned
artifact recorded before the observation; Core Lite v0.2 does not prescribe
the log or store in which that expectation is recorded. The applicable
`SCHEMA_LOG` supplies structural and schema context only. `AUDIT_LOG` is not
the primary domain record.

---

## Security considerations

Implementations must prevent unauthorized event insertion, unstable identity,
unresolved mandatory references, mutation of prior events, and automated
substitution for required human authority.

---

## License

MIT License
