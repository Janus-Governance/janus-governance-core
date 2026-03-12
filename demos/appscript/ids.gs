// Janus Core Lite — Apps Script demo
// Minimal ID strategy: derive monotonic IDs from append-only sheet row counts.

function nextId_(sheetName) {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Missing sheet: ' + sheetName);
  var lastRow = sheet.getLastRow();
  // Row 1 is headers. First event appended to row 2 gets id=1.
  return Math.max(0, lastRow - 1) + 1;
}

function nowIso_() {
  return new Date().toISOString();
}
