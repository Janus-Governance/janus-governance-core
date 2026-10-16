# Janus Stack (Architecture)

Janus is a governance kernel and layered architecture for auditable systems operating in AI-assisted environments.

This document defines the conceptual separation of layers in the Janus-Governance-Core repository.

Normative note: this document is informative under the normative hierarchy defined in the Core (Core Lite §2, "Normative authority"). Where it uses MUST/SHOULD/MAY, those statements describe repository organization conventions and do not override the Core. Core protocol requirements live under `core/`.

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

- `docs/`: Working documentation for this repository. The glossary fixes the meaning of Core terms, subordinate to the Core; other documents in `docs/` are informative.
- `papers/`: Background analysis and research notes. Non-normative by default.
- `studies/`: Experiments, logs, and results. Non-normative by default.
- `philosophy/`: Canon and essays. Non-normative by default.

A document other than the Core, the glossary, or an accepted RFC is normative only if the Core expressly incorporates it.

## Semantic stability rule

`docs/glossary.md` fixes the meaning of named terms used across layers, subordinate to the Core.

Rules:
1) A term used in Core, Framework, Runtimes, Adapters, or SDK text MUST have a stable meaning anchored in the glossary.
2) Changing a glossary definition MUST trigger review of dependent documents.
3) When meanings conflict, the hierarchy defined in the Core applies: the higher level prevails and the divergence is recorded, without silently rewriting the lower-level source.

Informative documents in this repository may still diverge from the active Core. Such divergences are recorded and do not override the Core.

This rule is intended to keep semantics stable while allowing implementations to evolve independently.
