## Janus Governance Core

Janus is a set of stack-agnostic specifications for management systems that require traceable decisions, explicit evidence handling, and audit-ready records. “Management” is used as a superset term for organizational contexts (e.g., government, project, education, business).

Janus is not:
- A runtime, platform, or hosted service
- A product roadmap or marketing artifact
- A legal contract or a substitute for legal review
- A guarantee of compliance or correctness

### Repository map

Normative specifications and reference material:
- `core/`: Core specifications (protocols, policies, canonical semantics)
- `framework/`: Framework specifications (e.g., gates and reference model)
- `docs/`: Working technical documentation for this repository

Implementations and integration surfaces:
- `runtimes/`: Runtime implementations (non-normative to Core semantics)
- `adapters/`: Storage/transport adapters
- `sdk/`: Developer SDKs and integration helpers

Knowledge spaces (non-normative unless explicitly stated):
- `papers/`: Background, analysis, and research notes
- `studies/`: Experiments, logs, and results
- `philosophy/`: Canon and essays

### High-level principles

- Stack-agnostic Core: Core definitions avoid runtime or vendor assumptions.
- Glossary-first stability: canonical meanings live in `docs/glossary.md` and are treated as the source of semantic truth.
- Append-only records: canonical logs are defined as append-only sequences.
- Separation of concerns: decision authority, evidence, and audit representations are distinct concepts.
- Closed-loop governance: recorded outcomes feed back into future controls and review.
- Human final authority: when a matter requires explicit human accountability, the system records a `HUMAN_DECISION`.

### Status

- Core Lite: v0.1 Draft

### Reading order

1) `docs/glossary.md`
2) `docs/architecture/janus-stack.md`
3) `core/` specifications

### Governance note

Janus defines closed-loop governance mechanics. Final authority remains with designated humans for decisions that require accountability, recorded explicitly as `HUMAN_DECISION`.

## License

MIT License  
Copyright (c) 2026 Martín Nicolás Sánchez Morales
