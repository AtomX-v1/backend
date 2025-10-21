import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';

interface Client {
  ws: WebSocket;
  id: string;
  connectedAt: Date;
}

class ScannerWebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Client> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;

  public setup(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/scanner'
    });

    console.log('[WS] Scanner WebSocket server initialized');

    this.wss.on('connection', (ws, request) => {
      const clientId = this.generateClientId();
      const client: Client = {
        ws,
        id: clientId,
        connectedAt: new Date()
      };

      this.clients.set(clientId, client);
      console.log(`[WS] Client connected: ${clientId} (Total: ${this.clients.size})`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connected',
        clientId,
        timestamp: Date.now(),
        message: 'Connected to AtomX Scanner WebSocket'
      });

      // Handle client messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error(`[WS] Invalid message from ${clientId}:`, error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[WS] Client disconnected: ${clientId} (Total: ${this.clients.size})`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WS] Client error ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });

    // Start broadcasting updates every 30 seconds
    this.startBroadcasting();
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleClientMessage(clientId: string, message: any): void {
    console.log(`[WS] Message from ${clientId}:`, message);

    switch (message.type) {
      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          timestamp: Date.now()
        });
        break;

      case 'subscribe':
        // Client wants to subscribe to specific updates
        this.sendToClient(clientId, {
          type: 'subscribed',
          subscription: message.subscription || 'all',
          timestamp: Date.now()
        });
        break;

      default:
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Unknown message type',
          timestamp: Date.now()
        });
    }
  }

  private sendToClient(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(data));
      } catch (error) {
        console.error(`[WS] Error sending to ${clientId}:`, error);
        this.clients.delete(clientId);
      }
    }
  }

  public broadcast(data: any): void {
    const message = JSON.stringify(data);
    let sent = 0;
    let failed = 0;

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
          sent++;
        } catch (error) {
          console.error(`[WS] Error broadcasting to ${clientId}:`, error);
          this.clients.delete(clientId);
          failed++;
        }
      } else {
        this.clients.delete(clientId);
        failed++;
      }
    });

    if (sent > 0) {
      console.log(`[WS] Broadcasted to ${sent} clients ${failed > 0 ? `(${failed} failed)` : ''}`);
    }
  }

  public broadcastOpportunities(opportunities: any[]): void {
    this.broadcast({
      type: 'opportunities',
      data: opportunities,
      count: opportunities.length,
      timestamp: Date.now()
    });
  }

  public broadcastScannerStatus(status: any): void {
    this.broadcast({
      type: 'status',
      data: status,
      timestamp: Date.now()
    });
  }

  public broadcastScanStart(): void {
    this.broadcast({
      type: 'scan_start',
      timestamp: Date.now(),
      message: 'Arbitrage scan started'
    });
  }

  public broadcastScanComplete(opportunities: any[]): void {
    this.broadcast({
      type: 'scan_complete',
      opportunities,
      count: opportunities.length,
      timestamp: Date.now(),
      message: `Scan completed: ${opportunities.length} opportunities found`
    });
  }

  public broadcastLog(logEntry: any): void {
    this.broadcast({
      type: 'log',
      data: logEntry,
      timestamp: Date.now()
    });
  }

  private startBroadcasting(): void {
    // Broadcast every 30 seconds
    this.broadcastInterval = setInterval(() => {
      if (this.clients.size > 0) {
        this.broadcast({
          type: 'heartbeat',
          connectedClients: this.clients.size,
          timestamp: Date.now()
        });
      }
    }, 30000);

    console.log('[WS] Broadcasting started (30s interval)');
  }

  public stop(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    console.log('[WS] WebSocket server stopped');
  }

  public getStats(): any {
    return {
      connectedClients: this.clients.size,
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        connectedAt: client.connectedAt,
        connected: client.ws.readyState === WebSocket.OPEN
      }))
    };
  }
}

// Export singleton instance
export const scannerWebSocket = new ScannerWebSocketManager();