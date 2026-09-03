// ============================================================================
// DeployGuard AI - Evidence & Timeline Repository
// ============================================================================

import { executeCypher } from '../config/neo4j.js';
import { Evidence } from '../types/domain.js';

export class EvidenceRepository {
  async recordEvidence(evidence: Evidence): Promise<Evidence> {
    const timestamp = evidence.timestamp || new Date().toISOString();
    const query = `
      MERGE (e:Evidence { id: $id })
      ON CREATE SET
        e.type = $type,
        e.source = $source,
        e.timestamp = $timestamp,
        e.severity = $severity,
        e.value = $value,
        e.confidence = $confidence,
        e.metadata = $metadata
      ON MATCH SET
        e.value = $value,
        e.confidence = $confidence

      WITH e
      CALL {
        WITH e
        WITH e WHERE $serviceId IS NOT NULL AND $serviceId <> ""
        MATCH (s:Service { id: $serviceId })
        MERGE (e)-[:FOR_SERVICE]->(s)
        RETURN count(*) AS sCount
      }

      WITH e
      CALL {
        WITH e
        WITH e WHERE $deploymentId IS NOT NULL AND $deploymentId <> ""
        MATCH (d:Deployment { id: $deploymentId })
        MERGE (e)-[:FOR_DEPLOYMENT]->(d)
        RETURN count(*) AS dCount
      }

      RETURN e
    `;

    const records = await executeCypher<{ e: Evidence }>(query, {
      id: evidence.id,
      type: evidence.type,
      source: evidence.source,
      timestamp,
      severity: evidence.severity,
      value: evidence.value,
      confidence: evidence.confidence,
      metadata: JSON.stringify(evidence.metadata || {}),
      serviceId: evidence.serviceId || null,
      deploymentId: evidence.deploymentId || null,
    });

    return records[0].e;
  }

  async getIncidentTimeline(incidentId: string): Promise<Evidence[]> {
    const query = `
      MATCH (i:Incident { id: $incidentId })-[:HAS_EVIDENCE]->(e:Evidence)
      RETURN e
      ORDER BY e.timestamp ASC
    `;
    const records = await executeCypher<{ e: Evidence }>(query, { incidentId }, 'READ');
    return records.map(r => r.e);
  }
}
