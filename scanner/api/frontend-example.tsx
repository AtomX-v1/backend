// React Component Example for Frontend Integration
// Copy this to your frontend repo

import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info';
  message: string;
  category?: string;
  data?: any;
}

interface ScannerStatus {
  isRunning: boolean;
  startTime: string | null;
  lastScanTime: string | null;
  totalScans: number;
  uptime: number;
  lastScanAgo: number | null;
}

export const AtomXScanner: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [status, setStatus] = useState<ScannerStatus | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const API_BASE = 'http://localhost:3002/api/scanner';
  const WS_URL = 'ws://localhost:3002/ws/scanner';

  // WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('Connected to AtomX Scanner WebSocket');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
      // Reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    wsRef.current = ws;
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'log':
        setLogs(prev => [...prev.slice(-499), data.data]); // Keep last 500 logs
        break;
      
      case 'opportunities':
        setOpportunities(data.data);
        break;
      
      case 'status':
        setStatus(data.data);
        break;
      
      case 'scan_start':
        addSystemLog('info', 'Scan started');
        break;
      
      case 'scan_complete':
        addSystemLog('info', `Scan completed: ${data.count} opportunities found`);
        break;
      
      case 'connected':
        addSystemLog('info', 'Connected to AtomX Scanner');
        break;
    }
  };

  const addSystemLog = (level: 'log' | 'error' | 'warn' | 'info', message: string) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: `[SYSTEM] ${message}`,
      category: 'SYSTEM'
    };
    setLogs(prev => [...prev.slice(-499), logEntry]);
  };

  const startScanner = async () => {
    try {
      const response = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanInterval: 30000,
          minProfitUSD: 5.0,
          minProfitPercentage: 0.5
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsRunning(true);
        addSystemLog('info', 'Scanner started successfully');
      } else {
        const error = await response.json();
        addSystemLog('error', `Failed to start scanner: ${error.error}`);
      }
    } catch (error) {
      addSystemLog('error', `Network error: ${error}`);
    }
  };

  const stopScanner = async () => {
    try {
      const response = await fetch(`${API_BASE}/stop`, { method: 'POST' });
      
      if (response.ok) {
        setIsRunning(false);
        addSystemLog('info', 'Scanner stopped successfully');
      } else {
        const error = await response.json();
        addSystemLog('error', `Failed to stop scanner: ${error.error}`);
      }
    } catch (error) {
      addSystemLog('error', `Network error: ${error}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (level: string, category?: string) => {
    if (category === 'PRICE') return 'text-blue-400';
    if (category === 'ROUTE') return 'text-green-400';
    if (category === 'SCAN') return 'text-yellow-400';
    if (category === 'SYSTEM') return 'text-purple-400';
    
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-orange-400';
      case 'info': return 'text-cyan-400';
      default: return 'text-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-900 text-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">AtomX Arbitrage Scanner</h1>
        
        {/* Status Bar */}
        <div className="flex items-center gap-4 mb-4 p-4 bg-gray-800 rounded-lg">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
          <span>{isRunning ? 'Scanning' : 'Stopped'}</span>
          
          {status && (
            <span className="text-sm text-gray-400">
              Scans: {status.totalScans} | 
              Uptime: {Math.floor(status.uptime / 1000)}s
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={isRunning ? stopScanner : startScanner}
            className={`px-6 py-2 rounded-lg font-semibold ${
              isRunning 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
            disabled={!isConnected}
          >
            {isRunning ? 'Stop Scanner' : 'Start Scanner'}
          </button>
          
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg"
          >
            Clear Logs
          </button>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner Logs */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Scanner Logs</h2>
          <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className={`mb-1 ${getLogColor(log.level, log.category)}`}>
                <span className="text-gray-500">{formatTimestamp(log.timestamp)}</span>
                <span className="ml-2">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Opportunities Panel */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Opportunities ({opportunities.length})
          </h2>
          <div className="space-y-4">
            {opportunities.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No opportunities found
              </div>
            ) : (
              opportunities.map((opp, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4">
                  <div className="font-semibold text-lg mb-2">
                    {opp.tokenA?.symbol}/{opp.tokenB?.symbol}
                  </div>
                  <div className="text-green-400 font-bold">
                    +${opp.profitUSD?.toFixed(2)} ({opp.profitPercentage?.toFixed(2)}%)
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    Volume: ${opp.volume}
                  </div>
                  <div className="text-sm text-gray-400">
                    Confidence: {opp.confidence}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AtomXScanner;