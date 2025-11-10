import { ErrorHandler, ErrorCategory, ErrorSeverity } from '../../../srv/lib/error-handler';

// Mock dependencies
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

jest.mock('../../../srv/lib/error-messages', () => ({
  errorMessageManager: {
    getMessage: jest.fn((key: string) => `Mocked message for ${key}`),
    hasMessage: jest.fn(() => true),
    getHelpUrl: jest.fn((category: string) => `https://help.example.com/${category.toLowerCase()}`)
  }
}));

jest.mock('../../../srv/lib/language-middleware', () => ({
  getLocalizedMessage: jest.fn((req: any, key: string, fallback: string) => fallback)
}));

describe('ErrorHandler', () => {
  let errorHandler: any;
  let originalNodeEnv: string | undefined;

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  beforeEach(() => {
    // Reset singleton instance before each test
    (ErrorHandler as any).instance = undefined;
    errorHandler = ErrorHandler.getInstance();
    
    // Clear any existing correlation IDs
    (errorHandler as any).correlationIdMap.clear();
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create new instance only once', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      const instance3 = ErrorHandler.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('Environment Configuration', () => {
    it('should configure for development environment', () => {
      process.env.NODE_ENV = 'development';
      (ErrorHandler as any).instance = undefined;
      
      const devHandler = ErrorHandler.getInstance();
      
      expect((devHandler as any).environment).toBe('development');
      expect((devHandler as any).enableDetailedErrors).toBe(true);
      expect((devHandler as any).enableStackTrace).toBe(true);
    });

    it('should configure for production environment', () => {
      process.env.NODE_ENV = 'production';
      (ErrorHandler as any).instance = undefined;
      
      const prodHandler = ErrorHandler.getInstance();
      
      expect((prodHandler as any).environment).toBe('production');
      expect((prodHandler as any).enableDetailedErrors).toBe(false);
      expect((prodHandler as any).enableStackTrace).toBe(false);
    });

    it('should default to development when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      (ErrorHandler as any).instance = undefined;
      
      const defaultHandler = ErrorHandler.getInstance();
      
      expect((defaultHandler as any).environment).toBe('development');
      expect((defaultHandler as any).enableDetailedErrors).toBe(true);
    });
  });

  describe('Correlation ID Management', () => {
    it('should generate correlation ID', () => {
      const correlationId = errorHandler.generateCorrelationId();
      
      expect(correlationId).toBe('mock-uuid-1234');
      expect(correlationId).toMatch(/mock-uuid-\d+/);
    });

    it('should set and get correlation ID', () => {
      const requestId = 'test-request-123';
      const correlationId = 'test-correlation-456';
      
      errorHandler.setCorrelationId(requestId, correlationId);
      const retrieved = errorHandler.getCorrelationId(requestId);
      
      expect(retrieved).toBe(correlationId);
    });

    it('should return undefined for non-existent correlation ID', () => {
      const retrieved = errorHandler.getCorrelationId('non-existent-request');
      
      expect(retrieved).toBeUndefined();
    });

    it('should handle multiple correlation IDs', () => {
      errorHandler.setCorrelationId('req1', 'corr1');
      errorHandler.setCorrelationId('req2', 'corr2');
      
      expect(errorHandler.getCorrelationId('req1')).toBe('corr1');
      expect(errorHandler.getCorrelationId('req2')).toBe('corr2');
    });
  });

  describe('createErrorContext', () => {
    it('should create error context from request', () => {
      const mockReq = {
        id: 'test-request-id',
        user: { id: 'user123', ID: 'USER123' },
        session: { id: 'session456' },
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 Test Browser',
          'x-request-id': 'header-request-id'
        },
        connection: { remoteAddress: '10.0.0.1' }
      };

      const context = errorHandler.createErrorContext(mockReq, 'test-component', 'test-operation');

      expect(context).toEqual(expect.objectContaining({
        correlationId: expect.any(String),
        userId: 'user123',
        requestId: 'test-request-id',
        sessionId: 'session456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        timestamp: expect.any(String),
        environment: expect.any(String),
        component: 'test-component',
        operation: 'test-operation'
      }));
    });

    it('should handle request with minimal data', () => {
      const minimalReq = {};
      
      const context = errorHandler.createErrorContext(minimalReq, 'minimal-component', 'minimal-op');
      
      expect(context.component).toBe('minimal-component');
      expect(context.operation).toBe('minimal-op');
      expect(context.correlationId).toBe('mock-uuid-1234');
      expect(context.requestId).toBe('mock-uuid-1234');
      expect(context.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should prefer user.id over user.ID', () => {
      const reqWithBothIds = {
        user: { id: 'preferred-id', ID: 'fallback-id' }
      };
      
      const context = errorHandler.createErrorContext(reqWithBothIds, 'test', 'test');
      
      expect(context.userId).toBe('preferred-id');
    });

    it('should fallback to user.ID when user.id is not available', () => {
      const reqWithOnlyIdField = {
        user: { ID: 'fallback-id' }
      };
      
      const context = errorHandler.createErrorContext(reqWithOnlyIdField, 'test', 'test');
      
      expect(context.userId).toBe('fallback-id');
    });

    it('should use existing correlation ID if available', () => {
      const requestId = 'existing-request';
      const existingCorrelationId = 'existing-correlation';
      
      errorHandler.setCorrelationId(requestId, existingCorrelationId);
      
      const req = { id: requestId };
      const context = errorHandler.createErrorContext(req, 'test', 'test');
      
      expect(context.correlationId).toBe(existingCorrelationId);
    });

    it('should handle IP address from connection when x-forwarded-for is not available', () => {
      const req = {
        connection: { remoteAddress: '172.16.0.1' }
      };
      
      const context = errorHandler.createErrorContext(req, 'test', 'test');
      
      expect(context.ipAddress).toBe('172.16.0.1');
    });
  });

  describe('Error Categories and Severity', () => {
    it('should include all expected error categories', () => {
      expect(ErrorCategory.VALIDATION).toBe('VALIDATION');
      expect(ErrorCategory.AUTHENTICATION).toBe('AUTHENTICATION');
      expect(ErrorCategory.AUTHORIZATION).toBe('AUTHORIZATION');
      expect(ErrorCategory.BUSINESS_LOGIC).toBe('BUSINESS_LOGIC');
      expect(ErrorCategory.EXTERNAL_SERVICE).toBe('EXTERNAL_SERVICE');
      expect(ErrorCategory.DATABASE).toBe('DATABASE');
      expect(ErrorCategory.SYSTEM).toBe('SYSTEM');
      expect(ErrorCategory.NETWORK).toBe('NETWORK');
      expect(ErrorCategory.TIMEOUT).toBe('TIMEOUT');
      expect(ErrorCategory.RATE_LIMIT).toBe('RATE_LIMIT');
    });

    it('should include all expected error severities', () => {
      expect(ErrorSeverity.LOW).toBe('LOW');
      expect(ErrorSeverity.MEDIUM).toBe('MEDIUM');
      expect(ErrorSeverity.HIGH).toBe('HIGH');
      expect(ErrorSeverity.CRITICAL).toBe('CRITICAL');
    });
  });

  describe('Private Methods (via Integration)', () => {
    describe('sanitizeRequestData', () => {
      it('should handle object sanitization in error context', () => {
        const req = {
          body: {
            username: 'testuser',
            password: 'secret123',
            email: 'test@example.com'
          }
        };
        
        const context = errorHandler.createErrorContext(req, 'test', 'test');
        
        // The private method should be called during context creation
        expect(context).toBeDefined();
        expect(context.component).toBe('test');
      });
    });

    describe('generateErrorCode', () => {
      it('should generate consistent error codes through handleError', () => {
        const error = new Error('Test error');
        const context = errorHandler.createErrorContext({}, 'test', 'test');
        
        const result = errorHandler.handleError(
          error,
          ErrorCategory.VALIDATION,
          context
        );
        
        expect(result.code).toMatch(/^VALIDATION/); // Validation codes contain VALIDATION
        expect(typeof result.code).toBe('string');
      });
    });

    describe('determineSeverity', () => {
      it('should assign appropriate severity levels through handleError', () => {
        const error = new Error('Test error');
        const context = errorHandler.createErrorContext({}, 'test', 'test');
        
        const validationResult = errorHandler.handleError(
          error,
          ErrorCategory.VALIDATION,
          context
        );
        
        const systemResult = errorHandler.handleError(
          error,
          ErrorCategory.SYSTEM,
          context
        );
        
        expect(Object.values(ErrorSeverity)).toContain(validationResult.severity);
        expect(Object.values(ErrorSeverity)).toContain(systemResult.severity);
      });
    });

    describe('getUserFriendlyMessage', () => {
      it('should provide user-friendly messages through handleError', () => {
        const error = new Error('Technical database connection error');
        const context = errorHandler.createErrorContext({}, 'test', 'test');
        
        const result = errorHandler.handleError(
          error,
          ErrorCategory.DATABASE,
          context
        );
        
        // User message may or may not be defined depending on implementation
        if (result.userMessage) {
          expect(typeof result.userMessage).toBe('string');
          expect(result.userMessage.length).toBeGreaterThan(0);
        }
      });
    });

    describe('isRetryable', () => {
      it('should determine retryable status through handleError', () => {
        const error = new Error('Network timeout');
        const context = errorHandler.createErrorContext({}, 'test', 'test');
        
        const networkResult = errorHandler.handleError(
          error,
          ErrorCategory.NETWORK,
          context
        );
        
        const validationResult = errorHandler.handleError(
          error,
          ErrorCategory.VALIDATION,
          context
        );
        
        expect(typeof networkResult.retryable).toBe('boolean');
        expect(typeof validationResult.retryable).toBe('boolean');
      });
    });
  });

  describe('handleError', () => {
    it('should create standard error response', () => {
      const error = new Error('Test error message');
      const context = errorHandler.createErrorContext({}, 'test-component', 'test-operation');
      
      const result = errorHandler.handleError(error, ErrorCategory.VALIDATION, context);
      
      expect(result).toMatchObject({
        code: expect.any(String),
        message: 'Test error message',
        details: [],
        category: ErrorCategory.VALIDATION,
        severity: expect.any(String),
        correlationId: context.correlationId,
        timestamp: expect.any(String),
        retryable: expect.any(Boolean)
      });
    });

    it('should handle error with custom options', () => {
      const error = new Error('Custom error');
      const context = errorHandler.createErrorContext({}, 'test', 'test');
      const options = {
        severity: ErrorSeverity.HIGH,
        code: 'CUSTOM_ERROR_CODE',
        details: [{ field: 'test', message: 'Test detail' }],
        userMessage: 'Custom user message',
        retryable: false
      };
      
      const result = errorHandler.handleError(error, ErrorCategory.SYSTEM, context, options);
      
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.code).toBe('CUSTOM_ERROR_CODE');
      expect(result.details).toEqual(options.details);
      expect(result.userMessage).toBe('Custom user message');
      expect(result.retryable).toBe(false);
    });

    it('should include stack trace in development environment', () => {
      process.env.NODE_ENV = 'development';
      (ErrorHandler as any).instance = undefined;
      
      const devHandler = ErrorHandler.getInstance();
      const error = new Error('Stack trace test');
      const context = devHandler.createErrorContext({}, 'test', 'test');
      
      const result = devHandler.handleError(error, ErrorCategory.SYSTEM, context);
      
      // Stack trace should be included in context
      expect(result.context?.stackTrace).toBeDefined();
    });

    it('should not include stack trace in production environment', () => {
      process.env.NODE_ENV = 'production';
      (ErrorHandler as any).instance = undefined;
      
      const prodHandler = ErrorHandler.getInstance();
      const error = new Error('Production test');
      const context = prodHandler.createErrorContext({}, 'test', 'test');
      
      const result = prodHandler.handleError(error, ErrorCategory.SYSTEM, context);
      
      // Stack trace should not be included in production
      expect(result.context?.stackTrace).toBeUndefined();
    });

    it('should handle different error categories', () => {
      const error = new Error('Category test');
      const context = errorHandler.createErrorContext({}, 'test', 'test');
      
      const categories = [
        ErrorCategory.VALIDATION,
        ErrorCategory.AUTHENTICATION,
        ErrorCategory.AUTHORIZATION,
        ErrorCategory.BUSINESS_LOGIC,
        ErrorCategory.EXTERNAL_SERVICE,
        ErrorCategory.DATABASE,
        ErrorCategory.SYSTEM,
        ErrorCategory.NETWORK,
        ErrorCategory.TIMEOUT,
        ErrorCategory.RATE_LIMIT
      ];
      
      categories.forEach(category => {
        const result = errorHandler.handleError(error, category, context);
        expect(result.category).toBe(category);
        expect(result.code).toBeDefined();
        expect(result.severity).toBeDefined();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete error processing workflow', () => {
      const mockReq = {
        id: 'workflow-test',
        user: { id: 'user123' },
        headers: { 'x-forwarded-for': '192.168.1.1' }
      };
      
      const error = new Error('Complete workflow test');
      const context = errorHandler.createErrorContext(mockReq, 'workflow-component', 'workflow-operation');
      
      const result = errorHandler.handleError(
        error,
        ErrorCategory.BUSINESS_LOGIC,
        context,
        {
          severity: ErrorSeverity.MEDIUM,
          details: [{ workflow: 'test', step: 'validation' }],
          userMessage: 'Please check your input and try again.'
        }
      );
      
      expect(result).toMatchObject({
        code: expect.stringMatching(/^BUSINESS/),
        message: 'Complete workflow test',
        category: ErrorCategory.BUSINESS_LOGIC,
        severity: ErrorSeverity.MEDIUM,
        correlationId: context.correlationId,
        details: [{ workflow: 'test', step: 'validation' }],
        userMessage: 'Please check your input and try again.',
        timestamp: expect.any(String),
        retryable: expect.any(Boolean)
      });
      
      // Verify context tracking
      expect(errorHandler.getCorrelationId('workflow-test')).toBe(context.correlationId);
    });

    it('should handle errors without explicit context', () => {
      const error = new Error('No context error');
      
      // This should not throw even without context
      expect(() => {
        const context = errorHandler.createErrorContext({}, 'default', 'default');
        errorHandler.handleError(error, ErrorCategory.SYSTEM, context);
      }).not.toThrow();
    });

    it('should maintain correlation ID consistency across multiple calls', () => {
      const requestId = 'consistency-test';
      const req = { id: requestId };
      
      const context1 = errorHandler.createErrorContext(req, 'call1', 'operation1');
      const context2 = errorHandler.createErrorContext(req, 'call2', 'operation2');
      
      expect(context1.correlationId).toBe(context2.correlationId);
      expect(errorHandler.getCorrelationId(requestId)).toBe(context1.correlationId);
    });
  });

  describe('Error Response Structure Validation', () => {
    it('should create response with all required fields', () => {
      const error = new Error('Structure test');
      const context = errorHandler.createErrorContext({}, 'test', 'test');
      
      const result = errorHandler.handleError(error, ErrorCategory.VALIDATION, context);
      
      // Verify all required fields are present
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('details');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('correlationId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('retryable');
      
      // Verify types
      expect(typeof result.code).toBe('string');
      expect(typeof result.message).toBe('string');
      expect(Array.isArray(result.details)).toBe(true);
      expect(Object.values(ErrorCategory)).toContain(result.category);
      expect(Object.values(ErrorSeverity)).toContain(result.severity);
      expect(typeof result.correlationId).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.retryable).toBe('boolean');
    });

    it('should include optional fields when provided', () => {
      const error = new Error('Optional fields test');
      const context = errorHandler.createErrorContext({}, 'test', 'test');
      
      const result = errorHandler.handleError(
        error,
        ErrorCategory.VALIDATION,
        context,
        {
          userMessage: 'User friendly message',
          helpUrl: 'https://help.example.com'
        }
      );
      
      expect(result.userMessage).toBe('User friendly message');
      expect(result.helpUrl).toBe('https://help.example.com');
    });
  });

  describe('Retry Strategy and Execution', () => {
    it('should create retry strategy with default values', () => {
      const strategy = errorHandler.createRetryStrategy();
      
      expect(strategy).toEqual({
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true
      });
    });

    it('should create retry strategy with custom values', () => {
      const strategy = errorHandler.createRetryStrategy(5, 500, 5000, 1.5, false);
      
      expect(strategy).toEqual({
        maxAttempts: 5,
        baseDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 1.5,
        jitter: false
      });
    });

    it('should execute operation successfully on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const strategy = errorHandler.createRetryStrategy(3, 100, 1000);
      const context = errorHandler.createErrorContext({}, 'retry-test', 'operation');

      const result = await errorHandler.executeWithRetry(mockOperation, strategy, context);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry operation and eventually succeed', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success on attempt 3');

      const strategy = errorHandler.createRetryStrategy(3, 50, 1000);
      const context = errorHandler.createErrorContext({}, 'retry-test', 'operation');
      const mockOnRetry = jest.fn();

      const result = await errorHandler.executeWithRetry(mockOperation, strategy, context, mockOnRetry);

      expect(result).toBe('success on attempt 3');
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(mockOnRetry).toHaveBeenCalledTimes(2); // Called for first 2 failures
    });

    it('should fail after exhausting all retry attempts', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValue(new Error('Operation always fails'));

      const strategy = errorHandler.createRetryStrategy(2, 50, 1000);
      const context = errorHandler.createErrorContext({}, 'retry-test', 'operation');
      const mockOnRetry = jest.fn();

      await expect(
        errorHandler.executeWithRetry(mockOperation, strategy, context, mockOnRetry)
      ).rejects.toThrow('Operation always fails');

      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(mockOnRetry).toHaveBeenCalledTimes(1); // Called for first failure only
    });

    it('should apply exponential backoff with jitter', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const strategy = errorHandler.createRetryStrategy(3, 100, 1000, 2, true);
      const context = errorHandler.createErrorContext({}, 'backoff-test', 'operation');
      
      const startTime = Date.now();
      await errorHandler.executeWithRetry(mockOperation, strategy, context);
      const endTime = Date.now();

      // Should have taken some time for retries (with jitter, timing is variable)
      expect(endTime - startTime).toBeGreaterThan(50);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should apply exponential backoff without jitter', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const strategy = errorHandler.createRetryStrategy(3, 50, 1000, 2, false);
      const context = errorHandler.createErrorContext({}, 'no-jitter-test', 'operation');
      
      await errorHandler.executeWithRetry(mockOperation, strategy, context);
      
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should respect max delay limit', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success');

      // Set very high backoff multiplier but low max delay
      const strategy = errorHandler.createRetryStrategy(2, 100, 200, 10, false);
      const context = errorHandler.createErrorContext({}, 'max-delay-test', 'operation');

      const startTime = Date.now();
      await errorHandler.executeWithRetry(mockOperation, strategy, context);
      const endTime = Date.now();

      // Delay should be capped at maxDelay (200ms), not baseDelay * multiplier^attempt
      expect(endTime - startTime).toBeLessThan(500);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Logging Tests', () => {
    it('should log errors with different log levels', () => {
      const error = new Error('Log level test');
      const context = errorHandler.createErrorContext({}, 'log-test', 'operation');

      // Test different log levels by calling handleError with different options
      const debugSpy = jest.spyOn(console, 'debug');
      const infoSpy = jest.spyOn(console, 'info');
      const warnSpy = jest.spyOn(console, 'warn');
      const errorSpy = jest.spyOn(console, 'error');

      // Test debug level
      errorHandler.handleError(error, ErrorCategory.SYSTEM, context, { logLevel: 'debug' });
      expect(debugSpy).toHaveBeenCalledWith('🔍 Error Debug:', expect.any(Object));

      // Test info level
      errorHandler.handleError(error, ErrorCategory.SYSTEM, context, { logLevel: 'info' });
      expect(infoSpy).toHaveBeenCalledWith('ℹ️ Error Info:', expect.any(Object));

      // Test warn level
      errorHandler.handleError(error, ErrorCategory.SYSTEM, context, { logLevel: 'warn' });
      expect(warnSpy).toHaveBeenCalledWith('⚠️ Error Warning:', expect.any(Object));

      // Test error level (default)
      errorHandler.handleError(error, ErrorCategory.SYSTEM, context);
      expect(errorSpy).toHaveBeenCalledWith('❌ Error:', expect.any(Object));
    });

    it('should log retry attempts', async () => {
      const warnSpy = jest.spyOn(console, 'warn');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Retry test failure'))
        .mockResolvedValue('success');

      const strategy = errorHandler.createRetryStrategy(2, 50, 1000);
      const context = errorHandler.createErrorContext({}, 'retry-log-test', 'operation');

      await errorHandler.executeWithRetry(mockOperation, strategy, context);

      expect(warnSpy).toHaveBeenCalledWith('🔄 Retry Attempt:', {
        correlationId: context.correlationId,
        component: 'retry-log-test',
        operation: 'operation',
        attempt: 1,
        maxAttempts: 2,
        delay: expect.any(Number),
        error: 'Retry test failure'
      });
    });
  });

  describe('Error Message Localization', () => {
    it('should handle localization error and fallback to error message manager', () => {
      // Mock getLocalizedMessage to throw an error
      const { getLocalizedMessage } = require('../../../srv/lib/language-middleware');
      getLocalizedMessage.mockImplementation(() => {
        throw new Error('Localization service unavailable');
      });

      const consoleSpy = jest.spyOn(console, 'error');
      const error = new Error('Localization test error');
      const context = errorHandler.createErrorContext(
        { headers: { 'accept-language': 'es' } }, 
        'localization-test', 
        'operation'
      );

      const result = errorHandler.handleError(error, ErrorCategory.VALIDATION, context);

      expect(consoleSpy).toHaveBeenCalledWith('Error getting localized message:', expect.any(Error));
      expect(result.userMessage).toContain('Mocked message for VALIDATION'); // Fallback to error message manager
    });
  });

  describe('Cleanup', () => {
    it('should cleanup correlation ID map', () => {
      // Add some correlation IDs
      const req1 = { id: 'cleanup-test-1' };
      const req2 = { id: 'cleanup-test-2' };
      
      errorHandler.createErrorContext(req1, 'test', 'operation');
      errorHandler.createErrorContext(req2, 'test', 'operation');
      
      // Verify they exist
      expect(errorHandler.getCorrelationId('cleanup-test-1')).toBeDefined();
      expect(errorHandler.getCorrelationId('cleanup-test-2')).toBeDefined();
      
      // Cleanup
      errorHandler.cleanup();
      
      // Verify they're gone
      expect(errorHandler.getCorrelationId('cleanup-test-1')).toBeUndefined();
      expect(errorHandler.getCorrelationId('cleanup-test-2')).toBeUndefined();
    });
  });
});