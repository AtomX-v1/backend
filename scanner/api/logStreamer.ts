import { scannerWebSocket } from './websocket';

interface LogEntry {
  timestamp: string;
  level: 'log' | 'error' | 'warn' | 'info';
  message: string;
  category?: string;
  data?: any;
}

class LogStreamer {
  private originalConsole: {
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
    info: typeof console.info;
  };
  private isIntercepting = false;

  constructor() {
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console)
    };
  }

  /**
   * Start intercepting console logs and streaming to WebSocket
   */
  public start(): void {
    if (this.isIntercepting) return;

    this.isIntercepting = true;
    console.log('[LOG-STREAM] Starting log interception for frontend streaming');

    // Intercept console.log
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.streamLog('log', args);
    };

    // Intercept console.error
    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      this.streamLog('error', args);
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.streamLog('warn', args);
    };

    // Intercept console.info
    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.streamLog('info', args);
    };
  }

  /**
   * Stop intercepting console logs
   */
  public stop(): void {
    if (!this.isIntercepting) return;

    this.isIntercepting = false;
    
    // Restore original console methods
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;

    this.originalConsole.log('[LOG-STREAM] Stopped log interception');
  }

  /**
   * Stream a log entry to WebSocket clients
   */
  private streamLog(level: 'log' | 'error' | 'warn' | 'info', args: any[]): void {
    try {
      // Convert arguments to string
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join(' ');

      // Parse category from message (e.g., [PRICE], [ROUTE], [SCAN])
      const categoryMatch = message.match(/^\[([A-Z-]+)\]/);
      const category = categoryMatch ? categoryMatch[1] : 'GENERAL';

      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        category,
        data: args.length === 1 && typeof args[0] === 'object' ? args[0] : undefined
      };

      // Stream to WebSocket clients
      scannerWebSocket.broadcastLog(logEntry);

    } catch (error) {
      // Avoid infinite recursion if streaming fails
      this.originalConsole.error('[LOG-STREAM] Error streaming log:', error);
    }
  }

  /**
   * Send a custom log entry
   */
  public sendCustomLog(level: 'log' | 'error' | 'warn' | 'info', message: string, category?: string, data?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      category: category || 'CUSTOM',
      data
    };

    scannerWebSocket.broadcastLog(logEntry);
  }

  /**
   * Get interception status
   */
  public isActive(): boolean {
    return this.isIntercepting;
  }
}

// Export singleton instance
export const logStreamer = new LogStreamer();
export type { LogEntry };