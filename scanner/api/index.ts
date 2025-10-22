import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import scannerRoutes from './routes';

const app = express();

// Middleware
app.use(cors({
  origin: true, // Allow all origins for Vercel deployment
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

// WebSocket stats endpoint (simplified for serverless)
app.get('/api/ws/stats', (req, res) => {
  res.json({
    status: 'Serverless deployment - WebSocket not available',
    timestamp: new Date().toISOString()
  });
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

// Export for Vercel
export default (req: VercelRequest, res: VercelResponse) => {
  return app(req as any, res as any);
};