// ============================================================================
// DeployGuard AI - GitHub App & Webhook Integration Adapter
// ============================================================================

import crypto from 'crypto';

export interface GitHubWebhookPayload {
  action?: string;
  repository?: { full_name: string; name: string };
  deployment?: { id: number; sha: string; environment: string };
  deployment_status?: { state: string; description: string };
  pull_request?: { number: number; title: string; head: { sha: string } };
  head_commit?: { id: string; message: string; author: { name: string } };
}

export class GitHubAdapter {
  private webhookSecret: string;

  constructor(webhookSecret?: string) {
    this.webhookSecret = webhookSecret || process.env.WEBHOOK_SECRET || 'github_webhook_secret_key_deployguard';
  }

  /**
   * Verifies HMAC SHA-256 signature from GitHub webhook header `x-hub-signature-256`.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string): boolean {
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }
    const signature = signatureHeader.substring(7);
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = hmac.update(rawBody).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'utf-8'), Buffer.from(digest, 'utf-8'));
  }

  /**
   * Normalizes raw GitHub webhook events into DeployGuard domain model.
   */
  normalizeWebhookEvent(eventType: string, payload: GitHubWebhookPayload) {
    return {
      provider: 'github',
      eventType,
      repoName: payload.repository?.full_name || 'unknown/repo',
      sha: payload.deployment?.sha || payload.pull_request?.head.sha || payload.head_commit?.id || 'sha-unknown',
      commitMessage: payload.head_commit?.message || payload.pull_request?.title || 'Webhook update',
      author: payload.head_commit?.author.name || 'github-actions',
      timestamp: new Date().toISOString(),
    };
  }
}
