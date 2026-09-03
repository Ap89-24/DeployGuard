// ============================================================================
// DeployGuard AI - Project & Cluster Repository
// ============================================================================

import { executeCypher } from '../config/neo4j.js';
import { Project, Cluster, Organization } from '../types/domain.js';

export class ProjectRepository {
  async createOrganization(org: Omit<Organization, 'createdAt'> & { createdAt?: string }): Promise<Organization> {
    const createdAt = org.createdAt || new Date().toISOString();
    const query = `
      MERGE (o:Organization { id: $id })
      ON CREATE SET o.name = $name, o.plan = $plan, o.createdAt = $createdAt
      ON MATCH SET o.name = $name, o.plan = $plan
      RETURN o
    `;
    const records = await executeCypher<{ o: Organization }>(query, {
      id: org.id,
      name: org.name,
      plan: org.plan,
      createdAt,
    });
    return records[0].o;
  }

  async createProject(project: Omit<Project, 'createdAt'> & { createdAt?: string }): Promise<Project> {
    const createdAt = project.createdAt || new Date().toISOString();
    const query = `
      MERGE (p:Project { id: $id })
      ON CREATE SET p.name = $name, p.description = $description, p.organizationId = $organizationId, p.createdAt = $createdAt
      ON MATCH SET p.name = $name, p.description = $description

      WITH p
      CALL {
        WITH p
        WITH p WHERE $organizationId IS NOT NULL AND $organizationId <> ""
        MATCH (o:Organization { id: $organizationId })
        MERGE (p)-[:BELONGS_TO_ORG]->(o)
        RETURN count(*) AS orgCount
      }

      RETURN p
    `;

    const records = await executeCypher<{ p: Project }>(query, {
      id: project.id,
      name: project.name,
      description: project.description || '',
      organizationId: project.organizationId || 'org-acme-corp',
      createdAt,
    });

    return records[0].p;
  }

  async createCluster(cluster: Omit<Cluster, 'createdAt'> & { createdAt?: string }): Promise<Cluster> {
    const createdAt = cluster.createdAt || new Date().toISOString();
    const query = `
      MERGE (c:Cluster { id: $id })
      ON CREATE SET
        c.name = $name,
        c.environment = $environment,
        c.region = $region,
        c.provider = $provider,
        c.organizationId = $organizationId,
        c.createdAt = $createdAt
      ON MATCH SET
        c.name = $name,
        c.environment = $environment,
        c.region = $region,
        c.provider = $provider

      WITH c
      CALL {
        WITH c
        WITH c WHERE $organizationId IS NOT NULL AND $organizationId <> ""
        MATCH (o:Organization { id: $organizationId })
        MERGE (c)-[:BELONGS_TO_ORG]->(o)
        RETURN count(*) AS orgCount
      }

      RETURN c
    `;

    const records = await executeCypher<{ c: Cluster }>(query, {
      id: cluster.id,
      name: cluster.name,
      environment: cluster.environment,
      region: cluster.region,
      provider: cluster.provider,
      organizationId: cluster.organizationId || 'org-acme-corp',
      createdAt,
    });

    return records[0].c;
  }
}
