// ============================================================================
// DeployGuard AI - Multi-Tenant Graph Seeding Script
// ============================================================================

MERGE (o1:Organization {
  id: "org-acme-corp",
  name: "Acme Enterprise SaaS",
  plan: "enterprise",
  createdAt: "2026-01-01T00:00:00Z"
})

MERGE (p1:Project {
  id: "proj-ecommerce",
  name: "E-Commerce Platform Core",
  description: "Retail checkout and payment microservices cluster",
  createdAt: "2026-01-01T00:00:00Z"
})-[:BELONGS_TO_ORG]->(o1)

MERGE (cProd:Cluster {
  id: "cluster-prod-us-east-1",
  name: "eks-prod-us-east-1",
  environment: "production",
  region: "us-east-1",
  provider: "AWS EKS",
  createdAt: "2026-01-15T00:00:00Z"
})-[:BELONGS_TO_ORG]->(o1)

MERGE (sAuth:Service {
  id: "svc-auth",
  name: "auth-service",
  tier: "tier-1",
  repoUrl: "github.com/acme/auth-service",
  ownerTeam: "security-identity",
  language: "TypeScript",
  status: "HEALTHY",
  createdAt: "2026-02-01T00:00:00Z"
})-[:BELONGS_TO]->(p1)

MERGE (sPayment:Service {
  id: "svc-payment",
  name: "payment-service",
  tier: "tier-1",
  repoUrl: "github.com/acme/payment-service",
  ownerTeam: "fintech-checkout",
  language: "Go",
  status: "HEALTHY",
  createdAt: "2026-02-01T00:00:00Z"
})-[:BELONGS_TO]->(p1)

MERGE (sCheckout:Service {
  id: "svc-checkout",
  name: "checkout-service",
  tier: "tier-1",
  repoUrl: "github.com/acme/checkout-service",
  ownerTeam: "web-experience",
  language: "TypeScript",
  status: "HEALTHY",
  createdAt: "2026-02-01T00:00:00Z"
})-[:BELONGS_TO]->(p1)

MERGE (sInventory:Service {
  id: "svc-inventory",
  name: "inventory-service",
  tier: "tier-2",
  repoUrl: "github.com/acme/inventory-service",
  ownerTeam: "logistics-warehouse",
  language: "Java",
  status: "HEALTHY",
  createdAt: "2026-02-01T00:00:00Z"
})-[:BELONGS_TO]->(p1)

// Service Dependencies (DEPENDS_ON)
MERGE (sCheckout)-[:DEPENDS_ON { protocol: "gRPC", isCritical: true, weight: 1.0 }]->(sPayment)
MERGE (sCheckout)-[:DEPENDS_ON { protocol: "HTTP", isCritical: false, weight: 0.7 }]->(sInventory)
MERGE (sPayment)-[:DEPENDS_ON { protocol: "gRPC", isCritical: true, weight: 1.0 }]->(sAuth)
