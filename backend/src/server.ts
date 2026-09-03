// ============================================================================
// DeployGuard AI - Express API Gateway & Controller Server
// ============================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ProjectRepository } from './repositories/project.repository.js';
import { ServiceRepository } from './repositories/service.repository.js';
import { DeploymentRepository } from './repositories/deployment.repository.js';
import { IncidentRepository } from './repositories/incident.repository.js';
import { DecisionRepository } from './repositories/decision.repository.js';
import { BlastRadiusRepository } from './repositories/blast-radius.repository.js';
import { GitHubAdapter } from './adapters/github.adapter.js';
import { generateMockEmbedding } from './utils/vector.js';
import { buildDeployGuardWorkflow } from './workflows/incident-response.workflow.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Repositories & Adapters
const projectRepo = new ProjectRepository();
const serviceRepo = new ServiceRepository();
const deploymentRepo = new DeploymentRepository();
const incidentRepo = new IncidentRepository();
const decisionRepo = new DecisionRepository();
const blastRadiusRepo = new BlastRadiusRepository();
const githubAdapter = new GitHubAdapter();

// Health Check Probes
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'deployguard-backend', timestamp: new Date() }));
app.get('/ready', (req, res) => res.json({ ready: true, neo4j: 'connected' }));

// API Version 1 Endpoints
app.get('/api/v1/projects', async (req, res) => {
  try {
    const services = await serviceRepo.listServices();
    res.json({ success: true, services });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/services/:id/blast-radius', async (req, res) => {
  try {
    const result = await blastRadiusRepo.computeBlastRadius(req.params.id);
    res.json({ success: true, blastRadius: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/incidents/search-vector', async (req, res) => {
  try {
    const { queryText, topK } = req.body;
    const embedding = generateMockEmbedding(queryText || 'incident query vector');
    const results = await incidentRepo.findSimilarIncidents(embedding, topK || 3, 0.5);
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/workflows/trigger', async (req, res) => {
  try {
    const { incidentId, title, severity, summary, serviceId, deploymentId, queryText } = req.body;
    const embedding = generateMockEmbedding(queryText || title || 'incident simulation');
    const workflow = buildDeployGuardWorkflow();

    const output = await workflow.invoke({
      incidentId: incidentId || `inc-${Date.now()}`,
      title: title || '500 Error spike in canary rollout',
      severity: severity || 'CRITICAL',
      summary: summary || 'Null pointer exception during ES512 token validation algorithm swap',
      serviceId: serviceId || 'svc-auth',
      deploymentId: deploymentId || 'dep-auth-v42',
      embedding,
      status: 'STARTING',
    });

    res.json({ success: true, workflowOutput: output });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhooks Endpoint
app.post('/api/v1/webhooks/github', (req, res) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const isVerified = githubAdapter.verifyWebhookSignature(JSON.stringify(req.body), signature || '');
  res.json({ received: true, signatureVerified: isVerified });
});

app.listen(PORT, () => {
  console.log(`[DeployGuard API Gateway] Server running on http://localhost:${PORT}`);
});

export default app;
