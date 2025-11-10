/**
 * Process-Level Error Handlers
 * 
 * Handles process-level errors that escape Express error handling:
 * - Uncaught exceptions
 * - Unhandled promise rejections
 * - Signal termination (SIGTERM/SIGINT)
 * - Resource cleanup on shutdown
 * 
 * This module prevents the application from crashing silently and ensures
 * proper logging and graceful shutdown procedures.
 * 
 * @example
 * ```typescript
 * const processHandlers = new ProcessErrorHandlers(environment);
 * processHandlers.register();
 * ```
 */

import { EnvironmentInfo } from '../config';
import { errorHandler, ErrorCategory, ErrorSeverity } from '../lib/error-handler';

/**
 * Configuration for process error handlers
 */
export interface ProcessErrorHandlerConfig {
  /** Maximum number of uncaught exceptions before forcing shutdown */
  maxUncaughtExceptions?: number;
  /** Maximum number of unhandled rejections before forcing shutdown */
  maxUnhandledRejections?: number;
  /** Grace period in milliseconds for shutdown (default: 30s) */
  shutdownGracePeriod?: number;
  /** Whether to exit process on uncaught exception (default: true) */
  exitOnUncaughtException?: boolean;
  /** Whether to exit process on unhandled rejection (default: true) */
  exitOnUnhandledRejection?: boolean;
}

/**
 * Process-level error handler for critical application errors
 */
export class ProcessErrorHandlers {
  private uncaughtExceptionCount = 0;
  private unhandledRejectionCount = 0;
  private isShuttingDown = false;

  private readonly config: Required<ProcessErrorHandlerConfig> = {
    maxUncaughtExceptions: 5,
    maxUnhandledRejections: 5,
    shutdownGracePeriod: 30000,
    exitOnUncaughtException: true,
    exitOnUnhandledRejection: true,
  };

  private readonly shutdownHandlers: Set<() => void | Promise<void>> =
    new Set();

  constructor(
    private environment: EnvironmentInfo,
    config: ProcessErrorHandlerConfig = {}
  ) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Registers all process error handlers
   * Should be called early in application startup
   * 
   * @example
   * ```typescript
   * const handlers = new ProcessErrorHandlers(environment);
   * handlers.register();
   * ```
   */
  public register(): void {
    this.setupUncaughtExceptionHandler();
    this.setupUnhandledRejectionHandler();
    this.setupSignalHandlers();
    this.logRegistration();
  }

  /**
   * Register a callback to be executed during graceful shutdown
   * Useful for cleanup operations like closing database connections
   * 
   * @param handler - Async function to execute during shutdown
   * @example
   * ```typescript
   * handlers.onShutdown(async () => {
   *   await database.close();
   *   await cache.clear();
   * });
   * ```
   */
  public onShutdown(handler: () => void | Promise<void>): void {
    this.shutdownHandlers.add(handler);
  }

  /**
   * Sets up uncaught exception handler
   * Logs the exception and initiates graceful shutdown
   * 
   * @private
   */
  private setupUncaughtExceptionHandler(): void {
    process.on('uncaughtException', (error: Error) => {
      this.uncaughtExceptionCount++;

      const context = errorHandler.createErrorContext(
        { headers: {} } as any,
        'process',
        'uncaught-exception'
      );

      console.error('❌ UNCAUGHT EXCEPTION:', error);

      // Log the error
      errorHandler.handleError(error, ErrorCategory.SYSTEM, context, {
        severity: ErrorSeverity.CRITICAL,
        code: 'UNCAUGHT_EXCEPTION',
        details: [
          {
            uncaughtExceptionCount: this.uncaughtExceptionCount,
            maxAllowed: this.config.maxUncaughtExceptions,
          },
        ],
        logLevel: 'error',
      });

      // Check if we've exceeded the limit
      if (
        this.uncaughtExceptionCount >
        this.config.maxUncaughtExceptions
      ) {
        console.error(
          `❌ CRITICAL: Maximum uncaught exceptions (${this.config.maxUncaughtExceptions}) exceeded. Shutting down.`
        );
        this.initiateGracefulShutdown(1);
        return;
      }

      // Initiate graceful shutdown if configured
      if (this.config.exitOnUncaughtException) {
        console.warn(
          '⚠️ Uncaught exception detected. Initiating graceful shutdown...'
        );
        this.initiateGracefulShutdown(1);
      }
    });
  }

  /**
   * Sets up unhandled promise rejection handler
   * Logs the rejection and initiates graceful shutdown
   * 
   * @private
   */
  private setupUnhandledRejectionHandler(): void {
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.unhandledRejectionCount++;

      const context = errorHandler.createErrorContext(
        { headers: {} } as any,
        'process',
        'unhandled-rejection'
      );

      const error =
        reason instanceof Error
          ? reason
          : new Error(`Unhandled rejection: ${String(reason)}`);

      console.error('❌ UNHANDLED PROMISE REJECTION:', reason);

      // Log the error
      errorHandler.handleError(error, ErrorCategory.SYSTEM, context, {
        severity: ErrorSeverity.CRITICAL,
        code: 'UNHANDLED_REJECTION',
        details: [
          {
            unhandledRejectionCount: this.unhandledRejectionCount,
            maxAllowed: this.config.maxUnhandledRejections,
            reason: String(reason),
          },
        ],
        logLevel: 'error',
      });

      // Check if we've exceeded the limit
      if (
        this.unhandledRejectionCount >
        this.config.maxUnhandledRejections
      ) {
        console.error(
          `❌ CRITICAL: Maximum unhandled rejections (${this.config.maxUnhandledRejections}) exceeded. Shutting down.`
        );
        this.initiateGracefulShutdown(1);
        return;
      }

      // Initiate graceful shutdown if configured
      if (this.config.exitOnUnhandledRejection) {
        console.warn(
          '⚠️ Unhandled promise rejection detected. Initiating graceful shutdown...'
        );
        this.initiateGracefulShutdown(1);
      }
    });
  }

  /**
   * Sets up signal handlers for graceful shutdown
   * Handles SIGTERM and SIGINT signals
   * 
   * @private
   */
  private setupSignalHandlers(): void {
    const signals = ['SIGTERM', 'SIGINT'];

    signals.forEach((signal) => {
      process.on(signal, () => {
        console.log(`📢 Received ${signal} signal. Starting graceful shutdown...`);
        this.initiateGracefulShutdown(0);
      });
    });
  }

  /**
   * Initiates graceful shutdown
   * Runs shutdown handlers, closes connections, and exits process
   * 
   * @param exitCode - Exit code to use when exiting (0 for success, 1 for error)
   * @private
   */
  private async initiateGracefulShutdown(exitCode: number = 0): Promise<void> {
    // Prevent multiple shutdown attempts
    if (this.isShuttingDown) {
      console.log('⏳ Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    console.log('🛑 Starting graceful shutdown process...');

    const shutdownTimeout = setTimeout(() => {
      console.error(
        `❌ Shutdown timeout exceeded (${this.config.shutdownGracePeriod}ms). Force exiting.`
      );
      process.exit(exitCode);
    }, this.config.shutdownGracePeriod);

    try {
      // Execute all registered shutdown handlers
      for (const handler of this.shutdownHandlers) {
        try {
          await handler();
        } catch (error) {
          console.error('❌ Error during shutdown handler:', error);
        }
      }

        console.log('✅ Graceful shutdown completed successfully');
      clearTimeout(shutdownTimeout);
      process.exit(exitCode);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      clearTimeout(shutdownTimeout);
      process.exit(exitCode || 1);
    }
  }

  /**
   * Logs the registration of process error handlers
   * Only logs in development/non-cloud environments
   * 
   * @private
   */
  private logRegistration(): void {
    if (!this.environment.isCloud) {
      console.log('🔧 Process error handlers registered:');
      console.log('  - Uncaught exception handler');
      console.log('  - Unhandled rejection handler');
      console.log('  - SIGTERM/SIGINT signal handlers');
      console.log(`  - Graceful shutdown configured (${this.config.shutdownGracePeriod}ms)`);
    }
  }

  /**
   * Gets current statistics about error counts
   * Useful for monitoring and debugging
   * 
   * @returns Object containing error statistics
   */
  public getErrorStats() {
    return {
      uncaughtExceptionCount: this.uncaughtExceptionCount,
      unhandledRejectionCount: this.unhandledRejectionCount,
      isShuttingDown: this.isShuttingDown,
      maxUncaughtExceptions: this.config.maxUncaughtExceptions,
      maxUnhandledRejections: this.config.maxUnhandledRejections,
    };
  }

  /**
   * Resets error counts
   * Useful for testing or resetting after recovery
   * 
   * @private
   */
  public resetErrorCounts(): void {
    this.uncaughtExceptionCount = 0;
    this.unhandledRejectionCount = 0;
  }
}

/**
 * Factory function to create and register process error handlers
 * 
 * @param environment - Environment configuration
 * @param config - Optional configuration for error handlers
 * @returns ProcessErrorHandlers instance
 * 
 * @example
 * ```typescript
 * const handlers = createProcessErrorHandlers(environment, {
 *   maxUncaughtExceptions: 10,
 *   shutdownGracePeriod: 60000
 * });
 * handlers.register();
 * ```
 */
export function createProcessErrorHandlers(
  environment: EnvironmentInfo,
  config?: ProcessErrorHandlerConfig
): ProcessErrorHandlers {
  return new ProcessErrorHandlers(environment, config);
}
