
---
Janus is not a framework or a tool.

It is a governance layer for AI-assisted systems.

If you are new:

1. Read the Core → understand the rules
2. Use the Framework → apply the rules
3. Explore Runtimes → see real execution
---

[![DOI](https://zenodo.org/badge/1174000167.svg)](https://doi.org/10.5281/zenodo.18974356)

License: MIT

<p align="center">
  <img src="assets/logo/janus-logo.svg" width="160" alt="Janus logo">
</p>

# Janus Governance Core

Minimal governance kernel for AI-assisted systems.

→ Start here: https://janusgovernance.org  
→ Framework stack: https://framework.janusgovernance.org  


## Papers

### Janus Foundational Paper

Presents the formal description of the Janus governance kernel and its core invariants: append-only institutional logs, dual evidence model (E+ / E−), and explicit human authority boundary.

Version: v1.0
DOI: https://doi.org/10.5281/zenodo.18974356
docs/paper/janus-foundational-paper-v1.0.pdf

### Janus Framework Paper

Presents the operational stack of Janus, including protocol layer, runtime structure, observability, and governed AI-assisted development workflows.

Version: v1.0
DOI: https://doi.org/10.5281/zenodo.19239183
docs/paper/janus-framework-paper-v1.0.pdf

### Janus Origin Case Paper

Documents the structural systems failure that motivated Janus: systems record state changes but not the human decisions that authorize them. It provides longitudinal institutional evidence and positions the governance kernel as a minimal structural response.

Version: v1.0
DOI: https://doi.org/10.5281/zenodo.19709093
docs/paper/janus-origin-case-v1.0-en.pdf

---

## 🚀 Quick Orientation

- Understand the system → `docs/janus-explained.md`  
- Explore the architecture → `docs/architecture/janus-stack.md`  
- Run the deterministic demo → `docs/demo-run.md`  

---

## What is Janus

Janus is a minimal governance layer for human–AI development systems.

It introduces three structural invariants:

- append-only institutional logs  
- dual evidence model (E+ / E−)  
- explicit human authority decisions  

Together these enable development environments where actions, decisions, and system states remain traceable, auditable, and deterministically reconstructible.

---

## What this repository contains

This repository defines the **Janus Core**:

- canonical governance definitions  
- RFC specifications  
- architecture and glossary  
- deterministic validation suite  

It is **stack-agnostic** and does not depend on any runtime or implementation.

---

## Deterministic Validation Suite (Node)

This repository includes a minimal deterministic validation suite demonstrating reproducible Janus Core Lite cases and executable proofs of the system.

---

## Latest Updates

- Deterministic validation suite (Node) demonstrating reproducible Janus Core Lite cases
- 60-second executable proof of the system
- Runtime model documentation
- "What is Janus" overview document
- GitHub Pages section showing the executable proof

Links:

- [docs/janus-explained.md](docs/janus-explained.md)
- [docs/runtime-model.md](docs/runtime-model.md)
- [docs/demo-run.md](docs/demo-run.md)
- [runtimes/demo-node/](runtimes/demo-node/)

---

Run:

```bash
node runtimes/demo-node/demo.js
```

Suite:

```bash
node demos/node/src/run-suite.js
```

Output:

```
demos/node/outputs/janus-validation-suite.json
```

---



- `core/lite/` — Core Lite canonical specification  
- `rfcs/` — RFC 0001–0008  
- `docs/` — architecture and governance documentation  

### Validation and demos

- `runtimes/demo-node/` — reference runtime  
- `demos/node/` — validation datasets and outputs  

### Non-normative material


- `archive/` — historical and out-of-scope material  

---



## High-level principles

- Stack-agnostic Core  
- Glossary-first semantic stability  
- Append-only records  
- Separation of concerns  
- Closed-loop governance  
- Human final authority (`HUMAN_DECISION`)  

---

## Status

Core Lite: v0.1 Draft

---

## Reading order
1. `docs/glossary.md`  
2. `docs/architecture/janus-stack.md`  
3. `core/` specifications  

---

## Governance note

Janus defines closed-loop governance mechanics.  
Final authority remains with designated humans and is explicitly recorded as `HUMAN_DECISION`.

---

## License

MIT License  
Copyright (c) 2026 Martín Nicolás Sánchez Morales

---

## Paper Writing Protocol

Technical papers in this project follow the Janus LaTeX Paper Protocol.

See:
- docs/janus-latex-paper-protocol.md

