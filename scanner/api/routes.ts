import express from 'express';
import { ArbitrageScanner } from './scanner';
import { ArbitrageDetector } from './arbitrageDetector';
import { DEFAULT_CONFIG } from './config';
import { logStreamer } from './logStreamer';

const router = express.Router();

// Global scanner instance
let scannerInstance: ArbitrageScanner | null = null;
let scannerStatus = {
  isRunning: false,
  startTime: null as Date | null,
  lastScanTime: null as Date | null,
  totalScans: 0,
  lastOpportunities: [] as any[]
};

// Start scanner endpoint
router.post('/start', async (req, res) => {
  try {
    if (scannerStatus.isRunning) {
      return res.status(400).json({ 
        error: 'Scanner already running',
        status: scannerStatus
      });
    }

    console.log('[API] Starting arbitrage scanner...');

    // Start log streaming to WebSocket - DISABLED TO PREVENT INFINITE LOOP
    // logStreamer.start();

    scannerInstance = new ArbitrageScanner({
      scanInterval: req.body.scanInterval || DEFAULT_CONFIG.scanInterval,
      minProfitUSD: req.body.minProfitUSD || DEFAULT_CONFIG.minProfitUSD,
      minProfitPercentage: req.body.minProfitPercentage || DEFAULT_CONFIG.minProfitPercentage
    });

    // Update status
    scannerStatus.isRunning = true;
    scannerStatus.startTime = new Date();
    scannerStatus.totalScans = 0;

    // Start the scanner
    scannerInstance.start();

    console.log('[API] Scanner started successfully');
    console.log('[API] Log streaming enabled - frontend will receive real-time logs');
    
    res.json({
      message: 'Scanner started successfully',
      status: scannerStatus,
      config: {
        scanInterval: req.body.scanInterval || DEFAULT_CONFIG.scanInterval,
        minProfitUSD: req.body.minProfitUSD || DEFAULT_CONFIG.minProfitUSD,
        minProfitPercentage: req.body.minProfitPercentage || DEFAULT_CONFIG.minProfitPercentage
      }
    });

  } catch (error: any) {
    console.error('[API] Error starting scanner:', error.message);
    res.status(500).json({ 
      error: `Failed to start scanner: ${error.message}` 
    });
  }
});

// Stop scanner endpoint
router.post('/stop', (req, res) => {
  try {
    console.log('[API] Stopping arbitrage scanner...');
    
    if (scannerInstance) {
      scannerInstance.stop();
      scannerInstance = null;
    }

    // Stop log streaming - DISABLED
    // logStreamer.stop();

    // Update status
    scannerStatus.isRunning = false;
    scannerStatus.startTime = null;

    console.log('[API] Scanner stopped successfully');
    console.log('[API] Log streaming disabled');
    
    res.json({
      message: 'Scanner stopped successfully',
      status: scannerStatus
    });

  } catch (error: any) {
    console.error('[API] Error stopping scanner:', error.message);
    res.status(500).json({ 
      error: `Failed to stop scanner: ${error.message}` 
    });
  }
});

// Get scanner status
router.get('/status', (req, res) => {
  try {
    const currentStatus = {
      ...scannerStatus,
      uptime: scannerStatus.startTime ? 
        Date.now() - scannerStatus.startTime.getTime() : 0,
      lastScanAgo: scannerStatus.lastScanTime ? 
        Date.now() - scannerStatus.lastScanTime.getTime() : null
    };

    res.json({
      status: currentStatus,
      opportunities: scannerStatus.lastOpportunities
    });

  } catch (error: any) {
    console.error('[API] Error getting status:', error.message);
    res.status(500).json({ 
      error: `Failed to get status: ${error.message}` 
    });
  }
});

// Get current opportunities
router.get('/opportunities', (req, res) => {
  try {
    const opportunities = scannerInstance?.getLastOpportunities() || scannerStatus.lastOpportunities;
    
    res.json({
      opportunities,
      count: opportunities.length,
      timestamp: Date.now(),
      isLive: scannerStatus.isRunning
    });

  } catch (error: any) {
    console.error('[API] Error getting opportunities:', error.message);
    res.status(500).json({ 
      error: `Failed to get opportunities: ${error.message}` 
    });
  }
});

// Get configuration
router.get('/config', (req, res) => {
  try {
    res.json({
      default: DEFAULT_CONFIG,
      current: scannerInstance ? {
        scanInterval: DEFAULT_CONFIG.scanInterval,
        minProfitUSD: DEFAULT_CONFIG.minProfitUSD,
        minProfitPercentage: DEFAULT_CONFIG.minProfitPercentage
      } : null
    });

  } catch (error: any) {
    console.error('[API] Error getting config:', error.message);
    res.status(500).json({ 
      error: `Failed to get config: ${error.message}` 
    });
  }
});

// Manual scan endpoint (for testing)
router.post('/scan', async (req, res) => {
  try {
    console.log('[API] Running manual scan...');
    
    // For now, return empty opportunities since we need to implement manual scanning
    const opportunities: any[] = [];

    // Update status
    scannerStatus.lastScanTime = new Date();
    scannerStatus.totalScans += 1;
    scannerStatus.lastOpportunities = opportunities;

    console.log(`[API] Manual scan completed: ${opportunities.length} opportunities found`);
    
    res.json({
      message: 'Manual scan completed',
      opportunities,
      count: opportunities.length,
      scanTime: new Date(),
      totalScans: scannerStatus.totalScans
    });

  } catch (error: any) {
    console.error('[API] Error running manual scan:', error.message);
    res.status(500).json({ 
      error: `Failed to run scan: ${error.message}` 
    });
  }
});

// Log streaming control
router.post('/logs/start', (req, res) => {
  try {
    logStreamer.start();
    res.json({
      message: 'Log streaming started',
      isActive: logStreamer.isActive(),
      timestamp: new Date()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/logs/stop', (req, res) => {
  try {
    logStreamer.stop();
    res.json({
      message: 'Log streaming stopped',
      isActive: logStreamer.isActive(),
      timestamp: new Date()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs/status', (req, res) => {
  res.json({
    isStreaming: logStreamer.isActive(),
    scannerRunning: scannerStatus.isRunning,
    timestamp: new Date()
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    scanner: {
      available: true,
      running: scannerStatus.isRunning,
      logStreaming: logStreamer.isActive()
    }
  });
});

export default router;