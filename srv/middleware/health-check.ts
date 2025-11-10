import { Express, RequestHandler } from 'express';
import { EnvironmentInfo } from '../config/environment-config';

/**
 * Health Check Handler - Provides liveness and readiness probe endpoints
 * 
 * This module provides standardized health check endpoints for Kubernetes and
 * load balancer integration. These endpoints are not protected by authentication.
 * 
 * Endpoints:
 * - GET /health - Liveness probe (pod is alive)
 * - GET /ready - Readiness probe (ready to accept traffic)
 * - GET /health/live - Alternative liveness endpoint
 * - GET /health/ready - Alternative readiness endpoint
 * 
 * @example
 * ```typescript
 * import { registerHealthCheckEndpoints } from 'srv/middleware';
 * 
 * registerHealthCheckEndpoints(app, environment);
 * ```
 */

export class HealthCheckHandler {
  private readonly HEALTH_PATH = '/health';
  private readonly READY_PATH = '/ready';
  private readonly LIVE_PATH = '/health/live';
  private readonly READY_ALT_PATH = '/health/ready';

  constructor(
    private app: Express,
    private environment: EnvironmentInfo
  ) {}

  /**
   * Registers all health check endpoints on the Express application.
   * These endpoints should be registered early, before authentication middleware.
   * 
   * @public
   */
  public registerEndpoints(): void {
    this.registerLivenessProbe();
    this.registerReadinessProbe();
    this.registerAlternativeEndpoints();

    if (!this.environment.isCloud) {
      console.log('[INFO] Health check endpoints registered');
    }
  }

  /**
   * Registers liveness probe endpoints.
   * Used by Kubernetes to determine if the pod is alive.
   * 
   * A liveness probe that fails will cause Kubernetes to restart the pod.
   * Should return quickly without performing expensive checks.
   * 
   * @private
   */
  private registerLivenessProbe(): void {
    const handler: RequestHandler = (req, res) => {
      res.status(200).json({
        status: 'UP',
        type: 'LIVENESS',
        timestamp: new Date().toISOString(),
        environment: this.environment.env,
        uptime: process.uptime(),
      });
    };

    this.app.get(this.HEALTH_PATH, handler);
    this.app.get(this.LIVE_PATH, handler);
  }

  /**
   * Registers readiness probe endpoints.
   * Used by Kubernetes to determine if the pod is ready to accept traffic.
   * 
   * A readiness probe that fails will remove the pod from the service load balancer
   * but will NOT restart the pod (unlike liveness probe).
   * Can perform more expensive checks than liveness probe.
   * 
   * @private
   */
  private registerReadinessProbe(): void {
    const handler: RequestHandler = (req, res) => {
      res.status(200).json({
        status: 'READY',
        type: 'READINESS',
        timestamp: new Date().toISOString(),
        environment: this.environment.env,
        version: process.version,
        memoryUsage: process.memoryUsage(),
      });
    };

    this.app.get(this.READY_PATH, handler);
    this.app.get(this.READY_ALT_PATH, handler);
  }

  /**
   * Registers alternative health check endpoints for compatibility.
   * Some monitoring systems use different endpoint paths.
   * 
   * @private
   */
  private registerAlternativeEndpoints(): void {
    // Health check endpoint for Cloud Foundry
    const cfHandler: RequestHandler = (req, res) => {
      res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
      });
    };

    this.app.get('/health/cf', cfHandler);
  }

  /**
   * Gets the health check status for monitoring.
   * This can be used internally for monitoring or debugging.
   * 
   * @returns {Object} Health status object
   * @public
   */
  public getHealthStatus(): Record<string, any> {
    return {
      status: 'UP',
      environment: this.environment.env,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
    };
  }

  /**
   * Gets the readiness status for monitoring.
   * 
   * @returns {Object} Readiness status object
   * @public
   */
  public getReadinessStatus(): Record<string, any> {
    return {
      status: 'READY',
      environment: this.environment.env,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ready: true,
    };
  }
}

/**
 * Factory function to register health check endpoints.
 * 
 * @param {Express} app - Express application instance
 * @param {EnvironmentInfo} environment - Environment information
 * @returns {HealthCheckHandler} The health check handler instance
 * 
 * @example
 * ```typescript
 * const handler = registerHealthCheckEndpoints(app, environment);
 * ```
 */
export function registerHealthCheckEndpoints(
  app: Express,
  environment: EnvironmentInfo
): HealthCheckHandler {
  const handler = new HealthCheckHandler(app, environment);
  handler.registerEndpoints();
  return handler;
}
