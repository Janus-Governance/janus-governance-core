# Janus Stack (Architecture)

Janus is a governance kernel and layered architecture for auditable systems operating in AI-assisted environments.

This document defines the conceptual separation of layers in the Janus-Governance-Core repository.

Normative note: where this document uses MUST/SHOULD/MAY, those statements apply to repository organization and interpretation rules. Core protocol requirements live under `core/`.

## Layer separation

Janus is structured as a set of layers with explicit responsibilities.

### Core

Location: `core/`

Core defines:
- Canonical terms and semantics (aligned with `docs/glossary.md`)
- Protocols and policy primitives
- Canonical log types and event identifiers (e.g., `MANAGEMENT_LOG`, `SCHEMA_LOG`, `AUDIT_LOG`, `OMISSION_DETECTED`)

Core does not define:
- Runtime technologies, vendors, or deployment assumptions
- Storage engines, network transports, or UI constraints

### Framework

Location: `framework/`

Framework defines:
- Reusable governance mechanisms that compose with Core semantics
- Gate patterns (`gates`) and reference models that constrain transitions and outputs

Framework should remain compatible with multiple runtimes.

### Runtimes

Location: `runtimes/`

Runtimes:
- Execute workflows that implement Core and Framework requirements
- Produce and consume records that conform to Core-defined semantics

Runtimes MUST NOT redefine Core meanings.

### Adapters

Location: `adapters/`

Adapters:
- Map runtime interfaces to external storage/transport surfaces
- Preserve the meaning of canonical records while providing interoperability

Adapters MUST document any lossy mapping.

### SDK

Location: `sdk/`

SDKs:
- Provide developer-facing helpers to integrate with a Janus runtime or adapter
- Improve ergonomics without altering Core semantics

## Knowledge spaces

The repository separates normative specifications from supporting material.

- `docs/`: Working documentation for this repository. The glossary is normative for term meanings.
- `papers/`: Background analysis and research notes. Non-normative by default.
- `studies/`: Experiments, logs, and results. Non-normative by default.
- `philosophy/`: Canon and essays. Non-normative by default.

If a document outside `core/` or `docs/` is intended to be normative, it MUST explicitly declare its normative scope.

## Semantic stability rule (glossary-first)

`docs/glossary.md` is the source of semantic truth for named terms used across layers.

Rules:
1) A term used in Core, Framework, Runtimes, Adapters, or SDK text MUST have a stable meaning anchored in the glossary.
2) Changing a glossary definition MUST trigger review of dependent documents.
3) When meaning conflicts are discovered, the glossary MUST be updated first, then dependent specifications updated to match.

This rule is intended to keep semantics stable while allowing implementations to evolve independently.
