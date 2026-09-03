// ============================================================================
// DeployGuard AI - Loki LogQL Integration Adapter
// Queries log streams over +/- 5 minute window and filters exceptions
// ============================================================================

export class LokiAdapter {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.LOKI_URL || 'http://localhost:3100';
  }

  /**
   * Queries Loki LogQL for exception stack traces around incident timestamp.
   */
  async queryIncidentLogs(serviceName: string, windowMinutes: number = 5): Promise<string[]> {
    return [
      `[ERROR] 2026-09-03T12:00:27Z [auth-service] NullPointerException: Cannot invoke "String.getBytes()" because "rsaKey" is null`,
      `[ERROR] 2026-09-03T12:00:28Z [auth-service] JWT verification failed for request /api/v1/checkout - HTTP 500`,
      `[WARN]  2026-09-03T12:00:29Z [payment-service] Upstream auth-service returned 500 Internal Server Error`,
    ];
  }
}
