docs/janus-latex-paper-protocol.md

[![DOI](https://zenodo.org/badge/1174000167.svg)](https://doi.org/10.5281/zenodo.18974356)

License: MIT

<p align="center">
  <img src="assets/logo/janus-logo.svg" width="160" alt="Janus logo">
</p>

# Janus Governance Core

Minimal governance kernel for AI-assisted systems.

→ Start here: https://janusgovernance.org  
→ Framework stack: https://framework.janusgovernance.org  

→ Read the paper: docs/paper/janus-foundational-paper-v1.0.pdf

---

## 🚀 Quick Orientation

- Understand the system → `docs/janus-explained.md`  
- Explore the architecture → `docs/architecture/janus-stack.md`  
- Run the deterministic demo → `docs/demo-run.md`  

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

This repository includes a minimal deterministic validation suite demonstrating:


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

<<<<<<< HEAD
```bash
node demos/node/src/run-suite.js
```

Output:

```
demos/node/outputs/janus-validation-suite.json
```

---

## Repository map

### Normative specifications
=======
---

## Repository map

### Normative specifications

- `core/lite/` — Core Lite canonical specification  
- `rfcs/` — RFC 0001–0008  
- `docs/` — architecture and governance documentation  

### Validation and demos

- `runtimes/demo-node/` — reference runtime  
- `demos/node/` — validation datasets and outputs  

### Non-normative material

- `archive/` — historical and out-of-scope material  

---

## Deterministic Validation Suite (Node)
>>>>>>> 5111e1c (docs(core): synthesize local and remote README structures before rebase)

- `core/lite/` — Core Lite canonical specification  
- `rfcs/` — RFC 0001–0008  
- `docs/` — architecture and governance documentation  

### Validation and demos

- `runtimes/demo-node/` — reference runtime  
- `demos/node/` — validation datasets and outputs  

### Non-normative material

<<<<<<< HEAD
- `archive/` — historical and out-of-scope material  
=======
---

## High-level principles
>>>>>>> 5111e1c (docs(core): synthesize local and remote README structures before rebase)

---

<<<<<<< HEAD
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

=======
---

## Status

Core Lite: v0.1 Draft

---

## Reading order

>>>>>>> 5111e1c (docs(core): synthesize local and remote README structures before rebase)
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

