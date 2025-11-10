/**
 * Rate Limiting System for ShiftBook Service
 * Prevents abuse and implements basic DoS protection
 */

const errorHandlerModule = require("./error-handler");
const { errorHandler } = errorHandlerModule;
const { ErrorCategory } = errorHandlerModule;
const { ErrorSeverity } = errorHandlerModule;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;
  private cleanupInterval?: NodeJS.Timeout;
  private static instances = new Map<string, RateLimiter>();

  constructor(config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }) {
    this.config = config;

    // Clean up expired entries every 5 minutes, but use shorter interval in test environment
    const cleanupIntervalMs = process.env.NODE_ENV === "test" ? 5000 : 300000;
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);

    // Unref the timer so it doesn't keep the process alive
    this.cleanupInterval.unref();
  }

  /**
   * Check if request should be rate limited
   */
  checkLimit(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const key = identifier;

    let entry = this.store.get(key);

    // If no entry exists or window has expired, create new entry
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      this.store.set(key, entry);

      const allowed = entry.count <= this.config.maxRequests;
      const remaining = Math.max(0, this.config.maxRequests - entry.count);

      return {
        allowed,
        remaining,
        resetTime: entry.resetTime,
      };
    }

    // Increment count
    entry.count++;

    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Create rate limiter for specific action (singleton per action)
   */
  static forAction(
    action: string,
    config?: Partial<RateLimitConfig>
  ): RateLimiter {
    // Check if instance already exists
    if (RateLimiter.instances.has(action)) {
      return RateLimiter.instances.get(action)!;
    }

    const defaultConfigs: Record<string, RateLimitConfig> = {
      SEND_MAIL_BY_CATEGORY: {
        windowMs: 60000,
        maxRequests: process.env.NODE_ENV === "test" ? 1000 : 10,
      }, // Higher limit for tests
      CREATE_CATEGORY_WITH_DETAILS: {
        windowMs: 60000,
        maxRequests: process.env.NODE_ENV === "test" ? 1000 : 20,
      }, // Higher limit for tests
      ADVANCED_CATEGORY_SEARCH: {
        windowMs: 60000,
        maxRequests: process.env.NODE_ENV === "test" ? 1000 : 50,
      }, // Higher limit for tests
      ADVANCED_LOG_SEARCH: {
        windowMs: 60000,
        maxRequests: process.env.NODE_ENV === "test" ? 1000 : 50,
      }, // Higher limit for tests
    };

    const actionConfig = defaultConfigs[action] || {
      windowMs: 60000,
      maxRequests: 100,
    };
    const finalConfig = { ...actionConfig, ...config };

    const instance = new RateLimiter(finalConfig);
    RateLimiter.instances.set(action, instance);
    return instance;
  }

  /**
   * Extract identifier from CAP request
   */
  static getIdentifier(req: any): string {
    // Use combination of user ID and IP address for identification
    const userId = req.user?.id || req.user?.ID || "anonymous";
    const ipAddress =
      req.headers?.["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      "unknown";
    const identifier = `${userId}-${ipAddress}`;

    return identifier;
  }

  /**
   * Cleanup method to clear intervals
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Reset rate limiter state (for testing purposes)
   */
  static resetAll(): void {
    // Dispose all existing instances
    for (const instance of RateLimiter.instances.values()) {
      instance.dispose();
    }
    RateLimiter.instances.clear();
  }

  /**
   * Reset specific rate limiter
   */
  static reset(action: string): void {
    const instance = RateLimiter.instances.get(action);
    if (instance) {
      instance.store.clear();
    }
  }

  /**
   * Create standardized error response for rate limit violations
   */
  static createRateLimitErrorResponse(
    req: any,
    action: string,
    remaining: number,
    resetTime: number
  ): any {
    const errorContext = errorHandler.createErrorContext(
      req,
      "rate-limiter",
      action
    );

    return errorHandler.handleError(
      new Error(`Rate limit exceeded for action: ${action}`),
      ErrorCategory.RATE_LIMIT,
      errorContext,
      {
        severity: ErrorSeverity.LOW,
        code: "RATE_LIMIT_EXCEEDED",
        details: [
          {
            action,
            remaining,
            resetTime: new Date(resetTime).toISOString(),
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
          },
        ],
        retryable: true,
        userMessage: `Too many requests. Please wait ${Math.ceil(
          (resetTime - Date.now()) / 1000
        )} seconds before trying again.`,
      }
    );
  }

  /**
   * Check rate limit and return error response if exceeded
   */
  static checkLimitWithErrorResponse(
    req: any,
    action: string
  ): {
    allowed: boolean;
    errorResponse?: any;
    remaining: number;
    resetTime: number;
  } {
    const identifier = this.getIdentifier(req);
    const rateLimiter = this.forAction(action);
    const result = rateLimiter.checkLimit(identifier);

    if (!result.allowed) {
      const errorResponse = this.createRateLimitErrorResponse(
        req,
        action,
        result.remaining,
        result.resetTime
      );
      return {
        allowed: false,
        errorResponse,
        remaining: result.remaining,
        resetTime: result.resetTime,
      };
    }

    return {
      allowed: true,
      remaining: result.remaining,
      resetTime: result.resetTime,
    };
  }
}

export default RateLimiter;
module.exports = RateLimiter;
