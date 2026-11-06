# RFC 0004 — Human Authority Model

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026

This nonnormative Draft is subordinate to Core Lite v0.2.

## Human authority

`HUMAN_DECISION` is the sole canonical human-authority event under Core Lite v0.2. It records a prior act by a designated human authority. AI may analyze or recommend; evaluation may identify a need for review; the Audit Writer may incorporate the already-existing record. None of them can originate or constitute the represented act, competence, or human judgment.

## Required profile

A `HUMAN_DECISION` record requires:

- `event_type` and `event_id`
- `actor_ref` identifying the human authority
- `scope_ref` identifying invoked competence
- nonempty `object_refs` identifying exactly what was decided
- `occurred_at` for the human act
- `recorded_at` for incorporation into `AUDIT_LOG`

`object_refs` is an unordered, duplicate-free, nonempty set of previously incorporated records or events in `MANAGEMENT_LOG`, `AUDIT_LOG`, or `SCHEMA_LOG`; each reference identifies origin log and stable target identity, while external artifacts and derived views are inadmissible. Core requires these canonical `object_refs` to resolve before incorporation. Resolution of `actor_ref` and evaluation of competence belong to Framework; other reference duties depend on the applicable profile. No event reference may resolve to the event itself.

## Recording boundary

The Audit Writer is the exclusive canonical appender and prevents bypass. It rejects incorporation when canonical `object_refs` do not resolve, but it does not resolve human competence, infer authority, or decide on behalf of the human. Broader structural validation may be proposed by a noncanonical Framework profile.
