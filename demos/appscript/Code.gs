// Janus Core Lite — Apps Script demo
//
// Minimal working proof of:
// - MANAGEMENT_LOG (append-only)
// - SCHEMA_LOG (reference)
// - AUDIT_LOG (audit writer boundary)
// - Evidence (E+ / E-)
// - Deterministic rebuild of state from logs

function runDemo() {
  // Ensure canonical log sheets exist.
  ensureLogSheets_();

  Logger.log('--- JANUS DEMO (Apps Script) ---');

  // Flow A: omission
  var change = appendManagementEvent({
    type: 'CHANGE_PROPOSED',
    payload: { note: 'Demo change proposal' }
  });

  var auditA = evaluateGovernance(change);

  // Flow B: approved
  var decision = appendManagementEvent({
    type: 'HUMAN_DECISION',
    payload: { decision: 'APPROVED', note: 'Demo decision' }
  });

  var auditB = evaluateGovernance(decision);

  // Flow C: deterministic reconstruction
  var rebuilt = rebuildState();

  var summary = {
    flowA: {
      managementEvent: change,
      auditEvent: auditA ? auditA.eventType : null
    },
    flowB: {
      managementEvent: decision,
      auditEvent: auditB ? auditB.eventType : null
    },
    rebuildState: rebuilt
  };

  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}
