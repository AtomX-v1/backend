import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import scannerRoutes from './routes';
import { scannerWebSocket } from './websocket';

const app = express();
const PORT = process.env.PORT || process.env.SCANNER_PORT || 3002;

// Middleware
app.use(cors({
  origin: true, // Allow all origins for production
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[API] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'AtomX Arbitrage Scanner API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Scanner API routes
app.use('/api/scanner', scannerRoutes);

// WebSocket stats endpoint
app.get('/api/ws/stats', (req, res) => {
  res.json(scannerWebSocket.getStats());
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API] Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const server = createServer(app);

// Setup WebSocket
scannerWebSocket.setup(server);

// Start server
server.listen(PORT, () => {
  console.log(`[SERVER] ========================================`);
  console.log(`[SERVER] AtomX Arbitrage Scanner API`);
  console.log(`[SERVER] ========================================`);
  console.log(`[SERVER] HTTP Server: http://localhost:${PORT}`);
  console.log(`[SERVER] WebSocket: ws://localhost:${PORT}/ws/scanner`);
  console.log(`[SERVER] Health Check: http://localhost:${PORT}/health`);
  console.log(`[SERVER] ========================================`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SERVER] Received SIGINT. Graceful shutdown...');
  
  scannerWebSocket.stop();
  
  server.close(() => {
    console.log('[SERVER] HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[SERVER] Received SIGTERM. Graceful shutdown...');
  
  scannerWebSocket.stop();
  
  server.close(() => {
    console.log('[SERVER] HTTP server closed');
    process.exit(0);
  });
});

export { app, server };