/**
 * Audit Logging System for ShiftBook Service
 * Provides structured logging for business operations and security events
 */

export interface AuditEvent {
  timestamp: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: any;
  result: 'SUCCESS' | 'FAILURE' | 'WARNING';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
}

export interface AuditContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
}

class AuditLogger {
  private logToConsole: boolean;
  private logToDatabase: boolean;

  constructor() {
    this.logToConsole = process.env.AUDIT_LOG_CONSOLE !== 'false';
    this.logToDatabase = process.env.AUDIT_LOG_DATABASE === 'true';
  }

  /**
   * Log a successful business operation
   */
  async logSuccess(
    action: string,
    entity: string,
    context: AuditContext,
    entityId?: string,
    details?: any
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      action,
      entity,
      entityId,
      details,
      result: 'SUCCESS',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      correlationId: context.correlationId
    });
  }

  /**
   * Log a failed business operation
   */
  async logFailure(
    action: string,
    entity: string,
    context: AuditContext,
    errorMessage: string,
    entityId?: string,
    details?: any
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      action,
      entity,
      entityId,
      details,
      result: 'FAILURE',
      errorMessage,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      correlationId: context.correlationId
    });
  }

  /**
   * Log a warning (e.g., validation issues that were handled)
   */
  async logWarning(
    action: string,
    entity: string,
    context: AuditContext,
    warningMessage: string,
    entityId?: string,
    details?: any
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      action,
      entity,
      entityId,
      details,
      result: 'WARNING',
      errorMessage: warningMessage,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      correlationId: context.correlationId
    });
  }

  /**
   * Log security-related events
   */
  async logSecurityEvent(
    action: string,
    context: AuditContext,
    details?: any,
    result: 'SUCCESS' | 'FAILURE' = 'SUCCESS'
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      action,
      entity: 'SECURITY',
      details,
      result,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      correlationId: context.correlationId
    });
  }

  /**
   * Log rate limiting events
   */
  async logRateLimitEvent(
    action: string,
    context: AuditContext,
    limitDetails: { remaining: number; resetTime: number; identifier: string }
  ): Promise<void> {
    await this.logSecurityEvent(`RATE_LIMIT_${action}`, context, {
      ...limitDetails,
      severity: 'MEDIUM'
    }, 'FAILURE');
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    action: string,
    context: AuditContext,
    reason: string,
    details?: any
  ): Promise<void> {
    await this.logSecurityEvent(`SUSPICIOUS_${action}`, context, {
      reason,
      severity: 'HIGH',
      ...details
    }, 'FAILURE');
  }

  /**
   * Log input validation failures that might indicate attacks
   */
  async logSecurityValidationFailure(
    action: string,
    context: AuditContext,
    validationType: string,
    input: any
  ): Promise<void> {
    // Detect potential security threats
    const threats = this.detectThreats(input);
    
    if (threats.length > 0) {
      await this.logSuspiciousActivity(action, context, `Input validation failure: ${validationType}`, {
        threats,
        validationType,
        inputSample: typeof input === 'string' ? input.substring(0, 100) : 'non-string'
      });
    } else {
      await this.logSecurityEvent(`VALIDATION_FAILURE_${action}`, context, {
        validationType,
        severity: 'LOW'
      }, 'FAILURE');
    }
  }

  /**
   * Log business validation failures
   */
  async logValidationFailure(
    req: any,
    context: any,
    validationResult: any
  ): Promise<void> {
    const auditContext = AuditLogger.extractContext(req);
    await this.logFailure(
      'VALIDATION_FAILURE',
      context.entity,
      auditContext,
      `Validation failed: ${validationResult.errors.join(', ')}`,
      context.data?.ID,
      {
        validationContext: context,
        validationErrors: validationResult.errors,
        validationWarnings: validationResult.warnings
      }
    );
  }

  /**
   * Log business validation warnings
   */
  async logValidationWarnings(
    req: any,
    context: any,
    warnings: any[]
  ): Promise<void> {
    const auditContext = AuditLogger.extractContext(req);
    await this.logWarning(
      'VALIDATION_WARNING',
      context.entity,
      auditContext,
      `Validation warnings: ${warnings.join(', ')}`,
      context.data?.ID,
      {
        validationContext: context,
        validationWarnings: warnings
      }
    );
  }

  /**
   * Detect potential security threats in input
   */
  private detectThreats(input: any): string[] {
    const threats: string[] = [];
    
    if (typeof input === 'string') {
      // SQL injection patterns
      if (/('|(\-\-)|;|\||\*|(%27)|(%3D)|(\%3D))/i.test(input)) {
        threats.push('SQL_INJECTION');
      }
      
      // XSS patterns
      if (/<script|javascript:|vbscript:|onload=|onerror=/i.test(input)) {
        threats.push('XSS');
      }
      
      // Path traversal
      if (/\.\.[\/\\]|[\/\\]\.\./.test(input)) {
        threats.push('PATH_TRAVERSAL');
      }
      
      // Command injection
      if (/[;&|`$()\[\]{}]/.test(input)) {
        threats.push('COMMAND_INJECTION');
      }
    }
    
    return threats;
  }

  /**
   * Log data access operations
   */
  async logDataAccess(
    action: string,
    entity: string,
    context: AuditContext,
    entityId?: string,
    recordCount?: number
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      userId: context.userId,
      action,
      entity,
      entityId,
      details: recordCount !== undefined ? { recordCount } : undefined,
      result: 'SUCCESS',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      correlationId: context.correlationId
    });
  }

  /**
   * Core logging method
   */
  private async log(event: AuditEvent): Promise<void> {
    if (this.logToConsole) {
      this.logToConsoleOutput(event);
    }

    if (this.logToDatabase) {
      await this.logToDatabaseOutput(event);
    }
  }

  /**
   * Log to console with structured format
   */
  private logToConsoleOutput(event: AuditEvent): void {
    const logLevel = event.result === 'FAILURE' ? 'ERROR' : 
                     event.result === 'WARNING' ? 'WARN' : 'INFO';
    
    const logMessage = `[AUDIT] ${event.action} ${event.entity}${event.entityId ? ` (${event.entityId})` : ''} by ${event.userId} - ${event.result}`;
    
    const logData = {
      timestamp: event.timestamp,
      level: logLevel,
      message: logMessage,
      audit: {
        userId: event.userId,
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        result: event.result,
        errorMessage: event.errorMessage,
        details: event.details,
        session: {
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          sessionId: event.sessionId
        }
      }
    };

    if (event.result === 'FAILURE') {
      console.error(this.safeStringify(logData));
    } else if (event.result === 'WARNING') {
      console.warn(this.safeStringify(logData));
    } else {
      console.info(this.safeStringify(logData));
    }
  }

  /**
   * Log to database for persistent storage
   */
  private async logToDatabaseOutput(event: AuditEvent): Promise<void> {
    try {
      // Import CAP query builder
      const { INSERT } = require('@sap/cds').ql;
      
      // Prepare audit log entry
      const auditLogEntry = {
        ID: this.generateUUID(),
        timestamp: new Date(event.timestamp),
        action: event.action,
        entity: event.entity,
        entityId: event.entityId || '',
        userId: event.userId,
        userFullName: event.userId, // Could be enhanced to get actual user name
        ipAddress: event.ipAddress || '',
        userAgent: event.userAgent || '',
        sessionId: event.sessionId || '',
        correlationId: event.correlationId || '',
        operation: this.extractOperation(event.action),
        result: event.result,
        errorMessage: event.errorMessage || '',
        details: event.details ? this.safeStringify(event.details) : '',
        previousState: '',
        newState: event.details ? this.safeStringify(event.details) : '',
        severity: this.determineSeverity(event.result),
        source: 'SHIFTBOOK_SERVICE'
      };

      // Insert into AuditLog table
      await INSERT.into('syntax.gbi.sap.dme.plugins.shiftbook.AuditLog').entries(auditLogEntry);
      
    } catch (error) {
      // Fallback to console if database logging fails
      console.error('Failed to log audit event to database:', error);
      console.error('Audit event that failed to log:', this.safeStringify(event));
    }
  }

  /**
   * Safely stringify objects, handling circular references
   */
  private safeStringify(obj: any): string {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      // Handle circular references and other JSON serialization issues
      return JSON.stringify({
        _error: 'Circular reference or non-serializable data',
        _type: typeof obj,
        _keys: obj && typeof obj === 'object' ? Object.keys(obj) : undefined
      });
    }
  }

  /**
   * Generate UUID for audit log entries
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Extract operation type from action
   */
  private extractOperation(action: string): string {
    if (action.includes('CREATE')) return 'CREATE';
    if (action.includes('UPDATE')) return 'UPDATE';
    if (action.includes('DELETE')) return 'DELETE';
    if (action.includes('READ')) return 'READ';
    return 'OTHER';
  }

  /**
   * Determine severity level based on result
   */
  private determineSeverity(result: string): string {
    switch (result) {
      case 'FAILURE': return 'ERROR';
      case 'WARNING': return 'WARN';
      case 'SUCCESS': return 'INFO';
      default: return 'INFO';
    }
  }

  /**
   * Extract audit context from CAP request
   */
  static extractContext(req: any): AuditContext {
    return {
      userId: req.user?.id || req.user?.ID || 'anonymous',
      ipAddress: req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
      sessionId: req.headers?.['x-session-id'] || req.session?.id
    };
  }

  /**
   * Create audit logger instance for action handlers
   */
  static forAction(action: string, req: any) {
    const logger = new AuditLogger();
    const context = AuditLogger.extractContext(req);
    
    return {
      logSuccess: async (entity: string, entityId?: string, details?: any) => 
        await logger.logSuccess(action, entity, context, entityId, details),
      
      logFailure: async (entity: string, errorMessage: string, entityId?: string, details?: any) => 
        await logger.logFailure(action, entity, context, errorMessage, entityId, details),
      
      logWarning: async (entity: string, warningMessage: string, entityId?: string, details?: any) => 
        await logger.logWarning(action, entity, context, warningMessage, entityId, details),
      
      logDataAccess: async (entity: string, entityId?: string, recordCount?: number) => 
        await logger.logDataAccess(action, entity, context, entityId, recordCount),
      
      logSecurityEvent: async (details?: any, result: 'SUCCESS' | 'FAILURE' = 'SUCCESS') => 
        await logger.logSecurityEvent(action, context, details, result),
      
      logRateLimitEvent: async (limitDetails: { remaining: number; resetTime: number; identifier: string }) => 
        await logger.logRateLimitEvent(action, context, limitDetails),
      
      logSuspiciousActivity: async (reason: string, details?: any) => 
        await logger.logSuspiciousActivity(action, context, reason, details),
      
      logSecurityValidationFailure: async (validationType: string, input: any) => 
        await logger.logSecurityValidationFailure(action, context, validationType, input),
      
      logValidationFailure: async (req: any, context: any, validationResult: any) => 
        await logger.logValidationFailure(req, context, validationResult),
      
      logValidationWarnings: async (req: any, context: any, warnings: any[]) => 
        await logger.logValidationWarnings(req, context, warnings)
    };
  }
}

export const auditLogger = new AuditLogger();
export default AuditLogger;

// CommonJS compatibility
module.exports = AuditLogger;
module.exports.auditLogger = auditLogger;
module.exports.default = AuditLogger;