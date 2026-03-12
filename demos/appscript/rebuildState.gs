// Janus Core Lite — Apps Script demo

// Deterministic reconstruction: rebuild a minimal state by replaying MANAGEMENT_LOG.
// This intentionally ignores any in-memory state or UI context.
function rebuildState() {
  ensureLogSheets_();

  var events = readManagementLog_();

  var state = {
    proposedChanges: 0,
    humanDecisionPresent: false,
    lastChangeProposedId: null,
    auditEvents: 0
  };

  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    if (ev.type === 'CHANGE_PROPOSED') {
      state.proposedChanges++;
      state.lastChangeProposedId = ev.id;
      state.humanDecisionPresent = false;
    }
    if (ev.type === 'HUMAN_DECISION') {
      // In this minimal model, any HUMAN_DECISION after the most recent change counts.
      if (state.lastChangeProposedId !== null && ev.id > state.lastChangeProposedId) {
        state.humanDecisionPresent = true;
      }
    }
  }

  // AUDIT_LOG is append-only too; count rows for visibility.
  var auditSheet = SpreadsheetApp.getActive().getSheetByName(AUDIT_LOG_SHEET_);
  if (auditSheet) {
    state.auditEvents = Math.max(0, auditSheet.getLastRow() - 1);
  }

  return state;
}
