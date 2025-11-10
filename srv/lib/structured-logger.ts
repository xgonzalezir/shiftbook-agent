/**
 * Structured Logger for ShiftBook Service
 * 
 * Provides centralized, structured logging with correlation ID tracking,
 * context enrichment, and integration with SAP CDS logging framework.
 * 
 * Features:
 * - Correlation ID tracking across requests
 * - Multiple logger categories for different domains
 * - Structured log format with timestamps and context
 * - Integration with Cloud Foundry headers
 * - Specialized methods for different log types
 */

const cds = require('@sap/cds');

interface LogContext {
  userId?: string;
  sessionId?: string;
  environment?: string;
  service?: string;
  version?: string;
  type?: string;
  [key: string]: any;
}

interface LogData {
  [key: string]: any;
}

class StructuredLogger {
  public correlationId: string | null = null;
  private loggers: { [key: string]: any } = {};

  constructor() {
    // Initialize loggers for different categories
    this.loggers = {
      app: cds.log('shiftbook'),
      auth: cds.log('shiftbook.auth'), 
      db: cds.log('shiftbook.db'),
      perf: cds.log('shiftbook.perf'),
      health: cds.log('shiftbook.health'),
      business: cds.log('shiftbook.business'),
      error: cds.log('shiftbook.error'),
      security: cds.log('shiftbook.security')
    };
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
    
    // Set in CDS context if available
    try {
      if (cds.context && typeof cds.context === 'object') {
        cds.context.id = correlationId;
      }
    } catch (error) {
      // Ignore context setting errors
    }
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string {
    if (this.correlationId) {
      return this.correlationId;
    }
    
    // Try to get from CDS context
    try {
      if (cds.context?.id) {
        return cds.context.id;
      }
    } catch (error) {
      // Ignore context errors
    }
    
    return 'unknown';
  }

  /**
   * Core logging method with structured format
   */
  log(loggerName: string, level: string, message: string, data?: LogData, context?: LogContext): void {
    const logger = this.loggers[loggerName] || this.loggers.app;
    const logLevel = level.toLowerCase();
    
    // Build structured log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      correlationId: this.getCorrelationId(),
      level: level.toUpperCase(),
      message,
      ...(data && { data }),
      context: {
        environment: process.env.CDS_ENV || 'development',
        service: 'shiftbook',
        version: process.env.npm_package_version || '1.0.0',
        ...context
      }
    };

    // Log using appropriate level
    if (logger[`_${logLevel}`] && logger[logLevel]) {
      logger[logLevel](message, logEntry);
    } else {
      // Fallback to info if level not supported
      logger.info(message, { ...logEntry, level: level.toUpperCase() });
    }
  }

  /**
   * Convenience methods for different log levels
   */
  trace(loggerName: string, message: string, data?: LogData, context?: LogContext): void {
    this.log(loggerName, 'trace', message, data, context);
  }

  debug(loggerName: string, message: string, data?: LogData, context?: LogContext): void {
    this.log(loggerName, 'debug', message, data, context);
  }

  info(loggerName: string, message: string, data?: LogData, context?: LogContext): void {
    this.log(loggerName, 'info', message, data, context);
  }

  warn(loggerName: string, message: string, data?: LogData, context?: LogContext): void {
    this.log(loggerName, 'warn', message, data, context);
  }

  error(loggerName: string, message: string, data?: LogData, context?: LogContext): void {
    this.log(loggerName, 'error', message, data, context);
  }

  /**
   * Domain-specific logging methods
   */
  auth(message: string, data?: LogData, context?: LogContext): void {
    this.log('auth', 'info', message, data, context);
  }

  db(message: string, data?: LogData, context?: LogContext): void {
    this.log('db', 'debug', message, data, context);
  }

  perf(message: string, data?: LogData, context?: LogContext): void {
    this.log('perf', 'info', message, data, context);
  }

  health(message: string, data?: LogData, context?: LogContext): void {
    this.log('health', 'info', message, data, context);
  }

  business(message: string, data?: LogData, context?: LogContext): void {
    this.log('business', 'info', message, data, context);
  }

  security(message: string, data?: LogData, context?: LogContext): void {
    this.log('security', 'warn', message, data, context);
  }

  /**
   * Log error with full error details
   */
  logError(message: string, error: Error, data?: LogData, context?: LogContext): void {
    const errorData = {
      ...data,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    };
    
    this.log('error', 'error', message, errorData, context);
  }

  /**
   * Log HTTP request with timing and details
   */
  logHttpRequest(req: any, res: any, duration: number): void {
    const data = {
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get?.('User-Agent') || req.headers?.['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
      correlationId: this.getCorrelationId()
    };

    const context = {
      userId: req.user?.id || req.user?.ID || 'anonymous'
    };

    const logLevel = res.statusCode >= 500 ? 'warn' : 
                     res.statusCode >= 400 ? 'warn' : 'info';
                     
    this.log('app', logLevel, `HTTP ${req.method} ${req.path || req.url}`, data, context);
  }

  /**
   * Log database query with performance metrics
   */
  logDatabaseQuery(operation: string, entity: string, duration: number, success: boolean, data?: LogData): void {
    const queryData = {
      operation,
      entity,
      duration,
      success,
      correlationId: this.getCorrelationId(),
      ...data
    };

    const context = {
      type: 'database_query'
    };

    const level = success ? 'debug' : 'warn';
    this.log('db', level, `Database ${operation} on ${entity}`, queryData, context);
  }

  /**
   * Log business operation
   */
  logBusinessOperation(operation: string, entity: string, data?: LogData, context?: LogContext): void {
    const businessData = {
      operation,
      entity,
      correlationId: this.getCorrelationId(),
      ...data
    };

    this.log('business', 'info', `Business operation: ${operation}`, businessData, context);
  }
}

// Create singleton instance
const structuredLogger = new StructuredLogger();

// Export singleton and class
export default structuredLogger;
export { StructuredLogger, LogContext, LogData };

// CommonJS compatibility
module.exports = structuredLogger;
module.exports.StructuredLogger = StructuredLogger;
module.exports.default = structuredLogger;