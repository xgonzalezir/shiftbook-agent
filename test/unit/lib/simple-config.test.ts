const simpleConfig = require("../../../srv/lib/simple-config");

describe("SimpleConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables for each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("get", () => {
    it("should return environment variable value when it exists", () => {
      process.env.TEST_KEY = "test-value";

      const result = simpleConfig.get("TEST_KEY");

      expect(result).toBe("test-value");
    });

    it("should return default value when environment variable does not exist", () => {
      delete process.env.NONEXISTENT_KEY;

      const result = simpleConfig.get("NONEXISTENT_KEY", "default-value");

      expect(result).toBe("default-value");
    });

    it("should return empty string as default when no default value provided", () => {
      delete process.env.NONEXISTENT_KEY;

      const result = simpleConfig.get("NONEXISTENT_KEY");

      expect(result).toBe("");
    });

    it("should return default value when environment variable is empty string", () => {
      process.env.EMPTY_KEY = "";

      const result = simpleConfig.get("EMPTY_KEY", "default-value");

      expect(result).toBe("default-value");
    });

    it("should handle undefined environment variable", () => {
      process.env.UNDEFINED_KEY = undefined as any;

      const result = simpleConfig.get("UNDEFINED_KEY", "default-value");

      expect(result).toBe("default-value");
    });

    it("should return environment variable value over default value", () => {
      process.env.PRIORITY_KEY = "env-value";

      const result = simpleConfig.get("PRIORITY_KEY", "default-value");

      expect(result).toBe("env-value");
    });
  });

  describe("getEmailConfig", () => {
    it("should return default email configuration when no environment variables are set", async () => {
      // Clear email-related environment variables
      delete process.env.EMAIL_DESTINATION_NAME;
      delete process.env.EMAIL_FROM_ADDRESS;
      delete process.env.EMAIL_FROM_NAME;
      delete process.env.EMAIL_SIMULATION_MODE;

      const config = await simpleConfig.getEmailConfig();

      expect(config).toEqual({
        destinationName: "shiftbook-email",
        fromAddress: "noreply@company.com",
        fromName: "Shift Book System",
        simulationMode: false,
      });
    });

    it("should return custom email configuration when environment variables are set", async () => {
      process.env.EMAIL_DESTINATION_NAME = "custom-email-service";
      process.env.EMAIL_FROM_ADDRESS = "custom@company.com";
      process.env.EMAIL_FROM_NAME = "Custom System";
      process.env.EMAIL_SIMULATION_MODE = "true";

      const config = await simpleConfig.getEmailConfig();

      expect(config).toEqual({
        destinationName: "custom-email-service",
        fromAddress: "custom@company.com",
        fromName: "Custom System",
        simulationMode: true,
      });
    });

    it("should handle mixed environment variable configuration", async () => {
      process.env.EMAIL_DESTINATION_NAME = "mixed-service";
      process.env.EMAIL_FROM_NAME = "Mixed System";
      // EMAIL_FROM_ADDRESS and EMAIL_SIMULATION_MODE use defaults

      const config = await simpleConfig.getEmailConfig();

      expect(config).toEqual({
        destinationName: "mixed-service",
        fromAddress: "noreply@company.com",
        fromName: "Mixed System",
        simulationMode: false,
      });
    });

    it("should handle email simulation mode as false for non-true values", async () => {
      process.env.EMAIL_SIMULATION_MODE = "false";

      const config = await simpleConfig.getEmailConfig();

      expect(config.simulationMode).toBe(false);
    });

    it("should handle email simulation mode as false for undefined", async () => {
      delete process.env.EMAIL_SIMULATION_MODE;

      const config = await simpleConfig.getEmailConfig();

      expect(config.simulationMode).toBe(false);
    });

    it("should handle email simulation mode as false for arbitrary values", async () => {
      process.env.EMAIL_SIMULATION_MODE = "yes";

      const config = await simpleConfig.getEmailConfig();

      expect(config.simulationMode).toBe(false);
    });

    it('should handle email simulation mode as true only for exact "true" value', async () => {
      process.env.EMAIL_SIMULATION_MODE = "true";

      const config = await simpleConfig.getEmailConfig();

      expect(config.simulationMode).toBe(true);
    });

    it("should handle empty string environment variables", async () => {
      process.env.EMAIL_DESTINATION_NAME = "";
      process.env.EMAIL_FROM_ADDRESS = "";
      process.env.EMAIL_FROM_NAME = "";
      process.env.EMAIL_SIMULATION_MODE = "";

      const config = await simpleConfig.getEmailConfig();

      expect(config).toEqual({
        destinationName: "shiftbook-email",
        fromAddress: "noreply@company.com",
        fromName: "Shift Book System",
        simulationMode: false,
      });
    });
  });

  describe("Integration Tests", () => {
    it("should work correctly with real-world environment variable names", () => {
      process.env.NODE_ENV = "test";
      process.env.PORT = "3000";
      process.env.DATABASE_URL = "postgres://localhost:5432/test";

      expect(simpleConfig.get("NODE_ENV")).toBe("test");
      expect(simpleConfig.get("PORT")).toBe("3000");
      expect(simpleConfig.get("DATABASE_URL")).toBe(
        "postgres://localhost:5432/test"
      );
      expect(simpleConfig.get("NONEXISTENT", "fallback")).toBe("fallback");
    });

    it("should maintain consistency between calls", () => {
      process.env.CONSISTENT_KEY = "consistent-value";

      const result1 = simpleConfig.get("CONSISTENT_KEY");
      const result2 = simpleConfig.get("CONSISTENT_KEY");

      expect(result1).toBe(result2);
      expect(result1).toBe("consistent-value");
    });
  });
});
