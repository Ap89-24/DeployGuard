// ============================================================================
// DeployGuard AI - Multi-Tenant Graph Seeding Script
// ============================================================================

// ============================================================================
// ORGANIZATION
// ============================================================================

MERGE (o1:Organization {
  id: "org-acme-corp"
})
SET
  o1.name = "Acme Enterprise SaaS",
  o1.plan = "enterprise",
  o1.createdAt = "2026-01-01T00:00:00Z";


// ============================================================================
// PROJECT
// ============================================================================

MERGE (p1:Project {
  id: "proj-ecommerce"
})
SET
  p1.name = "E-Commerce Platform Core",
  p1.description = "Retail checkout and payment microservices cluster",
  p1.createdAt = "2026-01-01T00:00:00Z";

MERGE (p1)-[:BELONGS_TO_ORG]->(o1);


// ============================================================================
// PRODUCTION CLUSTER
// ============================================================================

MERGE (cProd:Cluster {
  id: "cluster-prod-us-east-1"
})
SET
  cProd.name = "eks-prod-us-east-1",
  cProd.environment = "production",
  cProd.region = "us-east-1",
  cProd.provider = "AWS EKS",
  cProd.createdAt = "2026-01-15T00:00:00Z";

MERGE (cProd)-[:BELONGS_TO_ORG]->(o1);


// ============================================================================
// PRODUCTION NAMESPACE
// ============================================================================

MERGE (nsProd:Namespace {
  id: "cluster-prod-us-east-1:production"
})
SET
  nsProd.name = "production",
  nsProd.createdAt = "2026-01-15T00:00:00Z";

MERGE (nsProd)-[:BELONGS_TO_CLUSTER]->(cProd);


// ============================================================================
// AUTH SERVICE
// ============================================================================

MERGE (sAuth:Service {
  id: "svc-auth"
})
SET
  sAuth.name = "auth-service",
  sAuth.tier = "tier-1",
  sAuth.repoUrl = "github.com/acme/auth-service",
  sAuth.ownerTeam = "security-identity",
  sAuth.language = "TypeScript",
  sAuth.status = "HEALTHY",
  sAuth.createdAt = "2026-02-01T00:00:00Z";

MERGE (sAuth)-[:BELONGS_TO]->(p1);


// ============================================================================
// PAYMENT SERVICE
// ============================================================================

MERGE (sPayment:Service {
  id: "svc-payment"
})
SET
  sPayment.name = "payment-service",
  sPayment.tier = "tier-1",
  sPayment.repoUrl = "github.com/acme/payment-service",
  sPayment.ownerTeam = "fintech-checkout",
  sPayment.language = "Go",
  sPayment.status = "HEALTHY",
  sPayment.createdAt = "2026-02-01T00:00:00Z";

MERGE (sPayment)-[:BELONGS_TO]->(p1);


// ============================================================================
// CHECKOUT SERVICE
// ============================================================================

MERGE (sCheckout:Service {
  id: "svc-checkout"
})
SET
  sCheckout.name = "checkout-service",
  sCheckout.tier = "tier-1",
  sCheckout.repoUrl = "github.com/acme/checkout-service",
  sCheckout.ownerTeam = "web-experience",
  sCheckout.language = "TypeScript",
  sCheckout.status = "HEALTHY",
  sCheckout.createdAt = "2026-02-01T00:00:00Z";

MERGE (sCheckout)-[:BELONGS_TO]->(p1);


// ============================================================================
// INVENTORY SERVICE
// ============================================================================

MERGE (sInventory:Service {
  id: "svc-inventory"
})
SET
  sInventory.name = "inventory-service",
  sInventory.tier = "tier-2",
  sInventory.repoUrl = "github.com/acme/inventory-service",
  sInventory.ownerTeam = "logistics-warehouse",
  sInventory.language = "Java",
  sInventory.status = "HEALTHY",
  sInventory.createdAt = "2026-02-01T00:00:00Z";

MERGE (sInventory)-[:BELONGS_TO]->(p1);


// ============================================================================
// SERVICE DEPENDENCIES
// ============================================================================

MERGE (sCheckout)-[:DEPENDS_ON {
  protocol: "gRPC",
  isCritical: true,
  weight: 1.0
}]->(sPayment);

MERGE (sCheckout)-[:DEPENDS_ON {
  protocol: "HTTP",
  isCritical: false,
  weight: 0.7
}]->(sInventory);

MERGE (sPayment)-[:DEPENDS_ON {
  protocol: "gRPC",
  isCritical: true,
  weight: 1.0
}]->(sAuth);


// ============================================================================
// PRODUCTION DEPLOYMENTS
// ============================================================================

MERGE (dAuth:Deployment {
  id: "org-acme-corp:production:auth-service"
})
SET
  dAuth.name = "auth-service",
  dAuth.namespace = "production",
  dAuth.status = "HEALTHY",
  dAuth.environment = "production",
  dAuth.desiredReplicas = 3,
  dAuth.availableReplicas = 3,
  dAuth.readyReplicas = 3,
  dAuth.unavailableReplicas = 0,
  dAuth.createdAt = "2026-02-01T00:00:00Z";

MERGE (dAuth)-[:DEPLOYED_TO]->(cProd);
MERGE (dAuth)-[:DEPLOYED_SERVICE]->(sAuth);


MERGE (dPayment:Deployment {
  id: "org-acme-corp:production:payment-service"
})
SET
  dPayment.name = "payment-service",
  dPayment.namespace = "production",
  dPayment.status = "HEALTHY",
  dPayment.environment = "production",
  dPayment.desiredReplicas = 3,
  dPayment.availableReplicas = 3,
  dPayment.readyReplicas = 3,
  dPayment.unavailableReplicas = 0,
  dPayment.createdAt = "2026-02-01T00:00:00Z";

MERGE (dPayment)-[:DEPLOYED_TO]->(cProd);
MERGE (dPayment)-[:DEPLOYED_SERVICE]->(sPayment);


MERGE (dCheckout:Deployment {
  id: "org-acme-corp:production:checkout-service"
})
SET
  dCheckout.name = "checkout-service",
  dCheckout.namespace = "production",
  dCheckout.status = "HEALTHY",
  dCheckout.environment = "production",
  dCheckout.desiredReplicas = 3,
  dCheckout.availableReplicas = 3,
  dCheckout.readyReplicas = 3,
  dCheckout.unavailableReplicas = 0,
  dCheckout.createdAt = "2026-02-01T00:00:00Z";

MERGE (dCheckout)-[:DEPLOYED_TO]->(cProd);
MERGE (dCheckout)-[:DEPLOYED_SERVICE]->(sCheckout);


MERGE (dInventory:Deployment {
  id: "org-acme-corp:production:inventory-service"
})
SET
  dInventory.name = "inventory-service",
  dInventory.namespace = "production",
  dInventory.status = "HEALTHY",
  dInventory.environment = "production",
  dInventory.desiredReplicas = 3,
  dInventory.availableReplicas = 3,
  dInventory.readyReplicas = 3,
  dInventory.unavailableReplicas = 0,
  dInventory.createdAt = "2026-02-01T00:00:00Z";

MERGE (dInventory)-[:DEPLOYED_TO]->(cProd);
MERGE (dInventory)-[:DEPLOYED_SERVICE]->(sInventory);