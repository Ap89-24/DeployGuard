// ============================================================================
// DeployGuard AI - Core Domain Types & Data Transfer Objects
// ============================================================================

export type Environment = 'development' | 'staging' | 'production';
export type ServiceTier = 'tier-1' | 'tier-2' | 'tier-3';
export type ServiceStatus = 'HEALTHY' | 'DEGRADED' | 'OUTAGE' | 'UNKNOWN';
export type DeploymentStatus = 'PENDING' | 'ANALYZING' | 'CANARY' | 'VERIFYING' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
export type RecoveryAction = 'ROLLBACK' | 'FIX_FORWARD' | 'PAUSE' | 'REPAIR' | 'SCALE' | 'ESCALATE';
export type DecisionStatus = 'PROPOSED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'EXPIRED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'sre' | 'developer';
  organizationId: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: string;
}

export interface Cluster {
  id: string;
  name: string;
  environment: Environment;
  region: string;
  provider: string;
  organizationId: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  tier: ServiceTier;
  repoUrl?: string;
  ownerTeam?: string;
  language?: string;
  status: ServiceStatus;
  createdAt: string;
}

export interface DependencyRelation {
  fromServiceId: string;
  toServiceId: string;
  protocol: string;
  isCritical: boolean;
  weight?: number;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  branch: string;
}

export interface Deployment {
  id: string;
  version: string;
  status: DeploymentStatus;
  environment: Environment;
  startedAt: string;
  finishedAt?: string;
  canaryWeight?: number;
  gitSha: string;
  serviceId: string;
  clusterId: string;
}

export interface Evidence {
  id: string;
  type: 'git' | 'metric' | 'log' | 'trace' | 'k8s_event' | 'alert' | 'deployment';
  source: string;
  timestamp: string;
  serviceId?: string;
  deploymentId?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  value: string;
  metadata?: Record<string, any>;
  confidence: number;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  summary: string;
  rootCauseHypothesis?: string;
  status: IncidentStatus;
  embedding?: number[]; // 768 float array
  createdAt: string;
}

export interface Decision {
  id: string;
  action: RecoveryAction;
  confidence: number;
  rationale: string;
  safetyScore: number;
  status: DecisionStatus;
  createdAt: string;
}

export interface Approval {
  id: string;
  approver: string;
  status: ApprovalStatus;
  comment?: string;
  timestamp: string;
}

export interface VectorSearchResult {
  incident: Incident;
  similarityScore: number;
}

export interface UpstreamDependent {
  service: Service;
  distance: number;
  path: string[];
  isCriticalPath: boolean;
}

export interface DownstreamDependency {
  service: Service;
  distance: number;
  path: string[];
  protocol: string;
}

export interface BlastRadiusResult {
  targetService: Service;
  upstreamDependentsCount: number;
  upstreamServices: UpstreamDependent[];
  downstreamDependenciesCount: number;
  downstreamServices: DownstreamDependency[];
  tier1ImpactedCount: number;
  maxDependencyDepth: number;
  blastRadiusScore: number; // 0.0 to 1.0
  summary: string;
}

export interface RollbackSafetyOutput {
  safe: boolean;
  score: number; // 0 to 100
  blockers: string[];
  warnings: string[];
}
