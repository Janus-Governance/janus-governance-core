# Janus Core Lite v0.1

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

### Separation of domain and governance

Domain activity is recorded in `MANAGEMENT_LOG`.
Governance evaluations and findings are recorded in `AUDIT_LOG`.

Implementations MUST NOT treat `AUDIT_LOG` as the primary domain record.

### Explicit evidence model

The evidence model MUST distinguish:
- E+ (explicit evidence): evidence explicitly recorded in a system of record
- E− (omission evidence): evidence derived from a verified absence of an expected record

### Human final authority

When an outcome requires explicit human accountability, the system MUST record a
`HUMAN_DECISION` event.

Automated outputs MAY support human decisions but MUST NOT substitute for them
when accountability is required.

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

---

## 5 Evidence Model

### E+ explicit evidence

E+ is evidence explicitly recorded in a system of record.

E+ indicates that a claim or event is supported by a recorded artifact.

### E− omission evidence

E− is evidence derived from a verified absence of an expected record.

E− requires:
- a defined expectation
- a deterministic search scope
- a reproducible observation showing the record is missing
- referenceable schema context from `SCHEMA_LOG`

E− is not counter-argumentation.
It represents a verified omission relative to an explicit expectation.

---

## 6 Omission Detection

### `OMISSION_DETECTED`

`OMISSION_DETECTED` is a canonical governance event type indicating that an expected
record, state, or linkage is missing.

An `OMISSION_DETECTED` event MUST include enough context to support E− (omission evidence),
including:
- the expectation definition
- the deterministic search scope
- the reproducible observation that the expected record is absent
- the scope/time window to which the omission applies

---

## 7 Truth Condition

A claim is supported if:

- E+ recorded evidence exists
OR
- E− verified omission exists

Interpretation, escalation, and accountability MAY require human judgment.

Evidence (E+ or E−) is evaluated through governance evaluation flows.
These evaluation flows may produce governance events recorded in `AUDIT_LOG`.
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
