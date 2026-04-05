# ISSUE-003 — Resolution Note

Issue: RFC 0003 does not cite RFC 0006 when describing omission detection
as "a form of governance evaluation."

Audit record: JANUS-CORE-KERNEL-AUDIT-001  
Date: 2026-04-04  
File: rfcs/0003-omission-detection.md

---

## Finding

RFC 0003, Section "Omission detection," states:

> Omission detection is a form of governance evaluation applied to evidence
> expectations and scopes.

RFC 0006 (Governance Evaluation Layer) is not cited at that point.
This creates a latent forward-reference gap.

## Disposition

No semantic change to RFC 0003 is required.

RFC 0006 explicitly cites RFC 0003 as a concrete evaluation type:

> RFC 0003 defines one such evaluation type: omission detection.

The relationship is fully established from the RFC 0006 side.

Adding a forward reference from RFC 0003 to RFC 0006 would risk creating a
circular dependency at the kernel level. The RFC 0003 specification text
remains correct and complete as authored.

## Status

Closed. No file change. Documented in JANUS-CORE-KERNEL-AUDIT-001.

---

## License

MIT License
