# Addendum to *Janus: Evidence-Based Governance for AI-Assisted Development Systems* v1.0

This addendum applies to the immutable v1.0 publication associated with DOI `10.5281/zenodo.19239183`.

## Relationship to Janus Core

The Protocol, Runtime, and Workflow layers are subordinate to Janus Core Lite v0.2. Governance events map to the Core canonical logs and are written to `AUDIT_LOG` exclusively through the Audit Writer. The evaluated runtimes did not demonstrate enforcement of Audit Writer exclusivity; the reported results therefore do not demonstrate Core conformance.

## Restated operational invariants

1. For each governance-relevant expected action defined by a previously recorded expectation, the framework records E+ when supporting evidence is explicitly recorded, or derives E- only when absence is verified under Core Lite v0.2 Section 5.
2. An omission is detectable only relative to a previously recorded expectation, deterministic scope, applicable schema context, reproducible observation, and cutoff.
3. When an outcome requires explicit human accountability, the governance state is not complete until a `HUMAN_DECISION` is recorded. `OMISSION_DETECTED` does not substitute for `HUMAN_DECISION`.
4. Given the same log records, relevant schemas, and referenced evidence artifacts up to the same cutoff, the framework profile requires reconstruction to produce the same governance-relevant views and findings. This strengthens the Core's SHOULD; it does not define cross-log ordering.

## Benchmark limitations

`HUMAN_VERDICT` in v1.0 denotes a simulated test-harness event. It is not the canonical `HUMAN_DECISION`, which represents a prior human act. The reported GVL values measure test-pipeline timing, not omission-detection time or human decision latency.

No local raw dataset or execution record was found for the claimed 50 fault injections per artifact. A PVDR value of 0.95 is not arithmetically attainable from exactly 50 binary trials. Table I and its numerical conclusions are therefore withdrawn pending reproducible raw data.

The v1.0 metrics are proposals for operationalization, not a validated or independently replicated benchmark. “Total System Operations” was not operationally defined in v1.0, and the reported values must not be used as evidence of full governance coverage.

## Presentation correction

Section and subsection headings in the published PDF contain duplicated numbering. For example, `I. I. INTRODUCTION` should read `I. INTRODUCTION`; the same correction applies throughout.
