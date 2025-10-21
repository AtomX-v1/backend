import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createJupiterRoutes } from './routes/jupiterRoute';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/jupiter', createJupiterRoutes());

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    timestamp: Date.now(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   AtomX Jupiter Backend                ║
╠════════════════════════════════════════╣
║  Status: Running                       ║
║  Port: ${PORT}                            ║
║  Cluster: Devnet                       ║
╠════════════════════════════════════════╣
║  Endpoints:                            ║
║  • GET  /api/jupiter/quote             ║
║  • POST /api/jupiter/swap-instructions ║
║  • GET  /api/jupiter/route-map         ║
║  • GET  /api/jupiter/tokens            ║
║  • GET  /health                        ║
╚════════════════════════════════════════╝
  `);
});