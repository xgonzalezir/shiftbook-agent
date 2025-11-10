/**
 * Authentication Event Logger
 * Comprehensive logging system for authentication events in production
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AuthEvent {
  timestamp: string;
  eventType: 'login' | 'logout' | 'token_validation' | 'token_refresh' | 'auth_failure' | 'scope_check' | 'rate_limit' | 'security_violation';
  userId?: string;
  userEmail?: string;
  clientId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  status: 'success' | 'failure' | 'warning';
  details: Record<string, any>;
  environment: string;
  correlationId?: string;
}

export interface AuthLogConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logToFile: boolean;
  logToConsole: boolean;
  logFilePath?: string;
  maxFileSize: number; // in MB
  maxFiles: number;
  enableAuditTrail: boolean;
  enableMetrics: boolean;
  sensitiveFields: string[];
}

export class AuthLogger {
  private config: AuthLogConfig;
  private logStream?: fs.WriteStream;
  private metrics: {
    totalEvents: number;
    successEvents: number;
    failureEvents: number;
    warningEvents: number;
    eventsByType: Record<string, number>;
    eventsByStatus: Record<string, number>;
  };

  constructor(config?: Partial<AuthLogConfig>) {
    this.config = {
      enabled: true,
      logLevel: 'info',
      logToFile: true,
      logToConsole: true,
      logFilePath: path.join(process.cwd(), 'logs', 'auth-events.log'),
      maxFileSize: 10, // 10MB
      maxFiles: 5,
      enableAuditTrail: true,
      enableMetrics: true,
      sensitiveFields: ['password', 'token', 'secret', 'authorization'],
      ...config
    };

    this.metrics = {
      totalEvents: 0,
      successEvents: 0,
      failureEvents: 0,
      warningEvents: 0,
      eventsByType: {},
      eventsByStatus: {}
    };

    this.initializeLogger();
  }

  private initializeLogger(): void {
    if (!this.config.enabled) {
      return;
    }

    if (this.config.logToFile) {
      this.setupFileLogging();
    }
  }

  private setupFileLogging(): void {
    try {
      const logDir = path.dirname(this.config.logFilePath!);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Check if we need to rotate logs
      this.checkLogRotation();

      this.logStream = fs.createWriteStream(this.config.logFilePath!, { flags: 'a' });
      
      // Handle stream errors
      this.logStream.on('error', (error) => {
        console.error('Auth logger stream error:', error);
      });

    } catch (error) {
      console.error('Failed to setup auth logger file stream:', error);
    }
  }

  private checkLogRotation(): void {
    if (!this.config.logFilePath || !fs.existsSync(this.config.logFilePath)) {
      return;
    }

    try {
      const stats = fs.statSync(this.config.logFilePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      if (fileSizeInMB >= this.config.maxFileSize) {
        this.rotateLogFile();
      }
    } catch (error) {
      console.error('Error checking log file size:', error);
    }
  }

  private rotateLogFile(): void {
    try {
      const basePath = this.config.logFilePath!.replace('.log', '');
      
      // Remove oldest log file if we have max files
      const oldestLog = `${basePath}.${this.config.maxFiles}.log`;
      if (fs.existsSync(oldestLog)) {
        fs.unlinkSync(oldestLog);
      }

      // Shift existing log files
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const currentLog = `${basePath}.${i}.log`;
        const nextLog = `${basePath}.${i + 1}.log`;
        if (fs.existsSync(currentLog)) {
          fs.renameSync(currentLog, nextLog);
        }
      }

      // Rename current log file
      const currentLog = this.config.logFilePath!;
      const newLog = `${basePath}.1.log`;
      if (fs.existsSync(currentLog)) {
        fs.renameSync(currentLog, newLog);
      }

      // Close current stream and create new one
      if (this.logStream) {
        this.logStream.end();
        this.logStream = fs.createWriteStream(this.config.logFilePath!, { flags: 'a' });
      }

    } catch (error) {
      console.error('Error rotating log file:', error);
    }
  }

  private shouldLog(level: string): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level as keyof typeof levels] >= levels[this.config.logLevel];
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (this.config.sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.sanitizeData(value);
      }
    }

    return sanitized;
  }

  private formatLogEntry(event: AuthEvent): string {
    const sanitizedDetails = this.sanitizeData(event.details);
    
    return JSON.stringify({
      timestamp: event.timestamp,
      eventType: event.eventType,
      userId: event.userId,
      userEmail: event.userEmail,
      clientId: event.clientId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      method: event.method,
      url: event.url,
      status: event.status,
      details: sanitizedDetails,
      environment: event.environment,
      correlationId: event.correlationId
    });
  }

  private updateMetrics(event: AuthEvent): void {
    if (!this.config.enableMetrics) {
      return;
    }

    this.metrics.totalEvents++;
    
    switch (event.status) {
      case 'success':
        this.metrics.successEvents++;
        break;
      case 'failure':
        this.metrics.failureEvents++;
        break;
      case 'warning':
        this.metrics.warningEvents++;
        break;
    }

    // Update event type metrics
    this.metrics.eventsByType[event.eventType] = 
      (this.metrics.eventsByType[event.eventType] || 0) + 1;

    // Update status metrics
    this.metrics.eventsByStatus[event.status] = 
      (this.metrics.eventsByStatus[event.status] || 0) + 1;
  }

  public logAuthEvent(event: AuthEvent): void {
    if (!this.config.enabled) {
      return;
    }

    // Update metrics
    this.updateMetrics(event);

    // Format log entry
    const logEntry = this.formatLogEntry(event);

    // Log to console if enabled
    if (this.config.logToConsole) {
      const level = event.status === 'failure' ? 'error' : 
                   event.status === 'warning' ? 'warn' : 'info';
      
      if (this.shouldLog(level)) {
        const prefix = `[AUTH] ${event.eventType.toUpperCase()}`;
        console.log(`${prefix} - ${event.userId || 'unknown'} - ${event.status.toUpperCase()}`);
        
        if (level === 'error' || level === 'warn') {
          console.log(`Details: ${JSON.stringify(event.details, null, 2)}`);
        }
      }
    }

    // Log to file if enabled
    if (this.config.logToFile && this.logStream) {
      try {
        this.logStream.write(logEntry + '\n');
      } catch (error) {
        console.error('Error writing to auth log file:', error);
      }
    }

    // Create audit trail if enabled
    if (this.config.enableAuditTrail && event.status === 'failure') {
      this.createAuditTrail(event);
    }
  }

  private createAuditTrail(event: AuthEvent): void {
    try {
      const auditDir = path.join(process.cwd(), 'logs', 'audit');
      if (!fs.existsSync(auditDir)) {
        fs.mkdirSync(auditDir, { recursive: true });
      }

      const auditFile = path.join(auditDir, `auth-audit-${new Date().toISOString().split('T')[0]}.log`);
      const auditEntry = {
        ...event,
        auditTimestamp: new Date().toISOString(),
        severity: event.status === 'failure' ? 'HIGH' : 'MEDIUM'
      };

      fs.appendFileSync(auditFile, JSON.stringify(auditEntry) + '\n');
    } catch (error) {
      console.error('Error creating audit trail:', error);
    }
  }

  public logLogin(userId: string, userEmail: string, ipAddress: string, userAgent: string, status: 'success' | 'failure', details: Record<string, any> = {}): void {
    this.logAuthEvent({
      timestamp: new Date().toISOString(),
      eventType: 'login',
      userId,
      userEmail,
      ipAddress,
      userAgent,
      status,
      details,
      environment: process.env.NODE_ENV || 'development'
    });
  }

  public logLogout(userId: string, ipAddress: string, userAgent: string, details: Record<string, any> = {}): void {
    this.logAuthEvent({
      timestamp: new Date().toISOString(),
      eventType: 'logout',
      userId,
      ipAddress,
      userAgent,
      status: 'success',
      details,
      environment: process.env.NODE_ENV || 'development'
    });
  }

  public logTokenValidation(userId: string, clientId: string, status: 'success' | 'failure', details: Record<string, any> = {}): void {
    this.logAuthEvent({
      timestamp: new Date().toISOString(),
      eventType: 'token_validation',
      userId,
      clientId,
      status,
      details,
      environment: process.env.NODE_ENV || 'development'
    });
  }

  public logScopeCheck(userId: string, scope: string, resource: string, status: 'success' | 'failure', details: Record<string, any> = {}): void {
    this.logAuthEvent({
      timestamp: new Date().toISOString(),
      eventType: 'scope_check',
      userId,
      status,
      details: {
        scope,
        resource,
        ...details
      },
      environment: process.env.NODE_ENV || 'development'
    });
  }

  public logRateLimit(userId: string, ipAddress: string, limit: number, window: number, details: Record<string, any> = {}): void {
    this.logAuthEvent({
      timestamp: new Date().toISOString(),
      eventType: 'rate_limit',
      userId,
      ipAddress,
      status: 'warning',
      details: {
        limit,
        window,
        ...details
      },
      environment: process.env.NODE_ENV || 'development'
    });
  }

  public logSecurityViolation(userId: string, ipAddress: string, violationType: string, details: Record<string, any> = {}): void {
    this.logAuthEvent({
      timestamp: new Date().toISOString(),
      eventType: 'security_violation',
      userId,
      ipAddress,
      status: 'failure',
      details: {
        violationType,
        ...details
      },
      environment: process.env.NODE_ENV || 'development'
    });
  }

  public getMetrics(): any {
    if (!this.config.enableMetrics) {
      return { enabled: false };
    }

    return {
      ...this.metrics,
      successRate: this.metrics.totalEvents > 0 ? 
        ((this.metrics.successEvents / this.metrics.totalEvents) * 100).toFixed(2) + '%' : '0%',
      failureRate: this.metrics.totalEvents > 0 ? 
        ((this.metrics.failureEvents / this.metrics.totalEvents) * 100).toFixed(2) + '%' : '0%'
    };
  }

  public resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      successEvents: 0,
      failureEvents: 0,
      warningEvents: 0,
      eventsByType: {},
      eventsByStatus: {}
    };
  }

  public close(): void {
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

// Create singleton instance
export const authLogger = new AuthLogger();

// Export for use in other modules
export default authLogger; 