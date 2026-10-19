# RFC 0007 — Audit Writer Authority

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026  
Aligned with: Core Lite v0.2  
Canonical specification: `core/lite/JANUS_CORE_LITE_v0.2.md`

---

## Authority and scope

Core Lite v0.2 is the primary normative authority. This Draft explains the
exclusive technical writer boundary. References to other Draft RFCs are
informative and do not define the writer's authority.

---

## Summary

An authorized Audit Writer is the exclusive mechanism for appending governance
events to `AUDIT_LOG`. It records and validates events; it does not decide,
originate human authority, or write to the other canonical logs.

---

## Specification

### Exclusive writer

All governance events appended to `AUDIT_LOG` must be written exclusively
through an authorized Audit Writer. Direct writes that bypass it must be
prevented.

The Audit Writer validates the applicable canonical event contract, stable
identity, mandatory references, and append-only conditions before
incorporation. A rejected write is a technical rejection; it is not a
`HUMAN_DECISION` and does not create human authority.

### Human decision boundary

For `HUMAN_DECISION`, the Audit Writer validates and incorporates a record of a
prior human act. It must not originate, infer, simulate, or substitute for that
act. The responsible authority is identified by `actor_ref`, not by the
technical writer.

If mandatory `object_refs` do not resolve against already incorporated history,
the Audit Writer prevents incorporation. It does not repair the decision by
inventing objects or evidence.

### Log boundary and append-only behavior

The Audit Writer appends only to `AUDIT_LOG`; it does not modify
`MANAGEMENT_LOG` or `SCHEMA_LOG`. Corrections to domain activity are appended to
`MANAGEMENT_LOG`; schema corrections or evolution are appended to
`SCHEMA_LOG`; governance corrections are appended to `AUDIT_LOG` with a
resolvable backward reference.

Prior events are never overwritten or deleted.

---

## Security considerations

The authority boundary must be enforced at the storage or transport surface and
must prevent bypass, event forgery, unresolved mandatory references, mutation
of history, and autonomous creation of human authority.

---

## License

MIT License
