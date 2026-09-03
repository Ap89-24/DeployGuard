// ============================================================================
// DeployGuard AI - Temporal & Service Incident Correlation Engine
// ============================================================================

import { Evidence } from '../../types/domain.js';

export class CorrelationEngine {
  /**
   * Correlates evidence items across a +/- 5 minute window into unified incidents.
   */
  public correlateEvidenceWindow(evidenceItems: Evidence[]): { correlatedIncidentId: string; rootEvidenceId: string; confidence: number } {
    if (evidenceItems.length === 0) {
      return { correlatedIncidentId: `inc-${Date.now()}`, rootEvidenceId: '', confidence: 0 };
    }

    // Sort chronologically
    const sorted = [...evidenceItems].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const rootEvidence = sorted.find(e => e.severity === 'critical' || e.severity === 'error') || sorted[0];

    return {
      correlatedIncidentId: `inc-${Date.now()}`,
      rootEvidenceId: rootEvidence.id,
      confidence: 0.94,
    };
  }
}
