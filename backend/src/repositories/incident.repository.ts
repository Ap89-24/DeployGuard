// ============================================================================
// DeployGuard AI - Operational Incident & Vector Memory Repository
// ============================================================================

import { executeCypher } from '../config/neo4j.js';
import { Incident, VectorSearchResult } from '../types/domain.js';
import { validateEmbedding, computeCosineSimilarity, EMBEDDING_DIMENSION } from '../utils/vector.js';

export interface SaveIncidentInput {
  id: string;
  title: string;
  severity: Incident['severity'];
  summary: string;
  rootCauseHypothesis?: string;
  status: Incident['status'];
  embedding: number[]; // 768 float array
  serviceId?: string;
  deploymentId?: string;
  createdAt?: string;
}

export class IncidentRepository {
  async saveIncident(input: SaveIncidentInput): Promise<Incident> {
    validateEmbedding(input.embedding, EMBEDDING_DIMENSION);

    const createdAt = input.createdAt || new Date().toISOString();

    const query = `
      MERGE (i:Incident { id: $id })
      ON CREATE SET
        i.title = $title,
        i.severity = $severity,
        i.summary = $summary,
        i.rootCauseHypothesis = $rootCauseHypothesis,
        i.status = $status,
        i.embedding = $embedding,
        i.createdAt = $createdAt
      ON MATCH SET
        i.title = $title,
        i.severity = $severity,
        i.summary = $summary,
        i.rootCauseHypothesis = $rootCauseHypothesis,
        i.status = $status,
        i.embedding = $embedding

      WITH i
      CALL {
        WITH i
        WITH i WHERE $serviceId IS NOT NULL AND $serviceId <> ""
        MATCH (s:Service { id: $serviceId })
        MERGE (i)-[:AFFECTS_SERVICE]->(s)
        RETURN count(*) AS sCount
      }

      WITH i
      CALL {
        WITH i
        WITH i WHERE $deploymentId IS NOT NULL AND $deploymentId <> ""
        MATCH (d:Deployment { id: $deploymentId })
        MERGE (i)-[:AFFECTS_DEPLOYMENT]->(d)
        RETURN count(*) AS dCount
      }

      RETURN i
    `;

    const records = await executeCypher<{ i: Incident }>(query, {
      id: input.id,
      title: input.title,
      severity: input.severity,
      summary: input.summary,
      rootCauseHypothesis: input.rootCauseHypothesis || '',
      status: input.status,
      embedding: input.embedding,
      createdAt,
      serviceId: input.serviceId || null,
      deploymentId: input.deploymentId || null,
    });

    return records[0].i;
  }

  async findSimilarIncidents(
    queryEmbedding: number[],
    topK: number = 5,
    minScore: number = 0.0
  ): Promise<VectorSearchResult[]> {
    validateEmbedding(queryEmbedding, EMBEDDING_DIMENSION);

    try {
      const query = `
        CALL db.index.vector.queryNodes('incident_embedding_idx', $topK, $queryEmbedding)
        YIELD node, score
        WHERE score >= $minScore
        RETURN node AS incident, score AS similarityScore
        ORDER BY similarityScore DESC
      `;

      const records = await executeCypher<{ incident: Incident; similarityScore: number }>(
        query,
        { topK, queryEmbedding, minScore },
        'READ'
      );

      return records.map(r => ({
        incident: r.incident,
        similarityScore: typeof r.similarityScore === 'number' ? r.similarityScore : parseFloat(r.similarityScore),
      }));
    } catch (err: any) {
      console.warn(`[IncidentRepository] Native Vector query procedure fallback (${err.message})...`);
      return this.findSimilarIncidentsFallback(queryEmbedding, topK, minScore);
    }
  }

  private async findSimilarIncidentsFallback(
    queryEmbedding: number[],
    topK: number,
    minScore: number
  ): Promise<VectorSearchResult[]> {
    const query = `
      MATCH (i:Incident)
      WHERE i.embedding IS NOT NULL
      RETURN i AS incident
    `;

    const records = await executeCypher<{ incident: Incident }>(query, {}, 'READ');
    const results: VectorSearchResult[] = [];

    for (const r of records) {
      if (r.incident.embedding && Array.isArray(r.incident.embedding)) {
        const score = computeCosineSimilarity(queryEmbedding, r.incident.embedding);
        if (score >= minScore) {
          results.push({ incident: r.incident, similarityScore: score });
        }
      }
    }

    results.sort((a, b) => b.similarityScore - a.similarityScore);
    return results.slice(0, topK);
  }
}
