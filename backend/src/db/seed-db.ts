// ============================================================================
// DeployGuard AI - Database Seeding Utility
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { executeCypher, verifyNeo4jConnection, closeNeo4jDriver } from '../config/neo4j.js';
import { generateMockEmbedding } from '../utils/vector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedDatabase(): Promise<void> {
  console.log('----------------------------------------------------------------------------');
  console.log('[DeployGuard Seed] Seeding Neo4j Microservices Topology & Vector Embeddings...');
  console.log('----------------------------------------------------------------------------');

  const isConnected = await verifyNeo4jConnection();
  if (!isConnected) {
    throw new Error('Database connection failed. Cannot seed data.');
  }

  const seedFilePath = path.join(__dirname, '../../cypher/seed.cypher');
  const cypherRaw = fs.readFileSync(seedFilePath, 'utf-8');

  const cypherBlocks = cypherRaw
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(block => block.length > 0 && !block.startsWith('// ='));

  for (const block of cypherBlocks) {
    try {
      await executeCypher(block, {}, 'WRITE');
    } catch (err: any) {
      console.warn(`[DeployGuard Seed] Warning executing seed block:\n${err.message}`);
    }
  }

  // Generate 768-dim float vector embedding for historical incident
  console.log('[DeployGuard Seed] Saving 768-dim float vector embedding for historical incident...');
  const sampleEmbedding = generateMockEmbedding('JWT RSA key verification failure null pointer crash in auth-service causing 500 error rate');

  const updateVectorQuery = `
    MERGE (inc:Incident { id: "inc-hist-001" })
    ON CREATE SET
      inc.title = "OAuth2 RSA Key Signature Verification Failure in auth-service",
      inc.severity = "CRITICAL",
      inc.summary = "Null pointer exception during JWT validation algorithm swap causing 500 error spike",
      inc.rootCauseHypothesis = "Missing secret key payload in environment configuration",
      inc.status = "RESOLVED",
      inc.embedding = $embedding,
      inc.createdAt = "2026-09-01T10:00:00Z"
    ON MATCH SET
      inc.embedding = $embedding
    RETURN inc.id AS id
  `;
  await executeCypher(updateVectorQuery, { embedding: sampleEmbedding }, 'WRITE');

  console.log('----------------------------------------------------------------------------');
  console.log('[DeployGuard Seed] Seeding completed successfully!');
  console.log('----------------------------------------------------------------------------');
}

const isMainModule =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  seedDatabase()
    .then(() => closeNeo4jDriver())
    .catch((err) => {
      console.error('[DeployGuard Seed] Fatal Error:', err);
      process.exit(1);
    });
}