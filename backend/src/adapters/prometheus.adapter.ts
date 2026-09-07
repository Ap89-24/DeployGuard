// ============================================================================
// DeployGuard AI - Real Prometheus PromQL Metrics Adapter
// ============================================================================

export interface DeploymentHealthMetrics {
  namespace: string;
  deployment: string;

  desiredReplicas: number;
  availableReplicas: number;
  readyReplicas: number;
  unavailableReplicas: number;

  healthStatus: "HEALTHY" | "DEGRADED" | "UNKNOWN";
  queriedAt: string;
}

export interface PodRestartMetrics {
  namespace: string;
  deployment: string;

  totalRestarts: number;

  pods: Array<{
    pod: string;
    container: string;
    restartCount: number;
  }>;

  queriedAt: string;
}

interface PrometheusResponse {
  status: "success" | "error";
  data?: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value: [number, string];
    }>;
  };
  errorType?: string;
  error?: string;
}

export class PrometheusAdapter {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ||
      process.env.PROMETHEUS_URL ||
      "http://localhost:9090";
  }

  /**
   * Execute an instant PromQL query.
   */
  private async queryPrometheus(
    query: string
  ): Promise<PrometheusResponse["data"]> {
    const url = new URL("/api/v1/query", this.baseUrl);

    url.searchParams.set("query", query);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `Prometheus request failed: ${response.status} ${response.statusText}`
      );
    }

    const body = (await response.json()) as PrometheusResponse;

    if (body.status !== "success" || !body.data) {
      throw new Error(
        `Prometheus query failed: ${body.error || "Unknown error"}`
      );
    }

    return body.data;
  }

  /**
   * Get deployment replica health from kube-state-metrics.
   */
  async queryDeploymentHealth(
    namespace: string,
    deployment: string
  ): Promise<DeploymentHealthMetrics> {
    const [
      desired,
      available,
      ready,
      unavailable,
    ] = await Promise.all([
      this.queryPrometheus(`
        kube_deployment_spec_replicas{
          namespace="${namespace}",
          deployment="${deployment}"
        }
      `),

      this.queryPrometheus(`
        kube_deployment_status_replicas_available{
          namespace="${namespace}",
          deployment="${deployment}"
        }
      `),

      this.queryPrometheus(`
        kube_deployment_status_replicas_ready{
          namespace="${namespace}",
          deployment="${deployment}"
        }
      `),

      this.queryPrometheus(`
        kube_deployment_status_replicas_unavailable{
          namespace="${namespace}",
          deployment="${deployment}"
        }
      `),
    ]);

    const desiredReplicas = this.getMetricValue(desired);
    const availableReplicas = this.getMetricValue(available);
    const readyReplicas = this.getMetricValue(ready);
    const unavailableReplicas = this.getMetricValue(unavailable);

    let healthStatus: DeploymentHealthMetrics["healthStatus"];

    if (
      desiredReplicas === null ||
      availableReplicas === null ||
      readyReplicas === null
    ) {
      healthStatus = "UNKNOWN";
    } else if (
      availableReplicas < desiredReplicas ||
      readyReplicas < desiredReplicas ||
      (unavailableReplicas ?? 0) > 0
    ) {
      healthStatus = "DEGRADED";
    } else {
      healthStatus = "HEALTHY";
    }

    return {
      namespace,
      deployment,

      desiredReplicas: desiredReplicas ?? 0,
      availableReplicas: availableReplicas ?? 0,
      readyReplicas: readyReplicas ?? 0,
      unavailableReplicas: unavailableReplicas ?? 0,

      healthStatus,
      queriedAt: new Date().toISOString(),
    };
  }

  /**
   * Get container restart counts for pods belonging to a deployment.
   */
  async queryPodRestarts(
    namespace: string,
    deployment: string
  ): Promise<PodRestartMetrics> {
    const query = `
      kube_pod_container_status_restarts_total{
        namespace="${namespace}",
        pod=~"${deployment}-.*"
      }
    `;

    const data = await this.queryPrometheus(query);

    const pods = data?.result.map((result) => ({
      pod: result.metric.pod,
      container: result.metric.container,
      restartCount: Number(result.value[1]),
    })) ?? [];

    const totalRestarts = pods.reduce(
      (total, pod) => total + pod.restartCount,
      0
    );

    return {
      namespace,
      deployment,
      totalRestarts,
      pods,
      queriedAt: new Date().toISOString(),
    };
  }

  /**
   * Simple Prometheus connectivity check.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.queryPrometheus("up");
      return true;
    } catch (error) {
      console.error("[PrometheusAdapter] Health check failed:", error);
      return false;
    }
  }

  /**
   * Safely extract a single Prometheus metric value.
   */
  private getMetricValue(
    data: PrometheusResponse["data"]
  ): number | null {
    const result = data?.result?.[0];

    if (!result) {
      return null;
    }

    const value = Number(result.value[1]);

    return Number.isFinite(value) ? value : null;
  }
}