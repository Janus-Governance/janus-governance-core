# Janus Core Lite — Architecture Overview

Janus Core Lite defines a minimal governance kernel for auditable systems.

The architecture separates operational activity from governance
evaluation and accountability.

The system is structured around five core components.

---

## Append-only logs

Janus defines three canonical logs:

- MANAGEMENT_LOG
- SCHEMA_LOG
- AUDIT_LOG

These logs form the historical backbone of the system.

Operational activity is recorded in MANAGEMENT_LOG, while governance
findings and accountability records are written to AUDIT_LOG.

SCHEMA_LOG provides the structural context required to interpret records.

---

## Evidence model

Janus distinguishes two forms of evidence:

- **E+ (explicit evidence)** — recorded artifacts in a system of record
- **E− (omission evidence)** — verified absence of an expected record

This model allows governance processes to reason about both recorded
facts and structural omissions.

---

## Governance evaluation

Evidence is interpreted through governance evaluation flows.

Evaluation processes analyze available evidence and contextual data
in order to determine whether governance events should be produced.

Evaluation flows themselves are not recorded as events.

---

## Governance events

Evaluation processes may produce governance events.

Core Lite defines two canonical events:

- `OMISSION_DETECTED`
- `HUMAN_DECISION`

These events represent auditable governance outcomes.

---

## Human authority

When accountability is required, governance decisions must be recorded
explicitly through `HUMAN_DECISION`.

Automated systems may assist in analysis but cannot substitute for
explicit human responsibility.

---

## Audit writer boundary

All governance events must be written to `AUDIT_LOG` through an
authorized audit writer mechanism.

This prevents unauthorized event injection and preserves the integrity
of governance records.

---

Janus Core Lite therefore establishes a minimal governance kernel that
supports traceability, accountability, and deterministic reconstruction
of institutional decisions.
