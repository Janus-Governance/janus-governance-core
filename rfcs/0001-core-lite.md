# RFC 0001 — Core Lite

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

## Status and authority

This RFC is a nonnormative Draft proposal. The current primary normative baseline is `core/lite/JANUS_CORE_LITE_v0.2.md`. This RFC does not replace, extend, or override it.

## Summary

Core Lite defines a stack-agnostic governance kernel based on three append-only logs, E+ and E− evidence classes, the canonical `OMISSION_DETECTED` and `HUMAN_DECISION` events, typed references, and an exclusive Audit Writer boundary.

## Boundaries

- E+ and E− are evidence classes, not verdicts or exhaustive outcomes.
- `OMISSION_DETECTED` records qualified E−; it is not E− itself.
- `HUMAN_DECISION` records a prior human authority act and is not produced by AI, evaluation, or the Audit Writer.
- runtime, identity, framework policy, gate results, and distributed architecture remain outside this Draft's claim of Core semantics.

## Security considerations

Relevant threats include log tampering, schema drift, unqualified omission claims, unresolved references, direct audit-log writes, and automated substitution for human authority.

## License

MIT License
