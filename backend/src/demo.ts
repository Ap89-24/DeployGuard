// ============================================================================
// DeployGuard AI - End-to-End Backend Verification Demonstration
// ============================================================================

import { ProjectRepository } from './repositories/project.repository.js';
import { ServiceRepository } from './repositories/service.repository.js';
import { DeploymentRepository } from './repositories/deployment.repository.js';
import { IncidentRepository } from './repositories/incident.repository.js';
import { BlastRadiusRepository } from './repositories/blast-radius.repository.js';
import { initializeNeo4jSchema } from './db/schema-init.js';
import { closeNeo4jDriver } from './config/neo4j.js';
import { generateMockEmbedding } from './utils/vector.js';
import { buildDeployGuardWorkflow } from './workflows/incident-response.workflow.ts';

async function runBackendDemo() {
  console.log('============================================================================');
  console.log('            DeployGuard AI Backend & Neo4j Data Layer Demo                  ');
  console.log('============================================================================\n');

  console.log('[1/4] Initializing Schema & 768d Vector Index...');
  await initializeNeo4jSchema();

  console.log('[2/4] Building Topology...');
  const projRepo = new ProjectRepository();
  const svcRepo = new ServiceRepository();
  const depRepo = new DeploymentRepository();
  const incRepo = new IncidentRepository();
  const blastRepo = new BlastRadiusRepository();

  const org = await projRepo.createOrganization({ id: 'org-demo', name: 'Demo SaaS Org', plan: 'enterprise' });
  const proj = await projRepo.createProject({ id: 'proj-demo', name: 'Core Microservices', organizationId: org.id });
  const cluster = await projRepo.createCluster({ id: 'cluster-prod', name: 'eks-prod', environment: 'production', region: 'us-east-1', provider: 'EKS', organizationId: org.id });

  const sAuth = await svcRepo.createService({ id: 'svc-auth', name: 'auth-service', tier: 'tier-1', status: 'HEALTHY' }, proj.id, cluster.id);
  const sPay = await svcRepo.createService({ id: 'svc-payment', name: 'payment-service', tier: 'tier-1', status: 'HEALTHY' }, proj.id, cluster.id);
  const sCheck = await svcRepo.createService({ id: 'svc-checkout', name: 'checkout-service', tier: 'tier-1', status: 'HEALTHY' }, proj.id, cluster.id);

  await svcRepo.addDependency({ fromServiceId: sCheck.id, toServiceId: sPay.id, protocol: 'gRPC', isCritical: true });
  await svcRepo.addDependency({ fromServiceId: sPay.id, toServiceId: sAuth.id, protocol: 'gRPC', isCritical: true });

  console.log('[3/4] Computing Blast Radius...');
  const blast = await blastRepo.computeBlastRadius(sAuth.id);
  console.log(`✔ Blast Risk Score: ${(blast.blastRadiusScore * 100).toFixed(1)}% | Upstream count: ${blast.upstreamDependentsCount}`);

  console.log('[4/4] Executing 17-Node LangGraph StateGraph Workflow...');
  const workflow = buildDeployGuardWorkflow();
  const embedding = generateMockEmbedding('JWT token RSA signature error');
  const result = await workflow.invoke({
    incidentId: `inc-${Date.now()}`,
    title: '500 Error spike in auth-service canary v2.5.0',
    severity: 'CRITICAL',
    summary: 'Null pointer exception during ES512 token validation algorithm swap',
    serviceId: sAuth.id,
    deploymentId: 'dep-auth-v2.5.0',
    embedding,
    status: 'STARTING',
  });

  console.log('--- LANGGRAPH WORKFLOW COMPLETE ---');
  console.log(`Status: ${result.status}`);
  console.log(`Suggested Action: ${result.suggestedAction}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`Decision ID: ${result.decisionId}`);
  console.log(`Approval ID: ${result.approvalId}`);
}

runBackendDemo()
  .then(() => closeNeo4jDriver())
  .catch(err => {
    console.error('Backend Demo Error:', err);
    closeNeo4jDriver().finally(() => process.exit(1));
  });
