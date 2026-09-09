import { executeCypher } from '../../config/neo4j.js';
import { EventBus } from '../../events/event-bus.js';
import type { BaseDomainEvent } from '../../events/event-types.js';

type EventPayload = Record<string, any>;

export class Neo4jPersistenceEngine {
  private readonly eventBus: EventBus;

  constructor() {
    this.eventBus = EventBus.getInstance();

    this.registerListeners();

    console.log(
      '[Neo4j Persistence] Live event persistence engine initialized.',
    );
  }

  /**
   * Subscribe to events that represent operational state.
   */
  private registerListeners(): void {
    this.eventBus.subscribeToEvent(
      'KUBERNETES_DEPLOYMENT_CHANGE',
      (event) => {
        void this.persistKubernetesDeployment(event);
      },
    );

    this.eventBus.subscribeToEvent(
      'KUBERNETES_POD_STATE_CHANGE',
      (event) => {
        void this.persistKubernetesPodState(event);
      },
    );

    this.eventBus.subscribeToEvent(
      'KUBERNETES_POD_RESTART',
      (event) => {
        void this.persistKubernetesPodRestart(event);
      },
    );

    this.eventBus.subscribeToEvent(
      'PROMETHEUS_METRIC_OBSERVATION',
      (event) => {
        void this.persistPrometheusEvidence(event);
      },
    );

    this.eventBus.subscribeToEvent(
      'PROMETHEUS_METRIC_ANOMALY',
      (event) => {
        void this.persistPrometheusEvidence(event);
      },
    );
  }

  /**
   * Ensure the local Kubernetes cluster exists in Neo4j.
   *
   * The current watcher uses Docker Desktop locally.
   * This is deliberately separate from the seeded production EKS cluster.
   */
  private async ensureCluster(
    organizationId: string,
    clusterId: string,
    namespace: string,
  ): Promise<void> {
    await executeCypher(
      `
      MERGE (o:Organization {id: $organizationId})

      MERGE (c:Cluster {id: $clusterId})
      ON CREATE SET
        c.name = $clusterId,
        c.environment = 'development',
        c.provider = 'Kubernetes',
        c.createdAt = $timestamp

      MERGE (c)-[:BELONGS_TO_ORG]->(o)

      MERGE (ns:Namespace {
        id: $namespaceId
      })
      ON CREATE SET
        ns.name = $namespace,
        ns.createdAt = $timestamp

      MERGE (ns)-[:BELONGS_TO_CLUSTER]->(c)
      `,
      {
        organizationId,
        clusterId,
        namespaceId: `${clusterId}:${namespace}`,
        namespace,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Ensure the service exists and belongs to the configured project.
   */
  private async ensureService(
    organizationId: string,
    serviceId: string,
  ): Promise<void> {
    const projectId =
      process.env.DEPLOYGUARD_PROJECT_ID ??
      'proj-ecommerce';

    await executeCypher(
      `
      MERGE (o:Organization {id: $organizationId})

      MERGE (p:Project {id: $projectId})
      ON CREATE SET
        p.name = 'DeployGuard Kubernetes Project',
        p.createdAt = $timestamp

      MERGE (p)-[:BELONGS_TO_ORG]->(o)

      MERGE (s:Service {id: $serviceId})
      ON CREATE SET
        s.name = $serviceId,
        s.status = 'UNKNOWN',
        s.createdAt = $timestamp

      SET s.updatedAt = $timestamp

      MERGE (s)-[:BELONGS_TO]->(p)
      `,
      {
        organizationId,
        projectId,
        serviceId,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Persist a Kubernetes Deployment observation.
   */
  /**
 * Persist a Kubernetes Deployment observation.
 */
private async persistKubernetesDeployment(
  event: BaseDomainEvent,
): Promise<void> {
  try {
    const payload =
      (event.payload ?? {}) as EventPayload;

    const organizationId =
      event.organizationId;

    const namespace =
      payload.namespace ?? 'default';

    const deploymentName =
      payload.deploymentId ??
      event.deploymentId;

    if (!deploymentName) {
      console.warn(
        '[Neo4j Persistence] Deployment event has no deploymentId.',
      );
      return;
    }

    const serviceId =
      event.serviceId ??
      payload.serviceId ??
      deploymentName;

    const clusterId =
      process.env.DEPLOYGUARD_CLUSTER_ID ??
      'cluster-docker-desktop';

    const deploymentId =
      `${organizationId}:${namespace}:${deploymentName}`;

    await this.ensureCluster(
      organizationId,
      clusterId,
      namespace,
    );

    await this.ensureService(
      organizationId,
      serviceId,
    );

    await executeCypher(
      `
      MATCH (c:Cluster {id: $clusterId})
      MATCH (s:Service {id: $serviceId})

      MERGE (d:Deployment {id: $deploymentId})
      ON CREATE SET
        d.createdAt = $timestamp

      SET
        d.name = $deploymentName,
        d.version = $version,
        d.status = $status,
        d.environment = 'development',
        d.namespace = $namespace,
        d.revision = $revision,
        d.desiredReplicas = $desiredReplicas,
        d.availableReplicas = $availableReplicas,
        d.readyReplicas = $readyReplicas,
        d.unavailableReplicas = $unavailableReplicas,
        d.updatedReplicas = $updatedReplicas,
        d.generation = $generation,
        d.observedGeneration = $observedGeneration,
        d.updatedAt = $timestamp,
        d.lastEventId = $eventId

      MERGE (d)-[:DEPLOYED_TO]->(c)
      MERGE (d)-[:DEPLOYED_SERVICE]->(s)

      MERGE (e:Evidence {id: $eventId})
      SET
        e.type = 'deployment',
        e.source = 'kubernetes',
        e.timestamp = $timestamp,
        e.severity =
          CASE
            WHEN $status IN ['DEGRADED', 'SCALED_TO_ZERO']
              THEN 'HIGH'
            WHEN $status = 'ROLLING_OUT'
              THEN 'MEDIUM'
            ELSE 'INFO'
          END,
        e.value = $status,
        e.confidence = 1.0,
        e.metadata = $metadata

      MERGE (e)-[:ABOUT_DEPLOYMENT]->(d)
      MERGE (e)-[:ABOUT_SERVICE]->(s)
      `,
      {
        clusterId,
        serviceId,
        deploymentId,
        deploymentName,
        eventId: event.id,
        version: payload.version ?? 'unknown',
        status: payload.status ?? 'UNKNOWN',
        namespace,
        revision: payload.revision ?? null,
        desiredReplicas: payload.desiredReplicas ?? 0,
        availableReplicas: payload.availableReplicas ?? 0,
        readyReplicas: payload.readyReplicas ?? 0,
        unavailableReplicas:
          payload.unavailableReplicas ?? 0,
        updatedReplicas:
          payload.updatedReplicas ?? 0,
        generation:
          payload.generation ?? null,
        observedGeneration:
          payload.observedGeneration ?? null,
        timestamp: event.timestamp,
        metadata: JSON.stringify(payload),
      },
    );

    console.log(
      `[Neo4j Persistence] Deployment persisted: ${deploymentId}`,
    );
  } catch (error) {
    console.error(
      '[Neo4j Persistence] Failed to persist deployment event:',
      error,
    );
  }
}

  /**
   * Persist a Kubernetes Pod state transition.
   */
  private async persistKubernetesPodState(
    event: BaseDomainEvent,
  ): Promise<void> {
    try {
      const payload =
        (event.payload ?? {}) as EventPayload;

      const namespace =
        payload.namespace ?? 'default';

      const podName =
        payload.podName;

      if (!podName) {
        return;
      }

      const serviceId =
        event.serviceId ??
        payload.serviceId ??
        podName;

      const organizationId =
        event.organizationId;

      const clusterId =
        process.env.DEPLOYGUARD_CLUSTER_ID ??
        'cluster-docker-desktop';

      await this.ensureCluster(
        organizationId,
        clusterId,
        namespace,
      );

      await this.ensureService(
        organizationId,
        serviceId,
      );

      const podId =
        `${organizationId}:${namespace}:${podName}`;

      await executeCypher(
        `
        MATCH (c:Cluster {id: $clusterId})
        MATCH (s:Service {id: $serviceId})

        MERGE (p:Pod {id: $podId})
        ON CREATE SET
          p.createdAt = $timestamp

        SET
          p.name = $podName,
          p.namespace = $namespace,
          p.state = $currentState,
          p.rawState = $rawState,
          p.phase = $phase,
          p.restartCount = $restartCount,
          p.nodeName = $nodeName,
          p.updatedAt = $timestamp

        MERGE (p)-[:RUNS_ON_CLUSTER]->(c)
        MERGE (p)-[:INSTANCE_OF]->(s)

        MERGE (e:Evidence {id: $eventId})
        SET
          e.type = 'k8s_event',
          e.source = 'kubernetes',
          e.timestamp = $timestamp,
          e.severity =
            CASE
              WHEN $currentState IN [
                'IMAGE_PULL_FAILURE',
                'CRASH_LOOP',
                'OOM_KILLED',
                'CONFIGURATION_ERROR',
                'FAILED'
              ]
                THEN 'HIGH'
              WHEN $currentState = 'PENDING'
                THEN 'MEDIUM'
              ELSE 'INFO'
            END,
          e.value = $currentState,
          e.confidence = 1.0,
          e.metadata = $metadata

        MERGE (e)-[:ABOUT_POD]->(p)
        MERGE (e)-[:ABOUT_SERVICE]->(s)
        `,
        {
          clusterId,
          serviceId,
          podId,
          podName,
          namespace,
          currentState:
            payload.currentState ?? 'UNKNOWN',
          rawState:
            payload.rawState ?? 'UNKNOWN',
          phase:
            payload.phase ?? null,
          restartCount:
            payload.restartCount ?? 0,
          nodeName:
            payload.nodeName ?? null,
          eventId: event.id,
          timestamp: event.timestamp,
          metadata: JSON.stringify(payload),
        },
      );

      console.log(
        `[Neo4j Persistence] Pod state persisted: ${namespace}/${podName}`,
      );
    } catch (error) {
      console.error(
        '[Neo4j Persistence] Failed to persist pod state:',
        error,
      );
    }
  }

  /**
   * Persist a real Pod restart event as evidence.
   */
  private async persistKubernetesPodRestart(
    event: BaseDomainEvent,
  ): Promise<void> {
    try {
      const payload =
        (event.payload ?? {}) as EventPayload;

      const namespace =
        payload.namespace ?? 'default';

      const podName =
        payload.podName;

      if (!podName) {
        return;
      }

      const organizationId =
        event.organizationId;

      const serviceId =
        event.serviceId ??
        payload.serviceId ??
        podName;

      const clusterId =
        process.env.DEPLOYGUARD_CLUSTER_ID ??
        'cluster-docker-desktop';

      await this.ensureCluster(
        organizationId,
        clusterId,
        namespace,
      );

      await this.ensureService(
        organizationId,
        serviceId,
      );

      const podId =
        `${organizationId}:${namespace}:${podName}`;

      await executeCypher(
        `
        MATCH (p:Pod {id: $podId})
        MATCH (s:Service {id: $serviceId})

        SET
          p.restartCount = $restartCount,
          p.updatedAt = $timestamp

        MERGE (e:Evidence {id: $eventId})
        SET
          e.type = 'k8s_event',
          e.source = 'kubernetes',
          e.timestamp = $timestamp,
          e.severity = 'HIGH',
          e.value = toString($restartDelta),
          e.confidence = 1.0,
          e.metadata = $metadata

        MERGE (e)-[:ABOUT_POD]->(p)
        MERGE (e)-[:ABOUT_SERVICE]->(s)
        `,
        {
          podId,
          serviceId,
          restartCount:
            payload.restartCount ?? 0,
          restartDelta:
            payload.restartDelta ?? 1,
          eventId: event.id,
          timestamp: event.timestamp,
          metadata: JSON.stringify(payload),
        },
      );

      console.log(
        `[Neo4j Persistence] Pod restart persisted: ${namespace}/${podName}`,
      );
    } catch (error) {
      console.error(
        '[Neo4j Persistence] Failed to persist pod restart:',
        error,
      );
    }
  }

/**
 * Persist Prometheus observations/anomalies as Evidence.
 */
private async persistPrometheusEvidence(
  event: BaseDomainEvent,
): Promise<void> {
  try {
    const payload =
      (event.payload ?? {}) as EventPayload;

    const organizationId =
      event.organizationId;

    const namespace =
      payload.namespace ?? 'default';

    const deploymentName =
      payload.deployment ??
      payload.deploymentName;

    if (!deploymentName) {
      console.warn(
        '[Neo4j Persistence] Prometheus event has no deployment name.',
      );
      return;
    }

    const deploymentId =
      `${organizationId}:${namespace}:${deploymentName}`;

    const serviceId =
      event.serviceId ??
      payload.serviceId ??
      deploymentName;

    /*
     * Prometheus evidence is associated with a real Kubernetes
     * Deployment. If the Kubernetes event has not been persisted yet,
     * create the deployment topology here as well.
     */
    await this.ensureCluster(
      organizationId,
      process.env.DEPLOYGUARD_CLUSTER_ID ??
        'cluster-docker-desktop',
      namespace,
    );

    await this.ensureService(
      organizationId,
      serviceId,
    );

    const clusterId =
      process.env.DEPLOYGUARD_CLUSTER_ID ??
      'cluster-docker-desktop';

    const severity =
      event.type ===
      'PROMETHEUS_METRIC_ANOMALY'
        ? 'HIGH'
        : 'INFO';

    const deploymentHealth =
      payload.deploymentHealth ?? {};

    await executeCypher(
      `
      MATCH (c:Cluster {id: $clusterId})
      MATCH (s:Service {id: $serviceId})

      MERGE (d:Deployment {
        id: $deploymentId
      })
      ON CREATE SET
        d.name = $deploymentName,
        d.namespace = $namespace,
        d.environment = 'development',
        d.status = 'UNKNOWN',
        d.createdAt = $timestamp

      SET
        d.name = $deploymentName,
        d.namespace = $namespace,
        d.desiredReplicas = $desiredReplicas,
        d.availableReplicas = $availableReplicas,
        d.readyReplicas = $readyReplicas,
        d.unavailableReplicas = $unavailableReplicas,
        d.status = $healthStatus,
        d.updatedAt = $timestamp

      MERGE (d)-[:DEPLOYED_TO]->(c)
      MERGE (d)-[:DEPLOYED_SERVICE]->(s)

      MERGE (e:Evidence {
        id: $eventId
      })
      SET
        e.type = 'metric',
        e.source = 'prometheus',
        e.timestamp = $timestamp,
        e.severity = $severity,
        e.value = $value,
        e.confidence = 1.0,
        e.metadata = $metadata

      MERGE (e)-[:ABOUT_SERVICE]->(s)
      MERGE (e)-[:ABOUT_DEPLOYMENT]->(d)
      `,
      {
        clusterId,
        serviceId,
        deploymentId,
        deploymentName,
        namespace,
        desiredReplicas:
          deploymentHealth.desiredReplicas ?? 0,
        availableReplicas:
          deploymentHealth.availableReplicas ?? 0,
        readyReplicas:
          deploymentHealth.readyReplicas ?? 0,
        unavailableReplicas:
          deploymentHealth.unavailableReplicas ?? 0,
        healthStatus:
          deploymentHealth.healthStatus ?? 'UNKNOWN',
        eventId: event.id,
        timestamp: event.timestamp,
        severity,
        value: JSON.stringify(payload),
        metadata: JSON.stringify(payload),
      },
    );

    console.log(
      `[Neo4j Persistence] Prometheus evidence persisted: ${event.id}`,
    );
  } catch (error) {
    console.error(
      '[Neo4j Persistence] Failed to persist Prometheus evidence:',
      error,
    );
  }
}
}