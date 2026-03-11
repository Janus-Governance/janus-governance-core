<p align="center">
  <img src="assets/logo/janus-logo.svg" width="160" alt="Janus logo">
</p>

## Janus Governance Core

---

## What is Janus?

Janus is a minimal governance layer for human–AI development systems.

It introduces three structural invariants:

• append-only institutional logs  
• dual evidence model (E+ / E−)  
• explicit human authority decisions

Together these enable development environments where actions, decisions, and system states remain traceable, auditable, and deterministically reconstructible.

Read the Foundational Paper → `paper/janus-foundational-paper-v1.0.pdf`

---

Janus is a set of stack-agnostic specifications for management systems that require traceable decisions, explicit evidence handling, and audit-ready records. “Management” is used as a superset term for organizational contexts (e.g., government, project, education, business).

Janus is not:
- A runtime, platform, or hosted service
- A product roadmap or marketing artifact
- A legal contract or a substitute for legal review
- A guarantee of compliance or correctness

## Latest Updates

- Reference runtime demo (Node) demonstrating the Janus governance model
- 60-second executable proof of the system
- Runtime model documentation
- "What is Janus" overview document
- GitHub Pages section showing the executable proof

Links:

- [docs/janus-explained.md](docs/janus-explained.md)
- [docs/runtime-model.md](docs/runtime-model.md)
- [docs/demo-run.md](docs/demo-run.md)
- [runtime/demo-node/](runtime/demo-node/)

### Repository map

Normative specifications (Genesis):

- `core/lite/`: Core Lite canonical spec
- `rfcs/`: RFC 0001–0008
- `docs/`: Architecture + Governance docs
- 60-second runtime proof: [docs/demo-run.md](docs/demo-run.md)

Non-normative historical material:

- `archive/`: Out-of-scope for Genesis semantics

### Reference Runtime Demo

Janus includes a minimal executable Node demo proving governance evaluation, omission detection, audit writing, and deterministic rebuild.

- [runtime/demo-node/README.md](runtime/demo-node/README.md)
- Run: `node runtime/demo-node/demo.js`

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

## Paper Writing Protocol

Technical papers in this project follow the Janus LaTeX Paper Protocol.

See:

docs/janus-latex-paper-protocol.md
