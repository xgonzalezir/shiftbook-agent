/**
 * Centralized Error Handling Module for ShiftBook Service
 *
 * Provides standardized error processing, correlation ID tracking,
 * and environment-specific error detail levels across all components.
 */

import { v4 as uuidv4 } from "uuid";
import { errorMessageManager } from "./error-messages";
import { getLocalizedMessage } from "./language-middleware";

export enum ErrorCategory {
  VALIDATION = "VALIDATION",
  AUTHENTICATION = "AUTHENTICATION",
  AUTHORIZATION = "AUTHORIZATION",
  BUSINESS_LOGIC = "BUSINESS_LOGIC",
  EXTERNAL_SERVICE = "EXTERNAL_SERVICE",
  DATABASE = "DATABASE",
  SYSTEM = "SYSTEM",
  NETWORK = "NETWORK",
  TIMEOUT = "TIMEOUT",
  RATE_LIMIT = "RATE_LIMIT",
  EMAIL_SERVICE = "EMAIL_SERVICE",
}

export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface ErrorContext {
  correlationId: string;
  userId?: string;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  environment: string;
  component: string;
  operation: string;
  stackTrace?: string;
  requestData?: any;
  responseData?: any;
}

export interface StandardErrorResponse {
  code: string;
  message: string;
  details: any[];
  category: ErrorCategory;
  severity: ErrorSeverity;
  correlationId: string;
  timestamp: string;
  userMessage?: string;
  helpUrl?: string;
  retryable: boolean;
  context?: Partial<ErrorContext>;
}

export interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private correlationIdMap: Map<string, string> = new Map();
  private environment: string;
  private enableDetailedErrors: boolean;
  private enableStackTrace: boolean;

  private constructor() {
    this.environment = process.env.NODE_ENV || "development";
    this.enableDetailedErrors = this.environment !== "production";
    this.enableStackTrace = this.environment === "development";
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Set correlation ID for a request
   */
  setCorrelationId(requestId: string, correlationId: string): void {
    this.correlationIdMap.set(requestId, correlationId);
  }

  /**
   * Get correlation ID for a request
   */
  getCorrelationId(requestId: string): string | undefined {
    return this.correlationIdMap.get(requestId);
  }

  /**
   * Create error context from request
   */
  createErrorContext(
    req: any,
    component: string,
    operation: string
  ): ErrorContext {
    const requestId = req.id || req.headers?.["x-request-id"] || uuidv4();
    const correlationId =
      this.getCorrelationId(requestId) || this.generateCorrelationId();

    if (!this.getCorrelationId(requestId)) {
      this.setCorrelationId(requestId, correlationId);
    }

    return {
      correlationId,
      userId: req.user?.id || req.user?.ID,
      requestId,
      sessionId: req.session?.id,
      ipAddress:
        req.headers?.["x-forwarded-for"] || req.connection?.remoteAddress,
      userAgent: req.headers?.["user-agent"],
      timestamp: new Date().toISOString(),
      environment: this.environment,
      component,
      operation,
      requestData: {
        ...this.sanitizeRequestData(req.data || req.body),
        req: req, // Store the full request object for i18n access
      },
      responseData: req.responseData,
    };
  }

  /**
   * Create a standardized error response
   */
  createErrorResponse(
    error: Error | string,
    category: ErrorCategory,
    context: ErrorContext,
    options: {
      severity?: ErrorSeverity;
      code?: string;
      details?: any[];
      userMessage?: string;
      helpUrl?: string;
      retryable?: boolean;
    } = {}
  ): StandardErrorResponse {
    const errorMessage = typeof error === "string" ? error : error.message;
    const stackTrace =
      this.enableStackTrace && error instanceof Error ? error.stack : undefined;

    const response: StandardErrorResponse = {
      code: options.code || this.generateErrorCode(category),
      message: errorMessage,
      details: options.details || [],
      category,
      severity: options.severity || this.determineSeverity(category),
      correlationId: context.correlationId,
      timestamp: context.timestamp,
      userMessage:
        options.userMessage ||
        this.getUserFriendlyMessage(
          category,
          errorMessage,
          context.requestData?.req
        ),
      helpUrl: options.helpUrl || this.getHelpUrl(category),
      retryable:
        options.retryable !== undefined
          ? options.retryable
          : this.isRetryable(category),
      context: this.enableDetailedErrors
        ? {
            ...context,
            // Remove the req object from requestData to avoid circular reference
            requestData: context.requestData ? {
              ...context.requestData,
              req: undefined
            } : undefined,
            stackTrace,
          }
        : undefined,
    };

    return response;
  }

  /**
   * Handle and log an error
   */
  handleError(
    error: Error | string,
    category: ErrorCategory,
    context: ErrorContext,
    options: {
      severity?: ErrorSeverity;
      code?: string;
      details?: any[];
      userMessage?: string;
      helpUrl?: string;
      retryable?: boolean;
      logLevel?: "debug" | "info" | "warn" | "error";
    } = {}
  ): StandardErrorResponse {
    const errorResponse = this.createErrorResponse(
      error,
      category,
      context,
      options
    );

    // Log the error
    this.logError(errorResponse, options.logLevel || "error");

    return errorResponse;
  }

  /**
   * Create a retry strategy
   */
  createRetryStrategy(
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 10000,
    backoffMultiplier: number = 2,
    jitter: boolean = true
  ): RetryStrategy {
    return {
      maxAttempts,
      baseDelay,
      maxDelay,
      backoffMultiplier,
      jitter,
    };
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    strategy: RetryStrategy,
    context: ErrorContext,
    onRetry?: (attempt: number, error: Error, delay: number) => void
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === strategy.maxAttempts) {
          // Final attempt failed
          this.handleError(lastError, ErrorCategory.EXTERNAL_SERVICE, context, {
            details: [{ attempt, maxAttempts: strategy.maxAttempts }],
            retryable: false,
          });
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          strategy.baseDelay *
            Math.pow(strategy.backoffMultiplier, attempt - 1),
          strategy.maxDelay
        );

        // Add jitter if enabled
        const finalDelay = strategy.jitter
          ? delay * (0.5 + Math.random() * 0.5)
          : delay;

        // Log retry attempt
        this.logRetryAttempt(
          context,
          attempt,
          strategy.maxAttempts,
          finalDelay,
          lastError
        );

        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt, lastError, finalDelay);
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, finalDelay));
      }
    }

    throw lastError!;
  }

  /**
   * Sanitize request data for logging
   */
  private sanitizeRequestData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      "password",
      "token",
      "secret",
      "authorization",
      "apiKey",
    ];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  /**
   * Generate error code based on category
   */
  private generateErrorCode(category: ErrorCategory): string {
    const codes = {
      [ErrorCategory.VALIDATION]: "VALIDATION_ERROR",
      [ErrorCategory.AUTHENTICATION]: "AUTH_ERROR",
      [ErrorCategory.AUTHORIZATION]: "FORBIDDEN",
      [ErrorCategory.BUSINESS_LOGIC]: "BUSINESS_ERROR",
      [ErrorCategory.EXTERNAL_SERVICE]: "EXTERNAL_SERVICE_ERROR",
      [ErrorCategory.DATABASE]: "DATABASE_ERROR",
      [ErrorCategory.SYSTEM]: "SYSTEM_ERROR",
      [ErrorCategory.NETWORK]: "NETWORK_ERROR",
      [ErrorCategory.TIMEOUT]: "TIMEOUT_ERROR",
      [ErrorCategory.RATE_LIMIT]: "RATE_LIMIT_ERROR",
    };

    return codes[category] || "UNKNOWN_ERROR";
  }

  /**
   * Determine error severity based on category
   */
  private determineSeverity(category: ErrorCategory): ErrorSeverity {
    const severityMap = {
      [ErrorCategory.VALIDATION]: ErrorSeverity.LOW,
      [ErrorCategory.AUTHENTICATION]: ErrorSeverity.MEDIUM,
      [ErrorCategory.AUTHORIZATION]: ErrorSeverity.MEDIUM,
      [ErrorCategory.BUSINESS_LOGIC]: ErrorSeverity.MEDIUM,
      [ErrorCategory.EXTERNAL_SERVICE]: ErrorSeverity.HIGH,
      [ErrorCategory.DATABASE]: ErrorSeverity.HIGH,
      [ErrorCategory.SYSTEM]: ErrorSeverity.CRITICAL,
      [ErrorCategory.NETWORK]: ErrorSeverity.HIGH,
      [ErrorCategory.TIMEOUT]: ErrorSeverity.MEDIUM,
      [ErrorCategory.RATE_LIMIT]: ErrorSeverity.LOW,
    };

    return severityMap[category] || ErrorSeverity.MEDIUM;
  }

  /**
   * Get user-friendly error message using enhanced error message manager with i18n support
   */
  private getUserFriendlyMessage(
    category: ErrorCategory,
    technicalMessage: string,
    req?: any
  ): string {
    // Try to get localized message if request context is available
    if (req) {
      try {
        // Map error categories to message keys
        const messageKeyMap: Record<ErrorCategory, string> = {
          [ErrorCategory.VALIDATION]: "error.validation.failed",
          [ErrorCategory.AUTHENTICATION]: "error.authentication.failed",
          [ErrorCategory.AUTHORIZATION]: "error.authorization.failed",
          [ErrorCategory.BUSINESS_LOGIC]: "error.business.logic.failed",
          [ErrorCategory.EXTERNAL_SERVICE]: "error.external.service.failed",
          [ErrorCategory.DATABASE]: "error.database.failed",
          [ErrorCategory.SYSTEM]: "error.system.failed",
          [ErrorCategory.NETWORK]: "error.network.failed",
          [ErrorCategory.TIMEOUT]: "error.timeout.failed",
          [ErrorCategory.RATE_LIMIT]: "error.rate.limit.exceeded",
          [ErrorCategory.EMAIL_SERVICE]: "error.email.service.failed",
        };

        const messageKey = messageKeyMap[category];
        if (messageKey) {
          const localizedMessage = getLocalizedMessage(req, messageKey);
          if (localizedMessage !== messageKey) {
            return localizedMessage;
          }
        }
      } catch (error) {
        console.error("Error getting localized message:", error);
      }
    }

    // Fallback to enhanced error message manager
    return errorMessageManager.getMessage(category, "en", {
      technicalDetails: technicalMessage,
    });
  }

  /**
   * Get help URL for error category using enhanced error message manager
   */
  private getHelpUrl(category: ErrorCategory): string {
    // Use the enhanced error message manager for consistent help URLs
    return errorMessageManager.getHelpUrl(category);
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(category: ErrorCategory): boolean {
    const retryableCategories = [
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorCategory.DATABASE,
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.RATE_LIMIT,
    ];

    return retryableCategories.includes(category);
  }

  /**
   * Log error with appropriate level
   */
  private logError(
    errorResponse: StandardErrorResponse,
    level: "debug" | "info" | "warn" | "error"
  ): void {
    const logEntry = {
      level,
      timestamp: errorResponse.timestamp,
      correlationId: errorResponse.correlationId,
      category: errorResponse.category,
      severity: errorResponse.severity,
      code: errorResponse.code,
      message: errorResponse.message,
      retryable: errorResponse.retryable,
      context: errorResponse.context,
    };

    switch (level) {
      case "debug":
        console.debug("🔍 Error Debug:", logEntry);
        break;
      case "info":
        console.info("ℹ️ Error Info:", logEntry);
        break;
      case "warn":
        console.warn("⚠️ Error Warning:", logEntry);
        break;
      case "error":
        console.error("❌ Error:", logEntry);
        break;
    }
  }

  /**
   * Log retry attempt
   */
  private logRetryAttempt(
    context: ErrorContext,
    attempt: number,
    maxAttempts: number,
    delay: number,
    error: Error
  ): void {
    console.warn("🔄 Retry Attempt:", {
      correlationId: context.correlationId,
      component: context.component,
      operation: context.operation,
      attempt,
      maxAttempts,
      delay,
      error: error.message,
    });
  }

  /**
   * Cleanup correlation ID map
   */
  cleanup(): void {
    this.correlationIdMap.clear();
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// CommonJS compatibility
module.exports = {
  ErrorHandler,
  errorHandler,
  ErrorCategory,
  ErrorSeverity,
};
