// ============================================================================
// DeployGuard AI - Database Schema & Vector Index Initialization
// ============================================================================

import { executeCypher, verifyNeo4jConnection, closeNeo4jDriver } from '../config/neo4j.js';
import { EMBEDDING_DIMENSION } from '../utils/vector.js';

export const SCHEMA_STATEMENTS = [
  { name: 'org_id_unique', cypher: `CREATE CONSTRAINT org_id_unique IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE` },
  { name: 'user_id_unique', cypher: `CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE` },
  { name: 'project_id_unique', cypher: `CREATE CONSTRAINT project_id_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE` },
  { name: 'cluster_id_unique', cypher: `CREATE CONSTRAINT cluster_id_unique IF NOT EXISTS FOR (c:Cluster) REQUIRE c.id IS UNIQUE` },
  { name: 'service_id_unique', cypher: `CREATE CONSTRAINT service_id_unique IF NOT EXISTS FOR (s:Service) REQUIRE s.id IS UNIQUE` },
  { name: 'deployment_id_unique', cypher: `CREATE CONSTRAINT deployment_id_unique IF NOT EXISTS FOR (d:Deployment) REQUIRE d.id IS UNIQUE` },
  { name: 'commit_sha_unique', cypher: `CREATE CONSTRAINT commit_sha_unique IF NOT EXISTS FOR (cm:Commit) REQUIRE cm.sha IS UNIQUE` },
  { name: 'evidence_id_unique', cypher: `CREATE CONSTRAINT evidence_id_unique IF NOT EXISTS FOR (e:Evidence) REQUIRE e.id IS UNIQUE` },
  { name: 'incident_id_unique', cypher: `CREATE CONSTRAINT incident_id_unique IF NOT EXISTS FOR (i:Incident) REQUIRE i.id IS UNIQUE` },
  { name: 'decision_id_unique', cypher: `CREATE CONSTRAINT decision_id_unique IF NOT EXISTS FOR (dec:Decision) REQUIRE dec.id IS UNIQUE` },
  { name: 'approval_id_unique', cypher: `CREATE CONSTRAINT approval_id_unique IF NOT EXISTS FOR (a:Approval) REQUIRE a.id IS UNIQUE` },

  { name: 'deployment_started_at_idx', cypher: `CREATE INDEX deployment_started_at_idx IF NOT EXISTS FOR (d:Deployment) ON (d.startedAt)` },
  { name: 'deployment_status_idx', cypher: `CREATE INDEX deployment_status_idx IF NOT EXISTS FOR (d:Deployment) ON (d.status)` },
  { name: 'incident_status_idx', cypher: `CREATE INDEX incident_status_idx IF NOT EXISTS FOR (i:Incident) ON (i.status)` },
  { name: 'service_tier_idx', cypher: `CREATE INDEX service_tier_idx IF NOT EXISTS FOR (s:Service) ON (s.tier)` },

  {
    name: 'incident_embedding_idx',
    cypher: `
      CREATE VECTOR INDEX incident_embedding_idx IF NOT EXISTS
      FOR (i:Incident) ON (i.embedding)
      OPTIONS {
        indexConfig: {
          \`vector.dimensions\`: ${EMBEDDING_DIMENSION},
          \`vector.similarity_function\`: 'cosine'
        }
      }
    `
  }
];

export async function initializeNeo4jSchema(): Promise<void> {
  console.log('----------------------------------------------------------------------------');
  console.log('[DeployGuard Init] Initializing Neo4j Schema Constraints & 768d Vector Index...');
  console.log('----------------------------------------------------------------------------');

  const isConnected = await verifyNeo4jConnection();
  if (!isConnected) {
    throw new Error('Database connection failed. Cannot initialize schema.');
  }

  for (const stmt of SCHEMA_STATEMENTS) {
    try {
      console.log(`[DeployGuard Init] Applying: ${stmt.name}`);
      await executeCypher(stmt.cypher, {}, 'WRITE');
      console.log(`[DeployGuard Init] ✓ ${stmt.name} applied.`);
    } catch (err: any) {
      console.warn(`[DeployGuard Init] Warning on ${stmt.name}: ${err.message}`);
    }
  }

  console.log('----------------------------------------------------------------------------');
  console.log('[DeployGuard Init] Schema & Vector Index Initialization Completed.');
  console.log('----------------------------------------------------------------------------');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  initializeNeo4jSchema()
    .then(() => closeNeo4jDriver())
    .catch((err) => {
      console.error('[DeployGuard Init] Fatal Error:', err);
      process.exit(1);
    });
}
