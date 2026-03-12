# Janus Core Lite — Minimal Apps Script Demo Runtime

This folder contains a **minimal** Google Apps Script implementation of the Janus Core Lite runtime model.

It demonstrates:

- **Append-only canonical logs** stored in a Google Sheet:
  - `MANAGEMENT_LOG`
  - `SCHEMA_LOG`
  - `AUDIT_LOG`
- **Evidence generation** using the dual model:
  - `E+` = positive evidence (explicit record exists)
  - `E-` = negative evidence (expected record is verifiably missing)
- **Audit Writer boundary**: governance outcomes are appended to `AUDIT_LOG` only via `auditWriter(...)`
- **Deterministic reconstruction**: governance-relevant state is rebuilt by replaying `MANAGEMENT_LOG`

## 1) Create the log sheets

1. Create a new Google Spreadsheet.
2. Open **Extensions → Apps Script**.
3. Create the following sheets (or let the demo create them automatically):
   - `MANAGEMENT_LOG`
   - `SCHEMA_LOG`
   - `AUDIT_LOG`

The demo will also add minimal header rows and seed `SCHEMA_LOG` with one base schema record.

## 2) Add the script files

In the Apps Script editor, add these files and paste the contents from this folder:

- `Code.gs`
- `ids.gs`
- `appendManagementEvent.gs`
- `buildEvidence.gs`
- `evaluateGovernance.gs`
- `auditWriter.gs`
- `rebuildState.gs`

## 3) Run the demo

1. In Apps Script, select the function `runDemo`.
2. Click **Run**.
3. Check:
   - **Execution log** (Apps Script Logger)
   - The three sheets for appended rows

## 4) What the demo proves

- **MANAGEMENT_LOG is append-only**: domain activity is recorded as ordered events.
- **Omission detection (E-)**: after `CHANGE_PROPOSED`, the evaluator expects `HUMAN_DECISION`. If the decision is missing, it writes an `OMISSION_DETECTED` event to `AUDIT_LOG` with evidence type `E-`.
- **Human authority registration (E+)**: when a `HUMAN_DECISION` is appended, the evaluator writes `HUMAN_DECISION_REGISTERED` to `AUDIT_LOG` with evidence type `E+`.
- **Deterministic rebuild**: `rebuildState()` reconstructs a minimal state by replaying `MANAGEMENT_LOG`.

## Entrypoints

- `runDemo()` (in `Code.gs`)

## Notes

This is intentionally minimal and intended as a runnable proof of the Janus Core Lite invariants, not a production runtime.
