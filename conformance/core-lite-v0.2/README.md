# Core Lite v0.2 conformance inventory and schema foundation

This directory is the Gate 2 inventory and intentionally incomplete conformance-test-vector foundation for Janus Core Lite v0.2 at commit `8aae702a1bb11032f86a8a32e164e3a68fc961da` (SHA-256 `709279f32abe18d792c68299b080c349e1ed0c45780775581aacf32484e78b0b`).

The catalog contains 22 lexical MUST/MUST NOT parents, 43 lexical atomic requirements, 109 declarative constraints, and 152 total entries. The schema foundation adds six JSON Schema 2020-12 profiles and 42 manifest-driven fixture cases.

Every schema is a versioned Janus JSON conformance test-vector profile subordinate to Core. It is not a universal Core serialization, new canonical semantics, a replacement for Core, a runtime contract, a Framework identity or competence resolver, or proof of conformance. Objects remain open. References, identities and times have no invented UUID, URI, date-time or ordering syntax.

Exactly 19 atomic obligations receive `STRUCTURAL_SCHEMA_COVERED` and `REQUIREMENT_COMPLETE` based on resolvable schemas, fixtures and deterministic tests. D066–D075 receive only `PROJECTION_COVERED`; their unresolved findings remain. Human, Framework and stateful obligations outside the explicit structural allowlist remain incomplete.

The dependency-free baseline remains `EXPECTED_INCOMPLETE` with exit 1. Schema validation uses exactly `ajv@8.20.0` through `ajv/dist/2020.js` in isolated temporary copies; dependencies are never installed in this governed worktree.
