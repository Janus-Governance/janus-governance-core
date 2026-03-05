# RFC 0004 — Human Authority Model

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

---

## Summary

This RFC defines the human authority model used in Janus governance systems.

Janus requires that certain decisions involving accountability,
interpretation, or escalation remain under explicit human authority.

Such decisions are recorded using the canonical governance event:

HUMAN_DECISION

---

## Motivation

AI-assisted systems may produce analysis, recommendations, or automated
actions.

However, institutional accountability cannot be delegated to automated
systems.

Janus therefore defines a governance model in which human authorities
retain final responsibility for decisions that require accountability.

---

## Specification

### Human authority

When a governance process requires explicit human accountability,
the system MUST record a governance event:

HUMAN_DECISION

The event represents the formal acknowledgment that a designated human
authority has made, confirmed, or assumed responsibility for a decision.

HUMAN_DECISION is a governance event produced by governance evaluation flows when explicit human accountability is required, regardless of whether the evaluation is based on E+ or E− evidence.

### Event recording

`HUMAN_DECISION` events MUST be written to:

AUDIT_LOG

The event SHOULD reference:

- the triggering governance context
- any supporting evidence (E+ or E−)
- any relevant governance events (e.g., OMISSION_DETECTED)

### AI-assisted interpretation

AI systems MAY assist in analysis, detection, or recommendation.

However:

AI outputs MUST NOT substitute for HUMAN_DECISION when explicit
accountability is required.

---

## Rationale

Governance systems must maintain a clear boundary between automated
analysis and accountable decision-making.

The HUMAN_DECISION event ensures that final authority remains explicit
and auditable.

---

## Backwards compatibility

Not applicable (initial human authority specification).

---

## Security considerations

Risks related to human authority include:

- unauthorized human decision recording
- ambiguous accountability assignments
- automation incorrectly bypassing required human decisions

Implementations must ensure that governance flows correctly enforce
human authority requirements.

---

## License

MIT License
