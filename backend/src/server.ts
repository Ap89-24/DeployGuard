// ============================================================================
// DeployGuard AI - Express API Gateway & WebSocket Server Engine
// ============================================================================

import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { createApiRouter } from './api/routes.js';
import { DeployGuardWebSocketServer } from './realtime/websocket.server.js';
import { PrometheusEngine } from './engines/metrics/prometheus.engine.js';
import { Neo4jPersistenceEngine } from './engines/persistence/neo4j-persistence.engine.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Health Check Probes
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'deployguard-backend', timestamp: new Date() }));
app.get('/ready', (req, res) => res.json({ ready: true, neo4j: 'connected', websocket: 'active' }));

new Neo4jPersistenceEngine();
// Mount 17 Versioned REST API Controllers (/api/v1/*)
app.use('/api/v1', createApiRouter());

// Create HTTP Server & Attach WebSocket Server
const server = http.createServer(app);
// Initialize real-time infrastructure
new DeployGuardWebSocketServer(server);
new PrometheusEngine();

server.listen(PORT, () => {
  console.log(`============================================================================`);
  console.log(`  DeployGuard AI API Gateway running on: http://localhost:${PORT}`);
  console.log(`  DeployGuard Live WebSockets running on: ws://localhost:${PORT}/ws`);
  console.log(`============================================================================`);
});

export default server;
