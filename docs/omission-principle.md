# Omission as Structured Evidence

## 1. Core Idea

Most systems record what happened.
Janus also records what should have happened but did not.

In Janus, omission is not silence.
Omission is structured evidence.

This document is informative. Janus Core Lite v0.2 is the normative source and defines the conditions for E−.

## 2. Classical Model vs Janus Model

Classical systems:
- positive event recorded
- absence remains silent

Janus:
- E+ = evidence explicitly recorded in a system of record
- E− = evidence derived from a verified absence that satisfies the expectation, scope, observation, and schema-context requirements in Core §5
- governance evaluation uses evidence without redefining the Core evidence classes

## 3. Why This Matters

Omissions are often the most critical failures in socio-technical systems.
Examples:
- missing validation
- missing human decision
- missing required review
- missing protocol step

## 4. Canonical Janus Expression

E+ = explicit evidence
E− = verified omission evidence under Core §5

For governance-required activity:

E+ and E− are evidence classes, not interchangeable verdict labels.

A missing event supports E− only when every condition in Core §5 is met. A conforming omission record uses the Core-defined `OMISSION_DETECTED` governance event.

## 5. Runtime Demonstration

The Node demo illustrates a simplified omission-detection flow by emitting audit events when a governance-required event is missing. Its implementation-specific labels and counts do not establish conformity or validate the Core under scale.

Use this example:

1000 CHANGE_PROPOSED
→ 464 HUMAN_DECISION_REGISTERED
→ 536 OMISSION_DETECTED (E−)

Consistency:
The arithmetic is a property of this generated example, not a normative Core equation.

`HUMAN_DECISION_REGISTERED` is a runtime-specific label associated with the open technical divergence R1-011. The only canonical human-authority event is `HUMAN_DECISION`.

## 6. Principle

What did not happen, when it was required to happen, is part of system truth.
