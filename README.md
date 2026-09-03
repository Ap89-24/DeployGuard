# DeployGuard AI — Production SaaS Decision & Recovery Platform

DeployGuard AI is an evidence-driven deployment safety and recovery decision layer for Kubernetes workloads. It integrates real GitHub repositories, Kubernetes clusters, Argo Rollouts, Prometheus, Loki, OpenTelemetry, and CI/CD pipelines with pure **Neo4j** graph memory (768-dimensional Cosine Vector Index), a **LangGraph** workflow engine, and an **Enterprise SaaS Control Plane** UI.

---

## 🎨 Enterprise SaaS Control Plane UI

Features an enterprise-grade SaaS navigation architecture:
- **Tenant Sidebar**: Multi-tenant organization switcher (`Acme Corp`), user profile (`sre-lead@acme.com`), and real-time alert badges.
- **Top Command Header Bar**: Global `Cmd + K` search bar, cluster health indicator (`eks-prod-us-east-1`), and incident simulation trigger.
- **Mission Control Overview**: High-density metric scorecards, interactive SVG topology graph, blast radius reachability gauge, and 768d vector memory search sandbox.
- **Incidents & RCA Workbench**: Chronological evidence timeline (`IncidentsPage.tsx`) aggregating Prometheus metric spikes, Loki log exceptions, and K8s pod restarts.
- **SRE Human Approval Queue**: Dedicated approval review interface for safety decisions before Argo execution.

---

## 🏗 Architecture & Workspace Layout

```
d:/DeployGuard/
├── backend/
│   ├── cypher/
│   │   ├── schema.cypher          # Constraints, property indexes, 768d vector index
│   │   └── seed.cypher            # Seed topology & incident embeddings
│   ├── src/
│   │   ├── config/
│   │   │   └── neo4j.ts           # Neo4j driver connection pool & session wrapper
│   │   ├── types/
│   │   │   └── domain.ts          # TypeScript domain models & DTOs
│   │   ├── db/
│   │   │   ├── schema-init.ts     # Programmatic schema & vector index initializer
│   │   │   └── seed-db.ts         # Graph seeder
│   │   ├── repositories/          # Graph Repositories (Project, Service, Deployment, Incident, Decision, BlastRadius, RollbackSafety)
│   │   ├── adapters/              # Integration Adapters (GitHub, K8s, Argo, Prometheus, Loki, OTel)
│   │   ├── utils/
│   │   │   └── vector.ts          # 768d vector math & Cosine distance
│   │   ├── workflows/
│   │   │   └── incident-response.workflow.ts # 17-Node LangGraph StateGraph pipeline
│   │   ├── server.ts              # Express API Gateway (/api/v1/*)
│   │   └── demo.ts                # End-to-end backend verification demo
│   └── package.json
├── frontend/                      # REACT + VITE ENTERPRISE SAAS DASHBOARD
│   ├── src/
│   │   ├── App.tsx                # Enterprise Control Plane Layout
│   │   ├── components/            # Sidebar, TopNav, IncidentsPage, TopologyGraph, BlastRadiusVisualizer, VectorMemorySearch, LangGraphWorkflowTrace, IntegrationsPage, ApprovalModal
│   │   └── index.css              # Cyber-Orchestrator SaaS Design System Rules
│   └── package.json
└── docker-compose.yml                 # Docker Compose local dev stack
```

---

## ⚡ Quickstart Commands

```bash
# 1. Initialize Neo4j Schema & 768d Vector Index
cd backend
npm run init-db

# 2. Seed Microservices Graph Topology
npm run seed

# 3. Start Backend API Server (Port 4000)
npm run dev

# 4. Start Frontend UI Control Plane (Port 5173)
cd ../frontend
npm run dev
```

Visit the Enterprise SaaS UI at **`http://localhost:5173`**.
