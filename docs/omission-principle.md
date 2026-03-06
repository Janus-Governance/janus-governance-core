# Omission as Structured Evidence

## 1. Core Idea

Most systems record what happened.
Janus also records what should have happened but did not.

In Janus, omission is not silence.
Omission is structured evidence.

## 2. Classical Model vs Janus Model

Classical systems:
- positive event recorded
- absence remains silent

Janus:
- E+ = event occurred
- E- = required event missing
- governance outcome must be expressible as evidence

## 3. Why This Matters

Omissions are often the most critical failures in socio-technical systems.
Examples:
- missing validation
- missing human decision
- missing required review
- missing protocol step

## 4. Canonical Janus Expression

E+ = positive evidence  
E- = omission evidence

For governance-required activity:

governance outcome = E+ or E-

If a required event is missing, the system must emit structured omission evidence.

## 5. Runtime Demonstration

The reference runtime demo (Node) validates omission detection by emitting explicit audit events when a governance-required event is missing. A stress test (many proposals with random omission vs decision) validates the same principle under scale.

Use this example:

1000 CHANGE_PROPOSED
→ 464 HUMAN_DECISION_REGISTERED (E+)
→ 536 OMISSION_DETECTED (E-)

Consistency:
E+ + E- = governance outcomes

## 6. Principle

What did not happen, when it was required to happen, is part of system truth.
