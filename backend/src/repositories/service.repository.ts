// ============================================================================
// DeployGuard AI - Service Topology Repository
// ============================================================================

import { executeCypher } from '../config/neo4j.js';
import { Service, DependencyRelation } from '../types/domain.js';

export class ServiceRepository {
  async createService(
    service: Omit<Service, 'createdAt'> & { createdAt?: string },
    projectId?: string,
    clusterId?: string
  ): Promise<Service> {
    const createdAt = service.createdAt || new Date().toISOString();
    const query = `
      MERGE (s:Service { id: $id })
      ON CREATE SET
        s.name = $name,
        s.tier = $tier,
        s.repoUrl = $repoUrl,
        s.ownerTeam = $ownerTeam,
        s.language = $language,
        s.status = $status,
        s.createdAt = $createdAt
      ON MATCH SET
        s.name = $name,
        s.tier = $tier,
        s.repoUrl = $repoUrl,
        s.ownerTeam = $ownerTeam,
        s.language = $language,
        s.status = $status

      WITH s
      CALL {
        WITH s
        WITH s WHERE $projectId IS NOT NULL AND $projectId <> ""
        MATCH (p:Project { id: $projectId })
        MERGE (s)-[:BELONGS_TO]->(p)
        RETURN count(*) AS pCount
      }
      CALL {
        WITH s
        WITH s WHERE $clusterId IS NOT NULL AND $clusterId <> ""
        MATCH (c:Cluster { id: $clusterId })
        MERGE (s)-[:DEPLOYED_TO]->(c)
        RETURN count(*) AS cCount
      }

      RETURN s
    `;

    const records = await executeCypher<{ s: Service }>(query, {
      id: service.id,
      name: service.name,
      tier: service.tier,
      repoUrl: service.repoUrl || '',
      ownerTeam: service.ownerTeam || '',
      language: service.language || '',
      status: service.status || 'HEALTHY',
      createdAt,
      projectId: projectId || null,
      clusterId: clusterId || null,
    });

    return records[0].s;
  }

  async addDependency(rel: DependencyRelation): Promise<void> {
    const query = `
      MATCH (from:Service { id: $fromServiceId })
      MATCH (to:Service { id: $toServiceId })
      MERGE (from)-[r:DEPENDS_ON]->(to)
      SET 
        r.protocol = $protocol,
        r.isCritical = $isCritical,
        r.weight = $weight
    `;

    await executeCypher(query, {
      fromServiceId: rel.fromServiceId,
      toServiceId: rel.toServiceId,
      protocol: rel.protocol || 'HTTP',
      isCritical: rel.isCritical ?? true,
      weight: rel.weight ?? 1.0,
    });
  }

  async getServiceById(id: string): Promise<Service | null> {
    const query = `
      MATCH (s:Service { id: $id })
      RETURN s
    `;
    const records = await executeCypher<{ s: Service }>(query, { id }, 'READ');
    return records.length > 0 ? records[0].s : null;
  }

  async listServices(): Promise<Service[]> {
    const query = `
      MATCH (s:Service)
      RETURN s
      ORDER BY s.tier ASC, s.name ASC
    `;
    const records = await executeCypher<{ s: Service }>(query, {}, 'READ');
    return records.map(r => r.s);
  }
}
