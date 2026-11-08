# Core Lite v0.2 conformance inventory and schema/stateful foundation

This directory is the Gate 2 inventory and intentionally incomplete conformance-test-vector foundation for Janus Core Lite v0.2 at commit `8aae702a1bb11032f86a8a32e164e3a68fc961da` (SHA-256 `709279f32abe18d792c68299b080c349e1ed0c45780775581aacf32484e78b0b`).

The catalog contains 22 lexical MUST/MUST NOT parents, 43 lexical atomic requirements, 110 declarative constraints, and 153 total entries. D106 is a late inventory recovery and stateful implementation of the existing Core rule that a canonical `AUDIT_LOG` record uses `payload.event_id` as its identity; it makes no semantic change to Core Lite v0.2. The schema foundation adds six JSON Schema 2020-12 profiles and 42 manifest-driven fixture cases.

Every schema is a versioned Janus JSON conformance test-vector profile subordinate to Core. It is not a universal Core serialization, new canonical semantics, a replacement for Core, a runtime contract, a Framework identity or competence resolver, or proof of conformance. Objects remain open. References, identities and times have no invented UUID, URI, date-time or ordering syntax.

Exactly 19 atomic obligations receive `STRUCTURAL_SCHEMA_COVERED` and `REQUIREMENT_COMPLETE` based on resolvable schemas, fixtures and deterministic tests. D066–D075 receive only `PROJECTION_COVERED`; their unresolved findings remain. Human, Framework and stateful obligations outside the explicit structural allowlist remain incomplete.

The corrected deterministic in-memory stateful history/reference test profile completes 20 requirements and projects 2 more across 41 scenarios. Its dependency-free boundary guard checks the test wrapper, required `AUDIT_LOG` event type and event ID, identity equality, `HUMAN_DECISION` shape and placement, Audit Writer dispatch, applicable references, and uniqueness in that order. The recursively frozen state, logs, preconditions, Audit Writer registry, aliases, and alias targets are test-profile preconditions only. Aliases are a noncanonical test adapter; `CHECK_OBJECT_REFS` is an explicit technical adapter. Automatic `object_refs` governance applies only where Core defines it here, notably `HUMAN_DECISION`, while typed `antecedent_ref` resolution remains for correction, supersession, and void records.

This stateful foundation is not a runtime, authority store, full structural validator, JSON Schema substitute, or canonical serialization. It does not model origin, humanity, authority, will, competence, or E− semantics, and it does not claim conformance.

The dependency-free baseline remains `EXPECTED_INCOMPLETE` with exit 1 and `conformance_claimed: false`. Schema validation is defined for exactly `ajv@8.20.0` through `ajv/dist/2020.js`, but the AJV suite is not executed in this transaction because installation and network access are prohibited.
