# RFC 0002 — Evidence Model (E+ / E−)

Status: Draft  
Author: Martín Nicolás Sánchez Morales  
Created: 2026  
Aligned with: Core Lite v0.2  
Canonical specification: `core/lite/JANUS_CORE_LITE_v0.2.md`

---

## Authority and scope

Core Lite v0.2 is the primary normative authority. This Draft explains its
evidence model and neither replaces nor extends it. If the texts differ, the
canonical Core prevails. Frameworks, runtimes, demos, HTML, and suites do not
redefine the Core.

---

## Summary

E+ and E− are classes of evidence. They are not Boolean labels, event types,
verdicts, or references. Governance events invoke evidence through resolvable
references to immutable versions of supporting artifacts.

---

## Specification

### Explicit evidence (E+)

E+ is evidence explicitly recorded in a system of record. A claim supported by
E+ requires an explicitly recorded artifact that can be retrieved and
inspected. A governance event that invokes E+ references an immutable version
of that artifact through a resolvable evidence reference.

### Omission evidence (E−)

E− is evidence derived from a verified absence of an expected record or event.
A simple absence, failed lookup, or missing value is not E−.

E− requires all of the following cumulative conditions:

1. a defined, referenceable expectation whose version was recorded before the
   observation and declares provenance, temporal applicability, and when it
   becomes due;
2. a deterministic scope identifying sources, subject, filters, window, cutoff
   (`as-of`), and the evaluation procedure with its version;
3. a cutoff that does not precede the due time, with due status determinable
   from the material consulted up to that cutoff;
4. the `SCHEMA_LOG` context applicable to every record or event considered up
   to the cutoff; and
5. a reproducible observation relative to that scope and cutoff.

E− is not counter-argumentation. It is a verified omission relative to an
explicit expectation.

### Relationship with governance events

Evaluation may use E+ and/or E−. An instance of E− that satisfies the Core
conditions may produce `OMISSION_DETECTED`. Neither E+ nor E− automatically
produces a human decision.

`HUMAN_DECISION` represents a prior human act when explicit human
accountability is required. Evaluation does not originate it, and evidence does
not substitute for it.

---

## Security considerations

Implementations must prevent mutable or unresolved evidence references,
incomplete scopes, retroactively defined expectations, inconsistent schema
contexts, and irreproducible observations from being treated as valid E−.

---

## License

MIT License
