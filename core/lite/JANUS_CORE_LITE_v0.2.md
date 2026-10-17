# Janus Core Lite v0.2

Status: Draft  
Scope: Minimal governance core for AI-assisted systems.

---

## 1 Purpose

Define the minimal ontology and normative rules required
to implement governance for AI-assisted systems.

Core Lite is stack-agnostic.

---

## 2 Scope

Defines:
- ontology
- invariants
- event model
- evidence model
- omission detection
- truth condition
- minimal threat surface

Does NOT define:
- runtime architecture
- identity systems
- distributed audit hubs
- UI or commercial layers
- improvement-cycle methodologies such as PDCA/PHVA, which belong to the framework

### Normative authority

This document is the primary normative authority of the Janus Core.
`docs/glossary.md` fixes the meaning of Core terms, subordinate to this
document. An RFC is normative only when accepted, and then only to develop this
document without contradicting it; Draft RFCs are not accepted. All other
documentation is informative unless this document expressly incorporates it.
Runtimes, demos, and test suites are implementation or evidence, not normative
sources. Archived material has no authority over the active Core.

When sources diverge, the higher level prevails and the divergence MUST be
recorded; the lower-level source is not silently rewritten.

---

## 3 Ontology

The system is defined around three canonical append-only logs.

These logs are conceptual and may be implemented over any storage or transport,
provided the invariants in this document are preserved.

### `MANAGEMENT_LOG`

Domain events and actions within the management context.

### `SCHEMA_LOG`

Structural definitions and schema evolution used to interpret
records in MANAGEMENT_LOG and AUDIT_LOG.

### `AUDIT_LOG`

Governance events, accountability records, and audit findings.

---

## 4 Invariants

Core Lite defines a minimal set of invariants.

### Append-only logs

`MANAGEMENT_LOG`, `SCHEMA_LOG`, and `AUDIT_LOG` MUST be append-only.

Records MAY be compacted for operational purposes only if the system preserves
an equivalent, verifiable append-only representation for governance review.

Every record or event of a canonical log MUST be identifiable in a way that is
stable, unique within its log, never reused, and persistent under compaction.
This document does not prescribe whether that identity is a field, a position in
the canonical append-only representation, or a derived value. In `AUDIT_LOG`,
that identity is `event_id`, and every canonical event carries `event_type` and
`event_id`.

A record or event that declares that it supersedes, corrects, or voids an
earlier record or event MUST be appended as a new record or event and MUST keep
a resolvable backward reference to its antecedent. That reference does not by
itself assert causality.

### Separation of domain and governance

Domain activity is recorded in `MANAGEMENT_LOG`.
Governance evaluations and findings are recorded in `AUDIT_LOG`.

Implementations MUST NOT treat `AUDIT_LOG` as the primary domain record.

Corrections to domain activity are recorded in `MANAGEMENT_LOG`. Governance
events are never overwritten or deleted; any later interpretation,
authorization, or declaration about a governance event MUST be recorded only
through `HUMAN_DECISION`.

### Explicit evidence model

The evidence model MUST distinguish:
- E+ (explicit evidence): evidence explicitly recorded in a system of record
- E− (omission evidence): evidence derived from a verified absence of an expected record or event

E+ and E− are classes of evidence, not Boolean labels and not references.
Governance events invoke them through resolvable references to immutable
versions of the artifacts that support them.

### Human final authority

When an outcome requires explicit human accountability, the system MUST record a
`HUMAN_DECISION` event.

Automated outputs MAY support human decisions but MUST NOT substitute for them
when accountability is required.

`HUMAN_DECISION` is the only canonical human-authority event. It is recorded in
`AUDIT_LOG` and represents a prior human act. The Audit Writer may validate a
`HUMAN_DECISION` but MUST NOT originate it.

A `HUMAN_DECISION` MUST include `event_type`, `event_id`, `actor_ref`,
`scope_ref`, `object_refs`, `occurred_at`, and `recorded_at`. It MAY include
`evidence_refs`, `management_refs`, and `schema_ref`.

- `actor_ref` identifies the responsible human authority, individual or
  collective, not the technical writer of the event.
- `scope_ref` declares the competence invoked over the objects decided.
- `occurred_at` is the time of the human act; `recorded_at` is the time of its
  incorporation into `AUDIT_LOG`.
- `object_refs` identifies exclusively what was decided. It is a non-empty,
  unordered set of references to records or events of `MANAGEMENT_LOG`,
  `AUDIT_LOG`, or `SCHEMA_LOG`. Each reference identifies its origin log and the
  stable identity of its target. Two references are equal when they resolve to
  the same target, and no target appears twice. Plurality does not define joint
  semantics. External artifacts and derived views are not admissible objects.
- `management_refs` is domain context, `evidence_refs` is evidence, and
  `schema_ref` is interpretive context. None of them identifies the object
  decided or substitutes for `object_refs`. The same target MAY appear in
  `object_refs` and `evidence_refs` with independent roles; this does not
  establish evidentiary sufficiency.

When a `HUMAN_DECISION` is incorporated into `AUDIT_LOG`, each reference in
`object_refs` MUST resolve against the history already incorporated in its log,
and no event references itself. `AUDIT_LOG` MUST NOT contain a `HUMAN_DECISION`
whose `object_refs` do not resolve; the Audit Writer prevents its
incorporation. This rule asserts neither causality nor any relation with
`occurred_at`. A constitutive decision references the previously recorded
proposal, draft, or version that it constitutes; without a resolvable prior
target there is no valid `HUMAN_DECISION`.

Resolution of `actor_ref` and evaluation of competence belong to the framework.

### Audit writer authority

Governance events appended to `AUDIT_LOG` MUST be written exclusively
through an authorized Audit Writer mechanism.

Direct writes that bypass the Audit Writer MUST be prevented.

### Deterministic rebuildability

Given:
- all log records
- relevant schemas from `SCHEMA_LOG`
- referenced evidence artifacts

an implementation SHOULD be able to deterministically rebuild governance-relevant
views and findings.

The current view is a deterministic derivation of the history, schemas, and
referenced artifacts up to a cutoff; it MUST NOT be recorded as a mutation of
history. A deterministic re-evaluation may change the derived view but is not by
itself a canonical event unless it produces one of the existing canonical
events.

---

## 5 Evidence Model

### E+ explicit evidence

E+ is evidence explicitly recorded in a system of record.

E+ indicates that a claim or event is supported by a recorded artifact.

### E− omission evidence

E− is evidence derived from a verified absence of an expected record or event.

E− requires:
- a defined, referenceable expectation whose version was recorded before the
  observation and declares its provenance, temporal applicability, and the time
  or condition at which it becomes due
- a deterministic scope identifying sources, subject, filters, window, cutoff
  (`as-of`), and the evaluation procedure with its version; the cutoff MUST NOT
  precede the time at which the expectation became due, and that due status
  MUST be determinable from what was consulted up to the cutoff
- the `SCHEMA_LOG` schema context applicable to every record or event
  considered up to the cutoff
- a reproducible observation relative to that scope and cutoff

E− is not counter-argumentation.
It represents a verified omission relative to an explicit expectation.

---

## 6 Omission Detection

### `OMISSION_DETECTED`

`OMISSION_DETECTED` is the canonical governance event type that records an
instance of E− meeting the conditions of §5.

An `OMISSION_DETECTED` event MUST include enough context to support E− (omission evidence),
through the following fields:
- `event_type`
- `event_id`
- `expectation_ref`, referencing the expectation version evaluated
- `scope_ref`, referencing the deterministic search scope, including its cutoff
- `schema_ref`
- `evidence_refs`, with at least one reference
- `recorded_at`, as the event's only own time

`management_refs` is optional. The time at which the search was executed belongs
in the observation artifact. The event asserts the absence only within the
recorded scope and up to the recorded cutoff.

Later evidence or corrective action does not modify or remove the historical
event; it MUST be supported by referenceable evidence, and its effect is
reflected in the rebuilt view. A later action that satisfies the expectation is
not a supersession of the event. An omission is resolved only by a later
evaluation of the same expectation version, with a later cutoff and
corresponding evidence; an evaluation against another version of the
expectation does not resolve it. A `HUMAN_DECISION` about the omission modifies
neither the event nor its evidence and constitutes neither E+ nor E−.

---

## 7 Truth Condition

A claim is supported if:

- E+ recorded evidence exists
OR
- E− verified omission exists

Interpretation, escalation, and accountability MAY require human judgment.

Evidence (E+ or E−) is evaluated through governance evaluation flows.
These evaluation flows may produce `OMISSION_DETECTED` events recorded in
`AUDIT_LOG`; they do not originate `HUMAN_DECISION`.
When required, human interpretation MUST be recorded via `HUMAN_DECISION`.

---

## 8 Threat Surface

Core Lite defines a minimal threat surface.

Data integrity threats:
- log tampering
- shadow source of truth
- schema drift

Observability threats:
- silent failure

Authority threats:
- unauthorized audit writer
- autonomous authority violation
