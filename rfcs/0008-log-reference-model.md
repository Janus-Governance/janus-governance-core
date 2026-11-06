# RFC 0008 — Log Reference Model

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

This nonnormative Draft is subordinate to Core Lite v0.2.

## Typed references

Reference roles are distinct:

- `actor_ref` identifies the human authority
- `scope_ref` identifies competence for `HUMAN_DECISION` or deterministic search scope for `OMISSION_DETECTED`
- `object_refs` identify exactly what was decided
- `expectation_ref` identifies the prior versioned expectation
- `schema_ref` identifies interpretive schema context
- `evidence_refs` identify supporting observations or artifacts
- `management_refs` optionally identify additional domain context

One role cannot silently substitute for another. Core requires `HUMAN_DECISION.object_refs` to be nonempty and resolvable against previously incorporated history before incorporation. Evidence supporting E+ or E− uses immutable, resolvable artifact references where Core requires them. Resolution of `actor_ref` and evaluation of competence belong to Framework; other resolution duties depend on the applicable event or implementation profile. No event reference may resolve to the event itself.

## Reconstruction

Typed, resolvable references support reconstruction of event context from append-only history. A derived current view is not the source history and cannot erase or rewrite it. Reconstruction support is not a guarantee of correctness, availability, conformance, or compliance.

## Security considerations

Implementations should detect missing targets, type confusion, mutable targets, cycles, self-reference, and schema-version ambiguity.
