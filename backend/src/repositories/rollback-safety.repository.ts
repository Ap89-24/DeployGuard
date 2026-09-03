// ============================================================================
// DeployGuard AI - Rollback Safety Engine Repository
// ============================================================================

import { RollbackSafetyOutput } from '../types/domain.js';

export class RollbackSafetyRepository {
  /**
   * Deterministically checks rollback safety factors before recommending a production rollback.
   */
  async evaluateRollbackSafety(
    deploymentId: string,
    options: {
      hasPreviousRevision?: boolean;
      hasDatabaseMigration?: boolean;
      isStateful?: boolean;
      canaryWeight?: number;
    } = {}
  ): Promise<RollbackSafetyOutput> {
    const blockers: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    const hasPrev = options.hasPreviousRevision ?? true;
    const hasDbMigr = options.hasDatabaseMigration ?? false;
    const isStateful = options.isStateful ?? false;

    if (!hasPrev) {
      blockers.push('No known-good previous ReplicaSet revision exists to rollback to.');
      score -= 50;
    }

    if (hasDbMigr) {
      blockers.push('Unsafe schema migration detected (v4.2 schema changes require manual migration revert).');
      score -= 40;
    }

    if (isStateful) {
      warnings.push('Workload is stateful (StatefulSet pod volume re-attachment requires 30s grace window).');
      score -= 10;
    }

    if (options.canaryWeight && options.canaryWeight > 50) {
      warnings.push(`Canary weight is high (${options.canaryWeight}%). Immediate rollback will shift majority production traffic.`);
    }

    const safe = blockers.length === 0;

    return {
      safe,
      score: Math.max(0, score),
      blockers,
      warnings,
    };
  }
}
