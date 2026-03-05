# Janus Governance Pipeline

Janus Core Lite defines a deterministic governance pipeline that
separates operational activity from governance evaluation and
accountability.

The pipeline describes how institutional truth becomes observable,
interpretable, and auditable.

## Canonical kernel pipeline (Core Lite)

```
┌──────────────────────────────────────────────────────────────┐
│ 1) DOMAIN ACTIVITY (Management context)                       │
│    What happens in the organization (government/project/edu…) │
└───────────────┬──────────────────────────────────────────────┘
                │ append-only
                ▼
┌──────────────────────────────────────────────────────────────┐
│ 2) MANAGEMENT_LOG                                             │
│    Domain facts/actions record                                 │
└───────────────┬──────────────────────────────────────────────┘
                │ evidence extraction (E+ / E−) + schema context
                ▼
┌──────────────────────────────────────────────────────────────┐
│ 3) GOVERNANCE EVALUATION FLOWS                                │
│    Evidence interpretation within a defined scope              │
│    (includes omission detection as an evaluation type)         │
└───────────────┬──────────────────────────────────────────────┘
                │ produces governance events
                ▼
┌──────────────────────────────────────────────────────────────┐
│ 4) AUDIT WRITER (authority boundary)                          │
│    Only authorized appender of governance events               │
│    - prevents bypass                                           │
│    - enforces HUMAN_DECISION when required                     │
└───────────────┬──────────────────────────────────────────────┘
                │ append-only + references
                ▼
┌──────────────────────────────────────────────────────────────┐
│ 5) AUDIT_LOG                                                  │
│    Auditable outcome: events + references + accountability     │
│    (traceability + rebuildability)                             │
└──────────────────────────────────────────────────────────────┘
```

SCHEMA_LOG is a cross-cutting interpretive layer:

- SCHEMA_LOG provides referenceable schema context to interpret records over time.
- SCHEMA_LOG MUST be linkable from omission evidence (E−) and relevant governance events when interpretation depends on schema.

---

The governance pipeline describes how evidence derived from domain activity becomes auditable governance records within Janus systems.

## 1 Domain activity

Operational actions occur within the management domain.

These actions are recorded in:

`MANAGEMENT_LOG`

Examples include:

- project updates
- state changes
- workflow actions
- system events

---

## 2 Evidence formation

From recorded activity, evidence becomes available for governance
evaluation.

Two forms of evidence exist:

- **E+** — explicit recorded evidence
- **E−** — omission evidence derived from the absence of an expected record

Evidence establishes the factual basis for governance analysis.

---

## 3 Governance evaluation

Governance evaluation flows analyze evidence within a defined scope.

Evaluation may consider:

- evidence (E+ or E−)
- schema context
- domain activity
- temporal scope

Evaluation processes determine whether governance events should be
generated.

---

## 4 Governance events

When evaluation determines that governance findings exist,
events are produced.

Examples include:

- `OMISSION_DETECTED`
- `HUMAN_DECISION`

These events represent accountable governance outcomes.

---

## 5 Audit writer

Governance events are written to `AUDIT_LOG` exclusively through
an authorized audit writer.

This mechanism ensures that governance records cannot be forged or
injected outside the authorized governance flow.

---

## 6 Governance record

The final governance state is recorded in:

`AUDIT_LOG`

This log forms the authoritative institutional memory of governance
evaluations and accountable decisions.

---

The governance pipeline ensures that institutional actions,
evaluations, and decisions remain traceable and reconstructable.

# Janus Core Lite — Design Principles

Janus Core Lite is designed as a minimal governance kernel for
auditable systems.

The architecture follows several foundational design principles.

---

## Minimal governance kernel

The system defines only the minimal primitives required for governance:

- logs
- evidence
- evaluation
- events
- human authority
- audit writer boundary

All higher-level mechanisms are implemented outside the core.

---

## Append-only institutional history

All canonical logs are append-only.

This guarantees that historical states and governance records cannot
be erased or silently rewritten.

---

## Separation of domain and governance

Operational activity and governance evaluation are recorded separately.

- Domain activity → `MANAGEMENT_LOG`
- Governance outcomes → `AUDIT_LOG`

This separation prevents governance logic from corrupting domain data.

---

## Explicit omission modeling

Governance must reason not only about recorded actions but also about
missing actions.

Janus therefore introduces omission evidence (E−), allowing verified
absences of expected records to become observable governance signals.

---

## Human accountability boundary

Automated systems may assist in analysis and detection.

However, decisions requiring explicit accountability must be recorded
through `HUMAN_DECISION`.

Human responsibility remains explicit and auditable.

---

## Deterministic rebuildability

Given:

- append-only logs
- schema definitions
- referenced evidence artifacts

a governance state should be reconstructable deterministically.

This ensures that institutional truth remains observable even after
system failures.

---

These principles allow Janus Core Lite to function as a minimal
governance kernel adaptable to different domains, including
AI-assisted development environments.
