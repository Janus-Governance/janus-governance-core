# RFC 0003 — Omission Detection

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026  
Aligned with: Core Lite v0.2  
Canonical specification: `core/lite/JANUS_CORE_LITE_v0.2.md`

---

## Authority and scope

Core Lite v0.2 is the primary normative authority. This Draft explains omission
detection without adding Core requirements. Any divergence is resolved in favor
of the canonical Core and recorded rather than silently rewritten.

---

## Summary

`OMISSION_DETECTED` records an instance of E− that satisfies every condition in
Core Lite v0.2 §5. It records a verified omission; it is not a human decision
and is not evidence that an implementation is semantically conformant.

---

## Specification

### Omission detection

A missing record alone is not E−. Omission detection requires, cumulatively:

- a referenceable expectation version recorded before observation, including
  provenance, temporal applicability, and the due time or condition;
- a deterministic scope containing sources, subject, filters, window, cutoff,
  and the versioned evaluation procedure;
- a cutoff no earlier than the expectation's due time, with due status
  determinable from the consulted material;
- applicable `SCHEMA_LOG` context for every record or event considered; and
- a reproducible observation relative to the scope and cutoff.

### `OMISSION_DETECTED` contract

When the cumulative conditions are met, evaluation may produce an
`OMISSION_DETECTED` event. The event must include:

- `event_type`;
- `event_id`;
- `expectation_ref`, identifying the expectation version evaluated;
- `scope_ref`, identifying the deterministic search scope and cutoff;
- `schema_ref`;
- `evidence_refs`, containing at least one reference; and
- `recorded_at`, the event's only own time.

`management_refs` is optional. Search execution time belongs in the observation
artifact. The event asserts absence only within the recorded scope and up to
the recorded cutoff. It is appended to `AUDIT_LOG` exclusively through an
authorized Audit Writer.

### Later evidence, correction, and resolution

Later evidence or corrective action does not overwrite, delete, or modify the
historical event. Its effect appears in the deterministically rebuilt view and
must be supported by referenceable evidence.

An omission is resolved only by a later evaluation of the same expectation
version, using a later cutoff and corresponding evidence. Evaluation of a
different expectation version does not resolve it. A later action satisfying
the expectation is not a supersession of the historical event.

`OMISSION_DETECTED` is distinct from `HUMAN_DECISION`. Evaluation does not
originate a human decision. A human decision about an omission modifies neither
the event nor its evidence and constitutes neither E+ nor E−.

---

## Security considerations

Incomplete search scope, retroactive expectations, inconsistent schemas,
corrupted logs, unresolved references, or unauthorized writers must not be
accepted as omission detection.

---

## License

MIT License
