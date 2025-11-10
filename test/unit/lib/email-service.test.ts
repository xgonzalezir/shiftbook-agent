// Create mock implementations
const mockCreateTestAccount = jest.fn();
const mockGetTestMessageUrl = jest.fn();

// Mock dependencies first before imports
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
    verify: jest.fn().mockResolvedValue(true),
  })),
  createTestAccount: jest.fn(),
  getTestMessageUrl: jest.fn(),
}));

jest.mock("@sap-cloud-sdk/connectivity", () => ({
  getDestination: jest.fn(),
}));

jest.mock("../../../srv/lib/simple-config", () => ({
  simpleConfig: {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config = {
        EMAIL_SIMULATION_MODE: "false",
        EMAIL_SMTP_HOST: "smtp.test.com",
        EMAIL_SMTP_PORT: "587",
        EMAIL_SMTP_SECURE: "false",
        EMAIL_SMTP_USER: "testuser",
        EMAIL_SMTP_PASSWORD: "testpass",
        EMAIL_TEST_CONNECTION: "false",
      };
      return config[key as keyof typeof config] || defaultValue;
    }),
    getEmailConfig: jest.fn().mockReturnValue({
      destinationName: "email-service",
      fromAddress: "noreply@shiftbook.local",
      fromName: "Shift Book System",
      simulationMode: false,
    }),
  },
}));

jest.mock("../../../srv/lib/error-handler", () => ({
  errorHandler: {
    createErrorContext: jest.fn().mockReturnValue({ context: "test" }),
    handleError: jest.fn().mockReturnValue({ error: "handled" }),
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

// Now import the service using ES6 imports to avoid TypeScript redeclaration conflicts
import { getDestination } from "@sap-cloud-sdk/connectivity";
import nodemailer from "nodemailer";
import { EmailService } from "../../../srv/lib/email-service";
import { simpleConfig } from "../../../srv/lib/simple-config";

// Cast nodemailer to access mock properties
const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

describe("EmailService", () => {
  let emailService: any;
  let mockTransporter: any;
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
  };
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Reset environment
    process.env.NODE_ENV = "development";
    delete process.env.VCAP_APPLICATION;

    // Reset EmailService singleton
    EmailService.resetInstance();

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
      verify: jest.fn().mockResolvedValue(true),
    };

    mockNodemailer.createTransport.mockReturnValue(mockTransporter);
    mockNodemailer.createTestAccount.mockResolvedValue({
      user: "ethereal.test@example.com",
      pass: "test-password",
      smtp: { host: "smtp.ethereal.email", port: 587, secure: false },
      imap: { host: "imap.ethereal.email", port: 993, secure: true },
      pop3: { host: "pop3.ethereal.email", port: 995, secure: true },
      web: "https://ethereal.email",
    });
    mockNodemailer.getTestMessageUrl.mockReturnValue(
      "https://ethereal.email/message/test-id"
    );

    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, "log").mockImplementation(() => {}),
      error: jest.spyOn(console, "error").mockImplementation(() => {}),
      warn: jest.spyOn(console, "warn").mockImplementation(() => {}),
    };

    // Get fresh instance
    emailService = EmailService.getInstance();

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = EmailService.getInstance();
      const instance2 = EmailService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(EmailService);
    });
  });

  describe("Initialization", () => {
    it("should initialize successfully in simulation mode", async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SIMULATION_MODE") return "true";
        return "";
      });

      await emailService.initialize();

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Email Service running in SIMULATION MODE")
      );
    });

    it("should initialize in test environment", async () => {
      process.env.NODE_ENV = "test";

      await emailService.initialize();

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("SIMULATION MODE")
      );
    });

    it("should initialize with local SMTP in development", async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        const config = {
          EMAIL_SIMULATION_MODE: "false",
          EMAIL_SMTP_HOST: "localhost",
          EMAIL_SMTP_PORT: "1025",
        };
        return config[key as keyof typeof config];
      });

      await emailService.initialize();

      expect(mockNodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "localhost",
          port: 1025,
          secure: false,
        })
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Using local SMTP server: localhost:1025")
      );
    });

    it("should initialize with Ethereal when no local SMTP configured", async () => {
      // For this test, we want development mode but NOT simulation mode
      // So we need to provide EMAIL_SMTP_HOST as empty but EMAIL_SIMULATION_MODE as false
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SIMULATION_MODE") return "false";
        if (key === "EMAIL_SMTP_HOST") return ""; // No local SMTP configured
        if (key === "EMAIL_SMTP_PORT") return "";
        return "";
      });

      // Also ensure NODE_ENV is development (not test) to avoid test simulation mode
      process.env.NODE_ENV = "development";

      await emailService.initialize();

      expect(mockNodemailer.createTestAccount).toHaveBeenCalled();
      expect(mockNodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
        })
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Ethereal test account created")
      );
    });

    it("should initialize in production with BTP destination", async () => {
      process.env.NODE_ENV = "production";
      process.env.VCAP_APPLICATION = '{"name":"test-app"}';

      const mockDestination = {
        originalProperties: {
          "mail.smtp.host": "smtp.btp.example.com",
          "mail.smtp.port": "587",
          "mail.smtp.ssl.enable": "true",
        },
        username: "btp-user",
        password: "btp-password",
      };

      (getDestination as jest.Mock).mockResolvedValue(mockDestination);

      await emailService.initialize();

      expect(getDestination).toHaveBeenCalledWith({
        destinationName: "shiftbook-email",
      });
      expect(mockNodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "smtp.btp.example.com",
          port: 587,
          secure: true,
          auth: {
            user: "btp-user",
            pass: "btp-password",
          },
        })
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "✅ Successfully retrieved configuration from BTP destination service"
      );
    });

    it("should fallback to environment config when BTP destination fails", async () => {
      process.env.NODE_ENV = "production";
      process.env.VCAP_APPLICATION = '{"name":"test-app"}';

      (getDestination as jest.Mock).mockRejectedValue(
        new Error("BTP service unavailable")
      );
      (simpleConfig.get as jest.Mock).mockImplementation(
        (key: string, defaultValue?: string) => {
          const config = {
            EMAIL_SMTP_HOST: "smtp.env.example.com",
            EMAIL_SMTP_PORT: "465",
            EMAIL_SMTP_SECURE: "true",
            EMAIL_SMTP_USER: "env-user",
            EMAIL_SMTP_PASSWORD: "env-password",
          };
          return config[key as keyof typeof config] || defaultValue;
        }
      );

      await emailService.initialize();

      expect(consoleSpy.log).toHaveBeenCalledWith(
        "⚠️ BTP destination service not available, using environment configuration"
      );
      expect(mockNodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "smtp.env.example.com",
          port: 465,
          secure: true,
          auth: {
            user: "env-user",
            pass: "env-password",
          },
        })
      );
    });

    it("should test connection when configured", async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_TEST_CONNECTION") return "true";
        if (key === "EMAIL_SMTP_HOST") return "localhost";
        if (key === "EMAIL_SMTP_PORT") return "1025";
        return "";
      });

      await emailService.initialize();

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "✅ SMTP connection verified successfully"
      );
    });

    it("should skip connection test in development by default", async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SMTP_HOST") return "localhost";
        if (key === "EMAIL_SMTP_PORT") return "1025";
        return "";
      });

      await emailService.initialize();

      expect(mockTransporter.verify).not.toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "🔧 Skipping SMTP connection test (development mode)"
      );
    });

    it("should handle initialization errors", async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SMTP_HOST") return "localhost";
        if (key === "EMAIL_SMTP_PORT") return "1025";
        return "";
      });

      mockNodemailer.createTransport.mockImplementation(() => {
        throw new Error("Transport creation failed");
      });

      await expect(emailService.initialize()).rejects.toThrow(
        "Transport creation failed"
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "❌ Failed to initialize Email Service:",
        expect.any(Error)
      );
    });

    it("should skip re-initialization", async () => {
      await emailService.initialize();
      const firstCallCount = consoleSpy.log.mock.calls.length;

      await emailService.initialize();

      // Should not have additional initialization logs
      expect(consoleSpy.log).toHaveBeenCalledTimes(firstCallCount);
    });
  });

  describe("Configuration Management", () => {
    it("should use cached configuration when valid", async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SMTP_HOST") return "localhost";
        if (key === "EMAIL_SMTP_PORT") return "1025";
        return "";
      });

      // First initialization
      await emailService.initialize();
      const firstTransportCall = (nodemailer.createTransport as jest.Mock).mock
        .calls.length;

      // Reset transporter to force re-initialization
      emailService["isInitialized"] = false;

      // Second initialization should use cache
      await emailService.initialize();

      expect(nodemailer.createTransport).toHaveBeenCalledTimes(firstTransportCall + 1);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Using cached SMTP configuration")
      );
    });

    it("should clear configuration cache", () => {
      emailService.clearConfigCache();

      expect(consoleSpy.log).toHaveBeenCalledWith(
        "Email service configuration cache cleared"
      );
      expect(emailService.getConfigurationSource()).toBe("unknown");
    });

    it("should return configuration source", async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SMTP_HOST") return "localhost";
        if (key === "EMAIL_SMTP_PORT") return "1025";
        return "";
      });

      await emailService.initialize();

      const source = emailService.getConfigurationSource();
      expect(source).toBe("local-development");
    });
  });

  describe("Email Sending - Simulation Mode", () => {
    beforeEach(async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SIMULATION_MODE") return "true";
        return "";
      });
      (simpleConfig.getEmailConfig as jest.Mock).mockReturnValue({
        fromAddress: "noreply@test.com",
      });

      await emailService.initialize();
    });

    it("should send email in simulation mode", async () => {
      const emailOptions = {
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
        from: "sender@example.com",
      };

      const result = await emailService.sendMail(emailOptions);

      expect(result).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "📧 [SIMULATION] Email would be sent:"
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "   From:",
        "sender@example.com"
      );
      expect(consoleSpy.log).toHaveBeenCalledWith("   To:", "test@example.com");
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "   Subject:",
        "Test Subject"
      );
    });

    it("should use default from address", async () => {
      const emailOptions = {
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
      };

      const result = await emailService.sendMail(emailOptions);

      expect(result).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "   From:",
        "noreply@test.com"
      );
    });

    it("should handle array recipients", async () => {
      const emailOptions = {
        to: ["test1@example.com", "test2@example.com"],
        cc: ["cc@example.com"],
        bcc: "bcc@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
      };

      const result = await emailService.sendMail(emailOptions);

      expect(result).toBe(true);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        "   To:",
        "test1@example.com,test2@example.com"
      );
      expect(consoleSpy.log).toHaveBeenCalledWith("   CC:", "cc@example.com");
      expect(consoleSpy.log).toHaveBeenCalledWith("   BCC:", "bcc@example.com");
    });

    it("should validate required email fields", async () => {
      const incompleteOptions = {
        subject: "Test Subject",
        // Missing 'to' and 'html'
      } as any;

      await expect(emailService.sendMail(incompleteOptions)).rejects.toThrow();
    });
  });

  describe("Email Sending - Production Mode", () => {
    beforeEach(async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SMTP_HOST") return "localhost";
        if (key === "EMAIL_SMTP_PORT") return "1025";
        return "";
      });
      (simpleConfig.getEmailConfig as jest.Mock).mockReturnValue({
        fromAddress: "noreply@shiftbook.local",
      });

      await emailService.initialize();
    });

    it("should send email successfully", async () => {
      const emailOptions = {
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
        text: "Test plain text",
      };

      const result = await emailService.sendMail(emailOptions);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: "noreply@shiftbook.local",
        to: "test@example.com",
        cc: undefined,
        bcc: undefined,
        subject: "Test Subject",
        html: "<p>Test HTML content</p>",
        text: "Test plain text",
        attachments: undefined,
      });
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Email sent successfully: test-message-id")
      );
    });

    it("should convert HTML to plain text when not provided", async () => {
      const emailOptions = {
        to: "test@example.com",
        subject: "Test Subject",
        html: '<p>Test <strong>HTML</strong> content</p><script>alert("test")</script><style>body{color:red;}</style>',
      };

      await emailService.sendMail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "Test HTML content",
        })
      );
    });

    it("should handle email attachments", async () => {
      const emailOptions = {
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
        attachments: [
          {
            filename: "test.txt",
            content: "Test content",
            contentType: "text/plain",
          },
        ],
      };

      const result = await emailService.sendMail(emailOptions);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              filename: "test.txt",
              content: "Test content",
              contentType: "text/plain",
            },
          ],
        })
      );
    });

    it("should retry on failure and eventually succeed", async () => {
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ messageId: "success-message-id" });

      const emailOptions = {
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      };

      const result = await emailService.sendMail(emailOptions);

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("Email send attempt 1 failed:"),
        "Network error"
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Retrying in 1000ms...")
      );
    });

    it("should fail after exhausting retries", async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error("Persistent error"));

      const emailOptions = {
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      };

      await expect(emailService.sendMail(emailOptions)).rejects.toThrow();
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "❌ All email send attempts failed"
      );
    });

    it("should show Ethereal preview URL in development", async () => {
      // Reset to development mode with Ethereal
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SIMULATION_MODE") return "false"; // Disable simulation mode
        if (key === "EMAIL_SMTP_HOST") return ""; // No local SMTP (triggers Ethereal)
        if (key === "EMAIL_SMTP_PORT") return "";
        return "";
      });

      // Ensure we're in development mode
      process.env.NODE_ENV = "development";

      emailService["isInitialized"] = false;
      emailService["configCache"] = null;

      await emailService.initialize();

      const emailOptions = {
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test content</p>",
      };

      await emailService.sendMail(emailOptions);

      expect(nodemailer.getTestMessageUrl).toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining(
          "Preview URL: https://ethereal.email/message/test-id"
        )
      );
    });
  });

  describe("Email Tracking", () => {
    beforeEach(async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SIMULATION_MODE") return "true";
        return "";
      });
      (simpleConfig.getEmailConfig as jest.Mock).mockReturnValue({
        fromAddress: "noreply@test.com",
      });

      await emailService.initialize();
    });

    it("should send email with tracking", async () => {
      const emailOptions = {
        to: "test@example.com",
        subject: "Tracked Email",
        html: "<p>Tracked content</p>",
      };

      const result = await emailService.sendMailWithTracking(
        emailOptions,
        "NOTIFICATION",
        "log-123"
      );

      expect(result.success).toBe(true);
      expect(result.trackingId).toBeDefined();
      expect(result.trackingId).toMatch(/^email_\d+_[a-z0-9]+$/);

      const deliveryRecord = emailService.getDeliveryStatus(result.trackingId);
      expect(deliveryRecord).toBeDefined();
      expect(deliveryRecord?.status).toBe("simulated");
      expect(deliveryRecord?.category).toBe("NOTIFICATION");
      expect(deliveryRecord?.logEntryId).toBe("log-123");
    });

    it("should get delivery status by log entry ID", async () => {
      const emailOptions1 = {
        to: "test1@example.com",
        subject: "Email 1",
        html: "<p>Content 1</p>",
      };

      const emailOptions2 = {
        to: "test2@example.com",
        subject: "Email 2",
        html: "<p>Content 2</p>",
      };

      await emailService.sendMailWithTracking(emailOptions1, "INFO", "log-789");
      await emailService.sendMailWithTracking(emailOptions2, "INFO", "log-789");

      const records = emailService.getDeliveryStatusByLogEntry("log-789");

      expect(records).toHaveLength(2);
      expect(records[0].logEntryId).toBe("log-789");
      expect(records[1].logEntryId).toBe("log-789");
    });

    it("should return undefined for non-existent tracking ID", () => {
      const record = emailService.getDeliveryStatus("non-existent-id");
      expect(record).toBeUndefined();
    });

    it("should track email failures", async () => {
      // Switch to non-simulation mode to test actual failures
      emailService["simulationMode"] = false;
      mockTransporter.sendMail.mockRejectedValue(new Error("Send failed"));

      const emailOptions = {
        to: "test@example.com",
        subject: "Failed Email",
        html: "<p>Failed content</p>",
      };

      const result = await emailService.sendMailWithTracking(
        emailOptions,
        "ERROR",
        "log-456"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      const deliveryRecord = emailService.getDeliveryStatus(result.trackingId);
      expect(deliveryRecord?.status).toBe("failed");
    });
  });

  describe("Delivery Statistics", () => {
    beforeEach(async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SIMULATION_MODE") return "true";
        return "";
      });
      (simpleConfig.getEmailConfig as jest.Mock).mockReturnValue({
        fromAddress: "noreply@test.com",
      });

      await emailService.initialize();
    });

    it("should return empty statistics initially", () => {
      const stats = emailService.getDeliveryStatistics();

      expect(stats.total).toBe(0);
      expect(stats.sent).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.queued).toBe(0);
      expect(stats.simulated).toBe(0);
      expect(stats.recentFailures).toEqual([]);
      expect(stats.configurationSource).toBeDefined();
    });

    it("should track delivery statistics correctly", async () => {
      const emailOptions1 = {
        to: "success@example.com",
        subject: "Success Email",
        html: "<p>Success</p>",
      };

      await emailService.sendMailWithTracking(
        emailOptions1,
        "SUCCESS",
        "log-1"
      );

      const stats = emailService.getDeliveryStatistics();

      expect(stats.total).toBe(1);
      expect(stats.simulated).toBe(1);
      expect(stats.configurationSource).toBeDefined();
    });
  });

  describe("Connection Testing", () => {
    it("should test connection successfully", async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SMTP_HOST") return "localhost";
        if (key === "EMAIL_SMTP_PORT") return "1025";
        return "";
      });

      await emailService.initialize();

      const result = await emailService.testConnection();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it("should handle connection test failure", async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SMTP_HOST") return "localhost";
        if (key === "EMAIL_SMTP_PORT") return "1025";
        return "";
      });

      await emailService.initialize();
      mockTransporter.verify.mockRejectedValue(new Error("Connection failed"));

      const result = await emailService.testConnection();

      expect(result).toBe(false);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        "Email service connection test failed:",
        expect.any(Error)
      );
    });
  });

  describe("Health Status", () => {
    beforeEach(async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SMTP_HOST") return "localhost";
        if (key === "EMAIL_SMTP_PORT") return "1025";
        return "";
      });

      await emailService.initialize();
    });

    it("should return health status", () => {
      const health = emailService.getHealthStatus();

      expect(health).toEqual({
        initialized: true,
        connectionTest: true, // transporter exists
        configurationSource: "local-development",
        cacheStatus: "cached",
        rateLimitStatus: "active",
      });
    });
  });

  describe("Record Cleanup", () => {
    beforeEach(async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SIMULATION_MODE") return "true";
        return "";
      });
      (simpleConfig.getEmailConfig as jest.Mock).mockReturnValue({
        fromAddress: "noreply@test.com",
      });

      await emailService.initialize();

      // Clear any existing delivery records from previous tests
      const deliveryRecords = emailService["deliveryRecords"];
      deliveryRecords.clear();

      // Verify we're working with the same instance throughout the test
      expect(emailService["deliveryRecords"]).toBe(deliveryRecords);
    });

    it("should clean up old delivery records", async () => {
      // Manually create delivery records for testing the cleanup function
      const deliveryRecords = emailService["deliveryRecords"];

      // Create two test records - one old, one recent
      const oldRecord = {
        id: "old-record",
        recipients: ["old@example.com"],
        subject: "Old Email",
        category: "TEST",
        logEntryId: "log-old",
        status: "sent" as const,
        attempts: 1,
        lastAttempt: new Date("2020-01-01T00:00:00Z"), // Very old date
      };

      const newRecord = {
        id: "new-record",
        recipients: ["new@example.com"],
        subject: "New Email",
        category: "TEST",
        logEntryId: "log-new",
        status: "sent" as const,
        attempts: 1,
        lastAttempt: new Date(), // Recent date
      };

      deliveryRecords.set("old-record", oldRecord);
      deliveryRecords.set("new-record", newRecord);

      expect(emailService.getDeliveryStatistics().total).toBe(2);

      const deletedCount = emailService.cleanupOldRecords(30);

      expect(deletedCount).toBe(1);
      expect(emailService.getDeliveryStatistics().total).toBe(1);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Cleaned up 1 old email delivery records")
      );
    });

    it("should not delete recent records", () => {
      const deletedCount = emailService.cleanupOldRecords(30);

      expect(deletedCount).toBe(0);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("Cleaned up 0 old email delivery records")
      );
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SMTP_HOST") return "localhost";
        if (key === "EMAIL_SMTP_PORT") return "1025";
        return "";
      });
      (simpleConfig.getEmailConfig as jest.Mock).mockReturnValue({
        fromAddress: "noreply@test.com",
      });

      await emailService.initialize();
    });

    it("should handle multiple emails with rate limiting", async () => {
      const emailPromises: Promise<boolean>[] = [];
      for (let i = 0; i < 3; i++) {
        const emailOptions = {
          to: `test${i}@example.com`,
          subject: `Rate Limit Test ${i}`,
          html: `<p>Test ${i}</p>`,
        };
        emailPromises.push(emailService.sendMail(emailOptions));
      }

      const results = await Promise.all(emailPromises);

      expect(results.every((result) => result === true)).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SIMULATION_MODE") return "true";
        return "";
      });
      (simpleConfig.getEmailConfig as jest.Mock).mockReturnValue({
        fromAddress: "noreply@test.com",
      });

      await emailService.initialize();
    });

    it("should validate required fields", async () => {
      const invalidOptions = {} as any;

      await expect(emailService.sendMail(invalidOptions)).rejects.toThrow();
    });

    it("should handle large recipient lists", async () => {
      const manyRecipients = Array.from(
        { length: 50 },
        (_, i) => `test${i}@example.com`
      );
      const emailOptions = {
        to: manyRecipients,
        subject: "Bulk Test",
        html: "<p>Bulk email</p>",
      };

      const result = await emailService.sendMail(emailOptions);
      expect(result).toBe(true);
    });

    it("should handle special characters in emails", async () => {
      const emailOptions = {
        to: "test@例え.テスト",
        subject: "测试主题 🚀",
        html: "<p>Special characters: àáâãäåæçèéêë 中文 🎉</p>",
      };

      const result = await emailService.sendMail(emailOptions);
      expect(result).toBe(true);
    });

    it("should handle initialization before sending", async () => {
      const freshService = new (EmailService as any)();
      (simpleConfig.getEmailConfig as jest.Mock).mockReturnValue({
        fromAddress: "noreply@test.com",
      });

      const emailOptions = {
        to: "test@example.com",
        subject: "Auto Init Test",
        html: "<p>Auto init content</p>",
      };

      const result = await freshService.sendMail(emailOptions);
      expect(result).toBe(true);
    });
  });

  describe("HTML Processing", () => {
    it("should remove scripts and styles from HTML", async () => {
      (simpleConfig.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "EMAIL_SMTP_HOST") return "localhost";
        if (key === "EMAIL_SMTP_PORT") return "1025";
        return "";
      });
      (simpleConfig.getEmailConfig as jest.Mock).mockReturnValue({
        fromAddress: "noreply@test.com",
      });

      await emailService.initialize();

      const complexHtml = `
        <html>
          <head>
            <style>body { color: red; }</style>
            <script>alert('test');</script>
          </head>
          <body>
            <h1>Header</h1>
            <p>Paragraph with <strong>bold</strong> text</p>
            <script>console.log('embedded');</script>
          </body>
        </html>
      `;

      const emailOptions = {
        to: "test@example.com",
        subject: "HTML Processing Test",
        html: complexHtml,
      };

      await emailService.sendMail(emailOptions);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentEmail.text).not.toContain("alert");
      expect(sentEmail.text).not.toContain("script");
      expect(sentEmail.text).not.toContain("style");
      expect(sentEmail.text).toContain("Header");
      expect(sentEmail.text).toContain("Paragraph with bold text");
    });
  });
});
