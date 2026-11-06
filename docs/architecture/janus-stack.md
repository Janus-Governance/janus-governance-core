# Janus Stack (Architecture)

Janus is a governance kernel and layered architecture for auditable systems operating in AI-assisted environments.

This informative document maps ownership across the Janus ecosystem. It distinguishes surfaces present in this repository from external or planned surfaces.

Normative note: this document is informative under the normative hierarchy defined in the Core (Core Lite §2, "Normative authority"). Where it uses MUST/SHOULD/MAY, those statements describe repository organization conventions and do not override the Core. Core protocol requirements live under `core/`.

## Ownership boundaries

Janus is structured as a set of layers with explicit responsibilities. Only approved Core specifications define canonical event semantics.

### Core

Current surface in this repository: `core/`.

Core owns:
- the canonical specification and event semantics
- canonical log types and event identifiers
- the normative invariants expressly adopted by the Core

Core does not define:
- Runtime technologies, vendors, or deployment assumptions
- Storage engines, network transports, or UI constraints

### Framework

External ecosystem surface; no `framework/` directory is present in this repository.

Framework owns:
- runtimes that apply pinned, approved Core contracts
- operational profiles, including candidate profiles that do not amend Core
- gate patterns and reusable governance mechanisms

Framework must not redefine canonical Core meanings. A Framework candidate becomes normative only through the applicable promotion process and explicit authority decision.

### Labs

External ecosystem surface; no Labs directory is present in this repository.

Labs owns incubation, experiments, campaigns, and campaign evidence. Labs outputs do not become canonical semantics merely by being observed or published.

### Template

External ecosystem consumer; no Template directory is present in this repository.

Template consumes pinned, approved contract versions. It owns no independent semantics and cannot silently reinterpret Core or Framework contracts.

### Runtimes in this repository

Current surface: `runtimes/`.

The current Node demo is legacy implementation material classified `LEGACY_NONCONFORMING_PENDING_GATE_3`. Its presence does not make this repository the owner of Framework runtime semantics or establish conformance.

### Planned or external integration surfaces

Adapters and SDKs may exist as external or planned surfaces. No `adapters/` or `sdk/` directory is present here, and this map does not present either as an implemented repository surface. Such integrations must consume pinned contracts and document lossy mappings without altering canonical semantics.

## Knowledge spaces

The repository separates normative specifications from supporting material.

- `docs/`: subordinate glossary and informative documentation, including historical paper material under `docs/paper/`
- `rfcs/`: Draft proposals unless explicitly accepted under the Core hierarchy
- `runtimes/`: current legacy demonstration material pending Gate 3
- `archive/`: historical, non-active material

A document other than the Core, the glossary, or an accepted RFC is normative only if the Core expressly incorporates it.

## Semantic stability rule

`docs/glossary.md` fixes the meaning of named terms used across layers, subordinate to the Core.

Rules:
1) A term used across the ecosystem MUST preserve the meaning fixed by its pinned, approved contract.
2) Changing a subordinate glossary definition MUST trigger review of dependent active specifications, documentation, and derived surfaces.
3) When meanings conflict, the hierarchy defined in the Core applies: the higher level prevails and the divergence is recorded, without silently rewriting the lower-level source.

Informative documents in this repository may still diverge from the active Core. Such divergences are recorded and do not override the Core.

This rule is intended to keep semantics stable while allowing implementations to evolve independently.
