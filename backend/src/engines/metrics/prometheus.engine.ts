// ============================================================================
// DeployGuard AI - Prometheus Metrics Engine
// ============================================================================

import { EventBus } from '../../events/event-bus.js';
import { BaseDomainEvent } from '../../events/event-types.js';
import { PrometheusAdapter } from '../../adapters/prometheus.adapter.js';

export class PrometheusEngine {
    private readonly eventBus: EventBus;
    private readonly prometheus: PrometheusAdapter;

    constructor() {
        this.eventBus = EventBus.getInstance();
        this.prometheus = new PrometheusAdapter();

        this.registerListeners();

        console.log('[Prometheus Engine] Initialized');
    }

    private registerListeners(): void {
        this.eventBus.subscribeToEvent(
            'KUBERNETES_DEPLOYMENT_CHANGE',
            (event) => {
                void this.analyzeDeployment(event);
            }
        );
    }

    private async analyzeDeployment(
        event: BaseDomainEvent
    ): Promise<void> {
        try {
            const payload = event.payload as {
                namespace?: string;
                deploymentId?: string;
                deployment?: string;
            };

            const namespace = payload.namespace || 'default';

            const deployment =
                payload.deploymentId ||
                payload.deployment ||
                event.deploymentId;

            if (!deployment) {
                console.warn(
                    '[Prometheus Engine] Deployment name missing from Kubernetes event'
                );

                return;
            }

            console.log(
                `[Prometheus Engine] Querying Prometheus for ${namespace}/${deployment}`
            );

            const [health, restarts] = await Promise.all([
                this.prometheus.queryDeploymentHealth(
                    namespace,
                    deployment
                ),

                this.prometheus.queryPodRestarts(
                    namespace,
                    deployment
                ),
            ]);

            const isAnomaly =
                health.healthStatus === 'DEGRADED' ||
                restarts.totalRestarts > 0;

            const anomalyReasons: string[] = [];

            if (health.healthStatus === 'DEGRADED') {
                anomalyReasons.push(
                    'Deployment replica health is degraded'
                );
            }

            if (restarts.totalRestarts > 0) {
                anomalyReasons.push(
                    `${restarts.totalRestarts} container restart(s) detected`
                );
            }

            const metricEvent: BaseDomainEvent = {
                id: `prometheus-${deployment}-${Date.now()}`,

                type: isAnomaly
                    ? 'PROMETHEUS_METRIC_ANOMALY'
                    : 'PROMETHEUS_METRIC_OBSERVATION',

                provider: 'prometheus',

                organizationId: event.organizationId,

                projectId: event.projectId,

                serviceId: event.serviceId,

                deploymentId: deployment,

                timestamp: new Date().toISOString(),

                payload: {
                    namespace,
                    deployment,

                    deploymentHealth: health,

                    podRestarts: restarts,

                    anomaly: isAnomaly,

                    anomalyReasons,

                    triggeredByEventId: event.id,
                },
            };

            this.eventBus.publishEvent(metricEvent);

            console.log(
                `[Prometheus Engine] Published ${metricEvent.type} for ${namespace}/${deployment}`
            );
        } catch (error) {
            console.error(
                '[Prometheus Engine] Failed to analyze deployment:',
                error
            );
        }
    }
}