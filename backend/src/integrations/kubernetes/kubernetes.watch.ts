import * as k8s from '@kubernetes/client-node';
import { EventBus } from '../../events/event-bus.js';

export class KubernetesWatch {
  private readonly eventBus: EventBus;

  private readonly kc: k8s.KubeConfig;
  private readonly watch: k8s.Watch;

  private isWatching = false;

  private readonly watchers: k8s.AbortController[] = [];

  constructor() {
    this.eventBus = EventBus.getInstance();

    this.kc = new k8s.KubeConfig();

    // Automatically supports:
    // - ~/.kube/config when running locally
    // - in-cluster config when running inside Kubernetes
    this.kc.loadFromDefault();

    this.watch = new k8s.Watch(this.kc);
  }

  /**
   * Start real-time Kubernetes observation.
   */
  public async startWatching(
    namespace: string = 'default',
  ): Promise<void> {
    if (this.isWatching) {
      console.log(
        `[Kubernetes Watch API] Already watching namespace '${namespace}'`,
      );

      return;
    }

    this.isWatching = true;

    console.log(
      `[Kubernetes Watch API] Starting real-time observation for namespace '${namespace}'...`,
    );

    try {
      await Promise.all([
        this.watchPods(namespace),
        this.watchDeployments(namespace),
      ]);

      console.log(
        `[Kubernetes Watch API] Real-time observation active for '${namespace}'`,
      );
    } catch (error) {
      this.isWatching = false;

      console.error(
        '[Kubernetes Watch API] Failed to start watchers:',
        error,
      );

      throw error;
    }
  }

  /**
   * Watch Kubernetes Pods.
   */
  private async watchPods(namespace: string): Promise<void> {
    const path = `/api/v1/namespaces/${namespace}/pods`;

    console.log(`[Kubernetes Watch API] Watching: ${path}`);

    await this.watch.watch(
      path,
      {},
      (type, apiObj) => {
        this.handlePodEvent(type, apiObj);
      },
      (error) => {
        if (error) {
          console.error(
            '[Kubernetes Watch API] Pod watcher error:',
            error,
          );
        }

        console.log(
          '[Kubernetes Watch API] Pod watcher closed',
        );
      },
    );
  }

  /**
   * Watch Kubernetes Deployments.
   */
  private async watchDeployments(
    namespace: string,
  ): Promise<void> {
    const path = `/apis/apps/v1/namespaces/${namespace}/deployments`;

    console.log(
      `[Kubernetes Watch API] Watching: ${path}`,
    );

    await this.watch.watch(
      path,
      {},
      (type, apiObj) => {
        this.handleDeploymentEvent(type, apiObj);
      },
      (error) => {
        if (error) {
          console.error(
            '[Kubernetes Watch API] Deployment watcher error:',
            error,
          );
        }

        console.log(
          '[Kubernetes Watch API] Deployment watcher closed',
        );
      },
    );
  }

  /**
   * Handle Pod events.
   */
  private handlePodEvent(
    type: string,
    pod: k8s.V1Pod,
  ): void {
    const podName = pod.metadata?.name;

    if (!podName) {
      return;
    }

    const namespace = pod.metadata?.namespace ?? 'default';

    const restartCount =
      pod.status?.containerStatuses?.reduce(
        (total, container) =>
          total + (container.restartCount ?? 0),
        0,
      ) ?? 0;

    const phase = pod.status?.phase;

    console.log(
      `[Kubernetes] Pod ${type}: ${namespace}/${podName}`,
    );

    /*
     * Emit pod restart only when restart count > 0.
     */
    if (restartCount > 0) {
      this.eventBus.publishEvent({
        id: `k8s-pod-${pod.uid ?? podName}-${Date.now()}`,

        type: 'KUBERNETES_POD_RESTART',

        provider: 'kubernetes',

        organizationId: this.getOrganizationId(),

        serviceId: this.getServiceId(pod),

        timestamp: new Date().toISOString(),

        payload: {
          eventType: type,

          podName,

          namespace,

          restartCount,

          phase,

          nodeName: pod.spec?.nodeName,

          serviceId: this.getServiceId(pod),

          message: `Pod '${podName}' restarted ${restartCount} time(s)`,

          raw: {
            uid: pod.metadata?.uid,
          },
        },
      });
    }
  }

  /**
   * Handle Deployment events.
   */
  private handleDeploymentEvent(
    type: string,
    deployment: k8s.V1Deployment,
  ): void {
    const deploymentName =
      deployment.metadata?.name;

    if (!deploymentName) {
      return;
    }

    const namespace =
      deployment.metadata?.namespace ?? 'default';

    const serviceId =
      this.getServiceId(deployment);

    const version =
      deployment.spec?.template?.metadata?.labels?.[
      'app.kubernetes.io/version'
      ] ??
      deployment.spec?.template?.metadata?.labels?.[
      'version'
      ] ??
      deployment.spec?.template?.metadata?.labels?.[
      'app'
      ] ??
      'unknown';

    const desiredReplicas =
      deployment.spec?.replicas ?? 0;

    const availableReplicas =
      deployment.status?.availableReplicas ?? 0;

    const readyReplicas =
      deployment.status?.readyReplicas ?? 0;

    console.log(
      `[Kubernetes] Deployment ${type}: ${namespace}/${deploymentName}`,
    );

    this.eventBus.publishEvent({
      id: `k8s-deployment-${deployment.uid ?? deploymentName}-${Date.now()}`,

      type: 'KUBERNETES_DEPLOYMENT_CHANGE',

      provider: 'kubernetes',

      organizationId: this.getOrganizationId(),

      serviceId,

      deploymentId: deploymentName,

      timestamp: new Date().toISOString(),

      payload: {
        eventType: type,

        deploymentId: deploymentName,

        serviceId,

        namespace,

        version,

        status: this.getDeploymentStatus(deployment),

        desiredReplicas,

        availableReplicas,

        readyReplicas,

        generation:
          deployment.metadata?.generation,

        observedGeneration:
          deployment.status?.observedGeneration,

        message: `Deployment '${deploymentName}' changed`,
      },
    });
  }

  /**
   * Determine Deployment health.
   */
  private getDeploymentStatus(
    deployment: k8s.V1Deployment,
  ): string {
    const desired =
      deployment.spec?.replicas ?? 0;

    const available =
      deployment.status?.availableReplicas ?? 0;

    const updated =
      deployment.status?.updatedReplicas ?? 0;

    if (desired === 0) {
      return 'SCALED_TO_ZERO';
    }

    if (available === desired && updated === desired) {
      return 'HEALTHY';
    }

    if (updated < desired) {
      return 'ROLLING_OUT';
    }

    if (available < desired) {
      return 'DEGRADED';
    }

    return 'UNKNOWN';
  }

  /**
   * Extract service identifier from Kubernetes labels.
   */
  private getServiceId(
    resource:
      | k8s.V1Pod
      | k8s.V1Deployment,
  ): string {
    const labels =
      resource.metadata?.labels ?? {};

    return (
      labels['app.kubernetes.io/name'] ??
      labels['app'] ??
      labels['service'] ??
      resource.metadata?.name ??
      'unknown-service'
    );
  }

  /**
   * Organization should eventually come from the
   * Kubernetes cluster/integration configuration.
   */
  private getOrganizationId(): string {
    return (
      process.env.DEPLOYGUARD_ORGANIZATION_ID ??
      'org-acme-corp'
    );
  }

  /**
   * Stop all Kubernetes watchers.
   */
  public async stopWatching(): Promise<void> {
    if (!this.isWatching) {
      return;
    }

    console.log(
      '[Kubernetes Watch API] Stopping watchers...',
    );

    this.isWatching = false;

    for (const controller of this.watchers) {
      controller.abort();
    }

    this.watchers.length = 0;

    console.log(
      '[Kubernetes Watch API] Watchers stopped',
    );
  }

  public getWatchingStatus(): boolean {
    return this.isWatching;
  }
}
