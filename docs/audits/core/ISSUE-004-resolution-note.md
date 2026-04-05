# ISSUE-004 — Resolution Note

Issue: RFC 0004 uses inconsistent formatting for the HUMAN_DECISION event
name.

Audit record: JANUS-CORE-KERNEL-AUDIT-001  
Date: 2026-04-04  
File: rfcs/0004-human-authority-model.md

---

## Finding

RFC 0004 renders the event name in two forms:

- Inline code: `` `HUMAN_DECISION` `` — used in the "Event recording"
  section heading.
- Plain text: `HUMAN_DECISION` — used in the Summary, Specification body,
  and Rationale sections.

## Disposition

The formatting inconsistency is cosmetic. The semantic meaning of the term
is unambiguous in all occurrences.

Correcting the formatting would require a direct edit to RFC 0004 and could
not be performed as an append-only change. No semantic change to RFC 0004
is warranted.

## Status

Closed. No file change. Documented in JANUS-CORE-KERNEL-AUDIT-001.

---

## License

MIT License
