import {
  getEnvironment,
  isCloudFoundry,
  EnvironmentInfo,
} from "../../../srv/config";

describe("Environment Configuration Module", () => {
  // Store original env vars for restoration
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe("getEnvironment()", () => {
    it("should detect local development environment", () => {
      delete process.env.CDS_ENV;
      delete process.env.NODE_ENV;
      delete process.env.VCAP_APPLICATION;

      const env = getEnvironment();

      expect(env.env).toBe("development");
      expect(env.isLocal).toBe(true);
      expect(env.isTest).toBe(false);
      expect(env.isProduction).toBe(false);
      expect(env.isHybrid).toBe(false);
      expect(env.isCloud).toBe(false);
    });

    it("should prioritize CDS_ENV over NODE_ENV", () => {
      process.env.CDS_ENV = "hybrid";
      process.env.NODE_ENV = "production";
      delete process.env.VCAP_APPLICATION;

      const env = getEnvironment();

      expect(env.env).toBe("hybrid");
      expect(env.isHybrid).toBe(true);
    });

    it("should use NODE_ENV if CDS_ENV not set", () => {
      delete process.env.CDS_ENV;
      process.env.NODE_ENV = "test";
      delete process.env.VCAP_APPLICATION;

      const env = getEnvironment();

      expect(env.env).toBe("test");
      expect(env.isTest).toBe(true);
    });

    it("should detect test environment", () => {
      process.env.CDS_ENV = "test";
      delete process.env.VCAP_APPLICATION;

      const env = getEnvironment();

      expect(env.isTest).toBe(true);
      expect(env.isProduction).toBe(false);
      expect(env.isCloud).toBe(false);
    });

    it("should detect hybrid environment", () => {
      process.env.CDS_ENV = "hybrid";
      delete process.env.VCAP_APPLICATION;

      const env = getEnvironment();

      expect(env.isHybrid).toBe(true);
      expect(env.isCloud).toBe(true);
      expect(env.isProduction).toBe(false);
    });

    it("should detect explicit production environment", () => {
      process.env.CDS_ENV = "production";
      delete process.env.VCAP_APPLICATION;

      const env = getEnvironment();

      expect(env.isProduction).toBe(true);
      expect(env.isCloud).toBe(true);
    });

    it("should detect Cloud Foundry production environment via VCAP_APPLICATION", () => {
      delete process.env.CDS_ENV;
      delete process.env.NODE_ENV;
      process.env.VCAP_APPLICATION = "{}";

      const env = getEnvironment();

      expect(env.isProduction).toBe(true);
      expect(env.isCloud).toBe(true);
    });

    it("should not consider test environment as production even with VCAP_APPLICATION", () => {
      process.env.CDS_ENV = "test";
      process.env.VCAP_APPLICATION = "{}";

      const env = getEnvironment();

      expect(env.isTest).toBe(true);
      expect(env.isProduction).toBe(false);
      expect(env.isCloud).toBe(false);
    });

    it("should have isCloud = true only for production and hybrid", () => {
      // Local development
      delete process.env.CDS_ENV;
      delete process.env.NODE_ENV;
      delete process.env.VCAP_APPLICATION;

      let env = getEnvironment();
      expect(env.isCloud).toBe(false);

      // Test
      process.env.CDS_ENV = "test";
      env = getEnvironment();
      expect(env.isCloud).toBe(false);

      // Hybrid
      process.env.CDS_ENV = "hybrid";
      env = getEnvironment();
      expect(env.isCloud).toBe(true);

      // Production
      process.env.CDS_ENV = "production";
      env = getEnvironment();
      expect(env.isCloud).toBe(true);
    });
  });

  describe("isCloudFoundry()", () => {
    it("should return true when VCAP_APPLICATION is set", () => {
      process.env.VCAP_APPLICATION = "{}";

      expect(isCloudFoundry()).toBe(true);
    });

    it("should return false when VCAP_APPLICATION is not set", () => {
      delete process.env.VCAP_APPLICATION;

      expect(isCloudFoundry()).toBe(false);
    });

    it("should handle VCAP_APPLICATION with any value", () => {
      process.env.VCAP_APPLICATION = '{"app_id":"test"}';

      expect(isCloudFoundry()).toBe(true);
    });

    it("should return false for empty string VCAP_APPLICATION", () => {
      process.env.VCAP_APPLICATION = "";

      expect(isCloudFoundry()).toBe(false);
    });
  });

  // NOTE: Tests for utility functions removed
  // The following functions were moved to environment-config-utils.ts (test utilities only):
  // - getEnvironmentDescription()
  // - getAuthenticationMethod()
  //
  // These are simple utility functions that don't need comprehensive testing.
});
