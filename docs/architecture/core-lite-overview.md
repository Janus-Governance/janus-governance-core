# Janus Core Lite — Architecture Overview

This informative overview is subordinate to the primary normative specification, `core/lite/JANUS_CORE_LITE_v0.2.md`.

## Canonical logs

- `MANAGEMENT_LOG` records domain activity.
- `SCHEMA_LOG` records versioned schema context.
- `AUDIT_LOG` records canonical governance events through the exclusive Audit Writer boundary.

## Evidence model

E+ and E− are evidence classes. E+ identifies explicit recorded evidence. E− identifies evidence of a verified absence only when the complete conditions in Core v0.2 §5 are satisfied; the detailed restatement appears in `docs/governance/governance-scope.md`. Neither class is a Boolean, verdict, event type, or exhaustive outcome set.

`OMISSION_DETECTED` records E− and references its basis; it is not itself E−. `HUMAN_DECISION` records a prior human authority act and is not E+.

## Governance evaluation

Evaluation interprets evidence within a defined scope. It may originate a structural finding such as `OMISSION_DETECTED`. It may request or identify the need for a human decision, but it cannot originate `HUMAN_DECISION`.

## Human authority

`HUMAN_DECISION` is the sole canonical human-authority event in Core v0.2. AI systems may analyze or recommend, and the Audit Writer may incorporate the already-existing record, but only a designated human authority can perform the represented act. Resolution of `actor_ref` and evaluation of competence belong to Framework.

## Audit Writer boundary

All canonical governance events enter `AUDIT_LOG` through the Audit Writer, which prevents bypass. For `HUMAN_DECISION`, the writer rejects incorporation when canonical `object_refs` do not resolve against previously incorporated history. Broader field or reference validation may be assigned by a noncanonical Framework profile, but Core v0.2 does not assign the writer universal validation duties. The writer does not originate authority, competence, or human judgment.

## Reconstruction

Append-only logs plus the references required by each applicable event profile support reconstruction. Core v0.2 says an implementation SHOULD be able to rebuild governance-relevant views from the specified inputs; this attributed requirement is not a claim of proof or guaranteed recovery in every environment.
