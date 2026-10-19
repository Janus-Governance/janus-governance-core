# RFC 0001 — Janus Core Lite

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026  
Current revision: v0.2  
Canonical specification: `core/lite/JANUS_CORE_LITE_v0.2.md`

---

## Summary

This RFC identifies the Janus Core Lite proposal and records its evolution. The
active revision is Core Lite v0.2.

The canonical specification is `core/lite/JANUS_CORE_LITE_v0.2.md`. This Draft
RFC is explanatory and is not accepted normative authority. If this RFC differs
from the canonical specification, the canonical specification prevails and the
divergence must be recorded rather than silently resolved.

---

## Revision history

- **v0.1** — initial formulation of the minimal governance core.
- **v0.2** — clarification of evidence, omission, human authority, canonical
  logs, governance evaluation, event contracts, and deterministic
  reconstruction.

The v0.1 formulation remains traceable through Git history and archived
material. Revision v0.2 evolves the same RFC proposal; it does not assert that
v0.1 disappeared or was silently rewritten.

---

## Motivation

AI-assisted systems increasingly participate in workflows whose evidence,
omissions, and accountable human acts must remain traceable. Core Lite provides
a stack-agnostic governance ontology without defining runtime architecture,
identity systems, distributed audit hubs, user interfaces, or framework
methodologies.

---

## Specification

Core Lite v0.2 is defined only by the canonical specification cited above. Its
scope includes:

- three canonical append-only logs: `MANAGEMENT_LOG`, `SCHEMA_LOG`, and
  `AUDIT_LOG`;
- evidence classes E+ and E−;
- the canonical events `OMISSION_DETECTED` and `HUMAN_DECISION`;
- stable record identity and append-only correction rules;
- separation of domain activity from governance evaluations and findings;
- exclusive `AUDIT_LOG` writing through an authorized Audit Writer; and
- deterministic reconstruction of governance-relevant views and findings from
  history, schemas, and referenced evidence up to a cutoff.

This summary does not replace, reduce, or extend the canonical requirements.
An RFC becomes normative only if accepted and only insofar as it develops the
Core without contradicting it. Frameworks, runtimes, demos, HTML
representations, and test suites are informative or implementation evidence;
they do not redefine Core Lite.

---

## Compatibility and history

The RFC number identifies the proposal; the revision identifies its evolution.
RFC 0001 therefore continues to represent Janus Core Lite at revision v0.2.
Historical v0.1 paths and commits remain available for traceability but do not
prevail over the active canonical Core.

---

## Security considerations

The canonical specification addresses log tampering, shadow sources of truth,
schema drift, silent failure, unauthorized audit writing, and autonomous
authority violations. Implementations must consult the canonical specification
rather than infer complete security requirements from this summary.

---

## License

MIT License
