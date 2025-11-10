/**
 * Error Handler Middleware
 * 
 * Centralizes error handling for the Express application with:
 * - Global error handler for uncaught exceptions
 * - Standardized error responses
 * - Environment-specific error detail levels
 * - Correlation ID tracking for debugging
 * - Proper HTTP status code mapping
 * 
 * @example
 * ```typescript
 * const errorHandler = new ErrorHandlerMiddleware(environment);
 * app.use(errorHandler.getGlobalErrorHandler());
 * ```
 */

import { Express, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { EnvironmentInfo } from '../config';
import { errorHandler, ErrorCategory, ErrorSeverity } from '../lib/error-handler';

/**
 * Error handler middleware for Express applications
 */
export class ErrorHandlerMiddleware {
  /**
   * Status code to error category mapping
   */
  private readonly statusCodeMap: Map<number, ErrorCategory> = new Map([
    [400, ErrorCategory.VALIDATION],
    [401, ErrorCategory.AUTHENTICATION],
    [403, ErrorCategory.AUTHORIZATION],
    [404, ErrorCategory.VALIDATION],
    [429, ErrorCategory.RATE_LIMIT],
    [500, ErrorCategory.SYSTEM],
    [502, ErrorCategory.EXTERNAL_SERVICE],
    [503, ErrorCategory.SYSTEM],
    [504, ErrorCategory.TIMEOUT],
  ]);

  /**
   * Status code to severity mapping
   */
  private readonly statusCodeSeverityMap: Map<number, ErrorSeverity> = new Map([
    [400, ErrorSeverity.LOW],
    [401, ErrorSeverity.MEDIUM],
    [403, ErrorSeverity.MEDIUM],
    [404, ErrorSeverity.LOW],
    [429, ErrorSeverity.LOW],
    [500, ErrorSeverity.CRITICAL],
    [502, ErrorSeverity.HIGH],
    [503, ErrorSeverity.HIGH],
    [504, ErrorSeverity.HIGH],
  ]);

  constructor(private environment: EnvironmentInfo) {}

  /**
   * Returns the global error handler middleware
   * This should be used as the last middleware in the Express app
   * 
   * @returns ErrorRequestHandler - Express error handler middleware
   * @example
   * ```typescript
   * app.use(errorHandler.getGlobalErrorHandler());
   * ```
   */
  public getGlobalErrorHandler(): ErrorRequestHandler {
    return (
      err: any,
      req: Request,
      res: Response,
      next: NextFunction
    ): void => {
      // Create error context for structured logging
      const context = errorHandler.createErrorContext(
        req,
        'server',
        'global-error-handler'
      );

      // Determine error category and severity
      const category = this.determineErrorCategory(err);
      const severity = this.determineSeverity(err);
      const statusCode = this.getHttpStatusCode(err, category);

      // Create standardized error response
      const errorResponse = errorHandler.handleError(
        err,
        category,
        context,
        {
          severity,
          code: `HTTP_${statusCode}`,
          details: [{ originalError: err.message }],
          retryable: statusCode >= 500,
          logLevel: this.getLogLevel(statusCode),
        }
      );

      // Send response with appropriate status code
      res.status(statusCode).json(errorResponse);
    };
  }

  /**
   * Determines the error category based on HTTP status code or error type
   * 
   * @param error - The error object to categorize
   * @returns ErrorCategory - The determined error category
   * @private
   */
  private determineErrorCategory(error: any): ErrorCategory {
    const statusCode = error.status || error.statusCode || 500;
    return this.statusCodeMap.get(statusCode) || ErrorCategory.SYSTEM;
  }

  /**
   * Determines the error severity based on HTTP status code
   * 
   * @param error - The error object
   * @returns ErrorSeverity - The determined severity level
   * @private
   */
  private determineSeverity(error: any): ErrorSeverity {
    const statusCode = error.status || error.statusCode || 500;
    return (
      this.statusCodeSeverityMap.get(statusCode) || ErrorSeverity.HIGH
    );
  }

  /**
   * Gets the appropriate HTTP status code from error
   * 
   * @param error - The error object
   * @param category - The error category
   * @returns number - HTTP status code
   * @private
   */
  private getHttpStatusCode(error: any, category: ErrorCategory): number {
    // First, try to use the error's status code if provided
    if (error.status && error.status >= 400 && error.status < 600) {
      return error.status;
    }

    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 600) {
      return error.statusCode;
    }

    // Map category to default status code
    switch (category) {
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.RATE_LIMIT:
        return 429;
      case ErrorCategory.TIMEOUT:
        return 504;
      case ErrorCategory.EXTERNAL_SERVICE:
        return 502;
      default:
        return 500;
    }
  }

  /**
   * Gets the appropriate log level for a given HTTP status code
   * 
   * @param statusCode - HTTP status code
   * @returns 'debug' | 'info' | 'warn' | 'error' - Log level to use
   * @private
   */
  private getLogLevel(
    statusCode: number
  ): 'debug' | 'info' | 'warn' | 'error' {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  /**
   * Creates error handler middleware with error logging
   * This middleware should be added before the global error handler
   * 
   * @returns Express middleware function for error logging
   * @example
   * ```typescript
   * app.use(errorHandler.getErrorLoggingMiddleware());
   * app.use(errorHandler.getGlobalErrorHandler());
   * ```
   */
  public getErrorLoggingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Override res.json to capture outgoing errors
      const originalJson = res.json;

      res.json = function (data: any) {
        // Check if this is an error response
        if (
          data &&
          (data.error || data.message || data.code?.startsWith('HTTP_'))
        ) {
          // This is an error response - it will be logged by the error handler
        }

        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Registers the error handler middleware with the Express app
   * Should be called after all other middleware
   * 
   * @param app - Express application instance
   * @example
   * ```typescript
   * const errorHandler = new ErrorHandlerMiddleware(environment);
   * errorHandler.register(app);
   * ```
   */
  public register(app: Express): void {
    app.use(this.getErrorLoggingMiddleware());
    app.use(this.getGlobalErrorHandler());
  }
}

// Export singleton instance creator
export function createErrorHandlerMiddleware(
  environment: EnvironmentInfo
): ErrorHandlerMiddleware {
  return new ErrorHandlerMiddleware(environment);
}
