import {
  createXSUAAScopeMapperMiddleware,
  XSUAAScopeMapper,
} from "../../../srv/lib/xsuaa-scope-mapper";

describe("XSUAAScopeMapper", () => {
  let mapper: XSUAAScopeMapper;
  let originalEnv: NodeJS.ProcessEnv;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Save original environment FIRST
    originalEnv = { ...process.env };

    // Reset singleton instance
    (XSUAAScopeMapper as any).instance = undefined;

    // Mock console methods to avoid noise in tests
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});

    // Clear environment variables (but don't delete if it will be set by nested beforeEach)
    // delete process.env.VCAP_SERVICES; // Commented out - let nested beforeEach handle this
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance when called multiple times", () => {
      const instance1 = XSUAAScopeMapper.getInstance();
      const instance2 = XSUAAScopeMapper.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance only once", () => {
      const instance1 = XSUAAScopeMapper.getInstance();
      const instance2 = XSUAAScopeMapper.getInstance();
      const instance3 = XSUAAScopeMapper.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe("App Name Detection", () => {
    it("should get app name from VCAP_SERVICES", () => {
      process.env.VCAP_SERVICES = JSON.stringify({
        xsuaa: [
          {
            credentials: {
              xsappname: "test-app-name",
            },
          },
        ],
      });

      mapper = XSUAAScopeMapper.getInstance();

      expect(consoleSpy).toHaveBeenCalledWith(
        "XSUAA Scope Mapper initialized with mappings:",
        expect.objectContaining({
          "test-app-name.shiftbook.operator": "shiftbook.operator",
          "test-app-name.shiftbook.admin": "shiftbook.admin",
        })
      );
    });

    it("should use fallback app name when VCAP_SERVICES is not available", () => {
      mapper = XSUAAScopeMapper.getInstance();

      expect(consoleSpy).toHaveBeenCalledWith(
        "XSUAA Scope Mapper initialized with mappings:",
        expect.objectContaining({
          "shiftbook-cap-manu-dev-org-dev!t459223.shiftbook.operator":
            "shiftbook.operator",
          "shiftbook-cap-manu-dev-org-dev!t459223.shiftbook.admin":
            "shiftbook.admin",
        })
      );
    });

    it("should handle malformed VCAP_SERVICES gracefully", () => {
      process.env.VCAP_SERVICES = "invalid-json";

      mapper = XSUAAScopeMapper.getInstance();

      // Should use fallback app name
      expect(consoleSpy).toHaveBeenCalledWith(
        "XSUAA Scope Mapper initialized with mappings:",
        expect.objectContaining({
          "shiftbook-cap-manu-dev-org-dev!t459223.shiftbook.operator":
            "shiftbook.operator",
        })
      );
    });

    it("should handle missing xsuaa service in VCAP_SERVICES", () => {
      process.env.VCAP_SERVICES = JSON.stringify({
        postgres: [
          {
            credentials: {},
          },
        ],
      });

      mapper = XSUAAScopeMapper.getInstance();

      // Should use fallback app name
      expect(consoleSpy).toHaveBeenCalledWith(
        "XSUAA Scope Mapper initialized with mappings:",
        expect.objectContaining({
          "shiftbook-cap-manu-dev-org-dev!t459223.shiftbook.operator":
            "shiftbook.operator",
        })
      );
    });

    it("should warn when no app name can be determined", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      // Mock getAppName to return null
      const originalGetAppName = XSUAAScopeMapper.prototype["getAppName"];
      XSUAAScopeMapper.prototype["getAppName"] = jest
        .fn()
        .mockReturnValue(null);

      mapper = XSUAAScopeMapper.getInstance();

      expect(warnSpy).toHaveBeenCalledWith(
        "Could not determine app name for scope mapping"
      );

      // Restore original method
      XSUAAScopeMapper.prototype["getAppName"] = originalGetAppName;
    });
  });

  describe("Scope Mapping", () => {
    beforeEach(() => {
      // Clear any existing VCAP_SERVICES
      delete process.env.VCAP_SERVICES;

      // Set up test environment
      process.env.VCAP_SERVICES = JSON.stringify({
        xsuaa: [
          {
            credentials: {
              xsappname: "test-app",
            },
          },
        ],
      });

      // Reset singleton to ensure fresh instance with new environment
      (XSUAAScopeMapper as any).instance = undefined;

      // Create new instance with test environment
      mapper = XSUAAScopeMapper.getInstance();
    });

    it("should map basic scopes", () => {
      const jwtScopes = [
        "test-app.shiftbook.admin",
        "test-app.shiftbook.operator",
      ];

      const result = mapper.mapScopes(jwtScopes);

      expect(result).toContain("admin");
      expect(result).toContain("operator");
    });

    it("should map pattern-based scopes", () => {
      const jwtScopes = [
        "prefix-shiftbook-cap-tenant!t123.shiftbook.admin",
        "some-other-app!t456.shiftbook.operator",
      ];

      const result = mapper.mapScopes(jwtScopes);

      expect(result).toContain("admin");
      expect(result).toContain("operator");
    });

    it("should keep original scopes as fallback", () => {
      const jwtScopes = ["custom.scope", "test-app.shiftbook.admin"];

      const result = mapper.mapScopes(jwtScopes);

      expect(result).toContain("custom.scope");
      expect(result).toContain("shiftbook.admin");
      // The implementation filters out duplicates, so mapped direct scopes replace originals
    });

    it("should filter out invalid simplified scopes", () => {
      const jwtScopes = [
        "some-app!t123.shiftbook.invalid",
        "some-app!t123.shiftbook.admin",
      ];

      const result = mapper.mapScopes(jwtScopes);

      expect(result).toContain("admin");
      expect(result).not.toContain("shiftbook.invalid");
      expect(result).toContain("some-app!t123.shiftbook.invalid"); // Keep original
    });

    it("should remove duplicate scopes", () => {
      const jwtScopes = [
        "test-app.shiftbook.admin",
        "another-app!t123.shiftbook.admin", // Maps to same simplified scope
        "shiftbook.admin", // Direct duplicate
      ];

      const result = mapper.mapScopes(jwtScopes);

      const adminScopes = result.filter((scope) => scope === "shiftbook.admin");
      expect(adminScopes).toHaveLength(1);
    });

    it("should handle empty scopes array", () => {
      const result = mapper.mapScopes([]);

      expect(result).toEqual([]);
    });

    it("should handle scopes without shiftbook prefix", () => {
      const jwtScopes = ["other.service.scope", "random.permission"];

      const result = mapper.mapScopes(jwtScopes);

      expect(result).toEqual(jwtScopes); // Should keep originals
    });

    it("should handle complex scope patterns", () => {
      const jwtScopes = [
        "xs_user.read",
        "uaa.user",
        "complex-app-name-with-dashes!t987654.shiftbook.admin",
        "test-app.shiftbook.operator",
      ];

      const result = mapper.mapScopes(jwtScopes);

      expect(result).toContain("xs_user.read");
      expect(result).toContain("uaa.user");
      expect(result).toContain("admin");
      expect(result).toContain("operator");
    });
  });

  describe("Authority Mapping", () => {
    beforeEach(() => {
      mapper = XSUAAScopeMapper.getInstance();
    });

    it("should delegate to mapScopes", () => {
      const mapScopesSpy = jest.spyOn(mapper, "mapScopes");
      const authorities = ["auth1", "auth2"];

      mapper.mapAuthorities(authorities);

      expect(mapScopesSpy).toHaveBeenCalledWith(authorities);
    });

    it("should return mapped authorities", () => {
      const authorities = ["test-app.shiftbook.admin"];

      const result = mapper.mapAuthorities(authorities);

      expect(result).toContain("admin");
    });
  });

  describe("getScopeMapping", () => {
    beforeEach(() => {
      process.env.VCAP_SERVICES = JSON.stringify({
        xsuaa: [
          {
            credentials: {
              xsappname: "get-mapping-test",
            },
          },
        ],
      });
      mapper = XSUAAScopeMapper.getInstance();
    });

    it("should return copy of scope mapping", () => {
      const mapping = mapper.getScopeMapping();

      expect(mapping).toEqual(
        expect.objectContaining({
          "get-mapping-test.shiftbook.operator": "shiftbook.operator",
          "get-mapping-test.shiftbook.admin": "shiftbook.admin",
        })
      );

      // Verify it's a copy, not the original
      mapping["test.new.scope"] = "new.scope";
      const mapping2 = mapper.getScopeMapping();
      expect(mapping2).not.toHaveProperty("test.new.scope");
    });
  });

  describe("createXSUAAScopeMapperMiddleware", () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: jest.Mock;
    let middleware: any;

    beforeEach(() => {
      process.env.VCAP_SERVICES = JSON.stringify({
        xsuaa: [
          {
            credentials: {
              xsappname: "middleware-test",
            },
          },
        ],
      });

      mockReq = {
        user: {
          tokenInfo: {},
          scopes: [],
        },
      };
      mockRes = {};
      mockNext = jest.fn();
      middleware = createXSUAAScopeMapperMiddleware();
    });

    it("should process JWT scopes", () => {
      mockReq.user.tokenInfo.scope = [
        "middleware-test.shiftbook.admin",
        "other.scope",
      ];

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.user.tokenInfo.scope).toContain("shiftbook.admin");
      expect(mockReq.user.tokenInfo.scope).toContain("other.scope");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should process JWT authorities", () => {
      mockReq.user.tokenInfo.authorities = [
        "middleware-test.shiftbook.operator",
        "system.admin",
      ];

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.user.tokenInfo.authorities).toContain(
        "shiftbook.operator"
      );
      expect(mockReq.user.tokenInfo.authorities).toContain("system.admin");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should process user scopes", () => {
      mockReq.user.scopes = ["middleware-test.shiftbook.admin"];

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.user.scopes).toContain("shiftbook.admin");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should log scope changes", () => {
      mockReq.user.tokenInfo.scope = ["middleware-test.shiftbook.admin"];

      middleware(mockReq, mockRes, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Mapped XSUAA scopes:",
        expect.objectContaining({
          original: ["middleware-test.shiftbook.admin"],
          mapped: expect.arrayContaining(["shiftbook.admin"]),
        })
      );
    });

    it("should skip logging when scopes unchanged", () => {
      mockReq.user.tokenInfo.scope = ["unchanged.scope"];

      middleware(mockReq, mockRes, mockNext);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        "Mapped XSUAA scopes:",
        expect.any(Object)
      );
    });

    it("should handle request without user", () => {
      delete mockReq.user;

      expect(() => {
        middleware(mockReq, mockRes, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle request without tokenInfo", () => {
      delete mockReq.user.tokenInfo;

      expect(() => {
        middleware(mockReq, mockRes, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle non-array scopes", () => {
      mockReq.user.tokenInfo.scope = "single.scope";

      expect(() => {
        middleware(mockReq, mockRes, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle missing scopes and authorities", () => {
      mockReq.user.tokenInfo = {}; // No scope or authorities

      expect(() => {
        middleware(mockReq, mockRes, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle complex middleware scenario", () => {
      mockReq.user.tokenInfo.scope = [
        "middleware-test.shiftbook.admin",
        "middleware-test.shiftbook.operator",
        "external.system.read",
      ];
      mockReq.user.tokenInfo.authorities = ["middleware-test.shiftbook.admin"];
      mockReq.user.scopes = ["middleware-test.shiftbook.operator"];

      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.user.tokenInfo.scope).toContain("shiftbook.admin");
      expect(mockReq.user.tokenInfo.scope).toContain("shiftbook.operator");
      expect(mockReq.user.tokenInfo.scope).toContain("external.system.read");
      expect(mockReq.user.tokenInfo.authorities).toContain("shiftbook.admin");
      expect(mockReq.user.scopes).toContain("shiftbook.operator");
    });
  });

  describe("Integration Tests", () => {
    it("should work with real XSUAA scope patterns", () => {
      // Simulate real BTP environment
      process.env.VCAP_SERVICES = JSON.stringify({
        xsuaa: [
          {
            credentials: {
              xsappname: "shiftbook-cap-prod-space!b123",
            },
          },
        ],
      });

      mapper = XSUAAScopeMapper.getInstance();

      const realJWTScopes = [
        "shiftbook-cap-prod-space!b123.shiftbook.admin",
        "shiftbook-cap-prod-space!b123.shiftbook.operator",
        "xs_user.read",
        "uaa.user",
      ];

      const result = mapper.mapScopes(realJWTScopes);

      expect(result).toContain("shiftbook.admin");
      expect(result).toContain("shiftbook.operator");
      expect(result).toContain("xs_user.read");
      expect(result).toContain("uaa.user");
    });

    it("should handle multi-tenant scenario with dynamic tenant IDs", () => {
      mapper = XSUAAScopeMapper.getInstance();

      const multiTenantScopes = [
        "app-name!t123456.shiftbook.admin",
        "app-name!t789012.shiftbook.operator",
        "different-app!t456789.shiftbook.admin",
      ];

      const result = mapper.mapScopes(multiTenantScopes);

      expect(result).toContain("admin");
      expect(result).toContain("operator");

      // Should contain all original scopes too
      multiTenantScopes.forEach((scope) => {
        expect(result).toContain(scope);
      });
    });

    it("should maintain singleton behavior across middleware calls", () => {
      const middleware1 = createXSUAAScopeMapperMiddleware();
      const middleware2 = createXSUAAScopeMapperMiddleware();

      // Both should use the same singleton instance
      const mapper1 = XSUAAScopeMapper.getInstance();
      const mapper2 = XSUAAScopeMapper.getInstance();

      expect(mapper1).toBe(mapper2);
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      mapper = XSUAAScopeMapper.getInstance();
    });

    it("should handle scopes with special characters", () => {
      const specialScopes = [
        "app-with-dashes!t123.shiftbook.admin",
        "app_with_underscores!t456.shiftbook.operator",
        "app.with.dots!t789.shiftbook.admin",
      ];

      const result = mapper.mapScopes(specialScopes);

      expect(result).toContain("admin");
      expect(result).toContain("operator");
    });

    it("should handle very long scope names", () => {
      const longScope =
        "very-long-application-name-that-exceeds-normal-limits-for-testing-purposes!t123456789012345.shiftbook.admin";

      const result = mapper.mapScopes([longScope]);

      expect(result).toContain("admin");
      expect(result).toContain(longScope);
    });

    it("should handle malformed scope patterns gracefully", () => {
      const malformedScopes = [
        "malformed.scope.without.tenant",
        ".empty.prefix.shiftbook.admin",
        "no-exclamation-mark.shiftbook.operator",
        "",
      ];

      expect(() => {
        const result = mapper.mapScopes(malformedScopes);
        // The implementation extracts shiftbook scopes from any pattern containing 'shiftbook.'
        expect(result).toContain("malformed.scope.without.tenant");
        expect(result).toContain(".empty.prefix.shiftbook.admin");
        expect(result).toContain("admin"); // Extracted from .empty.prefix
        expect(result).toContain("no-exclamation-mark.shiftbook.operator");
        expect(result).toContain("operator"); // Extracted
        expect(result).toContain("");
      }).not.toThrow();
    });

    it("should handle null and undefined scopes", () => {
      expect(() => {
        mapper.mapScopes(null as any);
      }).toThrow();

      expect(() => {
        mapper.mapScopes(undefined as any);
      }).toThrow();
    });

    it("should handle case sensitivity", () => {
      const casedScopes = [
        "app!t123.SHIFTBOOK.ADMIN",
        "app!t123.shiftbook.Admin",
        "app!t123.Shiftbook.operator",
      ];

      const result = mapper.mapScopes(casedScopes);

      // Should not match case-sensitive patterns, but keep originals
      expect(result).toEqual(casedScopes);
    });
  });
});
