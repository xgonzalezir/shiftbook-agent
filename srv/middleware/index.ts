/**
 * Middleware Module - Orchestration and Management
 * 
 * This module handles all Express middleware registration and orchestration.
 * It provides a clean, centralized place to manage the middleware chain.
 * 
 * Exports:
 * - MiddlewareManager: Main class for middleware orchestration
 * - RequestLogger: Structured logging middleware
 * - createRequestLogger: Factory function for request logging
 * - HealthCheckHandler: Health check probe endpoints
 * - registerHealthCheckEndpoints: Factory function for health checks
 * 
 * @example
 * ```typescript
 * import { MiddlewareManager, HealthCheckHandler } from 'srv/middleware';
 * import { getEnvironment } from 'srv/config';
 * 
 * const environment = getEnvironment();
 * const manager = new MiddlewareManager(app, environment);
 * manager.setupMiddleware();
 * ```
 */

export { MiddlewareManager } from './middleware-manager';
export { RequestLogger, createRequestLogger } from './request-logger';
export { HealthCheckHandler, registerHealthCheckEndpoints } from './health-check';
