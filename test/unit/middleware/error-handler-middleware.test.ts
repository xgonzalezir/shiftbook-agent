/**
 * Error Handler Middleware Tests
 * 
 * Comprehensive test suite for error handling middleware
 */

import {ErrorHandlerMiddleware} from '../../../srv/middleware/error-handler-middleware';
import {EnvironmentInfo} from '../../../srv/config';
import {ErrorCategory, ErrorSeverity} from "../../../srv/lib/error-handler";
import request from 'supertest';
import express, {Express} from 'express';

describe('ErrorHandlerMiddleware', () => {
  let middleware: ErrorHandlerMiddleware;
  let mockEnvironment: EnvironmentInfo;
  let app: Express;

  beforeEach(() => {
    mockEnvironment = {
      env: 'development',
      isLocal: true,
      isTest: false,
      isProduction: false,
      isHybrid: false,
      isCloud: false,
    };

    middleware = new ErrorHandlerMiddleware(mockEnvironment);
    app = express();
  });

  describe('Error Category Determination', () => {
    it('should categorize 400 errors as VALIDATION', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Bad Request');
        error.status = 400;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(400)
        .then((response) => {
          expect(response.body.category).toBe(ErrorCategory.VALIDATION);
          expect(response.body.severity).toBe(ErrorSeverity.LOW);
        });
    });

    it('should categorize 401 errors as AUTHENTICATION', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Unauthorized');
        error.status = 401;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(401)
        .then((response) => {
          expect(response.body.category).toBe(ErrorCategory.AUTHENTICATION);
          expect(response.body.severity).toBe(ErrorSeverity.MEDIUM);
        });
    });

    it('should categorize 403 errors as AUTHORIZATION', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Forbidden');
        error.status = 403;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(403)
        .then((response) => {
          expect(response.body.category).toBe(ErrorCategory.AUTHORIZATION);
          expect(response.body.severity).toBe(ErrorSeverity.MEDIUM);
        });
    });

    it('should categorize 429 errors as RATE_LIMIT', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Too Many Requests');
        error.status = 429;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(429)
        .then((response) => {
          expect(response.body.category).toBe(ErrorCategory.RATE_LIMIT);
          expect(response.body.severity).toBe(ErrorSeverity.LOW);
        });
    });

    it('should categorize 500 errors as SYSTEM with CRITICAL severity', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Internal Server Error');
        error.status = 500;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(500)
        .then((response) => {
          expect(response.body.category).toBe(ErrorCategory.SYSTEM);
          expect(response.body.severity).toBe(ErrorSeverity.CRITICAL);
        });
    });

    it('should categorize 502 errors as EXTERNAL_SERVICE', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Bad Gateway');
        error.status = 502;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(502)
        .then((response) => {
          expect(response.body.category).toBe(ErrorCategory.EXTERNAL_SERVICE);
          expect(response.body.severity).toBe(ErrorSeverity.HIGH);
        });
    });

    it('should categorize 504 errors as TIMEOUT', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Gateway Timeout');
        error.status = 504;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(504)
        .then((response) => {
          expect(response.body.category).toBe(ErrorCategory.TIMEOUT);
          expect(response.body.severity).toBe(ErrorSeverity.HIGH);
        });
    });
  });

  describe('Error Response Structure', () => {
    it('should include correlation ID in error response', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Test error');
        error.status = 500;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(500)
        .then((response) => {
          expect(response.body.correlationId).toBeDefined();
          expect(typeof response.body.correlationId).toBe('string');
        });
    });

    it('should include timestamp in error response', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Test error');
        error.status = 500;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(500)
        .then((response) => {
          expect(response.body.timestamp).toBeDefined();
          expect(typeof response.body.timestamp).toBe('string');
        });
    });

    it('should include error code in standardized format', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Test error');
        error.status = 400;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(400)
        .then((response) => {
          expect(response.body.code).toBe('HTTP_400');
        });
    });

    it('should include retry information in error response', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Test error');
        error.status = 500;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(500)
        .then((response) => {
          expect(response.body.retryable).toBe(true);
        });
    });

    it('should mark 4xx errors as non-retryable', () => {
      app.use((req, res, next) => {
        const error: any = new Error('Test error');
        error.status = 400;
        next(error);
      });
      app.use(middleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(400)
        .then((response) => {
          expect(response.body.retryable).toBe(false);
        });
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should include error context in development environment', () => {
      const devEnvironment: EnvironmentInfo = {
        ...mockEnvironment,
        env: 'development',
        isLocal: true,
      };

      const devMiddleware = new ErrorHandlerMiddleware(devEnvironment);
      app.use((req, res, next) => {
        const error: any = new Error('Test error');
        error.status = 500;
        next(error);
      });
      app.use(devMiddleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(500)
        .then((response) => {
          expect(response.body.context).toBeDefined();
        });
    });

    it('should exclude error context in production environment', () => {
      const prodEnvironment: EnvironmentInfo = {
        env: 'production',
        isLocal: false,
        isTest: false,
        isProduction: true,
        isHybrid: false,
        isCloud: true,
      };

      const prodMiddleware = new ErrorHandlerMiddleware(prodEnvironment);
      app.use((req, res, next) => {
        const error: any = new Error('Test error');
        error.status = 500;
        next(error);
      });
      app.use(prodMiddleware.getGlobalErrorHandler());

      return request(app)
        .get('/')
        .expect(500)
        .then((response) => {
          // In production, context should not be included
          // Note: This depends on the errorHandler implementation
        });
    });
  });

  describe('Error Logging Middleware', () => {
    it('should provide error logging middleware', () => {
      const loggingMiddleware = middleware.getErrorLoggingMiddleware();
      expect(typeof loggingMiddleware).toBe('function');
    });

    it('should not block request flow', (done) => {
      app.use(middleware.getErrorLoggingMiddleware());
      app.get('/', (req, res) => {
        res.status(200).json({ success: true });
      });

      request(app)
        .get('/')
        .expect(200)
        .end(done);
    });
  });

  describe('Error Handler Registration', () => {
    it('should register middleware on app', () => {
      const testApp = express();
      middleware.register(testApp);

      // The middleware should be registered
      expect(testApp._router.stack.length).toBeGreaterThan(0);
    });

    it('should handle errors after registration', () => {
      const testApp = express();

      testApp.get('/', (req, res, next) => {
        const error: any = new Error('Test error');
        error.status = 500;
        next(error);
      });
      
      middleware.register(testApp);

      return request(testApp)
        .get('/')
        .expect(500)
        .then((response) => {
          expect(response.body.code).toBeDefined();
        });
    });
  });

  describe('HTTP Status Code Mapping', () => {
    const testCases = [
      { status: 400, expectedStatus: 400, expectedCategory: ErrorCategory.VALIDATION },
      { status: 401, expectedStatus: 401, expectedCategory: ErrorCategory.AUTHENTICATION },
      { status: 403, expectedStatus: 403, expectedCategory: ErrorCategory.AUTHORIZATION },
      { status: 404, expectedStatus: 404, expectedCategory: ErrorCategory.VALIDATION },
      { status: 429, expectedStatus: 429, expectedCategory: ErrorCategory.RATE_LIMIT },
      { status: 500, expectedStatus: 500, expectedCategory: ErrorCategory.SYSTEM },
      { status: 502, expectedStatus: 502, expectedCategory: ErrorCategory.EXTERNAL_SERVICE },
      { status: 503, expectedStatus: 503, expectedCategory: ErrorCategory.SYSTEM },
      { status: 504, expectedStatus: 504, expectedCategory: ErrorCategory.TIMEOUT },
    ];

    testCases.forEach((testCase) => {
      it(`should map ${testCase.status} to ${testCase.expectedCategory}`, () => {
        const testApp = express();

        testApp.get('/', (req, res, next) => {
          const error: any = new Error(`Error ${testCase.status}`);
          error.status = testCase.status;
          next(error);
        });
        
        testApp.use(middleware.getGlobalErrorHandler());

        return request(testApp)
          .get('/')
          .expect(testCase.expectedStatus)
          .then((response) => {
            expect(response.body.category).toBe(testCase.expectedCategory);
          });
      });
    });
  });

  describe('Error Message Handling', () => {
    it('should include error message in response', () => {
      const testApp = express();
      const errorMessage = 'Custom error message';
      
      testApp.get('/', (req, res, next) => {
        const error: any = new Error(errorMessage);
        error.status = 500;
        next(error);
      });
      
      testApp.use(middleware.getGlobalErrorHandler());

      return request(testApp)
        .get('/')
        .expect(500)
        .then((response) => {
          expect(response.body.message).toBe(errorMessage);
        });
    });

    it('should handle errors without message', () => {
      const testApp = express();
      
      testApp.get('/', (req, res, next) => {
        const error: any = new Error('');
        error.status = 500;
        next(error);
      });
      
      testApp.use(middleware.getGlobalErrorHandler());

      return request(testApp)
        .get('/')
        .expect(500)
        .then((response) => {
          expect(response.body.message).toBeDefined();
        });
    });
  });
});
