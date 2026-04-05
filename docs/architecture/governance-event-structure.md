# Canonical Governance Event Structure

This document defines the minimal conceptual structure of a governance
event within Janus systems.

The structure is not a runtime schema. It defines the conceptual fields
required for interoperability and deterministic reconstruction.

## Event identity

Every governance event SHOULD contain a unique identifier.

Example field:

event_id

## Event type

The event type identifies the governance event category.

Examples include:

- OMISSION_DETECTED
- HUMAN_DECISION

Example field:

event_type

## Timestamp

The event MUST record the time at which the governance event was
produced.

Example field:

timestamp

## Evaluation scope reference

Governance events SHOULD reference the evaluation scope in which the
event was produced.

Example field:

scope_ref

## Schema reference

Governance events SHOULD reference the relevant schema context from
SCHEMA_LOG when interpretation depends on schema definitions.

Example field:

schema_ref

## Domain references

Governance events SHOULD reference relevant domain records from
MANAGEMENT_LOG.

Example field:

management_refs

## Evidence references

Governance events SHOULD reference supporting evidence.

Evidence references may include:

- E+ artifacts
- E− omission observations

Example field:

evidence_refs

## Optional actor reference

If relevant, the governance event MAY reference the responsible actor
or authority.

Example field:

actor_ref

## Purpose

This structure allows governance events to remain:

- traceable
- interpretable
- reconstructable

without constraining implementation technologies.

## Related specifications

The governance event model is defined in RFC 0005.

Governance events are produced by evaluation flows defined in RFC 0006.

Governance events are appended to AUDIT_LOG through the Audit Writer
mechanism defined in RFC 0007.
