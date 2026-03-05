# Governance Scope Model

This document defines the concept of governance scope used during
governance evaluation flows in Janus systems.

A governance scope defines the bounded context within which evidence
is evaluated and governance conclusions are produced.

Governance scopes ensure that evaluation remains deterministic,
traceable, and reproducible.

## Scope definition

A governance scope represents a defined subset of observable system
state used during governance evaluation.

A scope typically includes:

- a defined time window
- a defined set of domain records
- relevant schema context
- a defined evaluation boundary

## Temporal scope

Governance evaluations may operate over a defined time interval.

Example:

- start_time
- end_time

Temporal scope ensures that evaluations remain reproducible and that
observations correspond to a clearly defined period.

## Record scope

A governance scope may restrict the set of domain records considered
during evaluation.

Example:

- records belonging to a specific project
- records associated with a particular workflow
- records matching a defined query boundary

This constraint ensures that evaluation operates over a well-defined
subset of MANAGEMENT_LOG.

## Schema scope

Governance evaluations may depend on schema definitions that interpret
records.

A governance scope SHOULD reference the relevant schema context from
SCHEMA_LOG.

This ensures that evaluations remain interpretable even as schemas
evolve over time.

## Deterministic search scope

When omission evidence (E−) is produced, the search scope used to
verify the absence of an expected record MUST be deterministic.

The scope must define:

- where the system searched
- what records were considered
- the schema context used during interpretation

This requirement ensures that omission evidence remains verifiable.

## Purpose

Governance scopes ensure that governance evaluation remains:

- deterministic
- reproducible
- auditable

without constraining implementation technologies.
