/**
 * Email Service Module for ShiftBook Application
 * Provides email notification capabilities using nodemailer with BTP destination service integration
 * Enhanced development support and simulation modes
 */

import { getDestination } from "@sap-cloud-sdk/connectivity";
import * as nodemailer from "nodemailer";
import { ErrorCategory, errorHandler, ErrorSeverity } from "./error-handler";
import { simpleConfig } from "./simple-config";

// Configuration cache for performance
interface CachedConfig {
  smtpConfig: nodemailer.TransportOptions;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  source: "btp-destination" | "environment" | "local-development";
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  from?: string;
}

export interface EmailDeliveryRecord {
  id: string;
  recipients: string[];
  subject: string;
  category: string;
  logEntryId: string;
  status: "queued" | "sent" | "failed" | "simulated";
  attempts: number;
  lastAttempt: Date;
  errorMessage?: string;
}

// Environment detection (dynamic to allow test environment changes)
const isDevelopment = () =>
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "local";
const isProduction = () =>
  process.env.NODE_ENV === "production" || process.env.VCAP_APPLICATION;

class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private lastRefillTimestamp: number;
  private tokensPerSecond: number;

  constructor(maxTokens: number, tokensPerSecond: number) {
    this.tokens = maxTokens;
    this.maxTokens = maxTokens;
    this.lastRefillTimestamp = Date.now();
    this.tokensPerSecond = tokensPerSecond;
  }

  async getToken(): Promise<boolean> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    const waitTime = (1 / this.tokensPerSecond) * 1000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    return this.getToken();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedTimeInSeconds = (now - this.lastRefillTimestamp) / 1000;
    const tokensToAdd = elapsedTimeInSeconds * this.tokensPerSecond;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefillTimestamp = now;
    }
  }
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;
  private destinationName = "shiftbook-email";
  private isInitialized = false;
  private retryCount = 3;
  private retryDelay = 1000; // ms
  private rateLimiter: RateLimiter;
  private deliveryRecords: Map<string, EmailDeliveryRecord> = new Map();
  private configCache: CachedConfig | null = null;
  private readonly configCacheTTL = 5 * 60 * 1000; // 5 minutes
  private simulationMode = false;

  private constructor() {
    // Initialize rate limiter (100 emails max, 10 per second)
    this.rateLimiter = new RateLimiter(100, 10);

    // Don't determine simulation mode here - do it lazily when needed
    this.simulationMode = false; // Will be set properly in initialize()
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public static resetInstance(): void {
    EmailService.instance = null as any;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Determine simulation mode now that configManager is available
    const explicitSimulationMode = simpleConfig.get("EMAIL_SIMULATION_MODE");
    const isTestEnvironment = process.env.NODE_ENV === "test";

    if (explicitSimulationMode === "true") {
      this.simulationMode = true;
    } else if (explicitSimulationMode === "false") {
      this.simulationMode = false;
    } else {
      // Auto-detect: test environment or development with no SMTP config
      this.simulationMode =
        isTestEnvironment ||
        (isDevelopment() && !simpleConfig.get("EMAIL_SMTP_HOST"));
    }

    console.log(
      `Email Service Initialization - Environment: ${
        process.env.NODE_ENV || "unknown"
      }`
    );
    console.log(
      `Simulation Mode: ${this.simulationMode ? "ENABLED" : "DISABLED"}`
    );

    if (this.simulationMode) {
      console.log(
        "📧 Email Service running in SIMULATION MODE - emails will be logged but not sent"
      );
      this.isInitialized = true;
      return;
    }

    try {
      const smtpConfig = await this.getSmtpConfiguration();
      this.transporter = nodemailer.createTransport(smtpConfig);

      // Test connection only in production or when explicitly configured
      if (
        isProduction() ||
        simpleConfig.get("EMAIL_TEST_CONNECTION") === "true"
      ) {
        await this.transporter.verify();
        console.log("✅ SMTP connection verified successfully");
      } else {
        console.log("🔧 Skipping SMTP connection test (development mode)");
      }

      this.isInitialized = true;
      console.log("✅ Email Service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Email Service:", error);
      throw error;
    }
  }

  private async getSmtpConfiguration(): Promise<nodemailer.TransportOptions> {
    // Check if we have a valid cached configuration
    if (
      this.configCache &&
      Date.now() - this.configCache.timestamp < this.configCacheTTL
    ) {
      console.log(
        `Using cached SMTP configuration (source: ${this.configCache.source})`
      );
      return this.configCache.smtpConfig;
    }

    let smtpConfig: nodemailer.TransportOptions;
    let source: "btp-destination" | "environment" | "local-development";

    // Development-specific configuration
    if (isDevelopment()) {
      console.log(
        "🔧 Development environment detected - using development SMTP configuration"
      );

      // Check for local SMTP server (e.g., MailHog, Ethereal)
      const localSmtpHost = simpleConfig.get("EMAIL_SMTP_HOST");
      const localSmtpPort = simpleConfig.get("EMAIL_SMTP_PORT");

      if (localSmtpHost && localSmtpPort) {
        // Use local SMTP server configuration
        smtpConfig = {
          host: localSmtpHost,
          port: parseInt(localSmtpPort),
          secure: simpleConfig.get("EMAIL_SMTP_SECURE") === "true",
          auth: {
            user: simpleConfig.get("EMAIL_SMTP_USER", ""),
            pass: simpleConfig.get("EMAIL_SMTP_PASSWORD", ""),
          },
          tls: {
            rejectUnauthorized: false, // Allow self-signed certificates in development
          },
        } as any;
        source = "local-development";
        console.log(
          `📧 Using local SMTP server: ${localSmtpHost}:${localSmtpPort}`
        );
      } else {
        // Use Ethereal for testing (no setup required)
        console.log("📧 No local SMTP configured, using Ethereal for testing");
        const testAccount = await nodemailer.createTestAccount();
        smtpConfig = {
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        } as any;
        source = "local-development";
        console.log(`📧 Ethereal test account created: ${testAccount.user}`);
      }
    } else {
      // Production configuration - try BTP first, then environment
      try {
        console.log(
          "Attempting to fetch SMTP configuration from BTP Destination Service..."
        );
        const destination = await getDestination({
          destinationName: this.destinationName,
        });

        // Debug logging to see what we get from the destination
        console.log(
          "🔧 [DEBUG] Destination object received:",
          JSON.stringify(
            {
              username: destination.username ? "***HIDDEN***" : "MISSING",
              password: destination.password ? "***HIDDEN***" : "MISSING",
              originalProperties: destination.originalProperties
                ? Object.keys(destination.originalProperties)
                : "NONE",
              url: destination.url,
              authTokens: destination.authTokens ? "Present" : "None",
            },
            null,
            2
          )
        );

        // Extract SMTP configuration from destination
        const smtpHost =
          destination.originalProperties?.["mail.smtp.host"] ||
          destination.originalProperties?.host ||
          "localhost";
        const smtpPort =
          destination.originalProperties?.["mail.smtp.port"] || "587";

        // Extract credentials from authTokens (for BasicAuthentication)
        let smtpUser = "";
        let smtpPass = "";
        let credentialsSource = "none";

        if (destination.authTokens && destination.authTokens.length > 0) {
          try {
            const authToken = destination.authTokens[0];
            const decoded = Buffer.from(authToken.value, "base64").toString();
            const [user, pass] = decoded.split(":");
            smtpUser = user;
            smtpPass = pass;
            credentialsSource = "authTokens";
          } catch (error) {
            console.warn("Failed to decode authTokens:", error.message);
          }
        }

        // Fallback to originalProperties or direct properties
        if (!smtpUser) {
          smtpUser =
            destination.originalProperties?.["mail.user"] ||
            destination.username ||
            "";
          smtpPass =
            destination.originalProperties?.["mail.password"] ||
            destination.password ||
            "";
          credentialsSource = smtpUser ? "originalProperties" : "none";
        }

        console.log("🔧 [DEBUG] Extracted SMTP config from destination:");
        console.log(`   Host: ${smtpHost}`);
        console.log(`   Port: ${smtpPort}`);
        console.log(
          `   User: ${
            smtpUser ? "***SET***" : "NOT SET"
          } (${credentialsSource})`
        );
        console.log(
          `   Password: ${
            smtpPass ? "***SET***" : "NOT SET"
          } (${credentialsSource})`
        );

        // Log originalProperties but hide sensitive data
        const safeProperties = { ...destination.originalProperties };
        if (safeProperties["mail.password"]) {
          safeProperties["mail.password"] = "***HIDDEN***";
        }
        console.log(
          `   All originalProperties:`,
          JSON.stringify(safeProperties, null, 2)
        );

        smtpConfig = {
          host: smtpHost,
          port: parseInt(smtpPort),
          secure:
            destination.originalProperties?.["mail.smtp.ssl.enable"] === "true",
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: true, // Strict SSL in production
          },
        } as any;

        source = "btp-destination";
        console.log(
          "✅ Successfully retrieved configuration from BTP destination service"
        );
      } catch (destinationError) {
        console.log(
          "⚠️ BTP destination service not available, using environment configuration"
        );
        console.log("Destination error details:", destinationError.message);

        // Fallback to environment variables
        smtpConfig = {
          host: simpleConfig.get("EMAIL_SMTP_HOST"),
          port: parseInt(simpleConfig.get("EMAIL_SMTP_PORT", "587")),
          secure: simpleConfig.get("EMAIL_SMTP_SECURE") === "true",
          auth: {
            user: simpleConfig.get("EMAIL_SMTP_USER"),
            pass: simpleConfig.get("EMAIL_SMTP_PASSWORD"),
          },
          tls: {
            rejectUnauthorized: true,
          },
        } as any;

        source = "environment";
        console.log("📧 Using environment-based SMTP configuration");
      }
    }

    // Cache the configuration
    this.configCache = {
      smtpConfig,
      timestamp: Date.now(),
      ttl: this.configCacheTTL,
      source,
    };

    return smtpConfig;
  }

  public async sendMail(options: EmailOptions): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check rate limit
    await this.rateLimiter.getToken();

    // Input validation
    if (!options.to || !options.subject || !options.html) {
      const errorContext = errorHandler.createErrorContext(
        {},
        "email-service",
        "send-mail"
      );

      const errorResponse = errorHandler.handleError(
        new Error(
          "Missing required email fields: to, subject, and html are mandatory"
        ),
        ErrorCategory.VALIDATION,
        errorContext,
        {
          severity: ErrorSeverity.LOW,
          code: "EMAIL_VALIDATION_ERROR",
          details: [
            {
              missingFields: [
                !options.to ? "to" : null,
                !options.subject ? "subject" : null,
                !options.html ? "html" : null,
              ].filter(Boolean),
            },
          ],
          retryable: false,
        }
      );

      throw new Error(JSON.stringify(errorResponse));
    }

    // Get default sender from configuration
    const emailConfig = await simpleConfig.getEmailConfig();
    const defaultSender = emailConfig.fromAddress;

    const mailOptions = {
      from: options.from || defaultSender,
      to: Array.isArray(options.to) ? options.to.join(",") : options.to,
      cc: options.cc
        ? Array.isArray(options.cc)
          ? options.cc.join(",")
          : options.cc
        : undefined,
      bcc: options.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc.join(",")
          : options.bcc
        : undefined,
      subject: options.subject,
      html: options.html,
      text: options.text || this.htmlToPlainText(options.html),
      attachments: options.attachments,
    };

    // Simulation mode - log but don't send
    if (this.simulationMode) {
      console.log("📧 [SIMULATION] Email would be sent:");
      console.log("   From:", mailOptions.from);
      console.log("   To:", mailOptions.to);
      console.log("   Subject:", mailOptions.subject);
      console.log("   CC:", mailOptions.cc || "none");
      console.log("   BCC:", mailOptions.bcc || "none");
      console.log("   Body length:", mailOptions.html.length, "characters");
      return true;
    }

    // Implement retry logic
    let attempts = 0;
    while (attempts < this.retryCount) {
      try {
        const info = await this.transporter!.sendMail(mailOptions);
        console.log(`✅ Email sent successfully: ${info.messageId}`);

        // In development, log the preview URL for Ethereal
        if (
          isDevelopment() &&
          info.messageId &&
          this.configCache?.source === "local-development"
        ) {
          console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }

        return true;
      } catch (error) {
        attempts++;
        console.error(
          `❌ Email send attempt ${attempts} failed:`,
          error.message
        );

        if (attempts >= this.retryCount) {
          console.error("❌ All email send attempts failed");

          const errorContext = errorHandler.createErrorContext(
            {},
            "email-service",
            "send-mail-retry"
          );

          const errorResponse = errorHandler.handleError(
            error,
            ErrorCategory.EXTERNAL_SERVICE,
            errorContext,
            {
              severity: ErrorSeverity.HIGH,
              code: "EMAIL_SEND_FAILED",
              details: [
                {
                  attempts,
                  maxAttempts: this.retryCount,
                  originalError: error.message,
                },
              ],
              retryable: false,
            }
          );

          throw new Error(JSON.stringify(errorResponse));
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempts - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  public async sendMailWithTracking(
    options: EmailOptions,
    category: string,
    logEntryId: string
  ): Promise<{ trackingId: string; success: boolean; error?: any }> {
    const trackingId = this.createDeliveryRecord(options, category, logEntryId);

    try {
      const result = await this.sendMail(options);

      // Update status based on simulation mode
      const status = this.simulationMode ? "simulated" : "sent";
      this.updateDeliveryStatus(trackingId, status);

      return { trackingId, success: true };
    } catch (error) {
      this.updateDeliveryStatus(trackingId, "failed", error);
      return { trackingId, success: false, error };
    }
  }

  private htmlToPlainText(html: string): string {
    // Simple HTML to plain text conversion
    return html
      .replace(/<style[^>]*>.*<\/style>/g, "")
      .replace(/<script[^>]*>.*<\/script>/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private createDeliveryRecord(
    mail: EmailOptions,
    category: string,
    logEntryId: string
  ): string {
    const id = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const record: EmailDeliveryRecord = {
      id,
      recipients: Array.isArray(mail.to) ? mail.to : [mail.to],
      subject: mail.subject,
      category,
      logEntryId,
      status: "queued",
      attempts: 0,
      lastAttempt: new Date(),
    };

    this.deliveryRecords.set(id, record);
    return id;
  }

  private updateDeliveryStatus(
    id: string,
    status: "queued" | "sent" | "failed" | "simulated",
    error?: any
  ): void {
    const record = this.deliveryRecords.get(id);
    if (record) {
      record.status = status;
      record.attempts += 1;
      record.lastAttempt = new Date();
      if (error) {
        record.errorMessage = error.message;
      }
      this.deliveryRecords.set(id, record);
    }
  }

  public getDeliveryStatus(id: string): EmailDeliveryRecord | undefined {
    return this.deliveryRecords.get(id);
  }

  public getDeliveryStatusByLogEntry(
    logEntryId: string
  ): EmailDeliveryRecord[] {
    return Array.from(this.deliveryRecords.values()).filter(
      (record) => record.logEntryId === logEntryId
    );
  }

  public getDeliveryStatistics(): {
    total: number;
    sent: number;
    failed: number;
    queued: number;
    simulated: number;
    recentFailures: EmailDeliveryRecord[];
    configurationSource: string;
  } {
    const records = Array.from(this.deliveryRecords.values());
    const recentFailures = records
      .filter((r) => r.status === "failed")
      .sort((a, b) => b.lastAttempt.getTime() - a.lastAttempt.getTime())
      .slice(0, 10); // Get last 10 failures

    return {
      total: records.length,
      sent: records.filter((r) => r.status === "sent").length,
      failed: records.filter((r) => r.status === "failed").length,
      queued: records.filter((r) => r.status === "queued").length,
      simulated: records.filter((r) => r.status === "simulated").length,
      recentFailures,
      configurationSource: this.getConfigurationSource(),
    };
  }

  public async testConnection(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      await this.transporter!.verify();
      return true;
    } catch (error) {
      console.error("Email service connection test failed:", error);
      return false;
    }
  }

  /**
   * Clear the configuration cache to force refresh from BTP Destination Service
   */
  public clearConfigCache(): void {
    this.configCache = null;
    console.log("Email service configuration cache cleared");
  }

  /**
   * Get current configuration source (BTP or environment)
   */
  public getConfigurationSource(): string {
    if (this.configCache) {
      return this.configCache.source;
    }
    return "unknown";
  }

  /**
   * Clean up old delivery records (older than specified days)
   * This helps prevent memory leaks in long-running applications
   */
  public cleanupOldRecords(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let cleanedCount = 0;
    for (const [id, record] of this.deliveryRecords.entries()) {
      if (record.lastAttempt < cutoffDate) {
        this.deliveryRecords.delete(id);
        cleanedCount++;
      }
    }

    console.log(
      `Cleaned up ${cleanedCount} old email delivery records (older than ${daysOld} days)`
    );
    return cleanedCount;
  }

  /**
   * Get email service health status
   */
  public getHealthStatus(): {
    initialized: boolean;
    connectionTest: boolean;
    configurationSource: string;
    cacheStatus: string;
    rateLimitStatus: string;
  } {
    return {
      initialized: this.isInitialized,
      connectionTest: this.transporter !== null,
      configurationSource: this.getConfigurationSource(),
      cacheStatus: this.configCache ? "cached" : "not-cached",
      rateLimitStatus: "active",
    };
  }
}

// Export the class and a function to get the instance
export default EmailService;
