# AtomX Scanner API

REST API and WebSocket server for controlling the AtomX arbitrage scanner from your frontend.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the API Server
```bash
npm run scanner:api
```

The server will start on `http://localhost:3002`

## API Endpoints

### Scanner Control

#### Start Scanner
```http
POST /api/scanner/start
Content-Type: application/json

{
  "scanInterval": 30000,      // Optional: scan every 30 seconds
  "minProfitUSD": 5.0,        // Optional: minimum $5 profit
  "minProfitPercentage": 0.5  // Optional: minimum 0.5% profit
}
```

#### Stop Scanner
```http
POST /api/scanner/stop
```

#### Get Scanner Status
```http
GET /api/scanner/status
```

Response:
```json
{
  "status": {
    "isRunning": true,
    "startTime": "2024-01-01T12:00:00.000Z",
    "lastScanTime": "2024-01-01T12:01:00.000Z",
    "totalScans": 42,
    "uptime": 60000,
    "lastScanAgo": 5000
  },
  "opportunities": [...]
}
```

#### Get Current Opportunities
```http
GET /api/scanner/opportunities
```

Response:
```json
{
  "opportunities": [
    {
      "tokenA": { "symbol": "SOL", "mint": "So111..." },
      "tokenB": { "symbol": "USDC", "mint": "EPjF..." },
      "profitUSD": 12.50,
      "profitPercentage": 1.25,
      "volume": 100,
      "forwardPrice": 187.44,
      "reversePrice": 189.89,
      "confidence": "HIGH"
    }
  ],
  "count": 1,
  "timestamp": 1704110400000,
  "isLive": true
}
```

#### Manual Scan (Testing)
```http
POST /api/scanner/scan
```

### Configuration

#### Get Configuration
```http
GET /api/scanner/config
```

### Log Streaming Control

#### Start Log Streaming
```http
POST /api/scanner/logs/start
```

#### Stop Log Streaming
```http
POST /api/scanner/logs/stop
```

#### Get Log Streaming Status
```http
GET /api/scanner/logs/status
```

### Health Check
```http
GET /health
```

## WebSocket Connection

Connect to `ws://localhost:3002/ws/scanner` for real-time updates.

### Message Types

#### Connection Confirmed
```json
{
  "type": "connected",
  "clientId": "client_123...",
  "timestamp": 1704110400000,
  "message": "Connected to AtomX Scanner WebSocket"
}
```

#### Real-time Scanner Logs (NEW!)
```json
{
  "type": "log",
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "level": "log",
    "message": "[PRICE] Fetching prices for 3 tokens",
    "category": "PRICE"
  },
  "timestamp": 1704110400000
}
```

#### Real-time Opportunities
```json
{
  "type": "opportunities",
  "data": [...],
  "count": 3,
  "timestamp": 1704110400000
}
```

#### Scanner Status Updates
```json
{
  "type": "status",
  "data": { ... },
  "timestamp": 1704110400000
}
```

#### Scan Events
```json
{
  "type": "scan_start",
  "timestamp": 1704110400000,
  "message": "Arbitrage scan started"
}

{
  "type": "scan_complete",
  "opportunities": [...],
  "count": 2,
  "timestamp": 1704110400000,
  "message": "Scan completed: 2 opportunities found"
}
```

## Frontend Integration Example

### JavaScript/TypeScript
```typescript
// API calls
const API_BASE = 'http://localhost:3002/api/scanner';

// Start scanner
const startScanner = async () => {
  const response = await fetch(`${API_BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scanInterval: 30000,
      minProfitUSD: 5.0,
      minProfitPercentage: 0.5
    })
  });
  return response.json();
};

// Get opportunities
const getOpportunities = async () => {
  const response = await fetch(`${API_BASE}/opportunities`);
  return response.json();
};

// WebSocket connection
const ws = new WebSocket('ws://localhost:3002/ws/scanner');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'opportunities':
      updateOpportunitiesUI(data.data);
      break;
    case 'status':
      updateStatusUI(data.data);
      break;
    case 'scan_complete':
      console.log(`Scan completed: ${data.count} opportunities`);
      break;
  }
};
```

### React Hook Example
```typescript
import { useState, useEffect } from 'react';

export function useScannerAPI() {
  const [isConnected, setIsConnected] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3002/ws/scanner');
    
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'opportunities') {
        setOpportunities(data.data);
      } else if (data.type === 'status') {
        setStatus(data.data);
      }
    };

    return () => ws.close();
  }, []);

  const startScanner = async () => {
    const response = await fetch('http://localhost:3002/api/scanner/start', {
      method: 'POST'
    });
    return response.json();
  };

  const stopScanner = async () => {
    const response = await fetch('http://localhost:3002/api/scanner/stop', {
      method: 'POST'
    });
    return response.json();
  };

  return {
    isConnected,
    opportunities,
    status,
    startScanner,
    stopScanner
  };
}
```

## Error Handling

All endpoints return standard HTTP status codes:
- `200`: Success
- `400`: Bad request (scanner already running, etc.)
- `500`: Internal server error

Error responses:
```json
{
  "error": "Scanner already running",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## CORS Configuration

The API allows requests from:
- `http://localhost:3000` (typical React dev server)
- `http://localhost:3001` (alternative port)

Add your frontend URL to the CORS configuration in `server.ts` if needed.