# Glossary (Normative)

This glossary defines canonical meanings for terms used by Janus specifications in this repository. It is subordinate to the Core (`core/lite/JANUS_CORE_LITE_v0.1.md`), which is the primary normative authority.

Semantic stability rule: when a term in this glossary is changed, any dependent specification text MUST be reviewed and updated accordingly.

## Conventions

- Capitalized tokens (e.g., `AUDIT_LOG`, `OMISSION_DETECTED`) denote canonical identifiers.
- RFC 2119 keywords (MUST, SHOULD, MAY) are used for normative requirements.

## Canonical terms

### Adapter

A component that maps between Janus runtime interfaces and an external storage or transport surface.

Adapters do not define Core semantics; they implement a mapping.

### `AUDIT_LOG`

An append-only log that records audit-relevant events, evaluations, and attestations needed to support review.

`AUDIT_LOG` entries MAY reference records from `MANAGEMENT_LOG` and `SCHEMA_LOG` when relevant, and MAY also represent governance events that do not originate in those logs (e.g., `OMISSION_DETECTED`).

An `AUDIT_LOG` entry MAY record:
- gate outcomes and their explanations (`gates`)
- risk classifications (e.g., R2) and escalation/handling outcomes
- explicit human accountability events (`HUMAN_DECISION`)
- omission findings (`OMISSION_DETECTED`) and their supporting omission evidence (E−)

`AUDIT_LOG` entries SHOULD preserve linkability to the originating expectations, scopes, and referenced artifacts.

### contractRef

A stable reference to an external rule source that is outside the Janus repository (e.g., policy text, contract clause, regulation section, internal procedure).

`contractRef` is a reference mechanism only. It does not import external text into Core semantics.

### E+ (explicit evidence)

The class of evidence explicitly recorded in a system of record.

E+ indicates that a claim or event is supported by a recorded artifact.

### E− (omission evidence)

The class of evidence derived from a verified absence of an expected record or event.

E− exists only when the conditions defined in Core §5 are met.

E− is not counter-argumentation.
It represents a verified omission relative to an explicit expectation.

### gates

Framework-defined checks that mediate state transitions or outputs.

A gate consumes inputs (e.g., proposed actions, evidence sets, risk flags) and produces a decision (allow, block, require escalation) plus an auditable explanation.

### `HUMAN_DECISION`

A canonical event indicating that a designated human authority has made or confirmed a decision.

It is the only canonical human-authority event. It is recorded in `AUDIT_LOG` and represents a prior human act. Its required content is defined in Core §4.

When a specification requires human accountability, the system MUST record a `HUMAN_DECISION` and MUST NOT substitute it with an automated inference.

### Management

The superset organizational context in which decisions, actions, and accountability occur.

Examples include government, project, education, and business contexts.

### `MANAGEMENT_LOG`

An append-only log of management-relevant events.

Typical entries include proposals, actions, domain decisions, assignments, exceptions, corrections to domain activity, and references to evidence artifacts. The canonical event `HUMAN_DECISION` is a governance event and is recorded in `AUDIT_LOG`, not in `MANAGEMENT_LOG`.

### `object_refs`

The reference in a `HUMAN_DECISION` that identifies exclusively what was decided: records or events of `MANAGEMENT_LOG`, `AUDIT_LOG`, or `SCHEMA_LOG`. It is distinct from domain context (`management_refs`), evidence (`evidence_refs`), interpretive context (`schema_ref`), and competence (`scope_ref`). Its requirements are defined in Core §4.

### `OMISSION_DETECTED`

The canonical governance event type that records an instance of E− meeting the conditions defined in Core §5.

An `OMISSION_DETECTED` event MUST include enough context to support E− (omission evidence), through the fields required by Core §6.

### R2

A risk classification indicating that a matter requires heightened controls.

At minimum, R2 handling MUST require explicit escalation rules and MUST support human final authority where accountability is required.

### Runtime

An execution environment that runs a Janus workflow or protocol implementation.

Runtimes implement the Core and Framework specifications but do not redefine their semantics.

### `SCHEMA_LOG`

An append-only log that defines schema declarations and schema versions used to interpret other logs.

If an event format or meaning depends on a schema version, the relevant `SCHEMA_LOG` entry MUST be referencable from the consuming record.

### `scope_ref`

A reference whose meaning depends on the event type: in `HUMAN_DECISION` it declares the competence invoked over the objects decided; in `OMISSION_DETECTED` it is the deterministic search scope of E−. It never identifies the object decided or the evidence.
