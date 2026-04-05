# ISSUE-006 — Change Record

Issue: RFC 0006 does not reference the canonical event structure document.

Audit record: JANUS-CORE-KERNEL-AUDIT-001  
Date: 2026-04-04  
File: rfcs/0006-governance-evaluation-layer.md

---

## Finding

RFC 0006 defines the governance evaluation layer and states that evaluation
flows may produce governance events recorded in AUDIT_LOG. However, the RFC
does not reference docs/architecture/governance-event-structure.md, which
defines the canonical conceptual structure of those governance events.

Implementors reading RFC 0006 in isolation lack a direct pointer to the
event structure specification.

## Change applied

An append-only "Event structure reference" section was added before the
License section in rfcs/0006-governance-evaluation-layer.md, pointing to
docs/architecture/governance-event-structure.md and to RFC 0005.

No existing normative content was modified.

## Diff summary

```
+ ## Event structure reference
+
+ The canonical conceptual structure of governance events produced by
+ evaluation flows is defined in:
+
+ docs/architecture/governance-event-structure.md
+
+ The governance event model and AUDIT_LOG recording requirements are
+ defined in RFC 0005.
```

## Semantic risk

Low. The appended section is informational and introduces no new
requirements. All normative language remains unchanged.

## Status

Closed. Change applied. Documented in JANUS-CORE-KERNEL-AUDIT-001.

---

## License

MIT License
