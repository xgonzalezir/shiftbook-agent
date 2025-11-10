import express, { Express } from 'express';
import cors from 'cors';
import { EnvironmentInfo } from '../config';
import { getCORSConfig } from '../config';
import { ErrorHandlerMiddleware } from './error-handler-middleware';

/**
 * Manages all middleware registration for the Express application.
 * Orchestrates the middleware chain in the correct order following Express best practices.
 * 
 * Middleware Chain Order:
 * 1. Body Parsing (JSON/URL-encoded)
 * 2. CORS (must be before auth)
 * 3. Logging
 * 4. Health Check (before auth)
 * 5. Language Detection
 * 6. Response Formatting
 * 7. Error Handling (last)
 * 
 * @example
 * ```typescript
 * const manager = new MiddlewareManager(app, environment);
 * manager.setupMiddleware();
 * ```
 */
export class MiddlewareManager {
  private readonly DEFAULT_REQUEST_LIMIT = '50mb';
  private readonly HEALTH_CHECK_PATH = '/health';
  private readonly READY_CHECK_PATH = '/ready';
  private errorHandler?: ErrorHandlerMiddleware;

  constructor(
    private app: Express,
    private environment: EnvironmentInfo
  ) {}

  /**
   * Sets up all middleware for the Express application.
   * Middleware is registered in the correct order to ensure proper request processing.
   */
  public setupMiddleware(): void {
    this.setupBodyParsing();
    this.setupCors();
    this.setupLogging();
    this.setupHealthCheck();
    this.setupLanguageDetection();
    this.setupResponseMiddleware();
    this.setupErrorHandling();
  }

  /**
   * Configures JSON and URL-encoded body parsing middleware.
   * Applied early in the middleware chain for all requests.
   * 
   * @private
   */
  private setupBodyParsing(): void {
    // JSON parsing
    this.app.use(express.json({ limit: this.DEFAULT_REQUEST_LIMIT }));

    // URL-encoded parsing (for form submissions)
    this.app.use(
      express.urlencoded({
        limit: this.DEFAULT_REQUEST_LIMIT,
        extended: true,
      })
    );
  }

  /**
   * Configures CORS (Cross-Origin Resource Sharing) middleware.
   * CORS must be set up before authentication middleware.
   * Configuration varies by environment (dev/test/production).
   * 
   * @private
   */
  private setupCors(): void {
    const corsOptions = getCORSConfig(this.environment);
    this.app.use(cors(corsOptions));

    // Preflight for all routes
    this.app.options('*', cors(corsOptions));

    if (!this.environment.isCloud) {
      console.log(
        `[${this.environment.env}] CORS configured for environment`
      );
    }
  }

  /**
   * Sets up request/response logging middleware.
   * In production, logs are structured for better observability.
   * 
   * @private
   */
  private setupLogging(): void {
    // Basic request logging middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();

      // Log response when finished
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';

        if (!this.environment.isCloud) {
          console.log(
            `[${logLevel}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
          );
        }
      });

      next();
    });
  }

  /**
   * Sets up health check endpoints.
   * These endpoints are typically used by load balancers and monitoring systems.
   * They should NOT require authentication.
   * 
   * Health check endpoints:
   * - /health - Quick liveness check (pod is running)
   * - /ready - Readiness check (ready to accept traffic)
   * 
   * @private
   */
  private setupHealthCheck(): void {
    // Liveness probe - pod is alive
    this.app.get(this.HEALTH_CHECK_PATH, (req, res) => {
      res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        environment: this.environment.env,
      });
    });

    // Readiness probe - ready to handle requests
    this.app.get(this.READY_CHECK_PATH, (req, res) => {
      res.status(200).json({
        status: 'READY',
        timestamp: new Date().toISOString(),
        environment: this.environment.env,
      });
    });

    if (!this.environment.isCloud) {
      console.log('[INFO] Health check endpoints configured at /health and /ready');
    }
  }

  /**
   * Sets up language detection middleware for i18n support.
   * Detects preferred language from Accept-Language header or query parameter.
   * 
   * @private
   */
  private setupLanguageDetection(): void {
    this.app.use((req, res, next) => {
      // Check for explicit language in query parameter
      if (req.query.lang) {
        req.language = String(req.query.lang);
      } else {
        // Fall back to Accept-Language header
        const acceptLanguage = req.get('Accept-Language');
        if (acceptLanguage) {
          // Extract primary language code (e.g., 'en' from 'en-US,en;q=0.9')
          req.language = acceptLanguage.split(',')[0].split('-')[0];
        } else {
          req.language = 'en'; // Default to English
        }
      }

      next();
    });
  }

  /**
   * Sets up response middleware for consistent response formatting.
   * Ensures all responses follow a standardized format.
   * 
   * @private
   */
  private setupResponseMiddleware(): void {
    // Add response helper methods
    this.app.use((req, res, next) => {
      // Helper to send successful responses
      if (!res.success) {
        res.success = (data: any, statusCode = 200) => {
          res.status(statusCode).json({
            success: true,
            data,
            timestamp: new Date().toISOString(),
          });
        };
      }

      // Helper to send error responses
      if (!res.error) {
        res.error = (message: string, statusCode = 400, details?: any) => {
          res.status(statusCode).json({
            success: false,
            error: {
              message,
              details,
            },
            timestamp: new Date().toISOString(),
          });
        };
      }

      next();
    });
  }

  /**
   * Sets up centralized error handling middleware.
   * Error handler must be registered LAST in the middleware chain.
   * 
   * Error handling includes:
   * - Global Express error handler
   * - Standardized error response formatting
   * - Correlation ID tracking
   * - Environment-specific error details
   * 
   * @private
   */
  private setupErrorHandling(): void {
    this.errorHandler = new ErrorHandlerMiddleware(this.environment);
    this.errorHandler.register(this.app);

    if (!this.environment.isCloud) {
      console.log('[INFO] Error handling middleware configured');
    }
  }

  /**
   * Gets the current middleware chain for inspection/testing.
   * Useful for debugging middleware order and configuration.
   * 
   * @returns {any} The app's middleware stack
   * @public
   */
  public getMiddlewareStack(): any {
    return this.app._router.stack;
  }

  /**
   * Gets environment information this manager is using.
   * Useful for testing and debugging.
   * 
   * @returns {EnvironmentInfo} Current environment info
   * @public
   */
  public getEnvironment(): EnvironmentInfo {
    return this.environment;
  }

  /**
   * Gets the error handler middleware instance.
   * Useful for testing and advanced configuration.
   * 
   * @returns {ErrorHandlerMiddleware | undefined} Error handler instance
   * @public
   */
  public getErrorHandler(): ErrorHandlerMiddleware | undefined {
    return this.errorHandler;
  }
}

// Type augmentation for Express Response to support our custom methods
declare global {
  namespace Express {
    interface Request {
      language?: string;
    }

    interface Response {
      success?: (data: any, statusCode?: number) => void;
      error?: (message: string, statusCode?: number, details?: any) => void;
    }
  }
}
