// Janus Core Lite — Apps Script demo

var MANAGEMENT_LOG_SHEET_ = 'MANAGEMENT_LOG';
var SCHEMA_LOG_SHEET_ = 'SCHEMA_LOG';
var AUDIT_LOG_SHEET_ = 'AUDIT_LOG';

function ensureLogSheets_() {
  var ss = SpreadsheetApp.getActive();

  var mgmt = ss.getSheetByName(MANAGEMENT_LOG_SHEET_);
  if (!mgmt) mgmt = ss.insertSheet(MANAGEMENT_LOG_SHEET_);
  if (mgmt.getLastRow() === 0) mgmt.appendRow(['id', 'tsIso', 'type', 'payloadJson']);

  var schema = ss.getSheetByName(SCHEMA_LOG_SHEET_);
  if (!schema) schema = ss.insertSheet(SCHEMA_LOG_SHEET_);
  if (schema.getLastRow() === 0) schema.appendRow(['id', 'tsIso', 'schemaVersion', 'payloadJson']);
  // Seed a minimal base schema record if empty (append-only).
  if (schema.getLastRow() === 1) {
    schema.appendRow([1, nowIso_(), 'BASE_SCHEMA_V1', JSON.stringify({ note: 'Minimal schema seed for demo' })]);
  }

  var audit = ss.getSheetByName(AUDIT_LOG_SHEET_);
  if (!audit) audit = ss.insertSheet(AUDIT_LOG_SHEET_);
  if (audit.getLastRow() === 0) audit.appendRow(['id', 'tsIso', 'eventType', 'evidenceType', 'refManagementEventId', 'payloadJson']);

  return { management: mgmt, schema: schema, audit: audit };
}

// Append-only: always appends a new row; never overwrites.
// event: { type: string, payload?: object }
function appendManagementEvent(event) {
  ensureLogSheets_();

  if (!event || !event.type) throw new Error('appendManagementEvent: missing event.type');

  var id = nextId_(MANAGEMENT_LOG_SHEET_);
  var tsIso = nowIso_();
  var payload = event.payload || {};

  var row = [id, tsIso, String(event.type), JSON.stringify(payload)];
  SpreadsheetApp.getActive().getSheetByName(MANAGEMENT_LOG_SHEET_).appendRow(row);

  return { id: id, tsIso: tsIso, type: String(event.type), payload: payload };
}
