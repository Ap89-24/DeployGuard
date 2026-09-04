// ============================================================================
// DeployGuard AI - Event Types & Payload Specifications
// ============================================================================

export type EventType =
  | 'KUBERNETES_POD_RESTART'
  | 'KUBERNETES_POD_STATE_CHANGE'
  | 'KUBERNETES_DEPLOYMENT_CHANGE'

  // Prometheus
  | 'PROMETHEUS_METRIC_OBSERVATION'
  | 'PROMETHEUS_METRIC_ANOMALY'

  // Loki
  | 'LOKI_LOG_EXCEPTION'

  // GitHub
  | 'GITHUB_WEBHOOK_EVENT'

  // Argo
  | 'ARGO_ROLLOUT_CHANGE'

  // DeployGuard internal events
  | 'EVIDENCE_NORMALIZED'
  | 'INCIDENT_DETECTED'
  | 'BLAST_RADIUS_COMPUTED'
  | 'DECISION_CREATED'
  | 'APPROVAL_SUBMITTED'
  | 'RECOVERY_EXECUTED'
  | 'RECOVERY_VERIFIED';

export interface BaseDomainEvent<T = any> {
  id: string;

  type: EventType;

  provider:
  | 'kubernetes'
  | 'prometheus'
  | 'loki'
  | 'github'
  | 'argo'
  | 'deployguard';

  organizationId: string;

  projectId?: string;

  serviceId?: string;

  deploymentId?: string;

  timestamp: string;

  payload: T;
}


