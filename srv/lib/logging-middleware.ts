/**
 * Logging Middleware for ShiftBook Service
 * 
 * Provides Express middleware functions for structured logging integration:
 * - Correlation ID management (generates/extracts from headers)
 * - HTTP request/response logging with timing
 * - Error logging with context
 * - Authentication attempt logging
 * - Business operation logging
 * 
 * Integrates with Cloud Foundry headers and structured logger.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
const structuredLogger = require('./structured-logger');

// Extend Request interface to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    ID?: string;
  };
  startTime?: number;
}

/**
 * Correlation ID Middleware
 * Generates or extracts correlation ID from various header sources
 * and logs request start information
 */
function correlationIdMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Try to get correlation ID from various headers (in order of preference)
  let correlationId = req.headers['x-correlation-id'] as string ||
                      req.headers['x-correlationid'] as string ||
                      req.headers['x-request-id'] as string ||
                      req.headers['x-vcap-request-id'] as string;

  // Generate new correlation ID if none found
  if (!correlationId) {
    correlationId = uuidv4();
  }

  // Set correlation ID in structured logger
  structuredLogger.setCorrelationId(correlationId);

  // Add correlation ID to response headers
  res.setHeader('x-correlation-id', correlationId);

  // Log request start
  const requestData = {
    method: req.method,
    url: req.url,
    path: req.path || req.url,
    userAgent: req.get?.('User-Agent') || req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress
  };

  const requestContext = {
    type: 'request_start',
    userId: req.user?.id || req.user?.ID || 'anonymous'
  };

  structuredLogger.info('app', 'Request started', requestData, requestContext);

  // Store start time for duration calculation
  req.startTime = Date.now();

  next();
}

/**
 * HTTP Request Logging Middleware
 * Logs completed requests with duration and response status
 */
function httpRequestLoggingMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Store original end function
  const originalEnd = res.end;

  // Override end function to log when response completes
  res.end = function(chunk?: any, encoding?: any, cb?: any): any {
    // Calculate duration
    const startTime = req.startTime || Date.now();
    const duration = Date.now() - startTime;

    // Log HTTP request completion
    structuredLogger.logHttpRequest(req, res, duration);

    // Call original end function
    return originalEnd.call(this, chunk, encoding, cb);
  };

  next();
}

/**
 * Error Logging Middleware
 * Logs errors with request context and details
 */
function errorLoggingMiddleware(error: Error, req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const errorData = {
    method: req.method,
    url: req.url,
    path: req.path || req.url,
    userAgent: req.get?.('User-Agent') || req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress
  };

  const errorContext = {
    type: 'request_error',
    userId: req.user?.id || req.user?.ID || 'anonymous'
  };

  structuredLogger.logError('Request error occurred', error, errorData, errorContext);

  // Pass error to next middleware
  next(error);
}

/**
 * Authentication Logging Middleware
 * Logs authentication attempts when authorization headers are present
 */
function authenticationLoggingMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Parse token type (Bearer, Basic, etc.)
    const tokenType = authHeader.split(' ')[0];

    const authData = {
      method: req.method,
      path: req.path || req.url,
      hasToken: true,
      tokenType
    };

    const authContext = {
      type: 'auth_attempt',
      ip: req.ip || req.connection?.remoteAddress
    };

    structuredLogger.auth('Authentication attempt', authData, authContext);
  }

  next();
}

/**
 * Business Operation Logging Middleware Factory
 * Creates middleware to log specific business operations
 */
function businessOperationLoggingMiddleware(operation: string, entity: string) {
  return function(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const operationData = {
      method: req.method,
      path: req.path || req.url,
      userId: req.user?.id || req.user?.ID || 'anonymous'
    };

    const operationContext = {
      type: 'business_operation',
      ip: req.ip || req.connection?.remoteAddress
    };

    structuredLogger.logBusinessOperation(operation, entity, operationData, operationContext);

    next();
  };
}

/**
 * Initialize Logging Middleware
 * Sets up comprehensive logging for an Express application
 */
function initializeLoggingMiddleware(app: any): void {
  // Add correlation ID middleware first
  app.use(correlationIdMiddleware);

  // Add HTTP request logging
  app.use(httpRequestLoggingMiddleware);

  // Add authentication logging
  app.use(authenticationLoggingMiddleware);

  // Error logging middleware should be added after routes
  // (not added here as it needs to be after route definitions)
}

/**
 * Get Current Correlation ID
 * Helper function to get the current correlation ID
 */
function getCurrentCorrelationId(): string {
  return structuredLogger.getCorrelationId();
}

/**
 * Set Correlation ID
 * Helper function to set correlation ID outside of middleware
 */
function setCorrelationId(correlationId: string): void {
  structuredLogger.setCorrelationId(correlationId);
}

// Export all middleware functions
export {
  correlationIdMiddleware,
  httpRequestLoggingMiddleware,
  errorLoggingMiddleware,
  authenticationLoggingMiddleware,
  businessOperationLoggingMiddleware,
  initializeLoggingMiddleware,
  getCurrentCorrelationId,
  setCorrelationId
};

// CommonJS compatibility
const middlewareExports = {
  correlationIdMiddleware,
  httpRequestLoggingMiddleware,
  errorLoggingMiddleware,
  authenticationLoggingMiddleware,
  businessOperationLoggingMiddleware,
  initializeLoggingMiddleware,
  getCurrentCorrelationId,
  setCorrelationId
};

module.exports = middlewareExports;
Object.assign(module.exports, middlewareExports);