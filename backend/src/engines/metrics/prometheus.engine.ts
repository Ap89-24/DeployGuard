// ============================================================================
// DeployGuard AI - Prometheus Metrics Engine
// ============================================================================

import { EventBus } from '../../events/event-bus.js';
import { BaseDomainEvent } from '../../events/event-types.js';
import { PrometheusAdapter } from '../../adapters/prometheus.adapter.js';

interface PreviousObservation {
    totalRestarts: number;
    desiredReplicas: number;
    availableReplicas: number;
    readyReplicas: number;
    unavailableReplicas: number;
}

export class PrometheusEngine {
    private readonly eventBus: EventBus;
    private readonly prometheus: PrometheusAdapter;

    /**
     * Previous observations are kept per namespace/deployment.
     *
     * Key:
     * namespace/deployment
     */
    private readonly previousObservations =
        new Map<string, PreviousObservation>();

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

            const key = `${namespace}/${deployment}`;

            const previous = this.previousObservations.get(key);

            // ----------------------------------------------------------------------
            // Detect changes
            // ----------------------------------------------------------------------

            const newRestartCount =
                previous !== undefined &&
                restarts.totalRestarts > previous.totalRestarts;

            const replicaDegradation =
                health.healthStatus === 'DEGRADED';

            const replicaAvailabilityDropped =
                previous !== undefined &&
                health.availableReplicas <
                previous.availableReplicas;

            const readinessDropped =
                previous !== undefined &&
                health.readyReplicas <
                previous.readyReplicas;

            const isAnomaly =
                replicaDegradation ||
                newRestartCount ||
                replicaAvailabilityDropped ||
                readinessDropped;

            const anomalyReasons: string[] = [];

            if (replicaDegradation) {
                anomalyReasons.push(
                    'Deployment replica health is degraded'
                );
            }

            if (newRestartCount) {
                const restartIncrease =
                    restarts.totalRestarts -
                    previous.totalRestarts;

                anomalyReasons.push(
                    `${restartIncrease} new container restart(s) detected`
                );
            }

            if (replicaAvailabilityDropped) {
                anomalyReasons.push(
                    `Available replicas decreased from ${previous.availableReplicas} to ${health.availableReplicas}`
                );
            }

            if (readinessDropped) {
                anomalyReasons.push(
                    `Ready replicas decreased from ${previous.readyReplicas} to ${health.readyReplicas}`
                );
            }

            // ----------------------------------------------------------------------
            // Update state AFTER comparison
            // ----------------------------------------------------------------------

            this.previousObservations.set(key, {
                totalRestarts: restarts.totalRestarts,

                desiredReplicas: health.desiredReplicas,

                availableReplicas: health.availableReplicas,

                readyReplicas: health.readyReplicas,

                unavailableReplicas: health.unavailableReplicas,
            });

            // ----------------------------------------------------------------------
            // Publish metric event
            // ----------------------------------------------------------------------

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

                    comparison: {
                        hasPreviousObservation: previous !== undefined,

                        previous: previous || null,

                        current: {
                            totalRestarts: restarts.totalRestarts,

                            desiredReplicas:
                                health.desiredReplicas,

                            availableReplicas:
                                health.availableReplicas,

                            readyReplicas:
                                health.readyReplicas,

                            unavailableReplicas:
                                health.unavailableReplicas,
                        },
                    },
                },
            };

            this.eventBus.publishEvent(metricEvent);

            console.log(
                `[Prometheus Engine] Published ${metricEvent.type} for ${namespace}/${deployment}`
            );

            if (anomalyReasons.length > 0) {
                console.log(
                    `[Prometheus Engine] Reasons: ${anomalyReasons.join(', ')}`
                );
            }
        } catch (error) {
            console.error(
                '[Prometheus Engine] Failed to analyze deployment:',
                error
            );
        }
    }
}