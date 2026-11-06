# RFC 0002 — Evidence Model (E+ / E−)

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

This nonnormative Draft is subordinate to Core Lite v0.2.

## Evidence classes

E+ is explicit evidence retrievable from a system of record. E− is evidence derived from a verified absence. They are evidence classes, not Boolean complements, verdicts, event types, or an exhaustive outcome space. `HUMAN_DECISION` is not E+.

## Minimum basis for E−

E− requires:

- a versioned, referenceable expectation that declares provenance and temporal applicability
- evidence that the expectation version was recorded before observation
- the time or condition at which the expectation becomes due
- deterministic sources, subject, filters, window, and cutoff
- a cutoff at or after the due condition
- due status determinable from what was consulted up to the cutoff
- a versioned observation procedure
- applicable `SCHEMA_LOG` context for every record or event considered up to the cutoff
- a reproducible observation of the declared scope

Missing data without this basis is not automatically E−.

## Relationship to events

`OMISSION_DETECTED` records a qualified E− observation and references its basis; the event is not itself E−. Evidence may inform a human, but neither E+ nor E− constitutes `HUMAN_DECISION`.

## Security considerations

Incomplete scope, premature cutoff, schema ambiguity, mutable procedures, or inaccessible sources can invalidate an omission claim.
