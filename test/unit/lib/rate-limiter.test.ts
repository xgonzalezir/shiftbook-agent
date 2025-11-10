// Mock the error handler BEFORE importing RateLimiter
jest.mock("../../../srv/lib/error-handler", () => ({
  errorHandler: {
    createErrorContext: jest.fn().mockReturnValue("mock-context"),
    handleError: jest.fn().mockReturnValue({ error: "mocked error response" }),
  },
  ErrorCategory: {
    RATE_LIMIT: "RATE_LIMIT",
    VALIDATION: "VALIDATION",
    AUTHENTICATION: "AUTHENTICATION",
    AUTHORIZATION: "AUTHORIZATION",
    BUSINESS_LOGIC: "BUSINESS_LOGIC",
    EXTERNAL_SERVICE: "EXTERNAL_SERVICE",
    DATABASE: "DATABASE",
    SYSTEM: "SYSTEM",
    NETWORK: "NETWORK",
    TIMEOUT: "TIMEOUT",
  },
  ErrorSeverity: {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  },
}));

// Import AFTER mocking
import RateLimiter from "../../../srv/lib/rate-limiter";

// Get reference to the mocked functions using require to match module usage
const errorHandlerModule = require("../../../srv/lib/error-handler");
const { errorHandler } = errorHandlerModule;
const { ErrorCategory } = errorHandlerModule;
const { ErrorSeverity } = errorHandlerModule;
const mockErrorHandler = jest.mocked(errorHandler);

describe("RateLimiter", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    // Reset all rate limiter instances before each test
    RateLimiter.resetAll();

    // Clear mock calls
    mockErrorHandler.createErrorContext.mockClear();
    mockErrorHandler.handleError.mockClear();

    // Create a new instance with test-friendly configuration
    rateLimiter = new RateLimiter({ windowMs: 1000, maxRequests: 3 });
  });

  afterEach(() => {
    // Clean up intervals
    rateLimiter.dispose();
    RateLimiter.resetAll();
  });

  describe("Constructor", () => {
    it("should initialize with default configuration when no config provided", () => {
      const defaultLimiter = new RateLimiter();

      const result = defaultLimiter.checkLimit("test");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1

      defaultLimiter.dispose();
    });

    it("should initialize with custom configuration", () => {
      const customLimiter = new RateLimiter({ windowMs: 2000, maxRequests: 5 });

      const result = customLimiter.checkLimit("test");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1

      customLimiter.dispose();
    });

    it("should set up cleanup interval", () => {
      const spy = jest.spyOn(global, "setInterval");
      const testLimiter = new RateLimiter();

      expect(spy).toHaveBeenCalled();

      testLimiter.dispose();
    });
  });

  describe("checkLimit", () => {
    it("should allow requests within the limit", () => {
      const results = [
        rateLimiter.checkLimit("user1"),
        rateLimiter.checkLimit("user1"),
        rateLimiter.checkLimit("user1"),
      ];

      results.forEach((result, index) => {
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(2 - index);
        expect(result.resetTime).toBeGreaterThan(Date.now());
      });
    });

    it("should block requests that exceed the limit", () => {
      // Use up the allowed requests
      rateLimiter.checkLimit("user1");
      rateLimiter.checkLimit("user1");
      rateLimiter.checkLimit("user1");

      // This should be blocked
      const result = rateLimiter.checkLimit("user1");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should track different identifiers separately", () => {
      const result1 = rateLimiter.checkLimit("user1");
      const result2 = rateLimiter.checkLimit("user2");
      const result3 = rateLimiter.checkLimit("user1");

      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(2);

      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(1);
    });

    it("should reset count after window expires", (done) => {
      // Use up all requests
      rateLimiter.checkLimit("user1");
      rateLimiter.checkLimit("user1");
      rateLimiter.checkLimit("user1");

      const blockedResult = rateLimiter.checkLimit("user1");
      expect(blockedResult.allowed).toBe(false);

      // Wait for window to expire (1000ms + buffer)
      setTimeout(() => {
        const newResult = rateLimiter.checkLimit("user1");
        expect(newResult.allowed).toBe(true);
        expect(newResult.remaining).toBe(2);
        done();
      }, 1100);
    }, 2000);

    it("should handle multiple requests at exact limit boundary", () => {
      // Fill up to the limit exactly
      for (let i = 0; i < 3; i++) {
        const result = rateLimiter.checkLimit("boundary-test");
        expect(result.allowed).toBe(true);
      }

      // Next request should be blocked
      const exceededResult = rateLimiter.checkLimit("boundary-test");
      expect(exceededResult.allowed).toBe(false);
      expect(exceededResult.remaining).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries", (done) => {
      // Create an entry
      const result1 = rateLimiter.checkLimit("cleanup-test");
      expect(result1.allowed).toBe(true);

      // Wait for expiry and trigger cleanup manually
      setTimeout(() => {
        // Access private method for testing
        (rateLimiter as any).cleanup();

        // New request should get fresh window
        const result2 = rateLimiter.checkLimit("cleanup-test");
        expect(result2.allowed).toBe(true);
        expect(result2.remaining).toBe(2); // Fresh count

        done();
      }, 1100);
    }, 2000);

    it("should not remove entries that have not expired", () => {
      // Create an entry
      rateLimiter.checkLimit("active-test");

      // Trigger cleanup immediately (should not remove active entries)
      (rateLimiter as any).cleanup();

      // Next request should continue from existing count
      const result = rateLimiter.checkLimit("active-test");
      expect(result.remaining).toBe(1); // Count continues from previous
    });
  });

  describe("forAction", () => {
    it("should create singleton instances per action", () => {
      const limiter1 = RateLimiter.forAction("TEST_ACTION");
      const limiter2 = RateLimiter.forAction("TEST_ACTION");

      expect(limiter1).toBe(limiter2); // Same instance
    });

    it("should create different instances for different actions", () => {
      const limiter1 = RateLimiter.forAction("ACTION_1");
      const limiter2 = RateLimiter.forAction("ACTION_2");

      expect(limiter1).not.toBe(limiter2);
    });

    it("should use predefined configurations for known actions", () => {
      const mailLimiter = RateLimiter.forAction("SEND_MAIL_BY_CATEGORY");

      // Test with known user - should allow many requests in test mode
      const result = mailLimiter.checkLimit("test-user");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(999); // 1000 - 1 in test mode
    });

    it("should use default configuration for unknown actions", () => {
      const unknownLimiter = RateLimiter.forAction("UNKNOWN_ACTION");

      const result = unknownLimiter.checkLimit("test-user");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1 (default config)
    });

    it("should allow custom configuration override", () => {
      const customLimiter = RateLimiter.forAction("CUSTOM_ACTION", {
        maxRequests: 5,
      });

      const result = customLimiter.checkLimit("test-user");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
    });
  });

  describe("getIdentifier", () => {
    it("should create identifier from user ID and IP address", () => {
      const req = {
        user: { id: "user123" },
        headers: { "x-forwarded-for": "192.168.1.1" },
      };

      const identifier = RateLimiter.getIdentifier(req);

      expect(identifier).toBe("user123-192.168.1.1");
    });

    it("should handle user with ID field instead of id", () => {
      const req = {
        user: { ID: "USER456" },
        connection: { remoteAddress: "10.0.0.1" },
      };

      const identifier = RateLimiter.getIdentifier(req);

      expect(identifier).toBe("USER456-10.0.0.1");
    });

    it("should use anonymous for missing user", () => {
      const req = {
        headers: { "x-forwarded-for": "203.0.113.1" },
      };

      const identifier = RateLimiter.getIdentifier(req);

      expect(identifier).toBe("anonymous-203.0.113.1");
    });

    it("should use connection.remoteAddress when x-forwarded-for is not available", () => {
      const req = {
        user: { id: "user789" },
        connection: { remoteAddress: "172.16.0.1" },
      };

      const identifier = RateLimiter.getIdentifier(req);

      expect(identifier).toBe("user789-172.16.0.1");
    });

    it("should handle missing IP information", () => {
      const req = {
        user: { id: "user999" },
      };

      const identifier = RateLimiter.getIdentifier(req);

      expect(identifier).toBe("user999-unknown");
    });

    it("should handle completely empty request", () => {
      const req = {};

      const identifier = RateLimiter.getIdentifier(req);

      expect(identifier).toBe("anonymous-unknown");
    });
  });

  describe("dispose", () => {
    it("should clear cleanup interval", () => {
      const clearSpy = jest.spyOn(global, "clearInterval");

      rateLimiter.dispose();

      expect(clearSpy).toHaveBeenCalled();
    });

    it("should handle multiple dispose calls gracefully", () => {
      rateLimiter.dispose();
      rateLimiter.dispose(); // Should not throw

      expect(() => rateLimiter.dispose()).not.toThrow();
    });
  });

  describe("resetAll", () => {
    it("should clear all instances and dispose them", () => {
      const limiter1 = RateLimiter.forAction("ACTION_1");
      const limiter2 = RateLimiter.forAction("ACTION_2");

      const disposeSpy1 = jest.spyOn(limiter1, "dispose");
      const disposeSpy2 = jest.spyOn(limiter2, "dispose");

      RateLimiter.resetAll();

      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();

      // Verify new instances are created
      const newLimiter = RateLimiter.forAction("ACTION_1");
      expect(newLimiter).not.toBe(limiter1);
    });
  });

  describe("reset", () => {
    it("should clear store for specific action", () => {
      const actionLimiter = RateLimiter.forAction("TEST_RESET");

      // Use some requests
      actionLimiter.checkLimit("user1");
      actionLimiter.checkLimit("user1");

      // Reset the action
      RateLimiter.reset("TEST_RESET");

      // Should start fresh
      const result = actionLimiter.checkLimit("user1");
      expect(result.remaining).toBe(99); // Fresh count (default config)
    });

    it("should handle reset for non-existent action", () => {
      expect(() => RateLimiter.reset("NON_EXISTENT_ACTION")).not.toThrow();
    });
  });

  describe("createRateLimitErrorResponse", () => {
    it("should create error response with correct parameters", () => {
      const req = { user: { id: "test" } };
      const action = "TEST_ACTION";
      const remaining = 0;
      const resetTime = Date.now() + 60000;

      const result = RateLimiter.createRateLimitErrorResponse(
        req,
        action,
        remaining,
        resetTime
      );

      expect(mockErrorHandler.createErrorContext).toHaveBeenCalledWith(
        req,
        "rate-limiter",
        action
      );
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        "RATE_LIMIT",
        "mock-context",
        expect.objectContaining({
          severity: "LOW",
          code: "RATE_LIMIT_EXCEEDED",
          details: expect.arrayContaining([
            expect.objectContaining({
              action,
              remaining,
              resetTime: expect.any(String),
              retryAfter: expect.any(Number),
            }),
          ]),
          retryable: true,
          userMessage: expect.stringContaining("Too many requests"),
        })
      );

      expect(result).toEqual({ error: "mocked error response" });
    });
  });

  describe("checkLimitWithErrorResponse", () => {
    const mockErrorHandler = jest.mocked(errorHandler);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return allowed result when within limit", () => {
      const req = {
        user: { id: "test-user" },
        headers: { "x-forwarded-for": "192.168.1.1" },
      };

      const result = RateLimiter.checkLimitWithErrorResponse(
        req,
        "TEST_ACTION"
      );

      expect(result.allowed).toBe(true);
      expect(result.errorResponse).toBeUndefined();
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it("should return error response when limit exceeded", () => {
      const testLimiter = RateLimiter.forAction("LIMIT_TEST", {
        maxRequests: 1,
      });

      const req = {
        user: { id: "limited-user" },
        headers: { "x-forwarded-for": "192.168.1.2" },
      };

      // Use up the limit
      RateLimiter.checkLimitWithErrorResponse(req, "LIMIT_TEST");

      // This should exceed the limit
      const result = RateLimiter.checkLimitWithErrorResponse(req, "LIMIT_TEST");

      expect(result.allowed).toBe(false);
      expect(result.errorResponse).toEqual({ error: "mocked error response" });
      expect(result.remaining).toBe(0);
      expect(mockErrorHandler.createErrorContext).toHaveBeenCalled();
    });
  });

  describe("Integration Tests", () => {
    it("should handle concurrent requests from same identifier", () => {
      const identifier = "concurrent-user";
      const results: {
        allowed: boolean;
        remaining: number;
        resetTime: number;
      }[] = [];

      // Simulate concurrent requests
      for (let i = 0; i < 5; i++) {
        results.push(rateLimiter.checkLimit(identifier));
      }

      const allowedResults = results.filter((r) => r.allowed);
      const blockedResults = results.filter((r) => !r.allowed);

      expect(allowedResults).toHaveLength(3); // Within limit
      expect(blockedResults).toHaveLength(2); // Exceeded limit
    });

    it("should work with real-world request patterns", () => {
      const users = ["user1", "user2", "user3"];
      const results: {
        user: string;
        result: { allowed: boolean; remaining: number; resetTime: number };
      }[] = [];

      // Simulate burst requests from multiple users
      users.forEach((user) => {
        for (let i = 0; i < 4; i++) {
          results.push({
            user,
            result: rateLimiter.checkLimit(user),
          });
        }
      });

      // Each user should have 3 allowed and 1 blocked
      users.forEach((user) => {
        const userResults = results.filter((r) => r.user === user);
        const allowed = userResults.filter((r) => r.result.allowed);
        const blocked = userResults.filter((r) => !r.result.allowed);

        expect(allowed).toHaveLength(3);
        expect(blocked).toHaveLength(1);
      });
    });
  });
});
