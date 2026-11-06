# RFC 0003 — Omission Detection

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

This nonnormative Draft is subordinate to Core Lite v0.2.

## Detection conditions

Omission detection applies a versioned procedure to deterministic sources, subject, filters, window, and cutoff. It requires an expectation version recorded before observation that declares provenance, temporal applicability, and due condition; a cutoff at or after that condition with due status determinable from what was consulted up to the cutoff; applicable `SCHEMA_LOG` context for every record or event considered; and a reproducible absence observation.

## Event profile

When the full E− conditions are met, an `OMISSION_DETECTED` candidate may be prepared with:

- `event_type` and `event_id`
- `expectation_ref`
- `scope_ref`, including the deterministic cutoff
- `schema_ref`
- nonempty `evidence_refs`
- `recorded_at`, the event's only own time
- optional `management_refs`

The candidate is submitted through the exclusive Audit Writer boundary for incorporation into `AUDIT_LOG` under the applicable event rules. Search-execution time belongs in the observation artifact. The event records E−; it is not itself E− and does not by itself establish fault, noncompliance, or human accountability.

## Historical treatment

Later evidence, action, or a derived current view does not erase the historical omission event. Resolution requires a later evaluation of the same expectation version, with a later cutoff and corresponding evidence; evaluation against another expectation version does not resolve it. A `HUMAN_DECISION` about the omission changes neither the event nor its evidence and constitutes neither E+ nor E−.
