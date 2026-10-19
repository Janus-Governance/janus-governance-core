# RFC 0008 — Log Reference Model

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026  
Aligned with: Core Lite v0.2  
Canonical specification: `core/lite/JANUS_CORE_LITE_v0.2.md`

---

## Authority and scope

Core Lite v0.2 is the primary normative authority. This Draft explains
references among canonical records and artifacts. It does not weaken mandatory
Core references or make another Draft constitutive authority.

---

## Canonical logs

- `MANAGEMENT_LOG` records domain events, actions, and their domain
  corrections.
- `SCHEMA_LOG` records structural definitions and schema evolution used to
  interpret records.
- `AUDIT_LOG` records governance events, accountability records, and audit
  findings.

All three logs are append-only. Corrections are appended to the corresponding
log with a resolvable backward reference. `AUDIT_LOG` does not replace the
primary domain record.

An E− expectation must be a defined, referenceable, versioned artifact recorded
before the observation. Core Lite v0.2 does not prescribe the log or store in
which that expectation is recorded. `SCHEMA_LOG` supplies only the applicable
structural and schema context used to interpret records.

---

## Reference contracts

References required by a canonical event are mandatory, not optional context.
They identify their origin and a stable target identity and must obey the
specific Core contract:

- evidence invoked as E+ or E− uses resolvable references to immutable artifact
  versions;
- `OMISSION_DETECTED` includes `expectation_ref`, `scope_ref`, `schema_ref`, and
  at least one `evidence_refs` entry;
- `HUMAN_DECISION` includes a non-empty, duplicate-free `object_refs` set whose
  targets resolve against history already incorporated in their origin logs;
  and
- optional `management_refs`, `evidence_refs`, or `schema_ref` retain their
  contextual roles and do not substitute for `object_refs`.

References assert neither causality nor evidentiary sufficiency merely by being
present. Derived views and external artifacts are not admissible
`HUMAN_DECISION` objects.

---

## Deterministic reconstruction

Given all log records, relevant `SCHEMA_LOG` schemas, and referenced evidence
artifacts up to the same cutoff, an implementation should be able to rebuild
the same governance-relevant views and findings deterministically.

The current view is derived from history, schemas, and referenced artifacts up
to that cutoff. It is not recorded as a mutation of history. Reevaluation may
change a derived view but is not itself a canonical event unless it produces an
existing canonical event under its Core contract.

Reconstruction is limited to governance-relevant views and findings supported
by the available records, schemas, and evidence. It does not assert that
arbitrary operational state is reconstructible from `AUDIT_LOG`.

---

## Security considerations

Implementations must detect missing, mutable, duplicated, or unresolved
references; preserve origin-log identity; apply schema context at the relevant
cutoff; and prevent reconstructed views from overwriting history.

---

## License

MIT License
