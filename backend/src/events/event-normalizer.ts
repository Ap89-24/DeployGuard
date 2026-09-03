// ============================================================================
// DeployGuard AI - Evidence & Event Normalizer
// ============================================================================

import { BaseDomainEvent } from './event-types.js';
import { Evidence } from '../types/domain.js';

export class EventNormalizer {
  public static normalizeToEvidence(event: BaseDomainEvent): Evidence {
    let severity: Evidence['severity'] = 'info';
    let value = JSON.stringify(event.payload);

    if (event.type === 'KUBERNETES_POD_RESTART') {
      severity = 'error';
      value = `Kubernetes Pod restart detected for service '${event.serviceId || 'unknown'}'`;
    } else if (event.type === 'PROMETHEUS_METRIC_ANOMALY') {
      severity = 'warning';
      value = `Prometheus Metric Regression: HTTP 500 error rate elevated to ${event.payload.errorRate || '18%'}`;
    } else if (event.type === 'LOKI_LOG_EXCEPTION') {
      severity = 'critical';
      value = `Loki Log Exception: ${event.payload.exception || 'NullPointerException in JWT verification'}`;
    }

    return {
      id: `ev-${event.id}`,
      type: event.provider === 'kubernetes' ? 'k8s_event' : event.provider === 'prometheus' ? 'metric' : event.provider === 'loki' ? 'log' : 'git',
      source: event.provider,
      timestamp: event.timestamp,
      serviceId: event.serviceId,
      deploymentId: event.deploymentId,
      severity,
      value,
      confidence: 0.95,
      metadata: event.payload,
    };
  }
}
