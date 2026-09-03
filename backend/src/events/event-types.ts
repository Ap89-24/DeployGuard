// ============================================================================
// DeployGuard AI - Event Types & Payload Specifications
// ============================================================================

export type EventType =
  | 'KUBERNETES_POD_RESTART'
  | 'KUBERNETES_DEPLOYMENT_CHANGE'
  | 'PROMETHEUS_METRIC_ANOMALY'
  | 'LOKI_LOG_EXCEPTION'
  | 'GITHUB_WEBHOOK_EVENT'
  | 'ARGO_ROLLOUT_CHANGE'
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
  provider: 'kubernetes' | 'prometheus' | 'loki' | 'github' | 'argo' | 'deployguard';
  organizationId: string;
  projectId?: string;
  serviceId?: string;
  deploymentId?: string;
  timestamp: string;
  payload: T;
}
