// ============================================================================
// DeployGuard AI - Real-Time WebSockets Server & Event Stream
// Broadcasts live incident lifecycle events to the React Dashboard
// ============================================================================

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EventBus } from '../events/event-bus.js';
import { BaseDomainEvent } from '../events/event-types.js';

export class DeployGuardWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupListeners();
  }

  private setupListeners(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WebSocket Server] React Client connected to live event stream.');
      this.clients.add(ws);

      // Send initial welcome handshaking message
      ws.send(JSON.stringify({
        type: 'SYSTEM_CONNECTED',
        timestamp: new Date().toISOString(),
        message: 'Connected to DeployGuard AI Live Incident Lifecycle Stream',
      }));

      ws.on('close', () => {
        console.log('[WebSocket Server] Client disconnected.');
        this.clients.delete(ws);
      });
    });

    // Subscribe to EventBus wildcard events and broadcast to all connected WebSocket clients
    const eventBus = EventBus.getInstance();
    eventBus.subscribeToEvent('*', (event: BaseDomainEvent) => {
      this.broadcast(event);
    });
  }

  public broadcast(event: any): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }
}
