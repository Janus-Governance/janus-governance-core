# RFC 0006 — Governance Evaluation Layer

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

This nonnormative Draft is subordinate to Core Lite v0.2.

## Evaluation

Evaluation interprets evidence under a declared scope and schema. It may prepare a structural finding such as `OMISSION_DETECTED` only after the complete E− conditions are met. Evaluation itself is not a canonical event.

Evaluation cannot originate `HUMAN_DECISION`. It may request human review or consume a record of a prior human act, but a detected need, recommendation, model output, gate result, or automated verdict is not human authority.

## Outputs and recording

Structural event candidates go to the exclusive Audit Writer for incorporation under the applicable event rules. Results such as allow, block, pass, fail, or escalate remain noncanonical gate or implementation outputs unless a normative Core version explicitly adopts them. Evaluation does not assign human competence or create human judgment.

## Semantic drift

An evaluation may report possible semantic drift for review. That report does not automatically establish E−, error, noncompliance, or accountability and introduces no new canonical event type.
