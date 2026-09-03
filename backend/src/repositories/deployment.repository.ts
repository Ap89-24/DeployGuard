// ============================================================================
// DeployGuard AI - Deployment & Git Intelligence Repository
// ============================================================================

import { executeCypher } from '../config/neo4j.js';
import { Deployment, Commit } from '../types/domain.js';

export interface RecordDeploymentInput {
  id: string;
  version: string;
  status: Deployment['status'];
  environment: Deployment['environment'];
  startedAt?: string;
  finishedAt?: string;
  canaryWeight?: number;
  gitSha: string;
  serviceId: string;
  clusterId: string;
  commitInfo?: {
    message: string;
    author: string;
    timestamp?: string;
    branch?: string;
  };
  previousDeploymentId?: string;
}

export class DeploymentRepository {
  async recordCommit(commit: Commit, serviceId?: string): Promise<Commit> {
    const query = `
      MERGE (cm:Commit { sha: $sha })
      ON CREATE SET
        cm.message = $message,
        cm.author = $author,
        cm.timestamp = $timestamp,
        cm.branch = $branch
      ON MATCH SET
        cm.message = $message,
        cm.author = $author,
        cm.branch = $branch

      WITH cm
      CALL {
        WITH cm
        WITH cm WHERE $serviceId IS NOT NULL AND $serviceId <> ""
        MATCH (s:Service { id: $serviceId })
        MERGE (cm)-[:BELONGS_TO_SERVICE]->(s)
        RETURN count(*) AS sCount
      }

      RETURN cm
    `;

    const records = await executeCypher<{ cm: Commit }>(query, {
      sha: commit.sha,
      message: commit.message,
      author: commit.author,
      timestamp: commit.timestamp || new Date().toISOString(),
      branch: commit.branch || 'main',
      serviceId: serviceId || null,
    });

    return records[0].cm;
  }

  async recordDeployment(input: RecordDeploymentInput): Promise<Deployment> {
    const startedAt = input.startedAt || new Date().toISOString();

    await this.recordCommit({
      sha: input.gitSha,
      message: input.commitInfo?.message || `Commit ${input.gitSha.substring(0, 7)}`,
      author: input.commitInfo?.author || 'unknown',
      timestamp: input.commitInfo?.timestamp || startedAt,
      branch: input.commitInfo?.branch || 'main',
    }, input.serviceId);

    const query = `
      MERGE (d:Deployment { id: $id })
      ON CREATE SET
        d.version = $version,
        d.status = $status,
        d.environment = $environment,
        d.startedAt = $startedAt,
        d.finishedAt = $finishedAt,
        d.canaryWeight = $canaryWeight,
        d.gitSha = $gitSha
      ON MATCH SET
        d.version = $version,
        d.status = $status,
        d.finishedAt = $finishedAt,
        d.canaryWeight = $canaryWeight

      WITH d
      MATCH (s:Service { id: $serviceId })
      MERGE (d)-[:FOR_SERVICE]->(s)

      WITH d
      MATCH (c:Cluster { id: $clusterId })
      MERGE (d)-[:TARGET_CLUSTER]->(c)

      WITH d
      MATCH (cm:Commit { sha: $gitSha })
      MERGE (d)-[:INCLUDES_COMMIT]->(cm)

      WITH d
      CALL {
        WITH d
        WITH d WHERE $prevId IS NOT NULL AND $prevId <> ""
        MATCH (prev:Deployment { id: $prevId })
        MERGE (d)-[:PREVIOUS_DEPLOYMENT]->(prev)
        RETURN count(*) AS prevCount
      }

      RETURN d
    `;

    const records = await executeCypher<{ d: Deployment }>(query, {
      id: input.id,
      version: input.version,
      status: input.status,
      environment: input.environment,
      startedAt,
      finishedAt: input.finishedAt || null,
      canaryWeight: input.canaryWeight ?? 100,
      gitSha: input.gitSha,
      serviceId: input.serviceId,
      clusterId: input.clusterId,
      prevId: input.previousDeploymentId || null,
    });

    return records[0].d;
  }
}
