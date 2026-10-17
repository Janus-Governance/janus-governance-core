# Errata for *Janus: A Minimal Governance Kernel for Deterministically Reconstructible Human-AI Development Systems* v1.0

This errata applies to the immutable v1.0 publication associated with DOI `10.5281/zenodo.18974356`. It does not replace or alter the deposited files.

## Evidence definitions

In Section V-A, for:

> Records actions that effectively occurred.

read:

> Evidence explicitly recorded in a system of record; it indicates that a claim or event is supported by a recorded artifact.

In Section V-B, for:

> Records detectable omissions: expected actions that did not occur within a defined structure.

read:

> Evidence derived from a verified absence of an expected record, relative to a defined expectation, a deterministic search scope, the applicable `SCHEMA_LOG` context, and a reproducible observation.

## Figure 2

Figure 2 as published omits stages described in its caption. The intended conceptual sequence is:

`Domain Events -> Evidence (E+ / E-) -> Governance Evaluation -> HUMAN_DECISION (when accountability is required) -> Audit Writer -> AUDIT_LOG -> GovernanceState -> SystemState`.

The final transition is a conditional paper hypothesis, not a Janus Core invariant.

## Table I

- For `Versioning`, read `Version control systems`.
- For `Validation`, read `Authorization / accountability`.
- For the displaced final row, read: `Operational level | code | organization | human-AI interaction`.

## References

Reference [1] should read:

> E. L. Trist and K. W. Bamforth, “Some Social and Psychological Consequences of the Longwall Method of Coal-Getting,” *Human Relations*, vol. 4, no. 1, pp. 3-38, 1951.

No local source was found that verifies reference [5], “Architectural Governance in Software Systems,” attributed to G. Booch, *IEEE Software*, 2006. Reference [5] and its citations should be treated as withdrawn unless a verifiable bibliographic source is produced.
