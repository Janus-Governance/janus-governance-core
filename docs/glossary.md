# Glossary (Normative, Subordinate)

This glossary is normative only within its subordinate role. `core/lite/JANUS_CORE_LITE_v0.2.md` is the primary normative authority and controls any conflict.

When a subordinate glossary definition changes, dependent active specifications, documentation, and derived surfaces MUST be reviewed. Any remaining divergence MUST be recorded under the Core hierarchy. This review safeguard does not give the glossary authority to amend or override Core Lite v0.2.

## Audit Writer

The exclusive mechanism authorized to append canonical governance events to `AUDIT_LOG`. It prevents bypass and incorporates records under the applicable canonical event rules. For `HUMAN_DECISION`, it rejects incorporation when canonical `object_refs` are not resolvable against previously incorporated history. It cannot originate authority, competence, human judgment, or the human act represented by `HUMAN_DECISION`. Broader structural validation belongs only to an applicable noncanonical Framework or implementation profile.

## `AUDIT_LOG`

The append-only log for governance events, accountability records, and audit findings. Derived views and noncanonical gate results may be associated with audit processing but do not become canonical Core event types merely by being stored or referenced.

## E+ (explicit evidence)

The class of evidence explicitly recorded in a system of record. It is not a Boolean value, verdict, event type, or exhaustive outcome. `HUMAN_DECISION` is not E+.

## E− (omission evidence)

The class of evidence derived from a verified absence only when all Core v0.2 expectation, provenance, prior-observation, timing, deterministic-scope, cutoff, procedure, schema, and reproducibility conditions are met. Missing data alone is not E−.

## Gate result

An implementation- or framework-level result such as allow, block, escalate, pass, or fail. A gate result is noncanonical under Core Lite v0.2 unless a later Core version explicitly adopts an event type for it.

## `HUMAN_DECISION`

The sole canonical human-authority event under Core Lite v0.2. It records a prior act by a designated human authority and requires `event_type`, `event_id`, `actor_ref`, `scope_ref`, nonempty `object_refs`, `occurred_at`, and `recorded_at`. AI, evaluation, and the Audit Writer cannot originate the represented act.

## `MANAGEMENT_LOG`

The append-only log of domain activity. `HUMAN_DECISION` is a governance event in `AUDIT_LOG`, not a `MANAGEMENT_LOG` event.

## `object_refs`

The unordered, duplicate-free, nonempty typed references identifying exactly what a `HUMAN_DECISION` decided. Each target is a previously incorporated record or event in one of the three canonical logs, identified by origin log and stable identity; external artifacts and derived views are inadmissible. They are distinct from actor, competence, evidence, schema, and general domain context.

## `OMISSION_DETECTED`

The canonical event that records a qualified instance of E−. The event is not itself E− and requires `event_type`, `event_id`, a versioned expectation reference, deterministic scope with cutoff, schema reference, nonempty evidence references, and `recorded_at` as its only own time.

## Reference resolution

The rule by which a typed reference identifies and retrieves its target in the applicable log or artifact system. Core requires `HUMAN_DECISION.object_refs` to resolve before incorporation. Evidence supporting E+ or E− uses immutable, resolvable artifact references where Core requires them. Resolution of `actor_ref` and evaluation of competence belong to Framework; other resolution duties depend on the applicable event or implementation profile. References with different roles are not interchangeable, and no event may reference itself.

## Runtime

An execution environment implementing Janus semantics. Runtime behavior and conformance require separate validation; documentation or a demo does not establish them.

## `SCHEMA_LOG`

The append-only log of versioned schema declarations used to interpret records.

## `scope_ref`

A typed reference whose role depends on the event profile: competence for `HUMAN_DECISION`, deterministic search scope for `OMISSION_DETECTED`. It does not identify the decision object or substitute for evidence.
