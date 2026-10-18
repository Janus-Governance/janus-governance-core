# Addendum to *Janus: A Minimal Governance Kernel for Deterministically Reconstructible Human-AI Development Systems* v1.0

This addendum aligns the informative v1.0 paper with Janus Core Lite v0.2. It does not alter the immutable DOI deposit.

## Canonical logs and corrections

`MANAGEMENT_LOG` records domain activity and its corrections. `SCHEMA_LOG` records structural definitions and schema evolution used to interpret records. `AUDIT_LOG` records governance events, accountability records, and audit findings. Corrections are appended in the corresponding log; a later interpretation, authorization, or declaration about a governance event is recorded only through `HUMAN_DECISION`.

## Evidence and authority

Under Core Lite v0.2, E+ and E- are classes of evidence, not Boolean labels or event types. E- requires a versioned expectation recorded before observation, a deterministic scope and cutoff, applicable `SCHEMA_LOG` context, and a reproducible observation.

In Figure 1, `HUMAN_DECISION` is required only when an outcome requires explicit human accountability. Evaluation flows may produce `OMISSION_DETECTED`; they do not originate `HUMAN_DECISION`.

## Reconstruction claims

Equation (2) is a conceptual model. Core Lite v0.2 states that an implementation SHOULD be able to rebuild governance-relevant views and findings from all log records, relevant schemas, and referenced evidence artifacts up to a cutoff. The Core does not define the temporal axis represented by `t`.

Equation (4) and the final transition in Figure 2 are a conditional hypothesis outside Janus Core. They do not make `AUDIT_LOG` the primary domain record, and they do not assert that arbitrary operational state is reconstructible from governance state.

## Operational profile

Baseline freezing, validation gates, structured telemetry, and structural identity validation are framework or implementation choices. They are not additional Core invariants.

## Status of the reported validation

Section VI describes preliminary internal self-application, not a controlled empirical evaluation. A dated six-case validation artifact exists locally, but it was introduced on 2026-03-13, after the v1.0 paper tag dated 2026-03-10. It therefore does not independently substantiate the results as reported in the immutable publication. Until contemporaneous artifacts are produced and reviewed, the phrases “structural stability,” “contract coherence,” “structural detection of inconsistencies,” and “controlled reproducibility” should be read as practitioner observations rather than validated empirical results.
