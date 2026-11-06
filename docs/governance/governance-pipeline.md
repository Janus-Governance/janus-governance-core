# Janus Governance Pipeline

This informative pipeline is subordinate to Core Lite v0.2.

```text
domain activity -> MANAGEMENT_LOG -> evidence observation -> evaluation
                                                       |
                                                       v
                                     structural event candidate

prior human act -> HUMAN_DECISION record candidate

event candidate -> Audit Writer incorporation -> AUDIT_LOG
SCHEMA_LOG ------^ supplies versioned interpretive context
```

## Evidence observation

E+ and E− are evidence classes, not verdicts or exhaustive outcomes. E− exists only after the complete Core v0.2 §5 requirements, restated in `governance-scope.md`, are met. A missing record alone is not E−.

## Evaluation

Evaluation interprets evidence within a declared scope and may originate a structural finding such as `OMISSION_DETECTED`. It cannot originate human authority. A requirement for human review is not a `HUMAN_DECISION`.

## Human authority

`HUMAN_DECISION` represents a prior act by a designated human authority. AI may recommend and evaluation may surface a need, but neither can constitute the act.

## Audit Writer

The Audit Writer is the exclusive canonical appender to `AUDIT_LOG` and prevents bypass. For `HUMAN_DECISION`, it rejects incorporation when canonical `object_refs` do not resolve against previously incorporated history; it does not originate authority, competence, or human judgment. Any broader validation is a noncanonical Framework responsibility or Draft proposal.

## History and views

`AUDIT_LOG` preserves event history. Implementations may derive current views from history, schemas, and referenced artifacts up to a cutoff, or produce noncanonical gate results. Those views and results do not become new canonical Core event types and do not replace history; deterministic re-evaluation is not itself an event unless it produces an existing canonical type.

The pipeline supports traceability and reconstruction; it does not by itself prove validation, conformance, compliance, or runtime behavior.
