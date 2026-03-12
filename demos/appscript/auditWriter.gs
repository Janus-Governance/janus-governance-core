// Janus Core Lite — Apps Script demo

// Audit Writer boundary: the only function allowed to append to AUDIT_LOG.
// evidence: object returned from buildEvidence(...)
// eventType: string governance event to record
function auditWriter(evidence, eventType) {
  ensureLogSheets_();

  if (!eventType) throw new Error('auditWriter: missing eventType');
  if (!evidence || !evidence.evidenceType) throw new Error('auditWriter: missing evidence');

  var id = nextId_(AUDIT_LOG_SHEET_);
  var tsIso = nowIso_();
  var refId = evidence.refManagementEventId || null;

  var payload = {
    evidence: evidence,
    note: 'Minimal Apps Script Janus Core Lite demo'
  };

  var row = [
    id,
    tsIso,
    String(eventType),
    String(evidence.evidenceType),
    refId,
    JSON.stringify(payload)
  ];

  SpreadsheetApp.getActive().getSheetByName(AUDIT_LOG_SHEET_).appendRow(row);

  return {
    id: id,
    tsIso: tsIso,
    eventType: String(eventType),
    evidenceType: String(evidence.evidenceType),
    refManagementEventId: refId,
    payload: payload
  };
}
