// ============================================================================
// DeployGuard AI - Recovery Decision & Approval Repository
// ============================================================================

import { executeCypher } from '../config/neo4j.js';
import { Decision, Approval, DecisionStatus, ApprovalStatus } from '../types/domain.js';

export interface RecordDecisionInput {
  id: string;
  action: Decision['action'];
  confidence: number;
  rationale: string;
  safetyScore: number;
  status: DecisionStatus;
  incidentId?: string;
  deploymentId?: string;
  createdAt?: string;
}

export interface RecordApprovalInput {
  id: string;
  approver: string;
  status: ApprovalStatus;
  comment?: string;
  decisionId: string;
  timestamp?: string;
}

export class DecisionRepository {
  async recordDecision(input: RecordDecisionInput): Promise<Decision> {
    const createdAt = input.createdAt || new Date().toISOString();

    const query = `
      MERGE (dec:Decision { id: $id })
      ON CREATE SET
        dec.action = $action,
        dec.confidence = $confidence,
        dec.rationale = $rationale,
        dec.safetyScore = $safetyScore,
        dec.status = $status,
        dec.createdAt = $createdAt
      ON MATCH SET
        dec.action = $action,
        dec.confidence = $confidence,
        dec.rationale = $rationale,
        dec.safetyScore = $safetyScore,
        dec.status = $status

      WITH dec
      CALL {
        WITH dec
        WITH dec WHERE $incidentId IS NOT NULL AND $incidentId <> ""
        MATCH (i:Incident { id: $incidentId })
        MERGE (i)-[:TRIGGERED_DECISION]->(dec)
        RETURN count(*) AS iCount
      }

      WITH dec
      CALL {
        WITH dec
        WITH dec WHERE $deploymentId IS NOT NULL AND $deploymentId <> ""
        MATCH (d:Deployment { id: $deploymentId })
        MERGE (dec)-[:TARGETS_DEPLOYMENT]->(d)
        RETURN count(*) AS dCount
      }

      RETURN dec
    `;

    const records = await executeCypher<{ dec: Decision }>(query, {
      id: input.id,
      action: input.action,
      confidence: input.confidence,
      rationale: input.rationale,
      safetyScore: input.safetyScore,
      status: input.status,
      createdAt,
      incidentId: input.incidentId || null,
      deploymentId: input.deploymentId || null,
    });

    return records[0].dec;
  }

  async recordApproval(input: RecordApprovalInput): Promise<Approval> {
    const timestamp = input.timestamp || new Date().toISOString();

    const query = `
      MERGE (a:Approval { id: $id })
      ON CREATE SET
        a.approver = $approver,
        a.status = $status,
        a.comment = $comment,
        a.timestamp = $timestamp
      ON MATCH SET
        a.approver = $approver,
        a.status = $status,
        a.comment = $comment,
        a.timestamp = $timestamp

      WITH a
      MATCH (dec:Decision { id: $decisionId })
      MERGE (dec)-[:REQUIRES_APPROVAL]->(a)

      WITH dec, a
      SET dec.status = CASE 
        WHEN $status = 'APPROVED' THEN 'APPROVED'
        WHEN $status = 'REJECTED' THEN 'REJECTED'
        ELSE dec.status
      END

      RETURN a
    `;

    const records = await executeCypher<{ a: Approval }>(query, {
      id: input.id,
      approver: input.approver,
      status: input.status,
      comment: input.comment || '',
      timestamp,
      decisionId: input.decisionId,
    });

    return records[0].a;
  }
}
