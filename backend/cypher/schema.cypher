// ============================================================================
// DeployGuard AI - Neo4j Multi-Tenant Graph & Vector Store Schema
// Engine: Neo4j 5.x+
// Vector Index: 768-dimensional float embeddings using Cosine Distance
// ============================================================================

// ----------------------------------------------------------------------------
// 1. MULTI-TENANT UNIQUENESS CONSTRAINTS
// Enforce primary key uniqueness across all domain entities.
// ----------------------------------------------------------------------------

CREATE CONSTRAINT org_id_unique IF NOT EXISTS
FOR (o:Organization) REQUIRE o.id IS UNIQUE;

CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT project_id_unique IF NOT EXISTS
FOR (p:Project) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT cluster_id_unique IF NOT EXISTS
FOR (c:Cluster) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT service_id_unique IF NOT EXISTS
FOR (s:Service) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT repo_id_unique IF NOT EXISTS
FOR (r:Repository) REQUIRE r.id IS UNIQUE;

CREATE CONSTRAINT deployment_id_unique IF NOT EXISTS
FOR (d:Deployment) REQUIRE d.id IS UNIQUE;

CREATE CONSTRAINT commit_sha_unique IF NOT EXISTS
FOR (cm:Commit) REQUIRE cm.sha IS UNIQUE;

CREATE CONSTRAINT evidence_id_unique IF NOT EXISTS
FOR (e:Evidence) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT incident_id_unique IF NOT EXISTS
FOR (i:Incident) REQUIRE i.id IS UNIQUE;

CREATE CONSTRAINT decision_id_unique IF NOT EXISTS
FOR (dec:Decision) REQUIRE dec.id IS UNIQUE;

CREATE CONSTRAINT approval_id_unique IF NOT EXISTS
FOR (a:Approval) REQUIRE a.id IS UNIQUE;

// ----------------------------------------------------------------------------
// 2. RANGE & PROPERTY INDEXES
// Optimize graph search traversal performance.
// ----------------------------------------------------------------------------

CREATE INDEX deployment_started_at_idx IF NOT EXISTS
FOR (d:Deployment) ON (d.startedAt);

CREATE INDEX deployment_status_idx IF NOT EXISTS
FOR (d:Deployment) ON (d.status);

CREATE INDEX incident_status_idx IF NOT EXISTS
FOR (i:Incident) ON (i.status);

CREATE INDEX incident_created_at_idx IF NOT EXISTS
FOR (i:Incident) ON (i.createdAt);

CREATE INDEX service_tier_idx IF NOT EXISTS
FOR (s:Service) ON (s.tier);

// ----------------------------------------------------------------------------
// 3. OPERATIONAL INCIDENT VECTOR MEMORY INDEX
// 768-dimensional float vector index on Incident.embedding using Cosine similarity.
// ----------------------------------------------------------------------------

CREATE VECTOR INDEX incident_embedding_idx IF NOT EXISTS
FOR (i:Incident) ON (i.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 768,
    `vector.similarity_function`: 'cosine'
  }
};
