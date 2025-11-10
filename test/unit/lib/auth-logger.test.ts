import { AuthLogger, AuthEvent, AuthLogConfig } from '../../../srv/lib/auth-logger';
import * as fs from 'fs';
import * as path from 'path';

// Mock file system operations
jest.mock('fs', () => ({
  WriteStream: jest.fn().mockImplementation(() => ({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  })),
  createWriteStream: jest.fn().mockReturnValue({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  }),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({ size: 1024 * 1024 }), // 1MB
  appendFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  renameSync: jest.fn()
}));

// Mock path operations  
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((first, ...rest) => {
    if (rest.includes('audit')) return '/mocked/path/audit';
    return '/mocked/path/auth-events.log';
  }),
  dirname: jest.fn().mockReturnValue('/mocked/path')
}));

describe('AuthLogger', () => {
  let authLogger: AuthLogger;
  let mockWriteStream: any;
  let consoleSpy: {
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
    debug: jest.SpyInstance;
    log: jest.SpyInstance;
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock console methods
    consoleSpy = {
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {}),
      log: jest.spyOn(console, 'log').mockImplementation(() => {})
    };

    // Mock write stream
    mockWriteStream = {
      write: jest.fn(),
      end: jest.fn(),
      on: jest.fn()
    };
    (fs.createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (authLogger) {
      authLogger.close();
    }
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default configuration', () => {
      authLogger = new AuthLogger();

      expect(authLogger).toBeDefined();
      expect(fs.createWriteStream).toHaveBeenCalled();
    });

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<AuthLogConfig> = {
        enabled: true,
        logLevel: 'debug',
        logToFile: false,
        logToConsole: true,
        maxFileSize: 5,
        maxFiles: 3
      };

      authLogger = new AuthLogger(customConfig);

      expect(authLogger).toBeDefined();
      // Should not create write stream when logToFile is false
      expect(fs.createWriteStream).not.toHaveBeenCalled();
    });

    it('should not initialize logger when disabled', () => {
      authLogger = new AuthLogger({ enabled: false });

      expect(fs.createWriteStream).not.toHaveBeenCalled();
    });

    it('should create log directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      authLogger = new AuthLogger();

      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('Event Logging', () => {
    beforeEach(() => {
      authLogger = new AuthLogger();
    });

    it('should log login events', () => {
      const event: AuthEvent = {
        timestamp: '2024-01-15T10:00:00.000Z',
        eventType: 'login',
        userId: 'user123',
        userEmail: 'test@example.com',
        ipAddress: '192.168.1.1',
        status: 'success',
        details: { loginMethod: 'credentials' },
        environment: 'development'
      };

      authLogger.logAuthEvent(event);

      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"login"')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('LOGIN')
      );
    });

    it('should log logout events', () => {
      const event: AuthEvent = {
        timestamp: '2024-01-15T10:05:00.000Z',
        eventType: 'logout',
        userId: 'user123',
        status: 'success',
        details: {},
        environment: 'development'
      };

      authLogger.logAuthEvent(event);

      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"logout"')
      );
    });

    it('should log authentication failures', () => {
      const event: AuthEvent = {
        timestamp: '2024-01-15T10:10:00.000Z',
        eventType: 'auth_failure',
        userEmail: 'invalid@example.com',
        ipAddress: '192.168.1.100',
        status: 'failure',
        details: { reason: 'invalid_credentials', attempts: 3 },
        environment: 'development'
      };

      authLogger.logAuthEvent(event);

      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"auth_failure"')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('AUTH_FAILURE')
      );
    });

    it('should log token validation events', () => {
      const event: AuthEvent = {
        timestamp: '2024-01-15T10:15:00.000Z',
        eventType: 'token_validation',
        userId: 'user123',
        clientId: 'client456',
        status: 'success',
        details: { tokenType: 'JWT', scope: 'read:data' },
        environment: 'development'
      };

      authLogger.logAuthEvent(event);

      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"token_validation"')
      );
    });

    it('should log security violation events', () => {
      const event: AuthEvent = {
        timestamp: '2024-01-15T10:20:00.000Z',
        eventType: 'security_violation',
        ipAddress: '192.168.1.200',
        userAgent: 'Suspicious Bot/1.0',
        status: 'warning',
        details: { violation: 'rate_limit_exceeded', threshold: 100 },
        environment: 'development'
      };

      authLogger.logAuthEvent(event);

      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"security_violation"')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY_VIOLATION')
      );
    });
  });

  describe('Sensitive Data Handling', () => {
    beforeEach(() => {
      authLogger = new AuthLogger({
        sensitiveFields: ['password', 'token', 'secret']
      });
    });

    it('should sanitize sensitive fields from event details', () => {
      const event: AuthEvent = {
        timestamp: '2024-01-15T10:25:00.000Z',
        eventType: 'login',
        userId: 'user123',
        status: 'success',
        details: {
          password: 'secret123',
          token: 'jwt-token-here',
          username: 'testuser',
          secret: 'api-secret'
        },
        environment: 'development'
      };

      authLogger.logAuthEvent(event);

      const writtenData = mockWriteStream.write.mock.calls[0][0];
      expect(writtenData).toContain('"password":"[REDACTED]"');
      expect(writtenData).toContain('"token":"[REDACTED]"');
      expect(writtenData).toContain('"secret":"[REDACTED]"');
      expect(writtenData).toContain('"username":"testuser"');
    });
  });

  describe('Metrics Collection', () => {
    beforeEach(() => {
      authLogger = new AuthLogger({ enableMetrics: true });
    });

    it('should track event metrics', () => {
      const successEvent: AuthEvent = {
        timestamp: '2024-01-15T11:00:00.000Z',
        eventType: 'login',
        userId: 'user123',
        status: 'success',
        details: {},
        environment: 'development'
      };

      const failureEvent: AuthEvent = {
        timestamp: '2024-01-15T11:01:00.000Z',
        eventType: 'auth_failure',
        userEmail: 'test@example.com',
        status: 'failure',
        details: {},
        environment: 'development'
      };

      authLogger.logAuthEvent(successEvent);
      authLogger.logAuthEvent(failureEvent);

      const metrics = authLogger.getMetrics();

      expect(metrics.totalEvents).toBe(2);
      expect(metrics.successEvents).toBe(1);
      expect(metrics.failureEvents).toBe(1);
      expect(metrics.eventsByType.login).toBe(1);
      expect(metrics.eventsByType.auth_failure).toBe(1);
      expect(metrics.successRate).toBe('50.00%');
      expect(metrics.failureRate).toBe('50.00%');
    });

    it('should track events by status', () => {
      const events = [
        { eventType: 'login', status: 'success' },
        { eventType: 'logout', status: 'success' },
        { eventType: 'auth_failure', status: 'failure' },
        { eventType: 'security_violation', status: 'warning' }
      ];

      for (const eventData of events) {
        const event: AuthEvent = {
          timestamp: '2024-01-15T11:00:00.000Z',
          eventType: eventData.eventType as any,
          status: eventData.status as any,
          details: {},
          environment: 'development'
        };
        authLogger.logAuthEvent(event);
      }

      const metrics = authLogger.getMetrics();

      expect(metrics.eventsByStatus.success).toBe(2);
      expect(metrics.eventsByStatus.failure).toBe(1);
      expect(metrics.eventsByStatus.warning).toBe(1);
    });

    it('should return disabled metrics when disabled', () => {
      const disabledLogger = new AuthLogger({ enableMetrics: false });

      const metrics = disabledLogger.getMetrics();

      expect(metrics.enabled).toBe(false);
    });
  });

  describe('Specific Event Logging Methods', () => {
    beforeEach(() => {
      authLogger = new AuthLogger();
    });

    it('should log login events using logLogin method', () => {
      authLogger.logLogin('user123', 'test@example.com', '192.168.1.1', 'Mozilla/5.0', 'success', { method: 'password' });

      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"login"')
      );
    });

    it('should log logout events using logLogout method', () => {
      authLogger.logLogout('user123', '192.168.1.1', 'Mozilla/5.0', { reason: 'user_action' });

      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"logout"')
      );
    });

    it('should log token validation using logTokenValidation method', () => {
      authLogger.logTokenValidation('user123', 'client456', 'success', { tokenType: 'JWT' });

      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"token_validation"')
      );
    });

    it('should log scope check using logScopeCheck method', () => {
      authLogger.logScopeCheck('user123', 'read:data', '/api/data', 'success', { permission: 'granted' });

      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"scope_check"')
      );
    });

    it('should log rate limit using logRateLimit method', () => {
      authLogger.logRateLimit('user123', '192.168.1.1', 100, 60, { currentCount: 105 });

      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"rate_limit"')
      );
    });

    it('should log security violation using logSecurityViolation method', () => {
      authLogger.logSecurityViolation('user123', '192.168.1.1', 'brute_force', { attempts: 10 });

      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"security_violation"')
      );
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect debug log level', () => {
      authLogger = new AuthLogger({ logLevel: 'debug' });

      const debugEvent: AuthEvent = {
        timestamp: '2024-01-15T11:05:00.000Z',
        eventType: 'token_validation',
        status: 'success',
        details: {},
        environment: 'development'
      };

      authLogger.logAuthEvent(debugEvent);

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should respect error log level', () => {
      authLogger = new AuthLogger({ logLevel: 'error' });

      const infoEvent: AuthEvent = {
        timestamp: '2024-01-15T11:10:00.000Z',
        eventType: 'login',
        status: 'success',
        details: {},
        environment: 'development'
      };

      authLogger.logAuthEvent(infoEvent);

      // Should not log to console for info level when log level is error
      expect(consoleSpy.log).not.toHaveBeenCalled();
      // But should still write to file
      expect(mockWriteStream.write).toHaveBeenCalled();
    });
  });

  describe('File Management', () => {
    it('should disable file logging when logToFile is false', () => {
      authLogger = new AuthLogger({ logToFile: false });

      expect(fs.createWriteStream).not.toHaveBeenCalled();
    });

    it('should disable console logging when logToConsole is false', () => {
      authLogger = new AuthLogger({ logToConsole: false });

      const event: AuthEvent = {
        timestamp: '2024-01-15T11:20:00.000Z',
        eventType: 'login',
        status: 'success',
        details: {},
        environment: 'development'
      };

      authLogger.logAuthEvent(event);

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(mockWriteStream.write).toHaveBeenCalled();
    });

    it('should create log files with correct configuration', () => {
      authLogger = new AuthLogger({ 
        logFilePath: '/custom/path/auth.log',
        maxFileSize: 20,
        maxFiles: 10 
      });

      // Should create write stream with the specified path
      expect(fs.createWriteStream).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('Metrics Management', () => {
    beforeEach(() => {
      authLogger = new AuthLogger({ enableMetrics: true });
    });

    it('should reset metrics', () => {
      // Log some events first
      authLogger.logLogin('user1', 'test@example.com', '192.168.1.1', 'Mozilla/5.0', 'success');
      authLogger.logLogin('user2', 'test2@example.com', '192.168.1.1', 'Mozilla/5.0', 'failure');

      expect(authLogger.getMetrics().totalEvents).toBe(2);

      authLogger.resetMetrics();

      const metrics = authLogger.getMetrics();
      expect(metrics.totalEvents).toBe(0);
      expect(metrics.successEvents).toBe(0);
      expect(metrics.failureEvents).toBe(0);
    });
  });

  describe('Audit Trail', () => {
    beforeEach(() => {
      authLogger = new AuthLogger({ enableAuditTrail: true });
    });

    it('should create audit trail for failure events', () => {
      const failureEvent: AuthEvent = {
        timestamp: '2024-01-15T12:00:00.000Z',
        eventType: 'auth_failure',
        userEmail: 'test@example.com',
        status: 'failure',
        details: { reason: 'invalid_password' },
        environment: 'development'
      };

      authLogger.logAuthEvent(failureEvent);

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('audit'),
        expect.objectContaining({ recursive: true })
      );
      expect(fs.appendFileSync).toHaveBeenCalled();
    });
  });

  describe('Resource Cleanup', () => {
    it('should properly close resources', () => {
      authLogger = new AuthLogger();

      authLogger.close();

      expect(mockWriteStream.end).toHaveBeenCalled();
    });

    it('should handle close when no stream exists', () => {
      authLogger = new AuthLogger({ logToFile: false });

      expect(() => authLogger.close()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      authLogger = new AuthLogger();
    });

    it('should handle events with missing fields gracefully', () => {
      const minimalEvent: AuthEvent = {
        timestamp: '2024-01-15T11:25:00.000Z',
        eventType: 'login',
        status: 'success',
        details: {},
        environment: 'development'
      };

      expect(() => authLogger.logAuthEvent(minimalEvent)).not.toThrow();
      expect(mockWriteStream.write).toHaveBeenCalled();
    });

    it('should handle very large event details', () => {
      const largeDetails = {};
      for (let i = 0; i < 100; i++) {
        largeDetails[`field${i}`] = `value${i}`.repeat(10);
      }

      const event: AuthEvent = {
        timestamp: '2024-01-15T11:30:00.000Z',
        eventType: 'login',
        status: 'success',
        details: largeDetails,
        environment: 'development'
      };

      expect(() => authLogger.logAuthEvent(event)).not.toThrow();
      expect(mockWriteStream.write).toHaveBeenCalled();
    });

    it('should handle null and undefined values in details', () => {
      const event: AuthEvent = {
        timestamp: '2024-01-15T11:35:00.000Z',
        eventType: 'login',
        status: 'success',
        details: {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          zeroValue: 0,
          falseValue: false
        },
        environment: 'development'
      };

      expect(() => authLogger.logAuthEvent(event)).not.toThrow();
      expect(mockWriteStream.write).toHaveBeenCalled();
    });
  });

  describe('Disabled Logger', () => {
    it('should not log when disabled', () => {
      authLogger = new AuthLogger({ enabled: false });

      const event: AuthEvent = {
        timestamp: '2024-01-15T11:40:00.000Z',
        eventType: 'login',
        status: 'success',
        details: {},
        environment: 'development'
      };

      authLogger.logAuthEvent(event);

      expect(mockWriteStream.write).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });
});