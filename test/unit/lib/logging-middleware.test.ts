import { jest } from '@jest/globals';

// Mock uuid
const mockUuidv4 = jest.fn();
jest.mock('uuid', () => ({
  v4: mockUuidv4
}));

// Mock structured logger
const mockStructuredLogger = {
  setCorrelationId: jest.fn(),
  info: jest.fn(),
  logHttpRequest: jest.fn(),
  logError: jest.fn(),
  auth: jest.fn(),
  logBusinessOperation: jest.fn()
};

jest.mock('../../../srv/lib/structured-logger', () => mockStructuredLogger);

// Import after mocking
const { 
  correlationIdMiddleware, 
  httpRequestLoggingMiddleware,
  errorLoggingMiddleware, 
  authenticationLoggingMiddleware, 
  businessOperationLoggingMiddleware, 
  initializeLoggingMiddleware 
} = require('../../../srv/lib/logging-middleware');

describe('LoggingMiddleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup UUID mock
    mockUuidv4.mockReturnValue('generated-uuid-123');
    
    // Setup request mock
    mockReq = {
      headers: {},
      method: 'GET',
      url: '/test/endpoint',
      path: '/test/endpoint',
      ip: '127.0.0.1',
      connection: { remoteAddress: '192.168.1.1' },
      user: { id: 'test-user-123' },
      get: jest.fn((header: string) => {
        const headers: { [key: string]: string } = {
          'User-Agent': 'Test-Agent/1.0'
        };
        return headers[header];
      }),
      startTime: 0
    };
    
    // Setup response mock
    mockRes = {
      setHeader: jest.fn(),
      end: jest.fn(),
      statusCode: 200
    };
    
    mockNext = jest.fn();
    
    // Reset structured logger mocks
    Object.keys(mockStructuredLogger).forEach(key => {
      (mockStructuredLogger as any)[key].mockClear();
    });
  });

  describe('correlationIdMiddleware', () => {
    it('should generate new correlation ID when none provided', () => {
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.setCorrelationId).toHaveBeenCalledWith('generated-uuid-123');
      expect(mockRes.setHeader).toHaveBeenCalledWith('x-correlation-id', 'generated-uuid-123');
    });

    it('should use existing x-correlation-id header', () => {
      mockReq.headers['x-correlation-id'] = 'existing-correlation-id';
      
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.setCorrelationId).toHaveBeenCalledWith('existing-correlation-id');
      expect(mockRes.setHeader).toHaveBeenCalledWith('x-correlation-id', 'existing-correlation-id');
      expect(mockUuidv4).not.toHaveBeenCalled();
    });

    it('should use x-correlationid header (without dash)', () => {
      mockReq.headers['x-correlationid'] = 'existing-correlationid';
      
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.setCorrelationId).toHaveBeenCalledWith('existing-correlationid');
    });

    it('should use x-request-id header as fallback', () => {
      mockReq.headers['x-request-id'] = 'request-id-123';
      
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.setCorrelationId).toHaveBeenCalledWith('request-id-123');
    });

    it('should use x-vcap-request-id header as fallback', () => {
      mockReq.headers['x-vcap-request-id'] = 'vcap-request-id-123';
      
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.setCorrelationId).toHaveBeenCalledWith('vcap-request-id-123');
    });

    it('should log request start with correct information', () => {
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.info).toHaveBeenCalledWith('app', 'Request started', {
        method: 'GET',
        url: '/test/endpoint',
        path: '/test/endpoint',
        userAgent: 'Test-Agent/1.0',
        ip: '127.0.0.1'
      }, {
        type: 'request_start',
        userId: 'test-user-123'
      });
    });

    it('should handle anonymous user', () => {
      delete mockReq.user;
      
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.info).toHaveBeenCalledWith('app', 'Request started', 
        expect.any(Object), 
        expect.objectContaining({
          userId: 'anonymous'
        })
      );
    });

    it('should use connection.remoteAddress when req.ip not available', () => {
      delete mockReq.ip;
      
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.info).toHaveBeenCalledWith('app', 'Request started', 
        expect.objectContaining({
          ip: '192.168.1.1'
        }), 
        expect.any(Object)
      );
    });

    it('should set start time on request', () => {
      const beforeTime = Date.now();
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      const afterTime = Date.now();
      
      expect(mockReq.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(mockReq.startTime).toBeLessThanOrEqual(afterTime);
    });

    it('should not override res.end (handled by httpRequestLoggingMiddleware)', () => {
      const originalEnd = mockRes.end;
      
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      
      // correlationIdMiddleware doesn't override res.end
      expect(mockRes.end).toBe(originalEnd);
    });

    it('should call next middleware', () => {
      correlationIdMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('httpRequestLoggingMiddleware', () => {
    it('should override res.end to log request completion', () => {
      const originalEnd = mockRes.end;
      const mockEnd = jest.fn();
      mockRes.end = mockEnd;
      
      httpRequestLoggingMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.end).not.toBe(originalEnd);
      expect(typeof mockRes.end).toBe('function');
      
      // Test that the overridden end function works
      const startTime = Date.now();
      mockReq.startTime = startTime - 100; // 100ms ago
      mockRes.end('test', 'utf8');
      
      expect(mockStructuredLogger.logHttpRequest).toHaveBeenCalledWith(mockReq, mockRes, expect.any(Number));
      expect(mockEnd).toHaveBeenCalledWith('test', 'utf8', undefined);
    });

    it('should call next middleware', () => {
      httpRequestLoggingMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('errorLoggingMiddleware', () => {
    let mockError: any;

    beforeEach(() => {
      mockError = new Error('Test error message');
      mockError.stack = 'Error stack trace';
    });

    it('should log error with structured logger', () => {
      errorLoggingMiddleware(mockError, mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.logError).toHaveBeenCalledWith('Request error occurred', mockError, {
        method: 'GET',
        url: '/test/endpoint',
        path: '/test/endpoint',
        ip: '127.0.0.1',
        userAgent: 'Test-Agent/1.0'
      }, {
        type: 'request_error',
        userId: 'test-user-123'
      });
    });

    it('should handle anonymous user in error logging', () => {
      delete mockReq.user;
      
      errorLoggingMiddleware(mockError, mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.logError).toHaveBeenCalledWith('Request error occurred', mockError, 
        expect.any(Object),
        expect.objectContaining({
          userId: 'anonymous'
        })
      );
    });

    it('should call next middleware', () => {
      errorLoggingMiddleware(mockError, mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });

    it('should handle missing user agent', () => {
      mockReq.get.mockReturnValue(undefined);
      
      errorLoggingMiddleware(mockError, mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.logError).toHaveBeenCalledWith('Request error occurred', mockError, 
        expect.objectContaining({
          userAgent: undefined
        }),
        expect.any(Object)
      );
    });
  });

  describe('authenticationLoggingMiddleware', () => {
    it('should log authentication attempt when authorization header is present', () => {
      mockReq.headers.authorization = 'Bearer token123';
      
      authenticationLoggingMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.auth).toHaveBeenCalledWith('Authentication attempt', {
        method: 'GET',
        path: '/test/endpoint',
        hasToken: true,
        tokenType: 'Bearer'
      }, {
        type: 'auth_attempt',
        ip: '127.0.0.1'
      });
    });

    it('should not log when no authorization header is present', () => {
      authenticationLoggingMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.auth).not.toHaveBeenCalled();
    });

    it('should handle Basic auth', () => {
      mockReq.headers.authorization = 'Basic dGVzdDp0ZXN0';
      
      authenticationLoggingMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.auth).toHaveBeenCalledWith('Authentication attempt', 
        expect.objectContaining({
          tokenType: 'Basic'
        }),
        expect.any(Object)
      );
    });

    it('should call next middleware', () => {
      authenticationLoggingMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('businessOperationLoggingMiddleware', () => {
    it('should create middleware that logs business operation', () => {
      const middleware = businessOperationLoggingMiddleware('CREATE_SHIFT', 'ShiftBookLog');
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.logBusinessOperation).toHaveBeenCalledWith(
        'CREATE_SHIFT',
        'ShiftBookLog',
        {
          method: 'GET',
          path: '/test/endpoint',
          userId: 'test-user-123'
        },
        {
          type: 'business_operation',
          ip: '127.0.0.1'
        }
      );
    });

    it('should handle anonymous user', () => {
      delete mockReq.user;
      const middleware = businessOperationLoggingMiddleware('UPDATE_SHIFT', 'ShiftBookLog');
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockStructuredLogger.logBusinessOperation).toHaveBeenCalledWith(
        'UPDATE_SHIFT',
        'ShiftBookLog',
        expect.objectContaining({
          userId: 'anonymous'
        }),
        expect.any(Object)
      );
    });

    it('should call next middleware', () => {
      const middleware = businessOperationLoggingMiddleware('DELETE_SHIFT', 'ShiftBookLog');
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('initializeLoggingMiddleware', () => {
    let mockApp: any;

    beforeEach(() => {
      mockApp = {
        use: jest.fn()
      };
    });

    it('should register all middleware in correct order', () => {
      initializeLoggingMiddleware(mockApp);
      
      expect(mockApp.use).toHaveBeenCalledTimes(3);
      expect(mockApp.use).toHaveBeenNthCalledWith(1, correlationIdMiddleware);
      expect(mockApp.use).toHaveBeenNthCalledWith(2, httpRequestLoggingMiddleware);
      expect(mockApp.use).toHaveBeenNthCalledWith(3, authenticationLoggingMiddleware);
    });
  });
});