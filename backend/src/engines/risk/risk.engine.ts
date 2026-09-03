// ============================================================================
// DeployGuard AI - Deterministic Configurable Risk Engine
// ============================================================================

export interface RiskCalculationFactors {
  serviceTier: 'tier-1' | 'tier-2' | 'tier-3';
  upstreamDependentsCount: number;
  canaryWeight?: number;
  hasDatabaseMigration?: boolean;
  historicalFailureRate?: number;
  errorRateDelta?: number;
}

export class RiskEngine {
  /**
   * Computes a deterministic deployment/incident risk score (0 to 100).
   */
  public calculateRiskScore(factors: RiskCalculationFactors): number {
    let score = 10; // Baseline score

    // Factor 1: Service Tier
    if (factors.serviceTier === 'tier-1') score += 35;
    else if (factors.serviceTier === 'tier-2') score += 20;
    else score += 10;

    // Factor 2: Upstream Dependents Count
    score += Math.min(30, factors.upstreamDependentsCount * 10);

    // Factor 3: Database Schema Migration
    if (factors.hasDatabaseMigration) score += 25;

    // Factor 4: Error Rate Delta
    if (factors.errorRateDelta) {
      score += Math.min(30, Math.round(factors.errorRateDelta * 100));
    }

    return Math.min(100, Math.max(0, score));
  }
}
