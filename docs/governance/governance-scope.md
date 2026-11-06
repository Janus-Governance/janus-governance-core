# Governance Scope Model

A governance scope is a referenceable, deterministic boundary for an observation or evaluation. Its meaning depends on the event profile; in `HUMAN_DECISION`, `scope_ref` denotes competence, while in `OMISSION_DETECTED` it denotes the search scope.

## Deterministic omission scope

An E− observation requires all of the following:

- a versioned, referenceable expectation that declares its provenance and temporal applicability
- evidence that the expectation version was recorded before the observation
- the time or condition at which the expectation becomes due
- deterministic sources, subject, filters, search window, and cutoff
- a cutoff at or after the due condition
- due status determinable from what was consulted up to the cutoff
- a versioned evaluation or observation procedure
- the applicable `SCHEMA_LOG` context for every record or event considered up to the cutoff
- a reproducible observation over the declared bytes or records

Core requires the scope to identify what was searched, where, for which subject, under which filters and schema, and through what cutoff. These elements must be resolvable later. A missing record outside this complete envelope is not automatically E−.

## Other scopes

Evaluation scopes may identify time windows, record sets, schemas, and evaluation boundaries. `HUMAN_DECISION.scope_ref` instead identifies the authority's competence over the objects in `object_refs`; it cannot substitute for those objects.

Scopes support reproducibility and audit. They do not themselves establish a verdict or human authority.
