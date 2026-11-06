# RFC 0005 — Governance Event Model

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

This nonnormative Draft is subordinate to Core Lite v0.2.

## Canonical set

Core Lite v0.2 defines two canonical governance event types:

- `OMISSION_DETECTED`
- `HUMAN_DECISION`

Names used by implementations, including registration events, gate outcomes, verdicts, or workflow statuses, are not canonical merely because they are recorded. A future canonical event requires explicit adoption by a later normative Core version, not an RFC Draft alone.

## Distinct origins

Evaluation may originate a structural `OMISSION_DETECTED` candidate after the E− conditions are met. `HUMAN_DECISION` instead records a prior human authority act and cannot be originated by evaluation, AI, or the Audit Writer.

## Recording

Both profiles are appended exclusively through the Audit Writer and must fulfill their event-specific requirements. Core requires `HUMAN_DECISION.object_refs` to resolve before incorporation; evidence uses immutable, resolvable artifact references where Core requires them. Other resolution duties depend on the applicable event or implementation profile, and no event may reference itself. Derived current views do not replace historical events.
