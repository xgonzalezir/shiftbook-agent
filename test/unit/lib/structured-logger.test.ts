import { jest } from '@jest/globals';

// Mock @sap/cds
const mockCdsLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  _trace: true,
  _debug: true,
  _info: true,
  _warn: true,
  _error: true
};

const mockCds = {
  log: jest.fn(() => mockCdsLogger),
  context: { id: 'test-context-id' }
};

jest.mock('@sap/cds', () => mockCds);

// Import after mocking
const structuredLogger = require('../../../srv/lib/structured-logger');

describe('StructuredLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset logger mocks
    Object.keys(mockCdsLogger).forEach(key => {
      if (typeof (mockCdsLogger as any)[key] === 'function') {
        ((mockCdsLogger as any)[key] as jest.MockedFunction<any>).mockClear();
      }
    });
    
    // Reset process.env
    delete process.env.CDS_ENV;
    delete process.env.npm_package_version;
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct loggers', () => {
      // Re-import to trigger constructor calls
      jest.resetModules();
      require('../../../srv/lib/structured-logger');
      
      expect(mockCds.log).toHaveBeenCalledWith('shiftbook');
      expect(mockCds.log).toHaveBeenCalledWith('shiftbook.auth');
      expect(mockCds.log).toHaveBeenCalledWith('shiftbook.db');
      expect(mockCds.log).toHaveBeenCalledWith('shiftbook.perf');
      expect(mockCds.log).toHaveBeenCalledWith('shiftbook.health');
      expect(mockCds.log).toHaveBeenCalledWith('shiftbook.business');
      expect(mockCds.log).toHaveBeenCalledWith('shiftbook.error');
      expect(mockCds.log).toHaveBeenCalledWith('shiftbook.security');
    });
  });

  describe('setCorrelationId', () => {
    it('should set correlation ID', () => {
      structuredLogger.setCorrelationId('test-correlation-123');
      expect(structuredLogger.correlationId).toBe('test-correlation-123');
    });

    it('should set correlation ID in CDS context when available', () => {
      mockCds.context = { id: null };
      structuredLogger.setCorrelationId('test-context-123');
      expect(mockCds.context.id).toBe('test-context-123');
    });

    it('should handle missing CDS context gracefully', () => {
      mockCds.context = null;
      expect(() => {
        structuredLogger.setCorrelationId('test-correlation-123');
      }).not.toThrow();
    });
  });

  describe('getCorrelationId', () => {
    it('should return set correlation ID', () => {
      structuredLogger.setCorrelationId('test-correlation-456');
      expect(structuredLogger.getCorrelationId()).toBe('test-correlation-456');
    });

    it('should return CDS context ID when no correlation ID set', () => {
      structuredLogger.correlationId = null;
      mockCds.context = { id: 'context-id-789' };
      expect(structuredLogger.getCorrelationId()).toBe('context-id-789');
    });

    it('should return "unknown" when no correlation ID or context available', () => {
      structuredLogger.correlationId = null;
      mockCds.context = null;
      expect(structuredLogger.getCorrelationId()).toBe('unknown');
    });
  });

  describe('log', () => {
    beforeEach(() => {
      structuredLogger.setCorrelationId('test-correlation-123');
    });

    it('should log with correct structured format', () => {
      const testData = { key: 'value', number: 42 };
      const testContext = { userId: 'user123', type: 'test' };
      
      structuredLogger.log('app', 'info', 'Test message', testData, testContext);
      
      expect(mockCdsLogger.info).toHaveBeenCalledWith('Test message', expect.objectContaining({
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        correlationId: 'test-correlation-123',
        level: 'INFO',
        message: 'Test message',
        data: testData,
        context: expect.objectContaining({
          userId: 'user123',
          type: 'test',
          environment: 'development',
          service: 'shiftbook',
          version: '1.0.0'
        })
      }));
    });

    it('should use environment from CDS_ENV', () => {
      process.env.CDS_ENV = 'production';
      
      structuredLogger.log('app', 'warn', 'Test warning');
      
      expect(mockCdsLogger.warn).toHaveBeenCalledWith('Test warning', expect.objectContaining({
        context: expect.objectContaining({
          environment: 'production'
        })
      }));
    });

    it('should use version from npm_package_version', () => {
      process.env.npm_package_version = '2.1.0';
      
      structuredLogger.log('app', 'error', 'Test error');
      
      expect(mockCdsLogger.error).toHaveBeenCalledWith('Test error', expect.objectContaining({
        context: expect.objectContaining({
          version: '2.1.0'
        })
      }));
    });

    it('should fall back to app logger for unknown logger name', () => {
      structuredLogger.log('unknown', 'info', 'Test message');
      expect(mockCdsLogger.info).toHaveBeenCalled();
    });

    it('should handle trace level logging', () => {
      structuredLogger.log('app', 'trace', 'Trace message');
      
      expect(mockCdsLogger.trace).toHaveBeenCalledWith('Trace message', expect.objectContaining({
        level: 'TRACE'
      }));
    });

    it('should handle debug level logging', () => {
      structuredLogger.log('app', 'debug', 'Debug message');
      
      expect(mockCdsLogger.debug).toHaveBeenCalledWith('Debug message', expect.objectContaining({
        level: 'DEBUG'
      }));
    });

    it('should fall back to info for unknown log level', () => {
      structuredLogger.log('app', 'unknown', 'Unknown level message');
      
      expect(mockCdsLogger.info).toHaveBeenCalledWith('Unknown level message', expect.objectContaining({
        level: 'UNKNOWN'
      }));
    });

    it('should respect logger level availability', () => {
      // Create a new mock logger with debug disabled
      const mockLoggerWithDisabledDebug = {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        _trace: true,
        _debug: false, // Debug is disabled
        _info: true,
        _warn: true,
        _error: true
      };

      // Set the disabled logger in the loggers map directly
      (structuredLogger as any).loggers.testLogger = mockLoggerWithDisabledDebug;
      
      structuredLogger.log('testLogger', 'debug', 'Debug message');

      expect(mockLoggerWithDisabledDebug.debug).not.toHaveBeenCalled();
    });
  });

  describe('Convenience Methods', () => {
    beforeEach(() => {
      structuredLogger.setCorrelationId('test-correlation-456');
    });

    it('should log trace messages', () => {
      structuredLogger.trace('app', 'Trace message', { data: 'test' });
      
      expect(mockCdsLogger.trace).toHaveBeenCalledWith('Trace message', expect.objectContaining({
        level: 'TRACE',
        data: { data: 'test' }
      }));
    });

    it('should log debug messages', () => {
      structuredLogger.debug('app', 'Debug message', { debug: true });
      
      expect(mockCdsLogger.debug).toHaveBeenCalledWith('Debug message', expect.objectContaining({
        level: 'DEBUG',
        data: { debug: true }
      }));
    });

    it('should log info messages', () => {
      structuredLogger.info('app', 'Info message', { info: 'data' });
      
      expect(mockCdsLogger.info).toHaveBeenCalledWith('Info message', expect.objectContaining({
        level: 'INFO',
        data: { info: 'data' }
      }));
    });

    it('should log warn messages', () => {
      structuredLogger.warn('app', 'Warning message', { warn: true });
      
      expect(mockCdsLogger.warn).toHaveBeenCalledWith('Warning message', expect.objectContaining({
        level: 'WARN',
        data: { warn: true }
      }));
    });

    it('should log error messages', () => {
      structuredLogger.error('app', 'Error message', { error: 'details' });
      
      expect(mockCdsLogger.error).toHaveBeenCalledWith('Error message', expect.objectContaining({
        level: 'ERROR',
        data: { error: 'details' }
      }));
    });
  });

  describe('Specialized Logging Methods', () => {
    beforeEach(() => {
      structuredLogger.setCorrelationId('specialized-test-789');
    });

    it('should log authentication events', () => {
      structuredLogger.auth('User authenticated', { userId: 'user123' }, { sessionId: 'sess456' });
      
      expect(mockCdsLogger.info).toHaveBeenCalledWith('User authenticated', expect.objectContaining({
        correlationId: 'specialized-test-789',
        level: 'INFO',
        data: { userId: 'user123' },
        context: expect.objectContaining({
          sessionId: 'sess456'
        })
      }));
    });

    it('should log database operations', () => {
      structuredLogger.db('Query executed', { query: 'SELECT * FROM table' });
      
      expect(mockCdsLogger.debug).toHaveBeenCalledWith('Query executed', expect.objectContaining({
        level: 'DEBUG',
        data: { query: 'SELECT * FROM table' }
      }));
    });

    it('should log performance metrics', () => {
      structuredLogger.perf('Operation completed', { duration: 250 });
      
      expect(mockCdsLogger.info).toHaveBeenCalledWith('Operation completed', expect.objectContaining({
        level: 'INFO',
        data: { duration: 250 }
      }));
    });

    it('should log health check events', () => {
      structuredLogger.health('Health check passed', { status: 'healthy' });
      
      expect(mockCdsLogger.info).toHaveBeenCalledWith('Health check passed', expect.objectContaining({
        level: 'INFO',
        data: { status: 'healthy' }
      }));
    });

    it('should log business logic events', () => {
      structuredLogger.business('Order processed', { orderId: 'ORD123' });
      
      expect(mockCdsLogger.info).toHaveBeenCalledWith('Order processed', expect.objectContaining({
        level: 'INFO',
        data: { orderId: 'ORD123' }
      }));
    });

    it('should log security events', () => {
      structuredLogger.security('Security violation detected', { ip: '192.168.1.1' });
      
      expect(mockCdsLogger.warn).toHaveBeenCalledWith('Security violation detected', expect.objectContaining({
        level: 'WARN',
        data: { ip: '192.168.1.1' }
      }));
    });
  });

  describe('logError', () => {
    it('should log errors with full error details', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      (error as any).code = 'ERR_TEST';
      
      structuredLogger.logError('Operation failed', error, { operation: 'test' }, { userId: 'user123' });
      
      expect(mockCdsLogger.error).toHaveBeenCalledWith('Operation failed', expect.objectContaining({
        level: 'ERROR',
        data: {
          operation: 'test',
          error: {
            name: 'Error',
            message: 'Test error',
            stack: 'Error stack trace',
            code: 'ERR_TEST'
          }
        },
        context: expect.objectContaining({
          userId: 'user123'
        })
      }));
    });

    it('should handle errors without stack trace', () => {
      const error = new Error('Simple error');
      delete (error as any).stack;
      
      structuredLogger.logError('Simple operation failed', error);
      
      expect(mockCdsLogger.error).toHaveBeenCalledWith('Simple operation failed', expect.objectContaining({
        data: {
          error: {
            name: 'Error',
            message: 'Simple error',
            stack: undefined,
            code: undefined
          }
        }
      }));
    });
  });

  describe('logHttpRequest', () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
      mockReq = {
        method: 'POST',
        url: '/api/shiftbook',
        path: '/api/shiftbook',
        ip: '127.0.0.1',
        connection: { remoteAddress: '192.168.1.1' },
        user: { id: 'user123' },
        get: jest.fn((header: string) => {
          if (header === 'User-Agent') return 'Test-Agent/2.0';
          return undefined;
        })
      };

      mockRes = {
        statusCode: 200
      };

      structuredLogger.setCorrelationId('http-test-123');
    });

    it('should log successful HTTP requests as info', () => {
      structuredLogger.logHttpRequest(mockReq, mockRes, 150);
      
      expect(mockCdsLogger.info).toHaveBeenCalledWith('HTTP POST /api/shiftbook', expect.objectContaining({
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        correlationId: 'http-test-123',
        level: 'INFO',
        message: 'HTTP POST /api/shiftbook',
        data: {
          method: 'POST',
          url: '/api/shiftbook',
          path: '/api/shiftbook',
          statusCode: 200,
          duration: 150,
          userAgent: 'Test-Agent/2.0',
          ip: '127.0.0.1',
          correlationId: 'http-test-123'
        },
        context: expect.objectContaining({
          userId: 'user123',
          environment: 'development',
          service: 'shiftbook',
          version: '1.0.0'
        })
      }));
    });

    it('should log error HTTP requests as warn', () => {
      mockRes.statusCode = 500;
      
      structuredLogger.logHttpRequest(mockReq, mockRes, 250);
      
      expect(mockCdsLogger.warn).toHaveBeenCalledWith('HTTP POST /api/shiftbook', expect.objectContaining({
        data: expect.objectContaining({
          statusCode: 500,
          duration: 250
        })
      }));
    });

    it('should log client error HTTP requests as warn', () => {
      mockRes.statusCode = 404;
      
      structuredLogger.logHttpRequest(mockReq, mockRes, 50);
      
      expect(mockCdsLogger.warn).toHaveBeenCalledWith('HTTP POST /api/shiftbook', expect.objectContaining({
        data: expect.objectContaining({
          statusCode: 404
        })
      }));
    });

    it('should handle anonymous user', () => {
      delete mockReq.user;
      
      structuredLogger.logHttpRequest(mockReq, mockRes, 100);
      
      expect(mockCdsLogger.info).toHaveBeenCalledWith('HTTP POST /api/shiftbook', expect.objectContaining({
        context: expect.objectContaining({
          userId: 'anonymous'
        })
      }));
    });

    it('should use connection.remoteAddress when ip not available', () => {
      delete mockReq.ip;
      
      structuredLogger.logHttpRequest(mockReq, mockRes, 100);
      
      expect(mockCdsLogger.info).toHaveBeenCalledWith('HTTP POST /api/shiftbook', expect.objectContaining({
        data: expect.objectContaining({
          ip: '192.168.1.1'
        })
      }));
    });
  });

  describe('logDatabaseQuery', () => {
    it('should log successful database queries as debug', () => {
      structuredLogger.logDatabaseQuery('SELECT', 'ShiftBookLog', 50, true, { rowCount: 5 });
      
      expect(mockCdsLogger.debug).toHaveBeenCalledWith('Database SELECT on ShiftBookLog', expect.objectContaining({
        data: {
          operation: 'SELECT',
          entity: 'ShiftBookLog',
          duration: 50,
          success: true,
          correlationId: expect.any(String),
          rowCount: 5
        },
        context: expect.objectContaining({
          type: 'database_query'
        })
      }));
    });

    it('should log failed database queries as warn', () => {
      structuredLogger.logDatabaseQuery('INSERT', 'ShiftBookCategory', 200, false, { error: 'Constraint violation' });
      
      expect(mockCdsLogger.warn).toHaveBeenCalledWith('Database INSERT on ShiftBookCategory', expect.objectContaining({
        timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        level: 'WARN',
        data: expect.objectContaining({
          operation: 'INSERT',
          entity: 'ShiftBookCategory',
          duration: 200,
          success: false,
          error: 'Constraint violation'
        }),
        context: expect.objectContaining({
          type: 'database_query'
        })
      }));
    });
  });

  describe('logBusinessOperation', () => {
    it('should log business operations', () => {
      structuredLogger.logBusinessOperation('VALIDATE_SHIFT', 'ShiftBookLog', { shiftId: 'SHIFT123' }, { userId: 'operator1' });
      
      expect(mockCdsLogger.info).toHaveBeenCalledWith('Business operation: VALIDATE_SHIFT', expect.objectContaining({
        data: {
          operation: 'VALIDATE_SHIFT',
          entity: 'ShiftBookLog',
          correlationId: expect.any(String),
          shiftId: 'SHIFT123'
        },
        context: expect.objectContaining({
          userId: 'operator1'
        })
      }));
    });
  });

});