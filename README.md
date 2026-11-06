# Janus Governance Core

Janus is a stack-agnostic governance layer for AI-assisted systems. It is not a framework, workflow engine, or runtime.

## Normative hierarchy

The primary internal normative baseline is [Core Lite v0.2](core/lite/JANUS_CORE_LITE_v0.2.md), whose document status remains Draft. The [glossary](docs/glossary.md) is subordinate to it. RFC 0001–0008 remain Draft, nonnormative proposals; architecture, explanatory, demo, and runtime documents are informative.

Core defines canonical semantics. Framework owns operational profiles and runtimes that apply approved Core contracts. Runtimes and demos may illustrate an implementation but do not redefine or prove Core conformance.

## Core model

- append-only `MANAGEMENT_LOG`, `SCHEMA_LOG`, and `AUDIT_LOG`
- E+ explicit-evidence and E− omission-evidence classes
- canonical `OMISSION_DETECTED` and `HUMAN_DECISION` events
- exclusive Audit Writer boundary for `AUDIT_LOG`
- referenceable context sufficient to support later reconstruction

`HUMAN_DECISION` records a prior act of a designated human authority. AI and evaluation may analyze or prepare non-authoritative material. Only a record of an already-performed human act can become `HUMAN_DECISION`; the Audit Writer is the exclusive canonical appender, rejects incorporation when canonical `object_refs` do not resolve, and cannot originate the act, competence, or human judgment.

## Reading order

1. `core/lite/JANUS_CORE_LITE_v0.2.md`
2. `docs/glossary.md`
3. `docs/architecture/` and `docs/governance/`
4. Draft RFCs in `rfcs/`
5. illustrative demos and runtime material

## Repository contents

- `core/lite/` — primary normative Core Lite specification
- `docs/` — subordinate glossary and informative documentation
- `rfcs/` — Draft, nonnormative proposals
- `runtimes/` and `demos/` — illustrative implementation material; the current Node demo is legacy and nonconforming pending Gate 3 source migration
- `archive/` — historical and out-of-scope material

## Papers

- Janus Foundational Paper v1.0 — DOI: https://doi.org/10.5281/zenodo.18974356
- Janus Framework Paper v1.0 — DOI: https://doi.org/10.5281/zenodo.19239183
- Janus Origin Case Paper v1.0 — DOI: https://doi.org/10.5281/zenodo.19709093

## Status

Core Lite v0.2 (Status: Draft) is the current internal normative baseline. Tracked HTML remains unreconciled and publication remains blocked. This Markdown reconciliation does not establish repository-wide, public-surface, runtime, standards, or publication alignment.

## License

MIT License  
Copyright (c) 2026 Martín Nicolás Sánchez Morales
