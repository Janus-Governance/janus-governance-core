# Deterministic Rebuild Model

This document describes the deterministic rebuild model used in
Janus governance systems.

The rebuild model explains how governance conclusions can be
reconstructed from recorded system history.

Deterministic rebuildability ensures that governance outcomes remain
observable even after system failures, migrations, or infrastructure
changes.

## Rebuild principle

A governance state should be reconstructable using only the recorded
system history and referenced context.

Rebuildability relies on:

- append-only logs
- referenced schema definitions
- referenced evidence artifacts

## Required inputs

A deterministic rebuild requires access to:

- `MANAGEMENT_LOG`
- `AUDIT_LOG`
- relevant schema definitions from `SCHEMA_LOG`
- referenced evidence artifacts or omission observations

These inputs represent the observable historical record of the system.

## Rebuild process

A rebuild process conceptually consists of:

1. Reading domain activity from `MANAGEMENT_LOG`
2. Interpreting records using schema definitions from `SCHEMA_LOG`
3. Re-evaluating governance evidence when necessary
4. Interpreting governance events recorded in `AUDIT_LOG`

The rebuild process reconstructs the governance interpretation
associated with recorded events.

## Event reference model

Governance events SHOULD reference the domain records, schema
context, and evidence artifacts required to interpret the event.

This reference model is defined in RFC 0008 (Log Reference Model).

These references allow rebuild processes to reproduce the reasoning
context associated with governance outcomes.

## Failure tolerance

Because the system relies on append-only logs and referenced context,
governance conclusions remain reconstructable even if operational
systems fail.

This property allows institutional truth to remain observable.

## Purpose

The deterministic rebuild model ensures that Janus governance systems
preserve:

- traceability
- auditability
- institutional memory

without constraining implementation technologies.
