// ============================================================================
// DeployGuard AI - Real-Time WebSockets Server & Event Stream
// Broadcasts live incident lifecycle events to the React Dashboard
// ============================================================================

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EventBus } from '../events/event-bus.js';
import { BaseDomainEvent } from '../events/event-types.js';

export class DeployGuardWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log(
        '[WebSocket Server] React Client connected to live event stream.',
      );

      this.clients.add(ws);

      // Initial connection message
      this.send(ws, {
        type: 'SYSTEM_CONNECTED',
        timestamp: new Date().toISOString(),
        message:
          'Connected to DeployGuard AI Live Incident Lifecycle Stream',
      });

      ws.on('close', () => {
        console.log(
          '[WebSocket Server] Client disconnected.',
        );

        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error(
          '[WebSocket Server] Client error:',
          error,
        );

        this.clients.delete(ws);
      });
    });

    const eventBus = EventBus.getInstance();

    eventBus.subscribeToEvent(
      '*',
      (event: BaseDomainEvent) => {
        this.broadcast(event);
      },
    );
  }

  private send(
    ws: WebSocket,
    payload: unknown,
  ): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  public broadcast(event: BaseDomainEvent): void {
    const message = JSON.stringify({
      type: 'DEPLOYGUARD_EVENT',
      timestamp: new Date().toISOString(),
      event,
    });

    let sent = 0;

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sent++;
      }
    }

    console.log(
      `[WebSocket Server] Broadcasted '${event.type}' to ${sent} client(s)`,
    );
  }

  public getClientCount(): number {
    return this.clients.size;
  }
}
