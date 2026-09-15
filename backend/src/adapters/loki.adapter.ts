// ============================================================================
// DeployGuard AI - Loki LogQL Integration Adapter
// Queries log streams over +/- 5 minute window and filters exceptions
// ============================================================================

export interface LokiLogEntry {
  timestamp: string;
  line: string;
  labels: Record<string, string>;
}

interface LokiStream {
  stream: Record<string, string>;
  values: [string, string][];
}

interface LokiQueryResponse {
  status: "success" | "error";
  data?: {
    resultType: "streams" | "matrix" | "vector" | "scalar";
    result: LokiStream[];
  };
  errorType?: string;
  error?: string;
}

export class LokiAdapter {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (
      baseUrl ||
      process.env.LOKI_URL ||
      "http://localhost:3100"
    ).replace(/\/$/, "");
  }

  /**
   * Query Loki for logs around an incident timestamp.
   *
   * The query searches Kubernetes logs whose service/pod/container
   * metadata matches the supplied service name.
   */
  async queryIncidentLogs(
    serviceName: string,
    incidentTimestamp: Date | string = new Date(),
    windowMinutes: number = 5
  ): Promise<string[]> {
    const entries = await this.queryLogs(
      serviceName,
      incidentTimestamp,
      windowMinutes
    );

    return entries.map((entry) => entry.line);
  }

  /**
   * Query Loki and return structured log evidence.
   */
  async queryLogs(
    serviceName: string,
    incidentTimestamp: Date | string = new Date(),
    windowMinutes: number = 5
  ): Promise<LokiLogEntry[]> {
    const timestamp = new Date(incidentTimestamp);

    if (Number.isNaN(timestamp.getTime())) {
      throw new Error(`Invalid incident timestamp: ${incidentTimestamp}`);
    }

    if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) {
      throw new Error("windowMinutes must be greater than 0");
    }

    const halfWindowMs = windowMinutes * 60 * 1000;

    const start = new Date(timestamp.getTime() - halfWindowMs);
    const end = new Date(timestamp.getTime() + halfWindowMs);

    /*
     * We intentionally use a content/metadata filter instead of assuming
     * a specific Loki label such as {app="..."} because the current Alloy
     * configuration does not promote every Kubernetes metadata field into
     * Loki labels.
     *
     * The query therefore works with the labels currently produced by Alloy
     * and can later be made more selective when namespace/pod/app labels
     * are promoted.
     */
    const escapedServiceName = this.escapeLogQLString(serviceName);

    const query = `{cluster="${this.getClusterLabel()}"} |= "${escapedServiceName}"`;

    const params = new URLSearchParams({
      query,
      start: start.getTime().toString() + "000000",
      end: end.getTime().toString() + "000000",
      limit: "500",
      direction: "backward",
    });

    const url = `${this.baseUrl}/loki/api/v1/query_range?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();

      throw new Error(
        `Loki query failed (${response.status} ${response.statusText}): ${body}`
      );
    }

    const data = (await response.json()) as LokiQueryResponse;

    if (data.status !== "success") {
      throw new Error(
        `Loki query returned an error: ${data.errorType || "unknown"} ${
          data.error || ""
        }`.trim()
      );
    }

    if (!data.data || data.data.resultType !== "streams") {
      return [];
    }

    return this.flattenStreams(data.data.result);
  }

  /**
   * Check whether Loki is reachable.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ready`, {
        method: "GET",
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Convert Loki streams into a simple evidence format.
   */
  private flattenStreams(streams: LokiStream[]): LokiLogEntry[] {
    const entries: LokiLogEntry[] = [];

    for (const stream of streams) {
      for (const [timestamp, line] of stream.values) {
        entries.push({
          timestamp: this.nanoTimestampToISOString(timestamp),
          line,
          labels: stream.stream,
        });
      }
    }

    return entries.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime()
    );
  }

  /**
   * Loki timestamps are represented in nanoseconds.
   */
  private nanoTimestampToISOString(timestamp: string): string {
    const nanoseconds = BigInt(timestamp);

    const milliseconds = nanoseconds / 1_000_000n;

    return new Date(Number(milliseconds)).toISOString();
  }

  /**
   * Escape characters that have special meaning inside a LogQL
   * quoted string.
   */
  private escapeLogQLString(value: string): string {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
  }

  /**
   * Cluster label added by the current Alloy configuration.
   */
  private getClusterLabel(): string {
    return process.env.DEPLOYGUARD_CLUSTER_ID || "cluster-docker-desktop";
  }
}
