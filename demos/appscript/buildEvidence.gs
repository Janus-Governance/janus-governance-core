// Janus Core Lite — Apps Script demo

function parseJson_(s) {
  try {
    return s ? JSON.parse(s) : {};
  } catch (e) {
    return { _parseError: true, raw: String(s) };
  }
}

function readManagementLog_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(MANAGEMENT_LOG_SHEET_);
  if (!sheet) throw new Error('Missing sheet: ' + MANAGEMENT_LOG_SHEET_);

  var values = sheet.getDataRange().getValues();
  // headers row
  var rows = values.slice(1);

  return rows
    .filter(function (r) { return r && r[0]; })
    .map(function (r) {
      return {
        id: Number(r[0]),
        tsIso: String(r[1]),
        type: String(r[2]),
        payload: parseJson_(r[3])
      };
    });
}

function findMostRecent_(events, type) {
  for (var i = events.length - 1; i >= 0; i--) {
    if (events[i].type === type) return events[i];
  }
  return null;
}

function hasHumanDecisionAfter_(events, changeProposedId) {
  for (var i = 0; i < events.length; i++) {
    if (events[i].id > changeProposedId && events[i].type === 'HUMAN_DECISION') return true;
  }
  return false;
}

// Evidence model:
// - E+ = verifiable evidence from an explicit record
// - E- = evidence derived from the verifiable absence of an expected record
//
// Returns a minimal evidence object (not yet written).
function buildEvidence(managementEvent) {
  if (!managementEvent || !managementEvent.type) throw new Error('buildEvidence: missing managementEvent.type');

  var events = readManagementLog_();

  if (managementEvent.type === 'CHANGE_PROPOSED') {
    var hasDecision = hasHumanDecisionAfter_(events, managementEvent.id);
    if (!hasDecision) {
      return {
        evidenceType: 'E-',
        reason: 'Expected HUMAN_DECISION record not found after CHANGE_PROPOSED',
        expectedEventType: 'HUMAN_DECISION',
        refManagementEventId: managementEvent.id
      };
    }

    return {
      evidenceType: 'E+',
      reason: 'HUMAN_DECISION exists after CHANGE_PROPOSED',
      expectedEventType: 'HUMAN_DECISION',
      refManagementEventId: managementEvent.id
    };
  }

  if (managementEvent.type === 'HUMAN_DECISION') {
    var mostRecentChange = findMostRecent_(events, 'CHANGE_PROPOSED');
    return {
      evidenceType: 'E+',
      reason: 'Explicit HUMAN_DECISION record appended',
      expectedEventType: 'HUMAN_DECISION',
      refManagementEventId: mostRecentChange ? mostRecentChange.id : managementEvent.id
    };
  }

  return {
    evidenceType: 'E+',
    reason: 'No governance rule for this event type in minimal demo',
    expectedEventType: null,
    refManagementEventId: managementEvent.id
  };
}
