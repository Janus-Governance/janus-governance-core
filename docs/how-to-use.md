# How to Use Janus Core

Begin with the primary normative baseline, `core/lite/JANUS_CORE_LITE_v0.2.md`. This guide is informative.

## Bounded flow

1. Preserve domain activity and versioned schemas in their canonical logs.
2. Declare referenceable expectations before evaluating their satisfaction.
3. Observe evidence within a deterministic, versioned scope and procedure.
4. If the full E− conditions are met, prepare `OMISSION_DETECTED` with its required typed references.
5. If a designated human performs an accountable decision, prepare `HUMAN_DECISION` with `actor_ref`, `scope_ref`, nonempty `object_refs`, `occurred_at`, and `recorded_at`.
6. Submit event candidates exclusively through the Audit Writer for incorporation into `AUDIT_LOG`; a `HUMAN_DECISION` with unresolved canonical `object_refs` must be rejected.
7. Derive current views without deleting or replacing history.

## Boundaries

- detection is not decision
- AI and evaluation cannot originate `HUMAN_DECISION`
- the Audit Writer records but does not constitute human authority
- resolution of `actor_ref` and evaluation of competence belong to Framework, not the Audit Writer's canonical Core duties
- missing data is not automatically E−
- gate results are implementation or framework outputs, not new canonical Core event types
- semantic drift observations do not by themselves establish error, omission, or accountability
