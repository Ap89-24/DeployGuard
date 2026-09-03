// ============================================================================
// DeployGuard AI - Hard Safety Policy Engine
// ============================================================================

export interface PolicyCheckInput {
  serviceTier: string;
  action: string;
  confidence: number;
  hasApproval: boolean;
}

export class PolicyEngine {
  public validatePolicy(input: PolicyCheckInput): { passed: boolean; requiresApproval: boolean; reason: string } {
    if (input.serviceTier === 'tier-1' && !input.hasApproval) {
      return {
        passed: true,
        requiresApproval: true,
        reason: 'Tier-1 production services strictly require human SRE lead approval before automated rollback mutation.',
      };
    }

    if (input.confidence < 0.70) {
      return {
        passed: false,
        requiresApproval: true,
        reason: 'AI RCA confidence is below safety threshold (70%). Autonomous rollback denied.',
      };
    }

    return {
      passed: true,
      requiresApproval: false,
      reason: 'Policy check passed.',
    };
  }
}
