# RFC 0004 — Human Authority Model

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026  
Aligned with: Core Lite v0.2  
Canonical specification: `core/lite/JANUS_CORE_LITE_v0.2.md`

---

## Authority and scope

Core Lite v0.2 is the primary normative authority. This Draft explains the
human-authority boundary. Identity resolution and evaluation of competence
belong to the Framework; neither Framework nor this Draft may redefine Core.

---

## Summary

`HUMAN_DECISION` is the only canonical human-authority event. It represents an
explicit prior human act and is required when an outcome requires explicit
human accountability. No agent, runtime, evaluation, or automated flow may
originate it.

---

## Specification

### Human act and technical recording

Automated systems may analyze evidence, detect conditions, or recommend an
action. Those stages are distinct from the accountable human act.

`HUMAN_DECISION` represents a prior human act by which a designated human
authority made or confirmed a decision over identified objects. The event
records that decision. No agent, runtime, evaluation, or automated flow may
originate that human act. The Audit Writer may validate and incorporate the
event but must not originate the human act. The technical writer is not the
responsible human authority.

### Event contract

A `HUMAN_DECISION` must include:

- `event_type` and stable `event_id`;
- `actor_ref`, identifying the responsible human authority;
- `scope_ref`, declaring the competence invoked;
- `object_refs`, a non-empty unordered set identifying exclusively the records
  or events decided;
- `occurred_at`, the time of the human act; and
- `recorded_at`, the time of incorporation into `AUDIT_LOG`.

It may include `evidence_refs`, `management_refs`, and `schema_ref` as evidence
or context. None substitutes for `object_refs`. External artifacts and derived
views are not admissible decision objects.

Each `object_refs` entry identifies its origin log and stable target identity,
contains no duplicate target, resolves against history already incorporated in
that log, and never self-references. The Audit Writer prevents incorporation if
an object reference does not resolve. A constitutive decision references the
previously recorded proposal, draft, or version that it constitutes.

### Append-only effect

A human decision does not rewrite events, evidence, or domain records. Later
interpretation, authorization, or declaration about a governance event is
appended as a new `HUMAN_DECISION`. Corrections remain append-only in the
canonical log to which they belong.

---

## Security considerations

Implementations must prevent automated origin, unresolved decision objects,
identity substitution, ambiguous scope, and direct writes that bypass the Audit
Writer.

---

## License

MIT License
