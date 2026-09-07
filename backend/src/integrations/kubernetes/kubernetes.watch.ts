import * as k8s from '@kubernetes/client-node';
import { EventBus } from '../../events/event-bus.js';

/**
 * The state we persist for each observed Pod.
 *
 * rawState:
 *   The exact Kubernetes state/reason.
 *   Example: ImagePullBackOff, ErrImagePull
 *
 * state:
 *   DeployGuard's normalized semantic state.
 *   Example: IMAGE_PULL_FAILURE
 */
type PodObservation = {
  restartCount: number;
  rawState: string;
  state: PodSemanticState;
};


/**
 * Normalized Kubernetes Pod states used by DeployGuard.
 *
 * Multiple Kubernetes states can map to the same semantic state.
 *
 * Example:
 *
 * ImagePullBackOff
 * ErrImagePull
 *       ↓
 * IMAGE_PULL_FAILURE
 */
type PodSemanticState =
  | 'RUNNING'
  | 'PENDING'
  | 'IMAGE_PULL_FAILURE'
  | 'CRASH_LOOP'
  | 'CONFIGURATION_ERROR'
  | 'OOM_KILLED'
  | 'FAILED'
  | 'TERMINATED'
  | 'UNKNOWN';

export class KubernetesWatch {
  private readonly eventBus: EventBus;

  private readonly kc: k8s.KubeConfig;
  private readonly watch: k8s.Watch;

  private isWatching = false;

  private readonly watchers: AbortController[] = [];

  /**
   * Stores the previous meaningful observation for each Pod.
   *
   * Key:
   *   namespace/podName
   *
   * This is used to detect:
   *
   * restart:
   *   1 → 2
   *
   * state transition:
   *   PENDING → IMAGE_PULL_FAILURE
   *
   * and to ignore:
   *
   *   1 → 1
   *   IMAGE_PULL_FAILURE → IMAGE_PULL_FAILURE
   */
  private readonly podObservations = new Map<
    string,
    PodObservation
    >();
  
  /**
 * Current Kubernetes state.
 *
 * These maps provide a snapshot for the frontend.
 *
 * WebSocket = future/live changes
 * Snapshot   = current state when frontend connects
 */
  private readonly currentDeployments = new Map<string, any>();

  private readonly currentPods = new Map<string, any>();

  constructor() {
    this.eventBus = EventBus.getInstance();

    this.kc = new k8s.KubeConfig();

    /**
     * Automatically supports:
     *
     * Local:
     *   ~/.kube/config
     *
     * Kubernetes:
     *   In-cluster service account configuration
     */
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
  private async watchPods(
    namespace: string,
  ): Promise<void> {
    const path =
      `/api/v1/namespaces/${namespace}/pods`;

    console.log(
      `[Kubernetes Watch API] Watching: ${path}`,
    );

    await this.watch.watch(
      path,
      {},
      (type, apiObj) => {
        this.handlePodEvent(
          type,
          apiObj as k8s.V1Pod,
        );
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
    const path =
      `/apis/apps/v1/namespaces/${namespace}/deployments`;

    console.log(
      `[Kubernetes Watch API] Watching: ${path}`,
    );

    await this.watch.watch(
      path,
      {},
      (type, apiObj) => {
        this.handleDeploymentEvent(
          type,
          apiObj as k8s.V1Deployment,
        );
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
   * Handle Kubernetes Pod events.
   *
   * Kubernetes can emit many MODIFIED events for a single Pod.
   *
   * Therefore we:
   *
   * 1. Calculate current restart count.
   * 2. Calculate current semantic state.
   * 3. Compare against previous observation.
   * 4. Emit only meaningful events.
   */
  private handlePodEvent(
    type: string,
    pod: k8s.V1Pod,
  ): void {
    const podName = pod.metadata?.name;

    if (!podName) {
      return;
    }

    const namespace =
      pod.metadata?.namespace ?? 'default';

    const podKey =
      `${namespace}/${podName}`;

    /**
     * Calculate total restart count across all containers.
     */
    const restartCount =
      pod.status?.containerStatuses?.reduce(
        (total, container) =>
          total + (container.restartCount ?? 0),
        0,
      ) ?? 0;

    /**
     * Get both the raw Kubernetes state and
     * DeployGuard's normalized semantic state.
     */
    const podState =
      this.getPodState(pod);

    const rawState =
      podState.rawState;

    const state =
      podState.semanticState;

    console.log(
      `[Kubernetes] Pod ${type}: ` +
      `${namespace}/${podName} (${rawState})`,
    );

    /**
     * Get previous observation.
     */
    const previous =
      this.podObservations.get(podKey);

    /**
     * ---------------------------------------------------------
     * INITIAL OBSERVATION
     * ---------------------------------------------------------
     *
     * Kubernetes sends ADDED events when the watcher starts.
     *
     * A Pod may already have:
     *
     *   restartCount = 5
     *
     * That does NOT mean it just restarted.
     *
     * Therefore we initialize our state without generating
     * a restart event.
     */
    if (!previous) {
      this.podObservations.set(
        podKey,
        {
          restartCount,
          rawState,
          state,
        },
      );

      this.currentPods.set(podKey, {
        id: `k8s-pod-snapshot-${pod.metadata?.uid ?? podName}`,

        type: 'KUBERNETES_POD_STATE_CHANGE',

        provider: 'kubernetes',

        organizationId:
          this.getOrganizationId(),

        serviceId:
          this.getServiceId(pod),

        timestamp:
          new Date().toISOString(),

        payload: {
          eventType: type,

          podName,

          namespace,

          currentState: state,

          semanticState: state,

          rawState,

          restartCount,

          phase:
            pod.status?.phase,

          nodeName:
            pod.spec?.nodeName,

          serviceId:
            this.getServiceId(pod),

          containerStatuses:
            pod.status?.containerStatuses?.map(
              (container) => ({
                name: container.name,
                ready: container.ready,
                restartCount: container.restartCount,
                state: container.state,
              }),
            ),
        },
      });

      /**
       * If DeployGuard starts while a Pod is already failing,
       * we still want to record that failure as evidence.
       */
      if (
        this.isMeaningfulFailureState(
          state,
        )
      ) {
        this.publishPodStateChange({
          eventType: type,
          podName,
          namespace,
          previousState: undefined,
          currentState: state,
          rawState,
          restartCount,
          pod,
        });
      }

      return;
    }

    /**
     * ---------------------------------------------------------
     * REAL RESTART DETECTION
     * ---------------------------------------------------------
     *
     * Example:
     *
     * 1 → 1
     * No event.
     *
     * 1 → 2
     * Real restart.
     *
     * 2 → 3
     * Real restart.
     */
    if (
      restartCount >
      previous.restartCount
    ) {
      this.publishPodRestart({
        eventType: type,
        podName,
        namespace,
        previousRestartCount:
          previous.restartCount,
        restartCount,
        state,
        rawState,
        pod,
      });
    }

    /**
     * ---------------------------------------------------------
     * SEMANTIC STATE TRANSITION
     * ---------------------------------------------------------
     *
     * Important:
     *
     * ImagePullBackOff
     *       ↓
     * ErrImagePull
     *
     * becomes:
     *
     * IMAGE_PULL_FAILURE
     *       ↓
     * IMAGE_PULL_FAILURE
     *
     * Therefore it does NOT generate another event.
     */
    if (
      state !== previous.state &&
      this.isMeaningfulStateTransition(
        previous.state,
        state,
      )
    ) {
      this.publishPodStateChange({
        eventType: type,
        podName,
        namespace,
        previousState:
          previous.state,
        currentState: state,
        rawState,
        restartCount,
        pod,
      });
    }

    /**
     * Always update the latest observation.
     */
    this.podObservations.set(
      podKey,
      {
        restartCount,
        rawState,
        state,
      },
    );

    this.currentPods.set(podKey, {
      id: `k8s-pod-snapshot-${pod.metadata?.uid ?? podName}`,

      type: 'KUBERNETES_POD_STATE_CHANGE',

      provider: 'kubernetes',

      organizationId:
        this.getOrganizationId(),

      serviceId:
        this.getServiceId(pod),

      timestamp:
        new Date().toISOString(),

      payload: {
        eventType: type,

        podName,

        namespace,

        currentState: state,

        semanticState: state,

        rawState,

        restartCount,

        phase:
          pod.status?.phase,

        nodeName:
          pod.spec?.nodeName,

        serviceId:
          this.getServiceId(pod),

        containerStatuses:
          pod.status?.containerStatuses?.map(
            (container) => ({
              name: container.name,
              ready: container.ready,
              restartCount: container.restartCount,
              state: container.state,
            }),
          ),
      },
    });

    /**
     * Deleted Pods should not remain in memory.
     */
    if (type === 'DELETED') {
      this.podObservations.delete(
        podKey,
      );
      this.currentPods.delete(podKey);
    }
  }

  /**
   * Determine the current Kubernetes Pod state.
   *
   * Container-level waiting/terminated reasons are more
   * useful for incident analysis than Pod phase alone.
   */
  private getPodState(
    pod: k8s.V1Pod,
  ): {
    rawState: string;
    semanticState: PodSemanticState;
  } {
    const containerStatuses =
      pod.status?.containerStatuses ?? [];

    /**
     * Check waiting states first.
     *
     * Examples:
     *
     * ImagePullBackOff
     * ErrImagePull
     * CrashLoopBackOff
     */
    for (const container of containerStatuses) {
      const waiting =
        container.state?.waiting;

      if (waiting?.reason) {
        return {
          rawState:
            waiting.reason,

          semanticState:
            this.normalizePodState(
              waiting.reason,
            ),
        };
      }

      /**
       * Check terminated states.
       */
      const terminated =
        container.state?.terminated;

      if (terminated?.reason) {
        return {
          rawState:
            terminated.reason,

          semanticState:
            this.normalizePodState(
              terminated.reason,
            ),
        };
      }
    }

    /**
     * Fall back to Kubernetes Pod phase.
     */
    const phase =
      pod.status?.phase ?? 'UNKNOWN';

    return {
      rawState: phase,

      semanticState:
        this.normalizePodState(
          phase,
        ),
    };
  }

  /**
   * Convert Kubernetes-specific states into
   * DeployGuard semantic states.
   */
  private normalizePodState(
    state: string,
  ): PodSemanticState {
    switch (state) {
      /**
       * Image-related failures.
       *
       * These are intentionally grouped together.
       */
      case 'ImagePullBackOff':
      case 'ErrImagePull':
        return 'IMAGE_PULL_FAILURE';

      /**
       * Application/container crash loop.
       */
      case 'CrashLoopBackOff':
        return 'CRASH_LOOP';

      /**
       * Container configuration/startup failures.
       */
      case 'CreateContainerConfigError':
      case 'CreateContainerError':
      case 'RunContainerError':
        return 'CONFIGURATION_ERROR';

      /**
       * Out-of-memory termination.
       */
      case 'OOMKilled':
        return 'OOM_KILLED';

      /**
       * Generic Kubernetes failure.
       */
      case 'Failed':
      case 'Error':
        return 'FAILED';

      /**
       * Completed container.
       */
      case 'Succeeded':
        return 'TERMINATED';

      /**
       * Normal Pod phases.
       */
      case 'Running':
        return 'RUNNING';

      case 'Pending':
        return 'PENDING';

      /**
       * Unknown/unrecognized state.
       */
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Determine whether a state is a meaningful failure.
   */
  private isMeaningfulFailureState(
    state: PodSemanticState,
  ): boolean {
    return [
      'IMAGE_PULL_FAILURE',
      'CRASH_LOOP',
      'CONFIGURATION_ERROR',
      'OOM_KILLED',
      'FAILED',
    ].includes(state);
  }

  /**
   * Determine whether a state transition is worth
   * publishing as DeployGuard evidence.
   *
   * Examples:
   *
   * PENDING → IMAGE_PULL_FAILURE
   *      YES
   *
   * RUNNING → CRASH_LOOP
   *      YES
   *
   * IMAGE_PULL_FAILURE → RUNNING
   *      YES, recovery
   *
   * IMAGE_PULL_FAILURE → IMAGE_PULL_FAILURE
   *      NO
   *
   * RUNNING → RUNNING
   *      NO
   */
  private isMeaningfulStateTransition(
    previousState: PodSemanticState,
    currentState: PodSemanticState,
  ): boolean {
    /**
     * Entering a failure state.
     */
    if (
      this.isMeaningfulFailureState(
        currentState,
      )
    ) {
      return true;
    }

    /**
     * Recovering from a failure state.
     */
    if (
      this.isMeaningfulFailureState(
        previousState,
      ) &&
      !this.isMeaningfulFailureState(
        currentState,
      )
    ) {
      return true;
    }

    return false;
  }

  /**
   * Publish a real Pod restart event.
   */
  private publishPodRestart({
    eventType,
    podName,
    namespace,
    previousRestartCount,
    restartCount,
    state,
    rawState,
    pod,
  }: {
    eventType: string;
    podName: string;
    namespace: string;
    previousRestartCount: number;
    restartCount: number;
    state: PodSemanticState;
    rawState: string;
    pod: k8s.V1Pod;
  }): void {
    const serviceId =
      this.getServiceId(pod);

    const restartDelta =
      restartCount -
      previousRestartCount;

    this.eventBus.publishEvent({
      id:
        `k8s-pod-restart-` +
        `${pod.metadata?.uid ?? podName}-` +
        `${Date.now()}`,

      type:
        'KUBERNETES_POD_RESTART',

      provider:
        'kubernetes',

      organizationId:
        this.getOrganizationId(),

      serviceId,

      timestamp:
        new Date().toISOString(),

      payload: {
        eventType,

        podName,

        namespace,

        previousRestartCount,

        restartCount,

        restartDelta,

        rawState,

        semanticState:
          state,

        phase:
          pod.status?.phase,

        nodeName:
          pod.spec?.nodeName,

        serviceId,

        message:
          `Pod '${podName}' restarted ` +
          `${restartDelta} ` +
          `time(s) since the previous observation`,

        raw: {
          uid:
            pod.metadata?.uid,
        },
      },
    });

    console.log(
      `[Kubernetes] 🚨 Pod restart detected: ` +
      `${namespace}/${podName} ` +
      `${previousRestartCount} → ${restartCount}`,
    );
  }

  /**
   * Publish a meaningful Pod state change.
   */
  private publishPodStateChange({
    eventType,
    podName,
    namespace,
    previousState,
    currentState,
    rawState,
    restartCount,
    pod,
  }: {
    eventType: string;
    podName: string;
    namespace: string;
    previousState?: PodSemanticState;
    currentState: PodSemanticState;
    rawState: string;
    restartCount: number;
    pod: k8s.V1Pod;
  }): void {
    const serviceId =
      this.getServiceId(pod);

    /**
     * Extract Kubernetes waiting reason.
     */
    const waitingContainer =
      pod.status?.containerStatuses?.find(
        (container) =>
          container.state?.waiting,
      );

    const waitingReason =
      waitingContainer
        ?.state
        ?.waiting
        ?.reason;

    const waitingMessage =
      waitingContainer
        ?.state
        ?.waiting
        ?.message;

    this.eventBus.publishEvent({
      id:
        `k8s-pod-state-` +
        `${pod.metadata?.uid ?? podName}-` +
        `${Date.now()}`,

      type:
        'KUBERNETES_POD_STATE_CHANGE',

      provider:
        'kubernetes',

      organizationId:
        this.getOrganizationId(),

      serviceId,

      timestamp:
        new Date().toISOString(),

      payload: {
        eventType,

        podName,

        namespace,

        previousState,

        currentState,

        rawState,

        reason:
          waitingReason ??
          rawState,

        message:
          waitingMessage ??
          `Pod '${podName}' changed ` +
          `from '${previousState ?? 'UNKNOWN'}' ` +
          `to '${currentState}'`,

        restartCount,

        phase:
          pod.status?.phase,

        nodeName:
          pod.spec?.nodeName,

        serviceId,

        containerStatuses:
          pod.status?.containerStatuses?.map(
            (container) => ({
              name:
                container.name,

              ready:
                container.ready,

              restartCount:
                container.restartCount,

              state:
                container.state,
            }),
          ),

        raw: {
          uid:
            pod.metadata?.uid,
        },
      },
    });

    console.log(
      `[Kubernetes] 🚨 Pod state change: ` +
      `${namespace}/${podName} ` +
      `${previousState ?? 'UNKNOWN'} → ` +
      `${currentState}` +
      ` [raw: ${rawState}]`,
    );
  }

  /**
   * Handle Kubernetes Deployment events.
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
      deployment.metadata?.namespace ??
      'default';

    const serviceId =
      this.getServiceId(deployment);

    /**
     * Try to identify the application version.
     */
    const version =
      deployment.spec
        ?.template
        ?.metadata
        ?.labels?.[
      'app.kubernetes.io/version'
      ] ??
      deployment.spec
        ?.template
        ?.metadata
        ?.labels?.[
      'version'
      ] ??
      deployment.spec
        ?.template
        ?.metadata
        ?.labels?.[
      'app'
      ] ??
      'unknown';

    const desiredReplicas =
      deployment.spec?.replicas ?? 0;

    const availableReplicas =
      deployment.status
        ?.availableReplicas ?? 0;

    const readyReplicas =
      deployment.status
        ?.readyReplicas ?? 0;

    const unavailableReplicas =
      deployment.status
        ?.unavailableReplicas ?? 0;

    const updatedReplicas =
      deployment.status
        ?.updatedReplicas ?? 0;

    const revision =
      deployment.metadata
        ?.annotations?.[
      'deployment.kubernetes.io/revision'
      ];

    console.log(
      `[Kubernetes] Deployment ${type}: ` +
      `${namespace}/${deploymentName}`,
    );

    const deploymentEvent = {
      id:
        `k8s-deployment-` +
        `${deployment.metadata?.uid ?? deploymentName}-` +
        `${Date.now()}`,

      type:
        'KUBERNETES_DEPLOYMENT_CHANGE' as const,

      provider:
        'kubernetes' as const,

      organizationId:
        this.getOrganizationId(),

      serviceId,

      deploymentId:
        deploymentName,

      timestamp:
        new Date().toISOString(),

      payload: {
        eventType: type,

        deploymentId:
          deploymentName,

        serviceId,

        namespace,

        version,

        revision,

        status:
          this.getDeploymentStatus(
            deployment,
          ),

        desiredReplicas,

        availableReplicas,

        readyReplicas,

        unavailableReplicas,

        updatedReplicas,

        generation:
          deployment.metadata
            ?.generation,

        observedGeneration:
          deployment.status
            ?.observedGeneration,

        message:
          `Deployment '${deploymentName}' changed`,
      },
    };

    const deploymentKey =
      `${namespace}/${deploymentName}`;

    if (type === 'DELETED') {
      this.currentDeployments.delete(
        deploymentKey,
      );
    } else {
      this.currentDeployments.set(
        deploymentKey,
        deploymentEvent,
      );
    }

    this.eventBus.publishEvent(
      deploymentEvent,
    );
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
      deployment.status
        ?.availableReplicas ?? 0;

    const updated =
      deployment.status
        ?.updatedReplicas ?? 0;

    if (desired === 0) {
      return 'SCALED_TO_ZERO';
    }

    if (
      available === desired &&
      updated === desired
    ) {
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
      labels[
      'app.kubernetes.io/name'
      ] ??
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
      process.env
        .DEPLOYGUARD_ORGANIZATION_ID ??
      'org-acme-corp'
    );
  }

  /**
 * Return the latest known Kubernetes state.
 *
 * This is used by the frontend when it first connects.
 *
 * WebSocket handles future changes.
 * This method handles the initial state.
 */
  public getCurrentState() {
    return {
      deployments:
        Array.from(
          this.currentDeployments.values(),
        ),

      pods:
        Array.from(
          this.currentPods.values(),
        ),

      watching:
        this.isWatching,

      timestamp:
        new Date().toISOString(),
    };
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

    /**
     * Clear observations because they are only valid
     * while this watcher instance is active.
     */
    this.podObservations.clear();

    this.currentPods.clear();
    this.currentDeployments.clear();

    console.log(
      '[Kubernetes Watch API] Watchers stopped',
    );
  }

  /**
   * Return whether Kubernetes observation is active.
   */
  public getWatchingStatus(): boolean {
    return this.isWatching;
  }
}