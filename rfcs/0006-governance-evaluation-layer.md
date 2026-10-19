# RFC 0006 — Governance Evaluation Layer

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026  
Aligned with: Core Lite v0.2  
Canonical specification: `core/lite/JANUS_CORE_LITE_v0.2.md`

---

## Authority and scope

Core Lite v0.2 is the primary normative authority. This Draft describes
evaluation without redefining Core. Other RFC Drafts and architecture documents
are informative navigation, not constitutive authority.

---

## Summary

Governance evaluation analyzes E+ and/or E− within a declared context. It may
produce `OMISSION_DETECTED` when every Core condition is met. It does not
produce, simulate, or originate `HUMAN_DECISION`.

---

## Specification

### Evaluation inputs

Evaluation may consider:

- resolvably referenced immutable E+ artifacts;
- E− only after every cumulative condition in Core §5 is satisfied;
- applicable `SCHEMA_LOG` context;
- relevant `MANAGEMENT_LOG` domain context; and
- prior `AUDIT_LOG` history up to the declared cutoff.

### Evaluation outputs

Evaluation may produce `OMISSION_DETECTED` when a verified omission satisfies
the canonical contract. A deterministic reevaluation that only changes a
derived view is not itself a canonical event.

Evaluation, recommendation, detection, escalation, and decision are distinct
stages. When accountability requires judgment, evaluation may identify the
need for human action or present evidence to a human authority. Only the human
act may later be represented by `HUMAN_DECISION`; the flow does not originate
that act.

### Event recording

Canonical events are appended to `AUDIT_LOG` exclusively through an authorized
Audit Writer. Evaluation does not write directly to `AUDIT_LOG` and does not
modify `MANAGEMENT_LOG` or `SCHEMA_LOG`.

### Informative architecture material

`docs/architecture/governance-event-structure.md` may illustrate an
implementation-oriented event shape. It is informative and does not define the
canonical contracts, which remain in Core Lite v0.2.

### Semantic drift

An implementation may flag inconsistent terminology for audit attention. That
flag is not E− unless the Core omission conditions are met, is not a new
canonical event, and does not imply accountability. Human review may decide
whether later action is authorized, without altering prior evidence or events.

---

## Security considerations

Evaluation must not use incomplete scope or schema context, claim human
authority, bypass the Audit Writer, mutate history, or treat a suite result as
semantic conformity.

---

## License

MIT License
