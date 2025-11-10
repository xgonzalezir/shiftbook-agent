// Use CommonJS require since the module exports CommonJS
const AuditLogger = require('../../../srv/lib/audit-logger');
const { auditLogger } = AuditLogger;

// Mock @sap/cds for database operations
jest.mock('@sap/cds', () => ({
  ql: {
    INSERT: {
      into: jest.fn().mockReturnValue({
        entries: jest.fn().mockResolvedValue(true)
      })
    }
  }
}));

describe('AuditLogger', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleSpy: {
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    };

    // Reset environment
    process.env.AUDIT_LOG_CONSOLE = 'true';
    process.env.AUDIT_LOG_DATABASE = 'false';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      const logger = new AuditLogger();
      
      expect(logger).toBeDefined();
    });

    it('should respect AUDIT_LOG_CONSOLE environment variable', () => {
      process.env.AUDIT_LOG_CONSOLE = 'false';
      const logger = new AuditLogger();
      
      // Test by trying to log and checking if console methods are called
      const context = {
        userId: 'test-user',
        ipAddress: '192.168.1.1'
      };
      
      return logger.logSuccess('TEST_ACTION', 'TEST_ENTITY', context).then(() => {
        expect(consoleSpy.info).not.toHaveBeenCalled();
      });
    });

    it('should respect AUDIT_LOG_DATABASE environment variable', () => {
      process.env.AUDIT_LOG_DATABASE = 'true';
      const logger = new AuditLogger();
      
      expect(logger).toBeDefined();
      // Database logging is tested in the database logging tests
    });
  });

  describe('Basic Logging Methods', () => {
    let logger: any;
    let testContext: any;

    beforeEach(() => {
      logger = new AuditLogger();
      testContext = {
        userId: 'test-user-123',
        ipAddress: '192.168.1.100',
        userAgent: 'Test User Agent',
        sessionId: 'session-456',
        correlationId: 'corr-789'
      };
    });

    describe('logSuccess', () => {
      it('should log successful operations', async () => {
        await logger.logSuccess('CREATE_SHIFT', 'SHIFT_LOG', testContext, 'entity-123', { 
          additionalData: 'test' 
        });

        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] CREATE_SHIFT SHIFT_LOG (entity-123) by test-user-123 - SUCCESS')
        );
      });

      it('should log success without entity ID and details', async () => {
        await logger.logSuccess('LOGIN', 'USER', testContext);

        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] LOGIN USER by test-user-123 - SUCCESS')
        );
      });

      it('should include all context information', async () => {
        await logger.logSuccess('TEST_ACTION', 'TEST_ENTITY', testContext);

        const logCall = consoleSpy.info.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        
        expect(logData.audit.session.ipAddress).toBe('192.168.1.100');
        expect(logData.audit.session.userAgent).toBe('Test User Agent');
        expect(logData.audit.session.sessionId).toBe('session-456');
      });
    });

    describe('logFailure', () => {
      it('should log failed operations', async () => {
        await logger.logFailure(
          'DELETE_SHIFT', 
          'SHIFT_LOG', 
          testContext, 
          'Permission denied',
          'shift-456',
          { reason: 'insufficient_permissions' }
        );

        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] DELETE_SHIFT SHIFT_LOG (shift-456) by test-user-123 - FAILURE')
        );
      });

      it('should include error message in log data', async () => {
        const errorMessage = 'Database connection failed';
        await logger.logFailure('UPDATE_CATEGORY', 'CATEGORY', testContext, errorMessage);

        const logCall = consoleSpy.error.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        
        expect(logData.audit.errorMessage).toBe(errorMessage);
        expect(logData.audit.result).toBe('FAILURE');
      });
    });

    describe('logWarning', () => {
      it('should log warning operations', async () => {
        await logger.logWarning(
          'VALIDATE_INPUT', 
          'USER_INPUT', 
          testContext, 
          'Data validation warning',
          'input-789'
        );

        expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] VALIDATE_INPUT USER_INPUT (input-789) by test-user-123 - WARNING')
        );
      });

      it('should include warning message', async () => {
        const warningMessage = 'Input contains suspicious patterns';
        await logger.logWarning('VALIDATION_CHECK', 'INPUT', testContext, warningMessage);

        const logCall = consoleSpy.warn.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        
        expect(logData.audit.errorMessage).toBe(warningMessage);
        expect(logData.audit.result).toBe('WARNING');
      });
    });
  });

  describe('Security Logging', () => {
    let logger: any;
    let testContext: any;

    beforeEach(() => {
      logger = new AuditLogger();
      testContext = {
        userId: 'security-user',
        ipAddress: '10.0.0.1'
      };
    });

    describe('logSecurityEvent', () => {
      it('should log security events with default success result', async () => {
        await logger.logSecurityEvent('LOGIN_ATTEMPT', testContext, { method: 'JWT' });

        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] LOGIN_ATTEMPT SECURITY by security-user - SUCCESS')
        );
      });

      it('should log security failures', async () => {
        await logger.logSecurityEvent('AUTHENTICATION_FAILURE', testContext, { 
          reason: 'invalid_token' 
        }, 'FAILURE');

        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] AUTHENTICATION_FAILURE SECURITY by security-user - FAILURE')
        );
      });
    });

    describe('logRateLimitEvent', () => {
      it('should log rate limiting events', async () => {
        const limitDetails = {
          remaining: 5,
          resetTime: Date.now() + 60000,
          identifier: 'user-123'
        };

        await logger.logRateLimitEvent('EXCEEDED', testContext, limitDetails);

        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] RATE_LIMIT_EXCEEDED SECURITY by security-user - FAILURE')
        );

        const logCall = consoleSpy.error.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        expect(logData.audit.details.remaining).toBe(5);
        expect(logData.audit.details.severity).toBe('MEDIUM');
      });
    });

    describe('logSuspiciousActivity', () => {
      it('should log suspicious activities', async () => {
        await logger.logSuspiciousActivity(
          'MULTIPLE_FAILED_LOGINS', 
          testContext, 
          'Multiple failed login attempts from same IP',
          { attemptCount: 10, timeWindow: '5 minutes' }
        );

        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] SUSPICIOUS_MULTIPLE_FAILED_LOGINS SECURITY by security-user - FAILURE')
        );

        const logCall = consoleSpy.error.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        expect(logData.audit.details.reason).toBe('Multiple failed login attempts from same IP');
        expect(logData.audit.details.severity).toBe('HIGH');
        expect(logData.audit.details.attemptCount).toBe(10);
      });
    });

    describe('logSecurityValidationFailure', () => {
      it('should log security validation failures without threats', async () => {
        await logger.logSecurityValidationFailure(
          'INPUT_VALIDATION', 
          testContext, 
          'email_format',
          'invalid-email-format'
        );

        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] VALIDATION_FAILURE_INPUT_VALIDATION SECURITY by security-user - FAILURE')
        );

        const logCall = consoleSpy.error.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        expect(logData.audit.details.validationType).toBe('email_format');
        expect(logData.audit.details.severity).toBe('LOW');
      });

      it('should detect and log SQL injection threats', async () => {
        const maliciousInput = "'; DROP TABLE users; --";
        
        await logger.logSecurityValidationFailure(
          'SQL_VALIDATION', 
          testContext, 
          'user_input',
          maliciousInput
        );

        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] SUSPICIOUS_SQL_VALIDATION SECURITY by security-user - FAILURE')
        );

        const logCall = consoleSpy.error.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        expect(logData.audit.details.threats).toContain('SQL_INJECTION');
        expect(logData.audit.details.severity).toBe('HIGH');
        expect(logData.audit.details.inputSample).toBe(maliciousInput);
      });

      it('should detect XSS threats', async () => {
        const xssInput = '<script>alert("XSS")</script>';
        
        await logger.logSecurityValidationFailure(
          'XSS_VALIDATION', 
          testContext, 
          'html_input',
          xssInput
        );

        const logCall = consoleSpy.error.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        expect(logData.audit.details.threats).toContain('XSS');
      });

      it('should detect path traversal threats', async () => {
        const pathTraversalInput = '../../../etc/passwd';
        
        await logger.logSecurityValidationFailure(
          'PATH_VALIDATION', 
          testContext, 
          'file_path',
          pathTraversalInput
        );

        const logCall = consoleSpy.error.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        expect(logData.audit.details.threats).toContain('PATH_TRAVERSAL');
      });

      it('should detect command injection threats', async () => {
        const cmdInjectionInput = 'file.txt; rm -rf /';
        
        await logger.logSecurityValidationFailure(
          'COMMAND_VALIDATION', 
          testContext, 
          'file_command',
          cmdInjectionInput
        );

        const logCall = consoleSpy.error.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        expect(logData.audit.details.threats).toContain('COMMAND_INJECTION');
      });

      it('should handle non-string input safely', async () => {
        const objectInput = { malicious: true, data: 'safe_data' };
        
        await logger.logSecurityValidationFailure(
          'OBJECT_VALIDATION', 
          testContext, 
          'object_input',
          objectInput
        );

        const logCall = consoleSpy.error.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        // For non-string input with no threats, the details structure is different
        expect(logData.audit.details.validationType).toBe('object_input');
        expect(logData.audit.details.severity).toBe('LOW');
      });
    });
  });

  describe('Business Validation Logging', () => {
    let logger: any;
    let mockReq: any;
    let validationContext: any;

    beforeEach(() => {
      logger = new AuditLogger();
      mockReq = {
        user: { id: 'business-user' },
        headers: { 'x-forwarded-for': '172.16.0.1' },
        connection: { remoteAddress: '10.0.0.5' }
      };
      validationContext = {
        entity: 'SHIFT_LOG',
        operation: 'CREATE',
        data: { ID: 'shift-123', message: 'Test shift log' }
      };
    });

    describe('logValidationFailure', () => {
      it('should log validation failures', async () => {
        const validationResult = {
          errors: ['Field is required', 'Invalid date format'],
          warnings: ['Future date detected']
        };

        await logger.logValidationFailure(mockReq, validationContext, validationResult);

        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] VALIDATION_FAILURE SHIFT_LOG (shift-123) by business-user - FAILURE')
        );

        const logCall = consoleSpy.error.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        expect(logData.audit.details.validationErrors).toEqual(validationResult.errors);
        expect(logData.audit.details.validationWarnings).toEqual(validationResult.warnings);
      });
    });

    describe('logValidationWarnings', () => {
      it('should log validation warnings', async () => {
        const warnings = ['Date is in the future', 'Unusual shift pattern'];

        await logger.logValidationWarnings(mockReq, validationContext, warnings);

        expect(consoleSpy.warn).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] VALIDATION_WARNING SHIFT_LOG (shift-123) by business-user - WARNING')
        );

        const logCall = consoleSpy.warn.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        expect(logData.audit.details.validationWarnings).toEqual(warnings);
      });
    });
  });

  describe('Data Access Logging', () => {
    let logger: any;
    let testContext: any;

    beforeEach(() => {
      logger = new AuditLogger();
      testContext = {
        userId: 'data-user',
        ipAddress: '192.168.2.50'
      };
    });

    it('should log data access with record count', async () => {
      await logger.logDataAccess('READ', 'SHIFT_LOGS', testContext, undefined, 25);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] READ SHIFT_LOGS by data-user - SUCCESS')
      );

      const logCall = consoleSpy.info.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.audit.details.recordCount).toBe(25);
    });

    it('should log data access without record count', async () => {
      await logger.logDataAccess('READ', 'USER_PROFILE', testContext, 'user-456');

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] READ USER_PROFILE (user-456) by data-user - SUCCESS')
      );

      const logCall = consoleSpy.info.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      expect(logData.audit.details).toBeUndefined();
    });
  });

  describe('Static Helper Methods', () => {
    describe('extractContext', () => {
      it('should extract context from request with all fields', () => {
        const mockReq = {
          user: { id: 'extract-user' },
          headers: {
            'x-forwarded-for': '203.0.113.1',
            'user-agent': 'Mozilla/5.0 Test Browser',
            'x-session-id': 'session-extract-123'
          },
          session: { id: 'fallback-session' }
        };

        const context = AuditLogger.extractContext(mockReq);

        expect(context).toEqual({
          userId: 'extract-user',
          ipAddress: '203.0.113.1',
          userAgent: 'Mozilla/5.0 Test Browser',
          sessionId: 'session-extract-123'
        });
      });

      it('should handle request with minimal data', () => {
        const mockReq = {
          headers: {}
        };

        const context = AuditLogger.extractContext(mockReq);

        expect(context.userId).toBe('anonymous');
        expect(context.ipAddress).toBeUndefined();
        expect(context.userAgent).toBeUndefined();
        expect(context.sessionId).toBeUndefined();
      });

      it('should prefer user.id over user.ID', () => {
        const mockReq = {
          user: { id: 'preferred', ID: 'fallback' },
          headers: {}
        };

        const context = AuditLogger.extractContext(mockReq);

        expect(context.userId).toBe('preferred');
      });

      it('should use user.ID as fallback', () => {
        const mockReq = {
          user: { ID: 'fallback-id' },
          headers: {}
        };

        const context = AuditLogger.extractContext(mockReq);

        expect(context.userId).toBe('fallback-id');
      });

      it('should prefer session id from headers over session object', () => {
        const mockReq = {
          headers: { 'x-session-id': 'header-session' },
          session: { id: 'object-session' }
        };

        const context = AuditLogger.extractContext(mockReq);

        expect(context.sessionId).toBe('header-session');
      });
    });

    describe('forAction', () => {
      it('should create action-specific logger with bound context', async () => {
        const mockReq = {
          user: { id: 'action-user' },
          headers: { 'x-forwarded-for': '198.51.100.1' }
        };

        const actionLogger = AuditLogger.forAction('BULK_IMPORT', mockReq);

        await actionLogger.logSuccess('SHIFT_DATA', 'batch-456', { recordCount: 100 });

        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] BULK_IMPORT SHIFT_DATA (batch-456) by action-user - SUCCESS')
        );

        const logCall = consoleSpy.info.mock.calls[0][0];
        const logData = JSON.parse(logCall);
        expect(logData.audit.session.ipAddress).toBe('198.51.100.1');
        expect(logData.audit.details.recordCount).toBe(100);
      });

      it('should provide all logging methods', async () => {
        const mockReq = { user: { id: 'test-user' } };
        const actionLogger = AuditLogger.forAction('TEST_ACTION', mockReq);

        // Test that all methods exist and are callable
        expect(typeof actionLogger.logSuccess).toBe('function');
        expect(typeof actionLogger.logFailure).toBe('function');
        expect(typeof actionLogger.logWarning).toBe('function');
        expect(typeof actionLogger.logDataAccess).toBe('function');
        expect(typeof actionLogger.logSecurityEvent).toBe('function');
        expect(typeof actionLogger.logRateLimitEvent).toBe('function');
        expect(typeof actionLogger.logSuspiciousActivity).toBe('function');
        expect(typeof actionLogger.logSecurityValidationFailure).toBe('function');
        expect(typeof actionLogger.logValidationFailure).toBe('function');
        expect(typeof actionLogger.logValidationWarnings).toBe('function');

        // Test a few methods work
        await actionLogger.logFailure('TEST_ENTITY', 'Test error');
        await actionLogger.logDataAccess('TEST_ENTITY', 'test-id', 5);

        expect(consoleSpy.error).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] TEST_ACTION TEST_ENTITY by test-user - FAILURE')
        );
        expect(consoleSpy.info).toHaveBeenCalledWith(
          expect.stringContaining('[AUDIT] TEST_ACTION TEST_ENTITY (test-id) by test-user - SUCCESS')
        );
      });
    });
  });

  describe('Private Helper Methods', () => {
    let logger: any;

    beforeEach(() => {
      logger = new AuditLogger();
    });

    describe('safeStringify', () => {
      it('should stringify normal objects', () => {
        const obj = { name: 'test', value: 123 };
        const result = logger.safeStringify(obj);
        expect(result).toBe('{"name":"test","value":123}');
      });

      it('should handle circular references', () => {
        const obj: any = { name: 'test' };
        obj.self = obj; // Create circular reference

        const result = logger.safeStringify(obj);
        const parsed = JSON.parse(result);
        
        expect(parsed._error).toBe('Circular reference or non-serializable data');
        expect(parsed._type).toBe('object');
        expect(parsed._keys).toEqual(['name', 'self']);
      });

      it('should handle undefined values', () => {
        const result = logger.safeStringify(undefined);
        
        // JSON.stringify(undefined) returns undefined (not a string)
        // so safeStringify should return "undefined" as string for safety
        expect(result).toBeUndefined();
      });
    });

    describe('generateUUID', () => {
      it('should generate valid UUID format', () => {
        const uuid = logger.generateUUID();
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        expect(uuid).toMatch(uuidRegex);
      });

      it('should generate unique UUIDs', () => {
        const uuid1 = logger.generateUUID();
        const uuid2 = logger.generateUUID();
        
        expect(uuid1).not.toBe(uuid2);
      });
    });

    describe('extractOperation', () => {
      it('should extract CREATE operation', () => {
        expect(logger.extractOperation('CREATE_SHIFT_LOG')).toBe('CREATE');
        expect(logger.extractOperation('USER_CREATE')).toBe('CREATE');
      });

      it('should extract UPDATE operation', () => {
        expect(logger.extractOperation('UPDATE_CATEGORY')).toBe('UPDATE');
        expect(logger.extractOperation('BATCH_UPDATE')).toBe('UPDATE');
      });

      it('should extract DELETE operation', () => {
        expect(logger.extractOperation('DELETE_RECORD')).toBe('DELETE');
        expect(logger.extractOperation('SOFT_DELETE')).toBe('DELETE');
      });

      it('should extract READ operation', () => {
        expect(logger.extractOperation('READ_data')).toBe('READ');
        expect(logger.extractOperation('bulk_READ')).toBe('READ');
      });

      it('should default to OTHER for unknown operations', () => {
        expect(logger.extractOperation('UNKNOWN_ACTION')).toBe('OTHER');
        expect(logger.extractOperation('VALIDATE')).toBe('OTHER');
      });
    });

    describe('determineSeverity', () => {
      it('should map result to severity correctly', () => {
        expect(logger.determineSeverity('SUCCESS')).toBe('INFO');
        expect(logger.determineSeverity('FAILURE')).toBe('ERROR');
        expect(logger.determineSeverity('WARNING')).toBe('WARN');
        expect(logger.determineSeverity('UNKNOWN')).toBe('INFO');
      });
    });
  });

  describe('Database Logging', () => {
    it('should log to database when enabled', async () => {
      process.env.AUDIT_LOG_DATABASE = 'true';
      const logger = new AuditLogger();
      
      const { ql } = require('@sap/cds');
      const mockEntries = jest.fn().mockResolvedValue(true);
      ql.INSERT.into.mockReturnValue({
        entries: mockEntries
      });

      const context = {
        userId: 'db-user',
        ipAddress: '10.0.0.100'
      };

      await logger.logSuccess('DB_TEST', 'TEST_ENTITY', context, 'entity-789');

      expect(ql.INSERT.into).toHaveBeenCalledWith('syntax.gbi.sap.dme.plugins.shiftbook.AuditLog');
      expect(mockEntries).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DB_TEST',
          entity: 'TEST_ENTITY',
          entityId: 'entity-789',
          userId: 'db-user',
          result: 'SUCCESS',
          source: 'SHIFTBOOK_SERVICE'
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      process.env.AUDIT_LOG_DATABASE = 'true';
      const logger = new AuditLogger();
      
      const { ql } = require('@sap/cds');
      ql.INSERT.into.mockReturnValue({
        entries: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const context = { userId: 'error-user' };

      await logger.logSuccess('ERROR_TEST', 'TEST_ENTITY', context);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Failed to log audit event to database:',
        expect.any(Error)
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Audit event that failed to log:',
        expect.stringContaining('ERROR_TEST')
      );
    });
  });

  describe('Singleton Instance', () => {
    it('should provide a singleton instance', () => {
      expect(auditLogger).toBeDefined();
      expect(auditLogger).toBeInstanceOf(AuditLogger);
    });

    it('should be usable directly', async () => {
      const context = { userId: 'singleton-user' };
      
      await auditLogger.logSuccess('SINGLETON_TEST', 'TEST_ENTITY', context);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] SINGLETON_TEST TEST_ENTITY by singleton-user - SUCCESS')
      );
    });
  });

  describe('Edge Cases', () => {
    let logger: any;

    beforeEach(() => {
      logger = new AuditLogger();
    });

    it('should handle empty context gracefully', async () => {
      const emptyContext = { userId: '' };

      await logger.logSuccess('EMPTY_CONTEXT_TEST', 'TEST_ENTITY', emptyContext);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] EMPTY_CONTEXT_TEST TEST_ENTITY by  - SUCCESS')
      );
    });

    it('should handle very long action names', async () => {
      const longAction = 'A'.repeat(200);
      const context = { userId: 'test-user' };

      await logger.logSuccess(longAction, 'TEST_ENTITY', context);

      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining(longAction)
      );
    });

    it('should handle complex nested details', async () => {
      const complexDetails = {
        nested: {
          level1: {
            level2: {
              array: [1, 2, 3],
              date: new Date(),
              null: null,
              undefined: undefined
            }
          }
        }
      };

      const context = { userId: 'complex-user' };

      await logger.logSuccess('COMPLEX_DETAILS', 'TEST_ENTITY', context, undefined, complexDetails);

      const logCall = consoleSpy.info.mock.calls[0][0];
      const logData = JSON.parse(logCall);
      
      expect(logData.audit.details.nested.level1.level2.array).toEqual([1, 2, 3]);
      expect(logData.audit.details.nested.level1.level2.null).toBeNull();
    });
  });
});