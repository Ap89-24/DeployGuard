// ============================================================================
// DeployGuard AI - Backend Unit Tests
// ============================================================================

import { validateEmbedding, computeCosineSimilarity, generateMockEmbedding, EMBEDDING_DIMENSION } from '../src/utils/vector.js';
import { buildDeployGuardWorkflow } from '../src/workflows/incident-response.workflow.js';

let passes = 0;
let fails = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✔ PASS: ${testName}`);
    passes++;
  } else {
    console.error(`  ✖ FAIL: ${testName}`);
    fails++;
  }
}

async function runBackendTests() {
  console.log('============================================================================');
  console.log('                 DeployGuard AI Backend Test Suite                          ');
  console.log('============================================================================\n');

  console.log('[Group 1] Vector Utilities');
  const vecA = generateMockEmbedding('test query 1');
  const vecB = generateMockEmbedding('test query 1');
  const vecC = generateMockEmbedding('completely different text string');

  assert(vecA.length === 768, 'Vector dimension is exactly 768');
  assert(Math.abs(computeCosineSimilarity(vecA, vecB) - 1.0) < 0.0001, 'Cosine similarity of identical vector is 1.0');
  assert(computeCosineSimilarity(vecA, vecC) < 0.9, 'Cosine similarity of different vectors is lower');

  console.log('\n[Group 2] LangGraph Workflow Compilation');
  const workflow = buildDeployGuardWorkflow();
  assert(typeof workflow === 'object' && typeof workflow.invoke === 'function', 'StateGraph compiles to executable workflow');

  console.log('\n============================================================================');
  console.log(`TEST SUMMARY: ${passes} Passed, ${fails} Failed`);
  console.log('============================================================================');

  if (fails > 0) process.exit(1);
}

runBackendTests();
