import { Request, Response, NextFunction } from 'express';
import { EnvironmentInfo } from '../config/environment-config';

/**
 * Request/Response logger middleware
 * 
 * Provides structured logging for all HTTP requests and responses.
 * In development, logs are human-readable. In production, logs are JSON for better observability.
 * 
 * Features:
 * - Request method and path logging
 * - Response status code logging
 * - Request duration tracking
 * - Environment-aware logging format
 * - Request/Response size tracking
 * - Error request identification
 * 
 * @example
 * ```typescript
 * const logger = new RequestLogger(environment);
 * app.use(logger.middleware());
 * ```
 */
export class RequestLogger {
  constructor(private environment: EnvironmentInfo) {}

  /**
   * Creates the logging middleware function.
   * Should be registered early in the Express middleware chain.
   * 
   * @returns {Function} Express middleware function
   * @public
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const startSize = this.getRequestSize(req);

      // Capture the original end function
      const originalEnd = res.end;
      let endBuffer: any;

      (res.end as any) = function (...args: any[]) {
        endBuffer = args[0];
        originalEnd.apply(res, args);
      };

      // Log when response finishes
      res.on('finish', () => {
        this.logRequest({
          req,
          res,
          duration: Date.now() - startTime,
          requestSize: startSize,
          responseSize: this.getResponseSize(res),
        });
      });

      next();
    };
  }

  /**
   * Calculates the size of the incoming request in bytes.
   * 
   * @param {Request} req - Express request object
   * @returns {number} Request size in bytes
   * @private
   */
  private getRequestSize(req: Request): number {
    const contentLength = req.get('Content-Length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  /**
   * Calculates the size of the outgoing response in bytes.
   * 
   * @param {Response} res - Express response object
   * @returns {number} Response size in bytes
   * @private
   */
  private getResponseSize(res: Response): number {
    const contentLength = res.get('Content-Length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  /**
   * Logs request information based on environment.
   * 
   * In development: Human-readable format
   * In production: JSON format for structured logging
   * 
   * @param {Object} data - Log data
   * @private
   */
  private logRequest(data: {
    req: Request;
    res: Response;
    duration: number;
    requestSize: number;
    responseSize: number;
  }): void {
    const { req, res, duration, requestSize, responseSize } = data;
    const statusCode = res.statusCode;
    const logLevel = this.getLogLevel(statusCode);

    if (this.environment.isCloud) {
      // Production: JSON structured logging
      this.logJson({
        level: logLevel,
        message: `${req.method} ${req.path}`,
        method: req.method,
        path: req.path,
        statusCode,
        duration: `${duration}ms`,
        requestSize: `${requestSize}B`,
        responseSize: `${responseSize}B`,
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: this.getClientIp(req),
      });
    } else {
      // Development: Human-readable format
      const statusEmoji = this.getStatusEmoji(statusCode);
      const sizeInfo = requestSize > 0 ? ` (${requestSize}B → ${responseSize}B)` : '';
      console.log(
        `${statusEmoji} [${logLevel}] ${req.method} ${req.path} - ${statusCode} (${duration}ms)${sizeInfo}`
      );
    }
  }

  /**
   * Determines the log level based on HTTP status code.
   * 
   * @param {number} statusCode - HTTP status code
   * @returns {string} Log level (INFO, WARN, ERROR)
   * @private
   */
  private getLogLevel(statusCode: number): string {
    if (statusCode >= 500) return 'ERROR';
    if (statusCode >= 400) return 'WARN';
    return 'INFO';
  }

  /**
   * Gets an emoji representing the HTTP status code.
   * 
   * @param {number} statusCode - HTTP status code
   * @returns {string} Emoji representation
   * @private
   */
  private getStatusEmoji(statusCode: number): string {
    if (statusCode >= 500) return '❌';
    if (statusCode >= 400) return '⚠️';
    if (statusCode >= 300) return '➡️';
    if (statusCode >= 200) return '✅';
    return '❓';
  }

  /**
   * Extracts the client IP address from the request.
   * Handles proxied requests (X-Forwarded-For header).
   * 
   * @param {Request} req - Express request object
   * @returns {string} Client IP address
   * @private
   */
  private getClientIp(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  }

  /**
   * Logs a structured JSON log entry.
   * Used in production environments for better observability.
   * 
   * @param {Object} logData - Data to log
   * @private
   */
  private logJson(logData: Record<string, any>): void {
    console.log(JSON.stringify(logData));
  }
}

/**
 * Factory function to create request logger middleware.
 * 
 * @param {EnvironmentInfo} environment - Environment information
 * @returns {Function} Express middleware function
 * @example
 * ```typescript
 * app.use(createRequestLogger(environment));
 * ```
 */
export function createRequestLogger(environment: EnvironmentInfo) {
  const logger = new RequestLogger(environment);
  return logger.middleware();
}
