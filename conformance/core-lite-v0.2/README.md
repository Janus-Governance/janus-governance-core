# Core Lite v0.2 conformance inventory

This directory is the Gate 2 inventory and honest incomplete coverage baseline for Janus Core Lite v0.2 at commit `8aae702a1bb11032f86a8a32e164e3a68fc961da` (SHA-256 `709279f32abe18d792c68299b080c349e1ed0c45780775581aacf32484e78b0b`).

It inventories exactly 22 lexical MUST/MUST NOT occurrences, decomposes their conjunctions and field lists into 43 lexical atomic requirements, and inventories 109 additional declarative constraints separately. The combined catalog contains 152 atomic entries, including one explicitly non-gating MAY capability.

This is not a complete conformance suite. Event schemas and fixtures have not been created. The catalog schema validates only inventory structure; it is not a Core event schema, universal serialization, or proof of conformance. Critical invariants are enforced manually by the dependency-free runner; no external JSON Schema engine execution is claimed. The deterministic runner therefore reports `EXPECTED_INCOMPLETE` and exits 1. Meta-tests validate inventory integrity and exit 0.

No RFC Draft originates a requirement. The inventory does not prescribe UUIDs, reference syntax, storage representation, canonical JSON, object_refs ordering, occurred_at ordering, closed future event types, or Core-owned actor competence. E+/E− remain evidence classes; HUMAN_DECISION is not E+; OMISSION_DETECTED is not E−; SHOULD/MAY are not upgraded.
