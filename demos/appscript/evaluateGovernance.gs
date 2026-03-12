// Janus Core Lite — Apps Script demo

// Minimal governance evaluation rules:
// - After CHANGE_PROPOSED: if HUMAN_DECISION is missing => write OMISSION_DETECTED (E-)
// - After HUMAN_DECISION: write HUMAN_DECISION_REGISTERED (E+)
function evaluateGovernance(managementEvent) {
  if (!managementEvent || !managementEvent.type) throw new Error('evaluateGovernance: missing managementEvent.type');

  var evidence = buildEvidence(managementEvent);

  if (managementEvent.type === 'CHANGE_PROPOSED') {
    if (evidence.evidenceType === 'E-') {
      return auditWriter(evidence, 'OMISSION_DETECTED');
    }
    // If E+, nothing to emit on CHANGE_PROPOSED in this minimal demo.
    return null;
  }

  if (managementEvent.type === 'HUMAN_DECISION') {
    return auditWriter(evidence, 'HUMAN_DECISION_REGISTERED');
  }

  return null;
}
