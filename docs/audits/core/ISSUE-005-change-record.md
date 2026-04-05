# ISSUE-005 — Change Record

Issue: docs/architecture/governance-event-structure.md lacks RFC
cross-references.

Audit record: JANUS-CORE-KERNEL-AUDIT-001  
Date: 2026-04-04  
File: docs/architecture/governance-event-structure.md

---

## Finding

The canonical governance event structure document defines the minimal
conceptual fields for governance events but contains no references to:

- RFC 0005, which defines the governance event model and AUDIT_LOG
  recording requirements.
- RFC 0006, which defines the evaluation layer that produces governance
  events.

This omission reduces traceability for implementors reading the architecture
document in isolation.

## Change applied

An append-only "Related specifications" section was added to the bottom of
docs/architecture/governance-event-structure.md.

The addition references RFC 0005 and RFC 0006. No existing content was
modified.

## Diff summary

```
+ ## Related specifications
+
+ The governance event model is defined in RFC 0005.
+
+ Governance events are produced by evaluation flows defined in RFC 0006.
+
+ Governance events are appended to AUDIT_LOG through the Audit Writer
+ mechanism defined in RFC 0007.
```

## Semantic risk

Low. The appended section adds navigational context only. It does not alter
any field definitions, MUST/SHOULD/MAY requirements, or existing normative
text.

## Status

Closed. Change applied. Documented in JANUS-CORE-KERNEL-AUDIT-001.

---

## License

MIT License
