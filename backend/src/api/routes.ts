// ============================================================================
// DeployGuard AI - 17 Versioned REST API Controllers (/api/v1/*)
// ============================================================================

import { Router } from 'express';
import { ProjectRepository } from '../repositories/project.repository.js';
import { ServiceRepository } from '../repositories/service.repository.js';
import { DeploymentRepository } from '../repositories/deployment.repository.js';
import { IncidentRepository } from '../repositories/incident.repository.js';
import { DecisionRepository } from '../repositories/decision.repository.js';
import { BlastRadiusRepository } from '../repositories/blast-radius.repository.js';
import { GitHubAdapter } from '../adapters/github.adapter.js';
import { KubernetesWatch } from '../integrations/kubernetes/kubernetes.watch.js';
import { generateMockEmbedding } from '../utils/vector.js';
import { buildDeployGuardWorkflow } from '../workflows/incident-response.workflow.js';

export function createApiRouter(): Router {
  const router = Router();

  const projectRepo = new ProjectRepository();
  const serviceRepo = new ServiceRepository();
  const deploymentRepo = new DeploymentRepository();
  const incidentRepo = new IncidentRepository();
  const decisionRepo = new DecisionRepository();
  const blastRadiusRepo = new BlastRadiusRepository();
  const githubAdapter = new GitHubAdapter();
  const k8sWatch = new KubernetesWatch();

  k8sWatch.startWatching('default');

  // 1. Auth (/api/v1/auth)
  router.post('/auth/login', (req, res) => {
    res.json({ success: true, token: 'jwt-token-acme-corp-sre-lead', user: { email: 'sre-lead@acme.com', name: 'Alice Smith', role: 'admin' } });
  });

  // 2. Users (/api/v1/users)
  router.get('/users/me', (req, res) => {
    res.json({ success: true, user: { id: 'user-01', name: 'Alice Smith', email: 'sre-lead@acme.com', role: 'admin', organizationId: 'org-acme-corp' } });
  });

  // 3. Organizations (/api/v1/organizations)
  router.get('/organizations', (req, res) => {
    res.json({ success: true, organizations: [{ id: 'org-acme-corp', name: 'Acme Enterprise SaaS', plan: 'enterprise' }] });
  });

  // 4. Projects (/api/v1/projects)
  router.get('/projects', async (req, res) => {
    try {
      const services = await serviceRepo.listServices();
      res.json({ success: true, projects: [{ id: 'proj-ecommerce', name: 'E-Commerce Platform Core', services }] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Clusters (/api/v1/clusters)
  router.get('/clusters', (req, res) => {
    res.json({ success: true, clusters: [{ id: 'cluster-prod-us-east-1', name: 'eks-prod-us-east-1', environment: 'production', region: 'us-east-1', provider: 'AWS EKS' }] });
  });

  // 6. Services (/api/v1/services)
  router.get('/services', async (req, res) => {
    try {
      const services = await serviceRepo.listServices();
      res.json({ success: true, services });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/services/:id/blast-radius', async (req, res) => {
    try {
      const result = await blastRadiusRepo.computeBlastRadius(req.params.id);
      res.json({ success: true, blastRadius: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Repositories (/api/v1/repositories)
  router.get('/repositories', (req, res) => {
    res.json({ success: true, repositories: [{ id: 'repo-auth', name: 'acme/auth-service', url: 'github.com/acme/auth-service' }] });
  });

  // 8. Deployments (/api/v1/deployments)
  router.get('/deployments', (req, res) => {
    res.json({ success: true, deployments: [{ id: 'dep-auth-v2.5.0', version: 'v2.5.0', status: 'CANARY', canaryWeight: 15, gitSha: 'c8f91a02' }] });
  });

  // 9. Rollouts (/api/v1/rollouts)
  router.get('/rollouts', (req, res) => {
    res.json({ success: true, rollouts: [{ name: 'auth-service', phase: 'Progressing', canaryWeight: 15, currentRevision: '2.5.0', stableRevision: '2.4.1' }] });
  });

  // 10. Incidents (/api/v1/incidents)
  router.get('/incidents', (req, res) => {
    res.json({ success: true, incidents: [{ id: 'inc-2026-903-01', title: '500 Error spike in auth-service canary release v2.5.0', severity: 'CRITICAL', status: 'INVESTIGATING' }] });
  });

  router.post('/incidents/search-vector', async (req, res) => {
    try {
      const { queryText, topK } = req.body;
      const embedding = generateMockEmbedding(queryText || 'incident search');
      const results = await incidentRepo.findSimilarIncidents(embedding, topK || 3, 0.5);
      res.json({ success: true, results });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Evidence (/api/v1/evidence)
  router.get('/evidence', (req, res) => {
    res.json({ success: true, evidence: [{ id: 'ev-101', type: 'metric', source: 'Prometheus', value: 'HTTP 500 error rate spike to 18%' }] });
  });

  // 12. Decisions (/api/v1/decisions)
  router.get('/decisions', (req, res) => {
    res.json({ success: true, decisions: [{ id: 'dec-2026-903-01', action: 'ROLLBACK', confidence: 0.94, status: 'PENDING_APPROVAL' }] });
  });

  // 13. Approvals (/api/v1/approvals)
  router.post('/approvals', async (req, res) => {
    try {
      const { decisionId, approver, comment, status } = req.body;
      const approval = await decisionRepo.recordApproval({
        id: `appr-${Date.now()}`,
        approver: approver || 'sre-lead@acme.com',
        status: status || 'APPROVED',
        comment: comment || 'Approved rollback',
        decisionId: decisionId || 'dec-2026-903-01',
      });
      res.json({ success: true, approval });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 14. Integrations (/api/v1/integrations)
  router.get('/integrations', (req, res) => {
    res.json({
      success: true,
      integrations: [
        { id: 'github', name: 'GitHub App', status: 'Connected' },
        { id: 'k8s', name: 'Kubernetes API', status: 'Connected' },
        { id: 'argo', name: 'Argo Rollouts', status: 'Connected' },
        { id: 'prometheus', name: 'Prometheus', status: 'Connected' },
        { id: 'loki', name: 'Loki Logs', status: 'Connected' },
      ]
    });
  });

  // 15. Audit Logs (/api/v1/audit-logs)
  router.get('/audit-logs', (req, res) => {
    res.json({ success: true, auditLogs: [{ timestamp: new Date().toISOString(), action: 'APPROVAL_GRANTED', actor: 'sre-lead@acme.com' }] });
  });

  // 16. Webhooks (/api/v1/webhooks/*)
  router.post('/webhooks/github', (req, res) => {
    const signature = req.headers['x-hub-signature-256'] as string;
    const isVerified = githubAdapter.verifyWebhookSignature(JSON.stringify(req.body), signature || '');
    res.json({ received: true, signatureVerified: isVerified });
  });

  // 17. Notifications (/api/v1/notifications)
  router.post('/notifications/slack', (req, res) => {
    res.json({ success: true, message: 'Slack notification queued' });
  });

  // Simulation Trigger Endpoint
  router.post('/workflows/trigger', async (req, res) => {
    try {
      // Emit real-time K8s pod restart event to WebSockets & EventBus!
      k8sWatch.emitPodRestartEvent('auth-service-v2.5.0-pod-x92', 'svc-auth', 3);

      const workflow = buildDeployGuardWorkflow();
      const embedding = generateMockEmbedding('JWT token RSA signature failure');
      const output = await workflow.invoke({
        incidentId: `inc-${Date.now()}`,
        title: '500 Error rate spike in auth-service canary release v2.5.0',
        severity: 'CRITICAL',
        summary: 'Null pointer exception during ES512 token validation algorithm swap',
        serviceId: 'svc-auth',
        deploymentId: 'dep-auth-v2.5.0',
        embedding,
        status: 'STARTING',
      });

      res.json({ success: true, workflowOutput: output });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
