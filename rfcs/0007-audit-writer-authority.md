# RFC 0007 — Audit Writer Authority

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

This nonnormative Draft is subordinate to Core Lite v0.2.

## Exclusive writer

The Audit Writer is the only mechanism authorized to append canonical governance events to `AUDIT_LOG`. Implementations must prevent direct or alternate writes that bypass it.

## Core responsibilities

The writer prevents bypass and is the exclusive canonical appender. It incorporates accepted records into append-only history under the applicable canonical event rules.

For `HUMAN_DECISION`, the writer rejects incorporation when canonical `object_refs` do not resolve against previously incorporated history. It otherwise incorporates a record of a prior human act. It does not originate the decision, resolve competence, infer authority, or substitute automation for the human.

## Draft Framework extension

A noncanonical Framework profile may assign broader structural checks for event-specific fields, timestamps, reference sets, or qualified E− support. Those proposed checks are not universal Audit Writer duties under Core Lite v0.2, and they cannot turn an unqualified absence into E− or create human authority.

## Security considerations

Controls should address bypass, unauthorized injection, ambiguous authority, unresolved references, and post-write mutation.
