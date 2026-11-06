# What is Janus?

Janus is a governance core for systems where humans, software, and AI participate in decision processes. It governs how relevant activity, evidence, omissions, and accountable human acts are recorded and reconstructed; it does not execute business logic.

## Evidence and events

- E+ is the class of explicit recorded evidence.
- E− is the class of evidence derived from a verified absence under the full Core v0.2 conditions.
- `OMISSION_DETECTED` records a qualified instance of E−; it is not itself E−.
- `HUMAN_DECISION` records a prior decision by a designated human authority. It is not E+, a system verdict, or an event that AI or evaluation can originate.

E+ and E− are evidence classes, not Boolean values, exhaustive outcomes, or automatic verdicts. A missing record is not automatically E−.

## Separation of responsibilities

Governance evaluation may inspect evidence and originate a structural finding such as `OMISSION_DETECTED`. The Audit Writer is the exclusive mechanism for appending governance events to `AUDIT_LOG`. For `HUMAN_DECISION`, it rejects incorporation when canonical `object_refs` do not resolve and otherwise incorporates a record of the prior human act; it cannot constitute that act or evaluate human competence.

## Reconstruction

Append-only history and typed, resolvable references support reconstruction of event context. A current view is derived from history, schemas, and referenced artifacts up to a cutoff; it is not a replacement for the historical records. Deterministic re-evaluation is not itself a canonical event unless it produces an existing canonical event type.

## Runtime material

`runtimes/demo-node/` is illustrative implementation material pending Gate 3 runtime evaluation. It does not establish actual runtime behavior, Core conformance, or proof of the model.
