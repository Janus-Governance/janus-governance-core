# Canonical Governance Event Structure

This informative document summarizes the distinct Core Lite v0.2 event profiles. It is not a runtime schema and is subordinate to the Core specification.

## Reference rules

References are typed by role. `actor_ref`, `scope_ref`, `object_refs`, `expectation_ref`, `schema_ref`, `evidence_refs`, and `management_refs` are not interchangeable. Core requires `HUMAN_DECISION.object_refs` to resolve against previously incorporated history before incorporation. Evidence supporting E+ or E− uses immutable, resolvable artifact references where Core requires them. Resolution of `actor_ref` and evaluation of competence belong to Framework. Other resolution duties depend on the applicable event or implementation profile. No event may reference itself.

## `HUMAN_DECISION`

`HUMAN_DECISION` records a prior act by a designated human authority. It is not produced by AI, evaluation, or the Audit Writer. Its record requires:

- `event_type`: `HUMAN_DECISION`
- `event_id`, stable and unique within `AUDIT_LOG`
- `actor_ref`: the human authority
- `scope_ref`: the competence invoked
- `object_refs`: a nonempty set identifying exactly what was decided
- `occurred_at`: when the human act occurred
- `recorded_at`: when the record entered `AUDIT_LOG`

`object_refs` is an unordered, duplicate-free, nonempty set. Each target is a previously incorporated record or event in `MANAGEMENT_LOG`, `AUDIT_LOG`, or `SCHEMA_LOG`, identified by origin log and stable identity; external artifacts and derived views are inadmissible. Supporting evidence and context may be referenced without replacing any required field. `recorded_at` is distinct from the time of the authority act unless both genuinely occur at the same instant.

## Candidate Framework profile: `HUMAN_VERDICT`

Core Lite v0.2 does not define an event named `HUMAN_VERDICT`. `HUMAN_DECISION` remains the canonical `event_type`. `HUMAN_VERDICT` is the name of a Framework-owned candidate operational profile inside a `HUMAN_DECISION` record, never an autonomous event.

Under this candidate Framework profile, the record may use:

- `decision_kind`: `OMISSION_VERDICT`
- `human_verdict`: `CONFIRMED` or `REJECTED_WITH_RATIONALE`
- `rationale_ref`, mandatory under this candidate profile

An AI actor cannot satisfy the human-authority requirement. Any later action is operationally separate from the decision and may be `NO_ACTION`, `AMENDED`, `ESCALATED`, or `DEFERRED`. A later action does not erase or rewrite `OMISSION_DETECTED`. Normative promotion is deferred to v0.3 tests and an explicit HEAD decision; none of these candidate fields is a Core v0.2 requirement.

## `OMISSION_DETECTED`

`OMISSION_DETECTED` records a qualified E− observation; the event is not itself E−. Its record requires:

- `event_type`: `OMISSION_DETECTED`
- `event_id`, stable and unique within `AUDIT_LOG`
- `expectation_ref`: a versioned, referenceable expectation with provenance and due condition
- `scope_ref`: the deterministic search scope, including cutoff
- `schema_ref`: the versioned interpretive context
- `evidence_refs`: a nonempty set resolving to the reproducible observation and its procedure or outputs
- `recorded_at`, the event's only own time

`management_refs` may supply additional domain context but are optional and cannot replace the required references. Core requires the cutoff to be at or after the expectation's due condition. Search-execution time belongs in the referenced observation artifact, not in another own-time field on the event.

## Audit Writer

The Audit Writer is the exclusive canonical appender to `AUDIT_LOG` and prevents bypass. For `HUMAN_DECISION`, it rejects incorporation when canonical `object_refs` do not resolve and otherwise incorporates a record of the prior human act. It does not originate authority, competence, or human judgment. Any broader structural validation is a noncanonical Framework responsibility or Draft proposal, not a universal Core v0.2 duty.
