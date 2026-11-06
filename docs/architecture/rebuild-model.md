# Deterministic Rebuild Model

This informative model explains how an implementation can reconstruct governance context from preserved history. Core Lite v0.2 uses requirements such as SHOULD for reconstruction support; it does not guarantee recovery in every deployment.

## Inputs

- append-only `MANAGEMENT_LOG`, `SCHEMA_LOG`, and `AUDIT_LOG`
- typed, resolvable references from governance events
- referenced evidence artifacts and versioned observation procedures
- preserved temporal and schema context

## Process

1. Read domain history from `MANAGEMENT_LOG`.
2. Resolve the versioned schema context in `SCHEMA_LOG`.
3. Resolve typed event references and supporting evidence.
4. Interpret canonical event history without rewriting it.
5. Derive a current view from history, schemas, and referenced artifacts up to a declared cutoff.

A derived current view is not the history itself and, under Core v0.2, cannot erase or silently replace earlier events. Deterministic re-evaluation may change the view but is not by itself a canonical event unless it produces one of the existing canonical event types.

## Limits

Reconstruction depends on availability, integrity, and resolvability of the referenced records. The model supports traceability and reproducibility; it is not a proof of correctness, completeness, or operational conformance.
