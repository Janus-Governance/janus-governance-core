# Janus Runtime Model

This document is informative. Core defines semantics; Framework owns runtimes and operational profiles that apply pinned, approved contracts. The present Node material is classified `LEGACY_NONCONFORMING_PENDING_GATE_3`; no statement here establishes actual behavior or conformance.

## Implementation responsibilities

A conforming claim would require separate validation. A runtime intended to implement Core should:

- preserve the three canonical append-only logs
- distinguish E+ and qualified E− from events and verdicts
- prevent direct `AUDIT_LOG` writes outside the Audit Writer
- allow evaluation to originate structural findings but not human authority
- incorporate `HUMAN_DECISION` only as a record of a prior human act
- preserve the reference duties of each applicable event or implementation profile and preserve historical events
- treat derived current views and gate results as noncanonical outputs

## Adapters

Storage, database, messaging, and API adapters may map runtime interfaces to external systems. They do not redefine Core semantics.

## Illustrative flow

1. Observe records and declared expectations in a bounded scope.
2. Classify supporting evidence only when the applicable conditions are met.
3. Prepare a structural event candidate or receive a record of a prior human act.
4. Apply the event-specific checks and incorporate canonical events through the Audit Writer without assigning it authority or competence judgments.
5. Derive current views from history, schemas, and referenced artifacts up to a cutoff without rewriting history; re-evaluation alone is not a canonical event.

These steps describe an intended model, not a tested claim about the repository's current runtime.
