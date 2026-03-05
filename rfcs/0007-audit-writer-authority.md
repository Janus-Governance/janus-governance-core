# RFC 0007 — Audit Writer Authority

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

---

## Summary

This RFC defines the minimal writer authority rule for AUDIT_LOG.

Janus requires that AUDIT_LOG governance events be written only through
authorized audit writer flows, to prevent unauthorized governance records
and shadow authority.

---

## Motivation

If any component can write to AUDIT_LOG, governance can be forged.

Writer authority is therefore a minimal kernel requirement.

This RFC defines the smallest rule set required to ensure that:

- governance events are not written by unauthorized actors
- human accountability is not bypassed
- audit records remain trustworthy

---

## Specification

### Audit writer

An Audit Writer is the only authorized mechanism allowed to append
governance events to AUDIT_LOG.

Implementations MUST ensure that all governance events in AUDIT_LOG are
produced through the Audit Writer.

### Minimal authority rule

The system MUST prevent direct writes to AUDIT_LOG that bypass the Audit Writer.

### Relationship with governance evaluation

Governance evaluation flows (RFC 0006) may produce governance events (RFC 0005),
but those events MUST be appended to AUDIT_LOG only via the Audit Writer.

### Human decision enforcement

When a governance flow requires explicit human accountability (RFC 0004),
the Audit Writer MUST record HUMAN_DECISION and MUST NOT substitute it with
automated inference.

### Event coverage

At minimum, the Audit Writer MUST support recording:

- OMISSION_DETECTED (RFC 0003)
- HUMAN_DECISION (RFC 0004)

---

## Rationale

Writer authority is a kernel-level control.

It creates a clear boundary between evaluation processes and the
authoritative audit record.

---

## Backwards compatibility

Not applicable (initial writer authority specification).

---

## Security considerations

Risks addressed include:

- unauthorized audit event injection
- audit log forgery
- bypass of required HUMAN_DECISION

Implementations must ensure that the Audit Writer authority boundary is
enforced at the storage or transport surface.

---

## License

MIT License
