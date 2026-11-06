# Janus Demo — Illustrative Walkthrough

This document describes an illustrative scenario. It is not executable proof, does not claim actual runtime behavior, and does not establish Core conformance. Runtime reconciliation and testing remain pending Gate 3 evaluation.

## Scenario A — qualified omission

Assume the complete E− conditions restated in `governance/governance-scope.md` are met for a versioned expectation requiring a human decision record. Only then may an `OMISSION_DETECTED` candidate be prepared.

The candidate references the expectation, deterministic scope, schema, and nonempty evidence set. It is submitted through the exclusive Audit Writer boundary for incorporation into `AUDIT_LOG` under the applicable event rules.

## Scenario B — prior human decision

A designated human authority performs a decision within an identified competence. A `HUMAN_DECISION` record candidate identifies the actor, competence, nonempty objects decided, time of the human act, and recording time. The Audit Writer rejects incorporation if canonical `object_refs` do not resolve and never makes the decision or evaluates competence.

## Scenario C — reconstruction

An implementation resolves typed references across preserved logs and evidence to derive a current view. The derived view does not replace append-only history.

The current Node source is legacy and nonconforming pending Gate 3. Its implementation-only label `HUMAN_DECISION_REGISTERED` must not be interpreted as a canonical Core event. `HUMAN_DECISION` remains the sole canonical human-authority event under Core Lite v0.2.
