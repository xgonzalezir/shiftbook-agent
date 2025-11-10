import * as cds from "@sap/cds";
import AuditLogger from "./lib/audit-logger";
import RateLimiter from "./lib/rate-limiter";
import * as configManager from "./lib/simple-config";
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;

// Import the new validation system
import ValidationMiddleware from "./lib/validation-middleware";

// Import email service
import EmailService from "./lib/email-service";

// Import Teams notification service
import { TeamsNotificationService } from "./lib/teams-notification-service";

// Import XSUAA scope mapper for proper scope handling
import { XSUAAScopeMapper } from "./lib/xsuaa-scope-mapper";

// Import language detection utilities
import {
  getSupportedLanguages,
  getUserLanguage,
  isLanguageSupported,
} from "./lib/language-middleware";

// Import optimized query service
import OptimizedQueryService from "./lib/optimized-query-service";

// Get email service instance
const emailService = EmailService.getInstance();

/**
 * Helper function to validate search queries for security
 */
function isSafeSearchQuery(query: string): boolean {
  if (!query || typeof query !== "string") return false;
  if (query.length > 64) return false;
  // Allow letters, numbers, spaces, dash, underscore
  const safePattern = /^[a-zA-Z0-9\s\-_]+$/;
  return safePattern.test(query);
}

/**
 * Handler for ShiftBookService: custom logic and validations with simplified configuration.
 */
// @ts-nocheck
console.log("🔧 [DEBUG] ShiftBookService.ts file is being executed!");

// Export the standard CAP service handler function
module.exports = function (srv: any) {
  console.log("🔧 ShiftBookService implementation loaded and registered");
  console.log("🔧 [DEBUG] Inside service initialization!");

  // Type assertion to help TypeScript
  const typedService = srv as any;

  console.log(
    "✅ ShiftBookService handler registered, setting up middleware and handlers..."
  );

  // Initialize XSUAA scope mapping middleware for production environment
  // Also enable for development when testing with real BTP tokens
  if (
    process.env.CDS_ENV === "production" ||
    process.env.NODE_ENV === "production" ||
    process.env.CDS_ENV === "development" ||
    process.env.NODE_ENV === "development"
  ) {
    console.log("Initializing XSUAA scope mapper for production environment");
    const scopeMapper = XSUAAScopeMapper.getInstance();
    console.log("Scope mapping configuration:", scopeMapper.getScopeMapping());

    // Add middleware to map XSUAA scopes to CAP-expected scopes
    typedService.before("*", (req: any) => {
      if (req.user && req.user.tokenInfo) {
        const tokenInfo = req.user.tokenInfo;

        // Map scopes if they exist
        if (tokenInfo.scope && Array.isArray(tokenInfo.scope)) {
          const originalScopes = [...tokenInfo.scope];
          tokenInfo.scope = scopeMapper.mapScopes(originalScopes);

          // Debug logging for scope mapping
          console.log("Request scope mapping:", {
            original: originalScopes,
            mapped: tokenInfo.scope,
            endpoint: req.path,
          });
        }

        // Map authorities if they exist
        if (tokenInfo.authorities && Array.isArray(tokenInfo.authorities)) {
          const originalAuthorities = [...tokenInfo.authorities];
          tokenInfo.authorities =
            scopeMapper.mapAuthorities(originalAuthorities);

          // Update req.user scopes for CAP compatibility
          req.user.scopes = tokenInfo.authorities;

          // Debug logging for authority mapping
          console.log("Request authority mapping:", {
            original: originalAuthorities,
            mapped: tokenInfo.authorities,
            userScopes: req.user.scopes,
            endpoint: req.path,
          });
        }
      }
    });
  }

  // Helper function to get BTP destination configuration
  const getDestinationConfig = async (destinationName: string) => {
    try {
      // In production BTP environment, use SAP Cloud SDK
      if (process.env.VCAP_SERVICES) {
        const { getDestination } = require("@sap-cloud-sdk/connectivity");
        const destination = await getDestination({
          destinationName: destinationName,
        });
        return destination;
      }

      // For development, return environment-based config
      console.log(
        `Using development config for destination: ${destinationName}`
      );
      return null;
    } catch (error) {
      console.error(`Error getting destination ${destinationName}:`, error);
      return null;
    }
  };

  // Helper function to get email configuration from environment variables or BTP Destination
  const getEmailConfig = async () => {
    try {
      console.log("🔧 [EMAIL DEBUG] Getting email configuration...");
      console.log("🔧 [EMAIL DEBUG] Environment vars:", {
        NODE_ENV: process.env.NODE_ENV,
        CDS_ENV: process.env.CDS_ENV,
        EMAIL_SIMULATION_MODE: process.env.EMAIL_SIMULATION_MODE,
        JEST_WORKER_ID: process.env.JEST_WORKER_ID,
      });

      const emailConfig = await configManager.getEmailConfig();
      console.log(
        "🔧 [EMAIL DEBUG] configManager.getEmailConfig() returned:",
        emailConfig
      );

      const destinationName = emailConfig.destinationName;
      const emailDestination = await getDestinationConfig(destinationName);

      // If we have a BTP destination, use it
      if (emailDestination) {
        return {
          type: "destination",
          destination: emailDestination,
          fromAddress:
            emailDestination.destinationConfiguration?.["from.address"] ||
            emailConfig.fromAddress,
          fromName:
            emailDestination.destinationConfiguration?.["from.name"] ||
            emailConfig.fromName,
        };
      }

      // For development, return simulation config
      const isTestEnv =
        process.env.NODE_ENV === "test" || process.env.CDS_ENV === "test";
      const isSimulationMode = process.env.EMAIL_SIMULATION_MODE === "true";
      const isJestEnv = process.env.JEST_WORKER_ID !== undefined;

      console.log("🔧 [EMAIL DEBUG] Simulation checks:", {
        emailConfigSimulationMode: emailConfig.simulationMode,
        envSimulationMode: process.env.EMAIL_SIMULATION_MODE,
        isTestEnv,
        isSimulationMode,
        isJestEnv,
        nodeEnv: process.env.NODE_ENV,
        cdsEnv: process.env.CDS_ENV,
      });

      if (
        emailConfig.simulationMode ||
        isSimulationMode ||
        isTestEnv ||
        isJestEnv
      ) {
        console.log("🔧 [EMAIL DEBUG] Returning simulation config");
        return {
          type: "simulation",
          fromAddress: emailConfig.fromAddress,
          fromName: emailConfig.fromName,
        };
      }

      // Fallback to environment variables for development
      return {
        type: "smtp",
        host: await configManager.get("EMAIL_SMTP_HOST"),
        port: parseInt(await configManager.get("EMAIL_SMTP_PORT", "587")),
        secure: (await configManager.get("EMAIL_SMTP_SECURE")) === "true",
        user: await configManager.get("EMAIL_SMTP_USER"),
        password: await configManager.get("EMAIL_SMTP_PASSWORD"),
        fromAddress: emailConfig.fromAddress,
        fromName: emailConfig.fromName,
      };
    } catch (error) {
      console.error("Error getting email configuration:", error);
      const fallbackConfig = await configManager.getEmailConfig();
      return {
        type: "simulation",
        fromAddress: fallbackConfig.fromAddress,
        fromName: fallbackConfig.fromName,
      };
    }
  };

  // Helper function to send email using the enhanced email service
  const sendEmail = async (
    recipients: string[],
    subject: string,
    message: string,
    category: string,
    logEntryId?: string,
    req?: any
  ) => {
    try {
      console.log("🔧 sendEmail called with:", {
        category,
        recipients: recipients.length,
      });
      const emailConfig = await getEmailConfig();
      console.log("🔧 Email config retrieved:", { type: emailConfig.type });

      // Validate recipients
      if (!recipients || recipients.length === 0) {
        throw new Error("No recipients provided");
      }

      // Validate email addresses
      const validRecipients = recipients.filter((recipient) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(recipient);
      });

      if (validRecipients.length === 0) {
        throw new Error("No valid email addresses provided");
      }

      if (validRecipients.length !== recipients.length) {
        console.warn(
          `Some invalid email addresses were filtered out: ${recipients
            .filter((r) => !validRecipients.includes(r))
            .join(", ")}`
        );
      }

      // Check if we're in simulation mode before initializing email service
      const isTestEnvironment = process.env.NODE_ENV === "test";
      const isSimulationMode = process.env.EMAIL_SIMULATION_MODE === "true";

      // Force simulation mode for any test-related scenarios
      if (
        emailConfig.type === "simulation" ||
        isTestEnvironment ||
        isSimulationMode ||
        process.env.JEST_WORKER_ID !== undefined
      ) {
        console.log(
          getText(
            req || {},
            "email.simulation.log",
            category,
            validRecipients.join("; "),
            subject,
            message
          )
        );
        return { status: "logged", recipients: validRecipients.join("; ") };
      }

      // Initialize email service only if not in simulation mode
      await emailService.initialize();

      // Create email options
      const emailOptions = {
        to: validRecipients,
        subject: subject,
        html: message,
        from: emailConfig.fromAddress,
      };

      // Send email with tracking if logEntryId is provided
      let result;
      if (logEntryId) {
        result = await emailService.sendMailWithTracking(
          emailOptions,
          `category_${category}`,
          logEntryId
        );
      } else {
        const success = await emailService.sendMail(emailOptions);
        result = { success, trackingId: null, messageId: null };
      }

      if (result.success) {
        console.log(
          getText(
            req || {},
            "email.sent.success",
            category,
            validRecipients.join("; "),
            subject,
            result.trackingId || "no-tracking"
          )
        );

        // Determine status based on simulation mode
        const emailConfig = await getEmailConfig();
        const status = emailConfig.type === "simulation" ? "logged" : "sent";

        return {
          status: status,
          recipients: validRecipients.join("; "),
          trackingId: result.trackingId,
          messageId: result.messageId,
        };
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error("🔧 Email sending failed:", error);
      console.error("🔧 Error stack:", error.stack);
      return {
        status: "failed",
        recipients: recipients.join("; "),
        error: error.message,
      };
    }
  };

  // Helper function to send notifications (email and/or Teams) based on category configuration
  const sendNotification = async (
    recipients: string[],
    subject: string,
    message: string,
    category: string,
    werks: string,
    logEntryId?: string,
    req?: any,
    logData?: any
  ) => {
    try {
      console.log(
        `🔧 [NOTIFICATION] Starting notification for category: ${category}, werks: ${werks}`
      );

      // Get category configuration
      const categoryConfig = await SELECT.one
        .from("ShiftBookCategory")
        .where({ ID: category, werks: werks })
        .columns(["ID", "werks", "sendmail"]);

      if (!categoryConfig) {
        console.log(
          `❌ [NOTIFICATION] Category not found: ${category} for werks: ${werks}`
        );
        return {
          status: "failed",
          error: "Category configuration not found",
          details: { category, werks },
        };
      }

      // Get Teams channel configuration for this category
      const teamsChannel = await SELECT.one
        .from("ShiftBookTeamsChannel")
        .where({ category_id: category });

      const results = {
        email: { sent: false, success: false, error: null },
        teams: { sent: false, success: false, error: null },
      };

      // Send EMAIL if there are email recipients and sendmail is enabled
      if (recipients.length > 0 && categoryConfig.sendmail === 1) {
        console.log(
          `📧 [EMAIL] Sending email notification for category: ${category}`
        );
        try {
          const emailResult = await sendEmailNotification(
            recipients,
            subject,
            message,
            category,
            logEntryId,
            req
          );
          results.email = {
            sent: true,
            success: emailResult.status === "sent",
            error: emailResult.status === "sent" ? null : emailResult.error,
          };
          console.log(`📧 [EMAIL] Email result:`, emailResult);
        } catch (error) {
          console.error(`❌ [EMAIL] Email sending failed:`, error);
          results.email = {
            sent: true,
            success: false,
            error: error.message,
          };
        }
      } else {
        console.log(
          `📧 [EMAIL] Skipped - No recipients (${recipients.length}) or sendmail disabled (${categoryConfig.sendmail})`
        );
      }

      // Send TEAMS if there's a teams channel configured and active
      if (teamsChannel && teamsChannel.active) {
        console.log(
          `📢 [TEAMS] Sending Teams notification for category: ${category}`
        );
        try {
          const teamsResult = await sendTeamsNotificationHandler(
            subject,
            message,
            category,
            werks,
            req,
            logData
          );
          results.teams = {
            sent: true,
            success: teamsResult.status === "sent",
            error: teamsResult.status === "sent" ? null : teamsResult.error,
          };
          console.log(`📢 [TEAMS] Teams result: ${teamsResult.status}`);
        } catch (error) {
          console.error(`❌ [TEAMS] Teams sending failed:`, error);
          results.teams = {
            sent: true,
            success: false,
            error: error.message,
          };
        }
      } else {
        console.log(
          `📢 [TEAMS] Skipped - No teams channel configured or inactive`
        );
      }

      // Determine overall success
      const emailSuccess = !results.email.sent || results.email.success;
      const teamsSuccess = !results.teams.sent || results.teams.success;
      const overallSuccess = emailSuccess && teamsSuccess;

      const finalResult = {
        status: overallSuccess ? "sent" : "failed",
        email: results.email,
        teams: results.teams,
        category: category,
        werks: werks,
        recipients: recipients ? recipients.join("; ") : null,
        notifications: [],
      };

      // Add notification details
      if (results.email.sent) {
        finalResult.notifications.push(
          `Email: ${results.email.success ? "sent" : "failed"}`
        );
      }
      if (results.teams.sent) {
        finalResult.notifications.push(
          `Teams: ${results.teams.success ? "sent" : "failed"}`
        );
      }

      console.log(`🔧 [NOTIFICATION] Final result:`, finalResult);
      return finalResult;
    } catch (error) {
      console.error(
        "❌ [NOTIFICATION] Critical error in sendNotification:",
        error
      );
      return {
        status: "failed",
        error: error.message,
        email: { sent: false, success: false, error: error.message },
        teams: { sent: false, success: false, error: error.message },
      };
    }
  };

  // Helper function to send email notifications (delegates to existing sendEmail)
  const sendEmailNotification = async (
    recipients: string[],
    subject: string,
    message: string,
    category: string,
    logEntryId?: string,
    req?: any
  ) => {
    // Call the existing sendEmail function
    return await sendEmail(
      recipients,
      subject,
      message,
      category,
      logEntryId,
      req
    );
  };

  // Helper function to send Teams notifications
  const sendTeamsNotificationHandler = async (
    subject: string,
    message: string,
    category: string,
    werks: string,
    req?: any,
    logData?: any
  ) => {
    try {
      console.log("🔧 Starting sendTeamsNotificationHandler function...");

      // Get Teams channel configuration for this category
      const teamsChannel = await SELECT.one
        .from("ShiftBookTeamsChannel")
        .where({
          category_id: category,
        });

      if (!teamsChannel) {
        throw new Error(
          `Teams channel configuration not found for category ${category}`
        );
      }

      if (!teamsChannel.active) {
        console.log(
          `🔧 Teams channel for category ${category} is not active - skipping notification`
        );
        return {
          status: "skipped",
          reason: "Teams channel is not active",
        };
      }

      // Determine notification type for theme color
      const notificationType = subject.toLowerCase().includes("alert")
        ? "alert"
        : subject.toLowerCase().includes("warning")
        ? "warning"
        : "info";

      // Prepare category and log details
      const categoryDetails = {
        category: category,
        werks: werks,
        type: notificationType,
        name: teamsChannel.name || "Shift Book",
      };

      const logDetails = {
        timestamp: new Date().toISOString(),
        channel: teamsChannel.name,
        shoporder: logData?.shoporder || "N/A",
        stepid: logData?.stepid || "N/A",
        split: logData?.split || "N/A",
        workcenter: logData?.workcenter || "N/A",
        user_id: logData?.user_id || "N/A",
      };

      // Always use HTTPS method for better SSL control in both development and production
      console.log(`🔧 [TEAMS] Using HTTPS method for Teams webhook`);
      const result =
        await TeamsNotificationService.sendTeamsNotificationWithHttps(
          teamsChannel.webhookURL,
          subject,
          message,
          categoryDetails,
          logDetails
        );

      if (result) {
        console.log(
          getText(
            req || {},
            "teams.sent.success",
            category,
            teamsChannel.name,
            subject
          )
        );

        return {
          status: "sent",
          channelName: teamsChannel.name,
        };
      } else {
        throw new Error("Failed to send Teams notification");
      }
    } catch (error) {
      console.error("🔧 Teams notification sending failed:", error);
      console.error("🔧 Error stack:", error.stack);
      return {
        status: "failed",
        error: error.message,
      };
    }
  };

  // Helper function to get localized text with simple fallback
  const getText = (req: any, key: string, ...args: any[]) => {
    // Use CAP's built-in i18n system with language detection
    try {
      // Apply the same language detection logic as in getShiftbookCategories
      let userLanguage = getUserLanguage(req);

      // Try to get language from CAP's internal request structure
      const capQuery = req._?.req?.query;
      if (capQuery?.lang) {
        userLanguage = capQuery.lang.toLowerCase();
      }

      // Also check Accept-Language header from CAP's internal structure
      const acceptLang = req._?.req?.headers?.["accept-language"];
      if (userLanguage === "en" && acceptLang) {
        if (acceptLang.includes("de")) userLanguage = "de";
        else if (acceptLang.includes("es")) userLanguage = "es";
        else if (acceptLang.includes("fr")) userLanguage = "fr";
      }

      console.log(
        `🔍 getText: Detected language ${userLanguage} for key ${key}`
      );

      // Try to get message from i18n files directly based on detected language
      let message = key; // Default fallback

      // Load messages from i18n files
      if (userLanguage === "de") {
        // Load German messages
        const fs = require("fs");
        const path = require("path");
        try {
          const messagesPath = path.join(
            __dirname,
            "../_i18n/messages_de.properties"
          );
          const messagesContent = fs.readFileSync(messagesPath, "utf8");
          const lines = messagesContent.split("\n");

          for (const line of lines) {
            if (line.startsWith(key + "=")) {
              message = line.substring(key.length + 1);
              break;
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not load German messages: ${error.message}`);
        }
      } else if (userLanguage === "es") {
        // Load Spanish messages (similar logic)
        const fs = require("fs");
        const path = require("path");
        try {
          const messagesPath = path.join(
            __dirname,
            "../_i18n/messages_es.properties"
          );
          const messagesContent = fs.readFileSync(messagesPath, "utf8");
          const lines = messagesContent.split("\n");

          for (const line of lines) {
            if (line.startsWith(key + "=")) {
              message = line.substring(key.length + 1);
              break;
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not load Spanish messages: ${error.message}`);
        }
      } else if (userLanguage === "fr") {
        // Load French messages
        const fs = require("fs");
        const path = require("path");
        try {
          const messagesPath = path.join(
            __dirname,
            "../_i18n/messages_fr.properties"
          );
          const messagesContent = fs.readFileSync(messagesPath, "utf8");
          const lines = messagesContent.split("\n");

          for (const line of lines) {
            if (line.startsWith(key + "=")) {
              message = line.substring(key.length + 1);
              break;
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not load French messages: ${error.message}`);
        }
      }

      console.log(`🔍 getText: Found message for ${key}: ${message}`);

      // If we found a localized message, interpolate parameters
      if (message !== key && args.length > 0) {
        args.forEach((arg, index) => {
          message = message.replace(new RegExp(`\\{${index}\\}`, "g"), arg);
        });
        console.log(`🔍 getText: After interpolation: ${message}`);
        return message;
      }

      // If the message is the same as the key, it means no translation was found
      // In this case, fall back to the default implementation
      if (message === key) {
        // Fallback messages for backward compatibility
        const fallbackMessages = {
          "error.category.already.exists":
            "Category {0} already exists for plant {1}",
          "error.missing.required.fields": "Missing required fields: {0}",
          "error.email.already.exists":
            "Email {0} already exists for category {1} and plant {2}",
          "error.translation.already.exists":
            "A translation already exists for category {0}, plant {1} and language {2}",
          "error.no.email.recipients":
            "No email recipients found for category {0} in plant {1}",
          "error.category.creation.failed":
            "Failed to create category - unable to retrieve generated ID",
          "field.category_werks": "category and werks",
          "field.category_werks_mail": "category, werks and mail_address",
          "field.category_werks_lng": "category, werks and lng",
          "email.simulation.log":
            "EMAIL SIMULATION - Category: {0}, Recipients: {1}, Subject: {2}, Message: {3}",
          "email.auto.log":
            "AUTO-EMAIL - Category: {0}, Recipients: {1}, Subject: {2}, Message: {3}",
          "email.sent.success":
            "EMAIL SENT - Category: {0}, Recipients: {1}, Subject: {2}, Tracking: {3}",
          "status.simulated": "simulated",
          "error.category.not.found": "Category {0} not found for plant {1}",
        };

        let fallbackMessage = fallbackMessages[key] || key;

        // Simple parameter replacement for fallback
        args.forEach((arg, index) => {
          fallbackMessage = fallbackMessage.replace(`{${index}}`, arg);
        });

        return fallbackMessage;
      }

      return message;
    } catch (error) {
      console.error(`Error getting localized message for key '${key}':`, error);

      // Return the key as fallback
      return key;
    }
  };

  // Create validation middleware instances
  const shiftBookLogValidator =
    ValidationMiddleware.createShiftBookLogValidator({
      enableAuditLogging: true,
      strictMode: false,
    });

  const shiftBookCategoryValidator =
    ValidationMiddleware.createShiftBookCategoryValidator({
      enableAuditLogging: true,
      strictMode: false,
    });

  // Note: Child entity validators removed - these entities are now protected
  // and can only be accessed through parent entity operations

  // Enhanced validation for ShiftBookLog using the ValidationMiddleware pattern (matching other handlers)
  typedService.before("CREATE", "ShiftBookLog", async (req: any) => {
    const audit = AuditLogger.forAction("CREATE_SHIFTBOOK_LOG", req);

    try {
      // Set log_dt to current timestamp if not provided
      if (!req.data.log_dt) {
        req.data.log_dt = new Date();
      }

      await shiftBookLogValidator(req, async () => {
        // Additional create-specific logic can go here
      });

      // Log the creation attempt
      await audit.logSuccess("ShiftBookLog", undefined, {
        operation: "CREATE",
        data: req.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await audit.logFailure("ShiftBookLog", error.message, undefined, {
        operation: "CREATE",
        data: req.data,
        error: error.message,
      });
      throw error;
    }
  });

  // After CREATE ShiftBookLog - Send notifications
  typedService.after("CREATE", "ShiftBookLog", async (data: any, req: any) => {
    console.log(
      "📢 [AFTER CREATE] ShiftBookLog created, sending notifications..."
    );
    console.log("📢 [AFTER CREATE] Log data:", data);

    try {
      if (data.category && data.werks) {
        console.log(
          `📢 [AFTER CREATE] Calling sendNotification for category: ${data.category}, werks: ${data.werks}`
        );

        // Get recipients from category configuration
        const categoryMails = await SELECT.from("ShiftBookCategoryMail").where({
          category: data.category,
          werks: data.werks,
        });

        const recipients = categoryMails.map((m: any) => m.mail_address);
        console.log(`📢 [AFTER CREATE] Found ${recipients.length} recipients`);

        // Prepare log data for notification
        const logData = {
          shoporder: data.shoporder,
          stepid: data.stepid,
          split: data.split,
          workcenter: data.workcenter,
          user_id: data.user_id,
        };

        // Call sendNotification even if no email recipients - it will still check for Teams channel
        const notificationResult = await sendNotification(
          recipients,
          data.subject || "Shift Book Log Entry",
          data.message || "",
          data.category,
          data.werks,
          data.ID,
          req,
          logData
        );

        console.log(
          "📢 [AFTER CREATE] Notification result:",
          notificationResult
        );
      } else {
        console.log(
          "⚠️ [AFTER CREATE] Skipping notifications - missing category or werks"
        );
      }
    } catch (error) {
      console.error("❌ [AFTER CREATE] Error sending notifications:", error);
      // Don't throw - we don't want to fail the log creation if notifications fail
    }
  });

  typedService.before("UPDATE", "ShiftBookLog", async (req: any) => {
    const audit = AuditLogger.forAction("UPDATE_SHIFTBOOK_LOG", req);

    try {
      await shiftBookLogValidator(req, async () => {
        // Additional update-specific logic can go here
      });

      // Log the update attempt
      await audit.logSuccess("ShiftBookLog", req.data.ID || req.data.guid, {
        operation: "UPDATE",
        data: req.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await audit.logFailure(
        "ShiftBookLog",
        error.message,
        req.data.ID || req.data.guid,
        {
          operation: "UPDATE",
          data: req.data,
          error: error.message,
        }
      );
      throw error;
    }
  });

  // DELETE handler for ShiftBookLog with audit logging
  typedService.before("DELETE", "ShiftBookLog", async (req: any) => {
    const audit = AuditLogger.forAction("DELETE_SHIFTBOOK_LOG", req);

    try {
      // Get the record before deletion for audit purposes
      const recordToDelete = await SELECT.one
        .from("ShiftBookLog")
        .where({ ID: req.data.ID || req.data.guid });

      if (recordToDelete) {
        await audit.logSuccess(
          "ShiftBookLog",
          recordToDelete.ID || recordToDelete.guid,
          {
            operation: "DELETE",
            deletedRecord: recordToDelete,
            timestamp: new Date().toISOString(),
          }
        );
      } else {
        await audit.logWarning(
          "ShiftBookLog",
          "Attempted to delete non-existent record",
          req.data.ID || req.data.guid,
          {
            operation: "DELETE",
            requestedId: req.data.ID || req.data.guid,
          }
        );
      }
    } catch (error) {
      await audit.logFailure(
        "ShiftBookLog",
        error.message,
        req.data.ID || req.data.guid,
        {
          operation: "DELETE",
          error: error.message,
        }
      );
      throw error;
    }
  });

  // Enhanced validation for ShiftBookCategory using the new validation system
  typedService.before("CREATE", "ShiftBookCategory", async (req: any) => {
    const audit = AuditLogger.forAction("CREATE_SHIFTBOOK_CATEGORY", req);

    try {
      await shiftBookCategoryValidator(req, async () => {
        // Additional create-specific logic can go here
      });

      await audit.logSuccess("ShiftBookCategory", undefined, {
        operation: "CREATE",
        data: req.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      await audit.logFailure("ShiftBookCategory", error.message, undefined, {
        operation: "CREATE",
        data: req.data,
        error: error.message,
      });
      throw error;
    }
  });

  typedService.before("UPDATE", "ShiftBookCategory", async (req: any) => {
    const audit = AuditLogger.forAction("UPDATE_SHIFTBOOK_CATEGORY", req);

    try {
      await shiftBookCategoryValidator(req, async () => {
        // Additional update-specific logic can go here
      });

      await audit.logSuccess(
        "ShiftBookCategory",
        `${req.data.ID}-${req.data.werks}`,
        {
          operation: "UPDATE",
          data: req.data,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      await audit.logFailure(
        "ShiftBookCategory",
        error.message,
        `${req.data.ID}-${req.data.werks}`,
        {
          operation: "UPDATE",
          data: req.data,
          error: error.message,
        }
      );
      throw error;
    }
  });

  // DELETE handler for ShiftBookCategory with audit logging
  typedService.before("DELETE", "ShiftBookCategory", async (req: any) => {
    const audit = AuditLogger.forAction("DELETE_SHIFTBOOK_CATEGORY", req);

    try {
      // Debug logging to see what we're receiving
      console.log("🔍 DELETE ShiftBookCategory - req.data:", req.data);
      console.log("🔍 DELETE ShiftBookCategory - req.params:", req.params);
      console.log("🔍 DELETE ShiftBookCategory - req.query:", req.query);
      console.log(
        "🔍 DELETE ShiftBookCategory - full req object keys:",
        Object.keys(req)
      );

      // Get the record before deletion for audit purposes
      // Fix: Use ID instead of category, as ID is the actual primary key
      const whereClause = { ID: req.data.ID, werks: req.data.werks };
      console.log("🔍 DELETE ShiftBookCategory - where clause:", whereClause);

      const recordToDelete = await SELECT.one
        .from("ShiftBookCategory")
        .where(whereClause);

      console.log(
        "🔍 DELETE ShiftBookCategory - record found:",
        recordToDelete
      );

      if (recordToDelete) {
        await audit.logSuccess(
          "ShiftBookCategory",
          `${recordToDelete.ID}-${recordToDelete.werks}`,
          {
            operation: "DELETE",
            deletedRecord: recordToDelete,
            timestamp: new Date().toISOString(),
          }
        );
      } else {
        console.log(
          "❌ DELETE ShiftBookCategory - Record not found for deletion"
        );
        await audit.logWarning(
          "ShiftBookCategory",
          "Attempted to delete non-existent record",
          `${req.data.ID}-${req.data.werks}`,
          {
            operation: "DELETE",
            requestedId: `${req.data.ID}-${req.data.werks}`,
            receivedData: req.data,
          }
        );
      }
    } catch (error) {
      console.error("❌ DELETE ShiftBookCategory - Error:", error);
      await audit.logFailure(
        "ShiftBookCategory",
        error.message,
        `${req.data.ID}-${req.data.werks}`,
        {
          operation: "DELETE",
          error: error.message,
          receivedData: req.data,
        }
      );
      throw error;
    }
  });

  // Child Entity Protection: Block direct CRUD operations on ShiftBookCategoryLng
  // These entities should only be modified through their parent entity operations
  typedService.before(
    ["CREATE", "UPDATE", "DELETE"],
    "ShiftBookCategoryLng",
    async (req: any) => {
      req.error(403, {
        code: "CHILD_ENTITY_ACCESS_DENIED",
        message:
          "ShiftBookCategoryLng can only be modified via its root entity (ShiftBookCategory)",
        target: "ShiftBookCategoryLng",
      });
    }
  );

  // Child Entity Protection: Block direct CRUD operations on ShiftBookCategoryMail
  // These entities should only be modified through their parent entity operations
  typedService.before(
    ["CREATE", "UPDATE", "DELETE"],
    "ShiftBookCategoryMail",
    async (req: any) => {
      req.error(403, {
        code: "CHILD_ENTITY_ACCESS_DENIED",
        message:
          "ShiftBookCategoryMail can only be modified via its root entity (ShiftBookCategory)",
        target: "ShiftBookCategoryMail",
      });
    }
  );

  // Test action handler - TEMPORARILY MODIFIED TO CHECK DESTINATION
  typedService.on("testAction", async (req: any) => {
    console.log(`🧪 testAction called - checking destination`);

    // Get destination name from configuration - SIMPLIFIED: Always use shiftbook-email
    const destinationName = "shiftbook-email";

    console.log(`🔍 [TEST] Final destination name: ${destinationName}`);
    console.log(`🔍 [TEST] Current timestamp: ${new Date().toISOString()}`);

    // Include debug info in response
    const debugInfo = {
      env_EMAIL_DESTINATION_NAME:
        process.env.EMAIL_DESTINATION_NAME || "not set",
      vcap_services_available: !!process.env.VCAP_SERVICES,
      timestamp: new Date().toISOString(),
    };

    try {
      // Try to get the destination
      const { getDestination } = require("@sap-cloud-sdk/connectivity");
      const destination = await getDestination({
        destinationName: destinationName,
      });

      if (destination) {
        console.log(`✅ [TEST] Destination '${destinationName}' found!`);
        console.log(`✅ [TEST] URL: ${destination.url || "not set"}`);
        console.log(`✅ [TEST] Type: ${destination.type || "not set"}`);

        return {
          status: "SUCCESS",
          destination: destinationName,
          destinationStatus: "FOUND",
          found: true,
          url: destination.url || null,
          type: destination.type || null,
          logId: null,
          category: null,
          werks: null,
          message: `Destination found successfully`,
          error: null,
          timestamp: new Date(),
          debug: debugInfo,
        };
      } else {
        console.log(`❌ [TEST] Destination '${destinationName}' not found`);

        return {
          status: "NOT_FOUND",
          destination: destinationName,
          destinationStatus: "NOT_FOUND",
          found: false,
          url: null,
          type: null,
          logId: null,
          category: null,
          werks: null,
          message: `Destination not found`,
          error: null,
          timestamp: new Date(),
          debug: debugInfo,
        };
      }
    } catch (error) {
      console.log(`❌ [TEST] Error checking destination: ${error.message}`);

      return {
        status: "ERROR",
        destination: destinationName,
        destinationStatus: "ERROR",
        found: false,
        url: null,
        type: null,
        logId: null,
        category: null,
        werks: null,
        message: null,
        error: error.message,
        timestamp: new Date(),
        debug: debugInfo,
      };
    }
  });

  // TEST: Handler for renamed action
  console.log(`[DEBUG] Registering testCreateCategory handler...`);
  typedService.on("testCreateCategory", async (req: any) => {
    console.log(`🚀🚀🚀 [DEBUG] testCreateCategory HANDLER CALLED!`);
    console.log(`📦 Data received:`, req.data);

    return {
      success: true,
      message: "Handler executed!",
      werks: req.data.werks,
    };
  });

  // TEST: Handler for simplified action
  console.log(`[DEBUG] Registering createCategorySimple handler...`);
  typedService.on("createCategorySimple", async (req: any) => {
    console.log(`🎯 [DEBUG] createCategorySimple HANDLER CALLED!`);
    console.log(`📦 Data received:`, req.data);

    return {
      success: true,
      id: "test-uuid-12345",
      message: "Simple action handler executed successfully!",
    };
  });

  // Handler for custom action: createCategoryWithDetails
  console.log(`[DEBUG] Registering createCategoryWithDetails handler...`);
  typedService.on("createCategoryWithDetails", async (req: any) => {
    console.log(`� [DEBUG] createCategoryWithDetails HANDLER CALLED!`);
    console.log(`�🚀 createCategoryWithDetails called with data:`, req.data);
    const audit = AuditLogger.forAction("CREATE_CATEGORY_WITH_DETAILS", req);

    // TEMP: Quick test to see if handler is called
    console.log("HANDLER IS BEING EXECUTED!");

    try {
      // Validate request data exists and is an object
      if (
        !req.data ||
        typeof req.data !== "object" ||
        Array.isArray(req.data)
      ) {
        audit.logFailure(
          "ShiftBookCategory",
          "Invalid request data format",
          undefined,
          { data: req.data }
        );
        const errorMessage = getText(req, "error.request.data.invalid");
        req.error(400, errorMessage);
        return;
      }

      const {
        werks,
        sendmail,
        sendworkcenters,
        default_subject,
        default_message,
        triggerproductionprocess,
        translations,
        mails,
        workcenters,
        teamsChannel,
      } = req.data;

      // Check for missing required fields first
      const missingFields = [];
      if (!werks) missingFields.push("werks");

      if (missingFields.length > 0) {
        audit.logFailure(
          "ShiftBookCategory",
          "Missing required fields",
          undefined,
          { missingFields }
        );
        const errorMessage = getText(
          req,
          "error.missing.required.fields",
          missingFields.join(", ")
        );
        req.error(400, errorMessage);
        return;
      }

      if (
        !werks ||
        typeof werks !== "string" ||
        werks.length < 1 ||
        werks.length > 4 ||
        !/^[A-Z0-9]+$/.test(werks)
      ) {
        audit.logFailure(
          "ShiftBookCategory",
          "Invalid werks format",
          undefined,
          { werks }
        );
        const errorMessage = getText(req, "error.werks.format");
        req.error(400, errorMessage);
        return;
      }

      if (
        sendmail !== undefined &&
        (typeof sendmail !== "number" || ![0, 1].includes(sendmail))
      ) {
        audit.logFailure(
          "ShiftBookCategory",
          "Invalid sendmail value",
          undefined,
          { sendmail }
        );
        const errorMessage = getText(req, "error.sendmail.value");
        req.error(400, errorMessage);
        return;
      }

      // Validate translations array
      if (
        translations &&
        (!Array.isArray(translations) || translations.length > 50)
      ) {
        audit.logFailure(
          "ShiftBookCategory",
          "Invalid translations array",
          undefined,
          { translationsLength: translations?.length }
        );
        const errorMessage = getText(req, "error.translations.array");
        req.error(400, errorMessage);
        return;
      }

      // Validate mails array
      if (mails && (!Array.isArray(mails) || mails.length > 100)) {
        audit.logFailure(
          "ShiftBookCategory",
          "Invalid mails array",
          undefined,
          { mailsLength: mails?.length }
        );
        const errorMessage = getText(req, "error.mails.max");
        req.error(400, errorMessage);
        return;
      }

      // Generate UUID explicitly using CDS built-in uuid function
      const { uuid } = cds.utils;
      const categoryId = uuid();

      console.log(
        `🔍 Creating new category for werks: ${werks} with ID: ${categoryId}`
      );

      const result = await INSERT.into("ShiftBookCategory").entries({
        ID: categoryId,
        werks,
        sendmail,
        sendworkcenters,
        default_subject,
        default_message,
        triggerproductionprocess,
      });

      console.log(`✅ Created category with pre-generated ID: ${categoryId}`);
      console.log(`🔧 Insert result:`, result);

      // Process translations if provided
      if (translations && Array.isArray(translations)) {
        for (const t of translations) {
          // Validate each translation
          if (!t.lng || typeof t.lng !== "string" || t.lng.length !== 2) {
            audit.logFailure(
              "ShiftBookCategoryLng",
              "Invalid language code",
              undefined,
              { lng: t.lng }
            );
            const errorMessage = getText(req, "error.language.code");
            req.error(400, errorMessage);
            return;
          }
          if (!t.desc || typeof t.desc !== "string" || t.desc.length > 512) {
            audit.logFailure(
              "ShiftBookCategoryLng",
              "Invalid translation description",
              undefined,
              { desc: t.desc }
            );
            const errorMessage = getText(req, "error.translation.description");
            req.error(400, errorMessage);
            return;
          }

          // Check if translation already exists
          const existingTranslation = await SELECT.one
            .from("ShiftBookCategoryLng")
            .where({
              category: categoryId,
              werks,
              lng: t.lng.toUpperCase(),
            });

          if (existingTranslation) {
            audit.logFailure(
              "ShiftBookCategoryLng",
              "Translation already exists",
              undefined,
              { category: categoryId, werks, lng: t.lng }
            );
            const errorMessage = getText(
              req,
              "error.translation.already.exists",
              categoryId,
              werks,
              t.lng
            );
            req.error(400, errorMessage);
            return;
          }

          await INSERT.into("ShiftBookCategoryLng").entries({
            category: categoryId,
            werks,
            lng: t.lng.toUpperCase(),
            desc: t.desc,
          });
        }
      }

      if (mails && Array.isArray(mails)) {
        console.log(
          `🔧 Processing ${mails.length} emails for category ${categoryId}`
        );
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // First check for duplicates within the request
        const emailAddresses = mails.map((m) => m.mail_address);
        const duplicateEmails = emailAddresses.filter(
          (email, index) => emailAddresses.indexOf(email) !== index
        );

        if (duplicateEmails.length > 0) {
          audit.logFailure(
            "ShiftBookCategoryMail",
            "Duplicate email in request",
            undefined,
            { duplicateEmails }
          );
          const errorMessage = getText(
            req,
            "error.email.already.exists",
            duplicateEmails[0],
            categoryId,
            werks
          );
          req.error(400, errorMessage);
          return;
        }

        for (const m of mails) {
          console.log(
            `🔧 Processing email: ${m.mail_address} for category ${categoryId}`
          );

          // Validate each email
          if (
            !m.mail_address ||
            typeof m.mail_address !== "string" ||
            !emailRegex.test(m.mail_address)
          ) {
            audit.logFailure(
              "ShiftBookCategoryMail",
              "Invalid email format",
              undefined,
              { mail_address: m.mail_address }
            );
            const errorMessage = getText(req, "error.email.format");
            req.error(400, errorMessage);
            return;
          }
          if (m.mail_address.length > 255) {
            audit.logFailure(
              "ShiftBookCategoryMail",
              "Email too long",
              undefined,
              { emailLength: m.mail_address.length }
            );
            const errorMessage = getText(req, "error.email.length");
            req.error(400, errorMessage);
            return;
          }

          // Check if email already exists for this category and plant
          const existingEmail = await SELECT.one
            .from("ShiftBookCategoryMail")
            .where({
              category: categoryId,
              werks,
              mail_address: m.mail_address,
            });

          if (existingEmail) {
            audit.logFailure(
              "ShiftBookCategoryMail",
              "Email already exists",
              undefined,
              { category: categoryId, werks, mail_address: m.mail_address }
            );
            const errorMessage = getText(
              req,
              "error.email.already.exists",
              m.mail_address,
              categoryId,
              werks
            );
            req.error(400, errorMessage);
            return;
          }

          try {
            const emailResult = await INSERT.into(
              "ShiftBookCategoryMail"
            ).entries({
              category: categoryId,
              werks,
              mail_address: m.mail_address,
            });
            console.log(
              `✅ Successfully created email entry: ${m.mail_address}`,
              emailResult
            );
          } catch (emailError) {
            console.error(
              `❌ Failed to create email entry: ${m.mail_address}`,
              emailError
            );
            audit.logFailure(
              "ShiftBookCategoryMail",
              emailError.message,
              undefined,
              {
                category: categoryId,
                werks,
                mail_address: m.mail_address,
                error: emailError.message,
              }
            );
            throw emailError;
          }
        }
        console.log(
          `✅ Successfully processed all ${mails.length} emails for category ${categoryId}`
        );
      }

      // Process workcenters if provided
      if (workcenters && Array.isArray(workcenters)) {
        console.log(
          `🔧 Processing ${workcenters.length} workcenters for category ${categoryId}`
        );

        for (const wc of workcenters) {
          // Validate each workcenter
          if (
            !wc.workcenter ||
            typeof wc.workcenter !== "string" ||
            wc.workcenter.length > 36
          ) {
            audit.logFailure(
              "ShiftBookCategoryWC",
              "Invalid workcenter format",
              undefined,
              { workcenter: wc.workcenter }
            );
            const errorMessage = getText(req, "error.workcenter.format");
            req.error(400, errorMessage);
            return;
          }

          try {
            const wcResult = await INSERT.into("ShiftBookCategoryWC").entries({
              category_id: categoryId,
              workcenter: wc.workcenter,
            });
            console.log(
              `✅ Successfully created workcenter entry: ${wc.workcenter}`,
              wcResult
            );
          } catch (wcError) {
            console.error(
              `❌ Failed to create workcenter entry: ${wc.workcenter}`,
              wcError
            );
            audit.logFailure(
              "ShiftBookCategoryWC",
              wcError.message,
              undefined,
              {
                category: categoryId,
                workcenter: wc.workcenter,
                error: wcError.message,
              }
            );
            throw wcError;
          }
        }
        console.log(
          `✅ Successfully processed all ${workcenters.length} workcenters for category ${categoryId}`
        );
      }

      // Process Teams Channel if provided
      console.log(`🔍 [TEAMS DEBUG] Checking teamsChannel parameter...`);
      console.log(
        `🔍 [TEAMS DEBUG] teamsChannel value:`,
        JSON.stringify(teamsChannel, null, 2)
      );
      console.log(`🔍 [TEAMS DEBUG] teamsChannel type:`, typeof teamsChannel);
      console.log(`🔍 [TEAMS DEBUG] teamsChannel truthy?`, !!teamsChannel);

      if (teamsChannel && typeof teamsChannel === "object") {
        console.log(`🔧 Processing Teams channel for category ${categoryId}`);

        // Validate Teams Channel data
        if (
          teamsChannel.webhookURL &&
          typeof teamsChannel.webhookURL === "string"
        ) {
          try {
            await INSERT.into("ShiftBookTeamsChannel").entries({
              category_id: categoryId,
              name: teamsChannel.name || "Default Channel",
              webhookURL: teamsChannel.webhookURL,
              description: teamsChannel.description || "",
              active:
                teamsChannel.active !== undefined ? teamsChannel.active : true,
            });
            console.log(
              `✅ Successfully created Teams channel for category ${categoryId}`
            );
          } catch (tcError) {
            console.error(
              `❌ Failed to create Teams channel for category ${categoryId}`,
              tcError
            );
            audit.logFailure(
              "ShiftBookTeamsChannel",
              tcError.message,
              undefined,
              {
                category: categoryId,
                error: tcError.message,
              }
            );
            throw tcError;
          }
        }
      }

      audit.logSuccess("ShiftBookCategory", `${categoryId}-${werks}`, {
        category: categoryId,
        werks,
        translationsCount: translations?.length || 0,
        mailsCount: mails?.length || 0,
        workcentersCount: workcenters?.length || 0,
        teamsChannelConfigured: !!teamsChannel?.webhookURL,
      });

      // Fetch the complete created category with all relations
      const createdCategory = await SELECT.one
        .from("ShiftBookCategory")
        .where({ ID: categoryId, werks })
        .columns("*", {
          translations: ["*"],
          mails: ["*"],
          workcenters: ["*"],
          teamsChannel: ["*"],
        });

      console.log(`🎉 Created category successfully:`, createdCategory);

      // Return the created category directly
      // Note: We need to return the plain object, not the CDS query result
      return {
        ID: createdCategory.ID,
        werks: createdCategory.werks,
        sendmail: createdCategory.sendmail,
        sendworkcenters: createdCategory.sendworkcenters,
        default_subject: createdCategory.default_subject,
        default_message: createdCategory.default_message,
        triggerproductionprocess: createdCategory.triggerproductionprocess,
        // createdAt: createdCategory.createdAt,
        // createdBy: createdCategory.createdBy,
        // modifiedAt: createdCategory.modifiedAt,
        // modifiedBy: createdCategory.modifiedBy,
        // translations: createdCategory.translations,
        // mails: createdCategory.mails,
        // workcenters: createdCategory.workcenters,
        // teamsChannel: createdCategory.teamsChannel,
      };
    } catch (error) {
      const categoryWerks = req.data?.werks
        ? `new-${req.data.werks}`
        : "unknown";
      audit.logFailure(
        "ShiftBookCategory",
        error.message,
        categoryWerks,
        req.data
      );
      throw error;
    }
  });

  // Handler for custom action: updateCategoryWithDetails
  typedService.on("updateCategoryWithDetails", async (req: any) => {
    const {
      category,
      werks,
      sendmail,
      sendworkcenters,
      default_subject,
      default_message,
      triggerproductionprocess,
      translations,
      mails,
      workcenters,
      teamsChannel,
    } = req.data;
    await UPDATE("ShiftBookCategory")
      .set({
        sendmail,
        sendworkcenters,
        default_subject,
        default_message,
        triggerproductionprocess,
      })
      .where({ ID: category, werks });
    // Delete old translations, mails, and workcenters
    await DELETE.from("ShiftBookCategoryLng").where({ category, werks });
    await DELETE.from("ShiftBookCategoryMail").where({ category, werks });
    await DELETE.from("ShiftBookCategoryWC").where({ category_id: category });
    // Insert new translations
    if (translations && Array.isArray(translations)) {
      for (const t of translations) {
        await INSERT.into("ShiftBookCategoryLng").entries({
          category,
          werks,
          lng: t.lng.toUpperCase(),
          desc: t.desc,
        });
      }
    }
    // Insert new mails
    if (mails && Array.isArray(mails)) {
      for (const m of mails) {
        await INSERT.into("ShiftBookCategoryMail").entries({
          category,
          werks,
          mail_address: m.mail_address,
        });
      }
    }
    // Insert new workcenters
    if (workcenters && Array.isArray(workcenters)) {
      for (const wc of workcenters) {
        await INSERT.into("ShiftBookCategoryWC").entries({
          category_id: category,
          workcenter: wc.workcenter,
        });
      }
    }

    // Update or create Teams Channel
    // Only process if teamsChannel parameter was explicitly provided (even if null/empty)
    console.log(`🔍 [TEAMS DEBUG UPDATE] Checking teamsChannel parameter...`);
    console.log(
      `🔍 [TEAMS DEBUG UPDATE] teamsChannel value:`,
      JSON.stringify(teamsChannel, null, 2)
    );
    console.log(
      `🔍 [TEAMS DEBUG UPDATE] teamsChannel type:`,
      typeof teamsChannel
    );
    console.log(
      `🔍 [TEAMS DEBUG UPDATE] teamsChannel !== undefined?`,
      teamsChannel !== undefined
    );

    if (teamsChannel !== undefined) {
      console.log(
        `🔧 Processing Teams channel for category ${category} (UPDATE)`
      );

      // Delete existing Teams Channel
      await DELETE.from("ShiftBookTeamsChannel").where({
        category_id: category,
      });
      console.log(
        `🗑️  Removed existing Teams channels for category ${category}`
      );

      // Insert new Teams Channel if webhookURL is provided
      if (
        teamsChannel &&
        teamsChannel.webhookURL &&
        typeof teamsChannel.webhookURL === "string"
      ) {
        try {
          await INSERT.into("ShiftBookTeamsChannel").entries({
            category_id: category,
            name: teamsChannel.name || "Default Channel",
            webhookURL: teamsChannel.webhookURL,
            description: teamsChannel.description || "",
            active:
              teamsChannel.active !== undefined ? teamsChannel.active : true,
          });
          console.log(
            `✅ Successfully created Teams channel for category ${category}`
          );
        } catch (tcError) {
          console.error(
            `❌ Failed to create Teams channel for category ${category}`,
            tcError
          );
          console.warn(`⚠️  Continuing despite Teams channel error`);
        }
      }
      // If teamsChannel is null/empty or has no webhookURL, the channel is deleted (no insert)
    }
    // If teamsChannel is undefined (not provided), existing channel is preserved

    return category;
  });

  // Handler for custom action: deleteCategoryCascade
  typedService.on("deleteCategoryCascade", async (req: any) => {
    const { category, werks } = req.data;
    await DELETE.from("ShiftBookCategoryMail").where({ category, werks });
    await DELETE.from("ShiftBookCategoryLng").where({ category, werks });
    await DELETE.from("ShiftBookCategoryWC").where({ category_id: category });
    await DELETE.from("ShiftBookCategory").where({ ID: category, werks });
    return category;
  });

  // Handler for custom action: advancedCategorySearch
  typedService.on("advancedCategorySearch", async (req: any) => {
    const audit = AuditLogger.forAction("ADVANCED_CATEGORY_SEARCH", req);
    const { query, language } = req.data;

    // Language override logic: explicit parameter takes precedence
    let userLanguage = getUserLanguage(req);

    // If explicit language parameter is provided, validate and use it
    if (language) {
      if (!isLanguageSupported(language)) {
        req.error(
          400,
          getText(
            req,
            "error.unsupported.language",
            language,
            getSupportedLanguages().join(", ")
          )
        );
        return;
      }
      userLanguage = language.toLowerCase();
      console.log(
        `🌍 Using explicit language parameter for search: ${userLanguage}`
      );
    } else {
      console.log(`🌍 Using detected language for search: ${userLanguage}`);
    }

    try {
      // Rate limiting for search operations
      const rateLimiter = RateLimiter.forAction("ADVANCED_CATEGORY_SEARCH");
      const identifier = RateLimiter.getIdentifier(req);
      const rateCheck = rateLimiter.checkLimit(identifier);

      if (!rateCheck.allowed) {
        audit.logFailure(
          "ShiftBookCategory",
          "Search rate limit exceeded",
          undefined,
          {
            identifier,
            query,
            remaining: rateCheck.remaining,
          }
        );
        req.error(
          429,
          `Search rate limit exceeded. Try again after ${new Date(
            rateCheck.resetTime
          ).toISOString()}`
        );
        return;
      }

      // Input validation and sanitization
      if (!query || typeof query !== "string") {
        audit.logFailure(
          "ShiftBookCategory",
          "Invalid or missing query parameter",
          undefined,
          { query }
        );
        req.error(400, "Query parameter is required and must be a string");
        return;
      }

      // Sanitize input to prevent SQL injection
      let sanitizedQuery = query.replace(/[^ -\w\s-]/g, "").trim();
      if (sanitizedQuery.length === 0) {
        audit.logFailure(
          "ShiftBookCategory",
          "Query contains only invalid characters",
          undefined,
          { query }
        );
        req.error(400, "Query must contain valid alphanumeric characters");
        return;
      }
      if (sanitizedQuery.length > 100) {
        audit.logFailure("ShiftBookCategory", "Query too long", undefined, {
          queryLength: sanitizedQuery.length,
        });
        req.error(400, "Query must be 100 characters or less");
        return;
      }

      // Input validation for search query
      if (!isSafeSearchQuery(query)) {
        req.error(
          400,
          "Search query must be a valid alphanumeric string (letters, numbers, spaces, dash, underscore, max 64 chars). No special characters allowed."
        );
        return;
      }
      sanitizedQuery = query.trim();

      // Use optimized category search service
      console.log(
        `🔍 Using optimized category search for query: "${sanitizedQuery}", language: ${userLanguage}`
      );

      const result = await OptimizedQueryService.searchCategoriesOptimized({
        werks: req.data.werks,
        searchText: sanitizedQuery,
        language: userLanguage,
        limit: 50,
      });

      await audit.logDataAccess(
        "ShiftBookCategory",
        undefined,
        result.results.length
      );

      console.log(
        `✅ Optimized category search returned ${result.results.length} results, hasMore: ${result.hasMore}`
      );

      return {
        results: result.results,
        hasMore: result.hasMore,
      };
    } catch (error) {
      audit.logFailure("ShiftBookCategory", error.message, undefined, {
        query,
      });
      throw error;
    }
  });

  // Handler for custom action: advancedLogSearch
  typedService.on("advancedLogSearch", async (req: any) => {
    const audit = AuditLogger.forAction("ADVANCED_LOG_SEARCH", req);
    const { query } = req.data;

    try {
      // Rate limiting for search operations
      const rateLimiter = RateLimiter.forAction("ADVANCED_LOG_SEARCH");
      const identifier = RateLimiter.getIdentifier(req);
      const rateCheck = rateLimiter.checkLimit(identifier);

      if (!rateCheck.allowed) {
        audit.logFailure(
          "ShiftBookLog",
          "Search rate limit exceeded",
          undefined,
          {
            identifier,
            query,
            remaining: rateCheck.remaining,
          }
        );
        req.error(
          429,
          `Search rate limit exceeded. Try again after ${new Date(
            rateCheck.resetTime
          ).toISOString()}`
        );
        return;
      }

      // Input validation and sanitization
      if (!query || typeof query !== "string") {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid or missing query parameter",
          undefined,
          { query }
        );
        req.error(400, "Query parameter is required and must be a string");
        return;
      }

      // Sanitize input to prevent SQL injection
      let sanitizedQuery = query.replace(/[^ -\w\s-]/g, "").trim();
      if (sanitizedQuery.length === 0) {
        audit.logFailure(
          "ShiftBookLog",
          "Query contains only invalid characters",
          undefined,
          { query }
        );
        req.error(400, "Query must contain valid alphanumeric characters");
        return;
      }
      if (sanitizedQuery.length > 100) {
        audit.logFailure("ShiftBookLog", "Query too long", undefined, {
          queryLength: sanitizedQuery.length,
        });
        req.error(400, "Query must be 100 characters or less");
        return;
      }

      // Input validation for search query
      if (!isSafeSearchQuery(query)) {
        req.error(
          400,
          "Search query must be a valid alphanumeric string (letters, numbers, spaces, dash, underscore, max 64 chars). No special characters allowed."
        );
        return;
      }
      sanitizedQuery = query.trim();

      // Use optimized full-text search service
      console.log(`🔍 Using optimized search for query: "${sanitizedQuery}"`);

      const result = await OptimizedQueryService.searchLogsOptimized({
        searchText: sanitizedQuery,
        limit: 100, // reasonable limit for search results
        werks: req.data.werks,
        category: req.data.category,
      });

      await audit.logDataAccess(
        "ShiftBookLog",
        undefined,
        result.results.length
      );

      console.log(
        `✅ Optimized search returned ${result.results.length} results, hasMore: ${result.hasMore}`
      );

      return {
        results: result.results,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
    } catch (error) {
      audit.logFailure("ShiftBookLog", error.message, undefined, { query });
      throw error;
    }
  });

  // Handler for custom action: batchInsertMails
  typedService.on("batchInsertMails", async (req: any) => {
    const audit = AuditLogger.forAction("BATCH_INSERT_MAILS", req);
    const { category, werks, mails } = req.data;

    try {
      // Enhanced input validation
      if (!category || typeof category !== "string") {
        audit.logFailure(
          "ShiftBookCategoryMail",
          "Invalid category",
          undefined,
          { category }
        );
        req.error(400, "Category must be a valid UUID string");
        return;
      }

      if (
        !werks ||
        typeof werks !== "string" ||
        werks.length < 1 ||
        werks.length > 4
      ) {
        audit.logFailure("ShiftBookCategoryMail", "Invalid werks", undefined, {
          werks,
        });
        req.error(400, "Werks must be a 1-4 character string");
        return;
      }

      if (!mails || !Array.isArray(mails) || mails.length === 0) {
        audit.logFailure(
          "ShiftBookCategoryMail",
          "Invalid mails array",
          undefined,
          { mails }
        );
        req.error(400, "Mails must be a non-empty array");
        return;
      }

      if (mails.length > 100) {
        audit.logFailure(
          "ShiftBookCategoryMail",
          "Too many emails",
          undefined,
          { mailsLength: mails.length }
        );
        req.error(400, "Maximum 100 emails allowed per batch");
        return;
      }

      // Email validation - very strict regex with additional checks
      const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

      // Additional validation for specific cases that regex might miss
      const validateEmailFormat = (email: string) => {
        const parts = email.split("@");
        if (parts.length !== 2) return false;

        const [localPart, domain] = parts;

        // Check for dots at start/end of local part
        if (localPart.startsWith(".") || localPart.endsWith(".")) return false;

        // Check for consecutive dots in local part
        if (localPart.includes("..")) return false;

        // Check for dots at start/end of domain
        if (domain.startsWith(".") || domain.endsWith(".")) return false;

        // Check for consecutive dots in domain
        if (domain.includes("..")) return false;

        return true;
      };
      for (const m of mails) {
        // Validate each email
        if (!m.mail_address || typeof m.mail_address !== "string") {
          audit.logFailure(
            "ShiftBookCategoryMail",
            "Invalid email type",
            undefined,
            { mail_address: m.mail_address }
          );
          req.error(400, "Email address must be a string");
          return;
        }

        if (
          !emailRegex.test(m.mail_address) ||
          !validateEmailFormat(m.mail_address)
        ) {
          audit.logFailure(
            "ShiftBookCategoryMail",
            "Invalid email format",
            undefined,
            { mail_address: m.mail_address }
          );
          req.error(400, "Invalid email address format");
          return;
        }

        if (m.mail_address.length > 255) {
          audit.logFailure(
            "ShiftBookCategoryMail",
            "Email too long",
            undefined,
            { emailLength: m.mail_address.length }
          );
          req.error(400, "Email address must be 255 characters or less");
          return;
        }
      }

      // Check for duplicates before inserting
      for (const m of mails) {
        const exists = await SELECT.one
          .from("ShiftBookCategoryMail")
          .where({ category, werks, mail_address: m.mail_address });
        if (exists) {
          audit.logFailure(
            "ShiftBookCategoryMail",
            "Email already exists",
            `${category}-${werks}-${m.mail_address}`,
            { mail_address: m.mail_address }
          );
          req.error(
            409,
            `Email address ${m.mail_address} already exists for this category and plant`
          );
          return;
        }
      }

      // Insert all emails
      for (const m of mails) {
        await INSERT.into("ShiftBookCategoryMail").entries({
          category,
          werks,
          mail_address: m.mail_address,
        });
      }

      audit.logSuccess("ShiftBookCategoryMail", `${category}-${werks}`, {
        category,
        werks,
        mailsCount: mails.length,
      });

      return category;
    } catch (error) {
      audit.logFailure(
        "ShiftBookCategoryMail",
        error.message,
        `${category}-${werks}`,
        req.data
      );
      throw error;
    }
  });

  // Handler for custom action: batchInsertTranslations
  typedService.on("batchInsertTranslations", async (req: any) => {
    const { category, werks, translations } = req.data;
    if (translations && Array.isArray(translations)) {
      for (const t of translations) {
        await INSERT.into("ShiftBookCategoryLng").entries({
          category,
          werks,
          lng: t.lng.toUpperCase(),
          desc: t.desc,
        });
      }
    }
    return category;
  });

  // Handler for custom action: batchInsertWorkcenters
  typedService.on("batchInsertWorkcenters", async (req: any) => {
    const audit = AuditLogger.forAction("BATCH_INSERT_WORKCENTERS", req);
    const { category, workcenters } = req.data;

    try {
      // Enhanced input validation
      if (!category || typeof category !== "string") {
        audit.logFailure("ShiftBookCategoryWC", "Invalid category", undefined, {
          category,
        });
        req.error(400, "Category must be a valid UUID string");
        return;
      }

      if (
        !workcenters ||
        !Array.isArray(workcenters) ||
        workcenters.length === 0
      ) {
        audit.logFailure(
          "ShiftBookCategoryWC",
          "Invalid workcenters array",
          undefined,
          { workcenters }
        );
        req.error(400, "Workcenters must be a non-empty array");
        return;
      }

      if (workcenters.length > 100) {
        audit.logFailure(
          "ShiftBookCategoryWC",
          "Too many workcenters",
          undefined,
          { workcentersLength: workcenters.length }
        );
        req.error(400, "Maximum 100 workcenters allowed per batch");
        return;
      }

      // Validate workcenter format
      for (const wc of workcenters) {
        if (
          !wc.workcenter ||
          typeof wc.workcenter !== "string" ||
          wc.workcenter.length > 36
        ) {
          audit.logFailure(
            "ShiftBookCategoryWC",
            "Invalid workcenter format",
            undefined,
            { workcenter: wc.workcenter }
          );
          req.error(
            400,
            "Each workcenter must be a string with max 36 characters"
          );
          return;
        }
      }

      // Insert workcenters
      for (const wc of workcenters) {
        await INSERT.into("ShiftBookCategoryWC").entries({
          category_id: category,
          workcenter: wc.workcenter,
        });
      }

      audit.logSuccess("ShiftBookCategoryWC", category, {
        workcentersCount: workcenters.length,
      });

      return category;
    } catch (error: any) {
      console.error("Error in batchInsertWorkcenters:", error);
      audit.logFailure(
        "ShiftBookCategoryWC",
        "Failed to insert workcenters",
        undefined,
        { error: error.message }
      );
      req.error(500, `Failed to insert workcenters: ${error.message}`);
    }
  });

  // Handler for custom action: sendMailByCategory
  typedService.on("sendMailByCategory", async (req: any) => {
    console.log("🔧 sendMailByCategory called with:", req.data);
    const audit = AuditLogger.forAction("SEND_MAIL_BY_CATEGORY", req);
    const { category, werks, subject, message } = req.data;

    try {
      // Rate limiting for email operations
      const rateLimiter = RateLimiter.forAction("SEND_MAIL_BY_CATEGORY");
      const identifier = RateLimiter.getIdentifier(req);
      const rateCheck = rateLimiter.checkLimit(identifier);

      if (!rateCheck.allowed) {
        audit.logFailure(
          "EmailOperation",
          "Rate limit exceeded",
          `${category}-${werks}`,
          {
            identifier,
            remaining: rateCheck.remaining,
            resetTime: new Date(rateCheck.resetTime).toISOString(),
          }
        );
        req.error(
          429,
          `Rate limit exceeded. Try again after ${new Date(
            rateCheck.resetTime
          ).toISOString()}`
        );
        return;
      }

      // Enhanced input validation
      if (!category || typeof category !== "string") {
        audit.logFailure("EmailOperation", "Invalid category", undefined, {
          category,
        });
        req.error(400, "Category must be a valid UUID string");
        return;
      }

      if (
        !werks ||
        typeof werks !== "string" ||
        werks.length < 1 ||
        werks.length > 4
      ) {
        audit.logFailure("EmailOperation", "Invalid werks", undefined, {
          werks,
        });
        req.error(400, "Werks must be a 1-4 character string");
        return;
      }

      if (!subject || typeof subject !== "string" || subject.length > 1024) {
        audit.logFailure("EmailOperation", "Invalid subject", undefined, {
          subjectLength: subject?.length,
        });
        req.error(400, "Subject must be a string with maximum 1024 characters");
        return;
      }

      if (!message || typeof message !== "string" || message.length > 4096) {
        audit.logFailure("EmailOperation", "Invalid message", undefined, {
          messageLength: message?.length,
        });
        req.error(400, "Message must be a string with maximum 4096 characters");
        return;
      }

      // Get mail recipients for this category
      const mails = await SELECT.from("ShiftBookCategoryMail").where({
        category,
        werks,
      });

      if (!mails || mails.length === 0) {
        const errorMsg = getText(
          req,
          "error.no.email.recipients",
          category,
          werks
        );
        audit.logFailure("EmailOperation", errorMsg, `${category}-${werks}`, {
          subject,
          recipientCount: 0,
        });
        req.error(404, errorMsg);
        return;
      }

      const recipients = mails.map((m: any) => m.mail_address);

      // Send notification using enhanced notification service (email and/or Teams)
      console.log("🔧 About to call sendNotification with:", {
        recipients,
        subject,
        message,
        category,
        werks,
      });
      const notificationResult = await sendNotification(
        recipients,
        subject,
        message,
        category,
        werks,
        undefined,
        req
      );
      console.log("🔧 sendNotification result:", notificationResult);

      audit.logSuccess("EmailOperation", `${category}-${werks}`, {
        category,
        werks,
        subject,
        recipientCount: recipients.length,
        status: notificationResult.status,
        emailSent: notificationResult.email?.sent || false,
        teamsSent: notificationResult.teams?.sent || false,
        rateLimitRemaining: rateCheck.remaining,
      });

      return {
        category,
        recipients:
          (notificationResult as any).recipients || recipients.join("; "),
        status: notificationResult.status,
        emailResult: (notificationResult as any).email,
        teamsResult: (notificationResult as any).teams,
        notifications: (notificationResult as any).notifications || [],
        rateLimitRemaining: rateCheck.remaining,
      };
    } catch (error) {
      audit.logFailure(
        "EmailOperation",
        error.message,
        `${category}-${werks}`,
        req.data
      );
      throw error;
    }
  });

  // Handler for custom action: sendMail - Comprehensive email sending with validation
  typedService.on("sendMail", async (req: any) => {
    const audit = AuditLogger.forAction("SEND_MAIL", req);
    const { to, cc, bcc, subject, html, text, category, logEntryId } = req.data;

    try {
      // Rate limiting for email operations
      const rateLimiter = RateLimiter.forAction("SEND_MAIL");
      const identifier = RateLimiter.getIdentifier(req);
      const rateCheck = rateLimiter.checkLimit(identifier);

      if (!rateCheck.allowed) {
        audit.logFailure("EmailOperation", "Rate limit exceeded", identifier, {
          identifier,
          remaining: rateCheck.remaining,
          resetTime: new Date(rateCheck.resetTime).toISOString(),
        });
        req.error(
          429,
          `Rate limit exceeded. Try again after ${new Date(
            rateCheck.resetTime
          ).toISOString()}`
        );
        return;
      }

      // Comprehensive input validation
      if (
        !to ||
        (Array.isArray(to) && to.length === 0) ||
        (typeof to === "string" && to.trim() === "")
      ) {
        audit.logFailure(
          "EmailOperation",
          "Missing or empty recipients",
          undefined,
          { to }
        );
        req.error(400, "Recipients (to) are required and cannot be empty");
        return;
      }

      if (
        !subject ||
        typeof subject !== "string" ||
        subject.trim().length === 0
      ) {
        audit.logFailure(
          "EmailOperation",
          "Missing or empty subject",
          undefined,
          { subject }
        );
        req.error(400, "Subject is required and cannot be empty");
        return;
      }

      if (subject.length > 1024) {
        audit.logFailure("EmailOperation", "Subject too long", undefined, {
          subjectLength: subject.length,
        });
        req.error(400, "Subject must be 1024 characters or less");
        return;
      }

      if (!html || typeof html !== "string" || html.trim().length === 0) {
        audit.logFailure(
          "EmailOperation",
          "Missing or empty HTML content",
          undefined,
          { htmlLength: html?.length }
        );
        req.error(400, "HTML content is required and cannot be empty");
        return;
      }

      if (html.length > 50000) {
        audit.logFailure("EmailOperation", "HTML content too long", undefined, {
          htmlLength: html.length,
        });
        req.error(400, "HTML content must be 50,000 characters or less");
        return;
      }

      // Validate email addresses
      const validateEmailList = (emailList: string | string[]) => {
        const emails = Array.isArray(emailList) ? emailList : [emailList];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emails.filter((email) => emailRegex.test(email.trim()));
      };

      const validTo = validateEmailList(to);
      const validCc = cc ? validateEmailList(cc) : [];
      const validBcc = bcc ? validateEmailList(bcc) : [];

      if (validTo.length === 0) {
        audit.logFailure(
          "EmailOperation",
          "No valid email addresses in 'to' field",
          undefined,
          { to }
        );
        req.error(
          400,
          "At least one valid email address is required in the 'to' field"
        );
        return;
      }

      // Check total recipient limit (prevent email bombing)
      const totalRecipients = validTo.length + validCc.length + validBcc.length;
      if (totalRecipients > 50) {
        audit.logFailure("EmailOperation", "Too many recipients", undefined, {
          totalRecipients,
        });
        req.error(400, "Total number of recipients cannot exceed 50");
        return;
      }

      // Initialize email service
      await emailService.initialize();

      // Get email configuration
      const emailConfig = await getEmailConfig();

      // Create email options
      const emailOptions = {
        to: validTo,
        cc: validCc.length > 0 ? validCc : undefined,
        bcc: validBcc.length > 0 ? validBcc : undefined,
        subject: subject.trim(),
        html: html.trim(),
        text: text ? text.trim() : undefined,
        from: emailConfig.fromAddress,
      };

      // Send email with tracking if logEntryId is provided
      let result;
      if (logEntryId) {
        result = await emailService.sendMailWithTracking(
          emailOptions,
          category || "manual",
          logEntryId
        );
      } else {
        const success = await emailService.sendMail(emailOptions);
        result = { success, trackingId: null };
      }

      if (result.success) {
        audit.logSuccess("EmailOperation", result.trackingId || "no-tracking", {
          to: validTo,
          cc: validCc,
          bcc: validBcc,
          subject: subject.trim(),
          category: category || "manual",
          logEntryId,
          trackingId: result.trackingId,
          rateLimitRemaining: rateCheck.remaining,
        });

        return {
          success: true,
          trackingId: result.trackingId,
          messageId: result.messageId,
          recipients: {
            to: validTo,
            cc: validCc,
            bcc: validBcc,
            total: totalRecipients,
          },
          rateLimitRemaining: rateCheck.remaining,
        };
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error) {
      audit.logFailure("EmailOperation", error.message, undefined, req.data);
      throw error;
    }
  });

  // Handler for custom action: getEmailDeliveryStatistics
  typedService.on("getEmailDeliveryStatistics", async (req: any) => {
    const audit = AuditLogger.forAction("GET_EMAIL_STATISTICS", req);

    try {
      // Initialize email service
      await emailService.initialize();

      // Get delivery statistics
      const stats = emailService.getDeliveryStatistics();

      audit.logSuccess("EmailStatistics", undefined, {
        total: stats.total,
        sent: stats.sent,
        failed: stats.failed,
        queued: stats.queued,
        configurationSource: stats.configurationSource,
      });

      return {
        statistics: {
          total: stats.total,
          sent: stats.sent,
          failed: stats.failed,
          queued: stats.queued,
          successRate:
            stats.total > 0
              ? ((stats.sent / stats.total) * 100).toFixed(2) + "%"
              : "0%",
        },
        configuration: {
          source: stats.configurationSource,
          cacheStatus: emailService.getConfigurationSource(),
        },
        recentFailures: stats.recentFailures.map((failure) => ({
          id: failure.id,
          subject: failure.subject,
          recipients: failure.recipients,
          lastAttempt: failure.lastAttempt,
          errorMessage: failure.errorMessage,
          attempts: failure.attempts,
        })),
      };
    } catch (error) {
      audit.logFailure("EmailStatistics", error.message, undefined, {});
      throw error;
    }
  });

  // Handler for custom action: getEmailHealthStatus
  typedService.on("getEmailHealthStatus", async (req: any) => {
    const audit = AuditLogger.forAction("GET_EMAIL_HEALTH", req);

    try {
      // Initialize email service
      await emailService.initialize();

      // Get health status
      const health = emailService.getHealthStatus();

      // Test connection if not already tested
      if (health.initialized && health.connectionTest) {
        health.connectionTest = await emailService.testConnection();
      }

      audit.logSuccess("EmailHealth", undefined, {
        initialized: health.initialized,
        connectionTest: health.connectionTest,
        configurationSource: health.configurationSource,
      });

      return {
        status:
          health.initialized && health.connectionTest ? "healthy" : "unhealthy",
        details: health,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      audit.logFailure("EmailHealth", error.message, undefined, {});
      throw error;
    }
  });

  // Handler for custom action: getMailRecipients
  typedService.on("getMailRecipients", async (req: any) => {
    const { category, werks } = req.data;

    const mails = await SELECT.from("ShiftBookCategoryMail").where({
      category,
      werks,
    });

    const recipients = mails.map((m: any) => m.mail_address).join("; ");

    return {
      category,
      werks,
      recipients,
      count: mails.length,
    };
  });

  // Enhanced handler for CREATE ShiftBookLog with email functionality
  typedService.after(
    "CREATE",
    "ShiftBookLog",
    async (results: any, req: any) => {
      const audit = AuditLogger.forAction("AUTO_EMAIL_LOG_CREATED", req);
      const logEntry = results;

      try {
        // Check if the category has sendmail enabled
        const categoryData = await SELECT.one
          .from("ShiftBookCategory")
          .where({ ID: logEntry.category, werks: logEntry.werks });

        if (categoryData && categoryData.sendmail === 1) {
          // Get mail recipients and send email
          const mails = await SELECT.from("ShiftBookCategoryMail").where({
            category: logEntry.category,
            werks: logEntry.werks,
          });

          if (mails && mails.length > 0) {
            const recipients = mails.map((m: any) => m.mail_address);

            // Send auto-notification using enhanced notification service (email and/or Teams)
            await sendNotification(
              recipients,
              logEntry.subject,
              logEntry.message,
              logEntry.category,
              logEntry.werks,
              undefined,
              req
            );

            audit.logSuccess(
              "AutoEmailOperation",
              `${logEntry.category}-${logEntry.werks}`,
              {
                logId: logEntry.guid || logEntry.ID,
                category: logEntry.category,
                werks: logEntry.werks,
                recipientCount: recipients.length,
                subject: logEntry.subject,
              }
            );
          } else {
            audit.logWarning(
              "AutoEmailOperation",
              "No recipients found for auto-email",
              `${logEntry.category}-${logEntry.werks}`,
              {
                category: logEntry.category,
                werks: logEntry.werks,
              }
            );
          }
        }
      } catch (error) {
        audit.logFailure(
          "AutoEmailOperation",
          error.message,
          `${logEntry.category}-${logEntry.werks}`,
          {
            logEntry: logEntry,
          }
        );
      }
    }
  );

  // ============================================================================
  // DMC SPECIFIC INTEGRATION METHODS
  // ============================================================================

  // Handler for getting latest shiftbook log for a specific plant and work center
  typedService.on("getLatestShiftbookLog", async (req: any) => {
    const { werks, workcenter } = req.data;

    try {
      const latestLog = await SELECT.one
        .from("ShiftBookLog")
        .where({ werks, workcenter })
        .orderBy({ log_dt: "desc" });

      if (!latestLog) {
        req.error(
          404,
          `No logs found for plant ${werks} and work center ${workcenter}`
        );
        return;
      }

      return {
        guid: latestLog.guid,
        werks: latestLog.werks,
        shoporder: latestLog.shoporder,
        stepid: latestLog.stepid,
        split: latestLog.split,
        workcenter: latestLog.workcenter,
        user_id: latestLog.user_id,
        log_dt: latestLog.log_dt,
        category: latestLog.category,
        subject: latestLog.subject,
        message: latestLog.message,
      };
    } catch (error) {
      console.error("Error getting latest shiftbook log:", error);
      req.error(500, "Internal server error while retrieving latest log");
    }
  });

  // Handler for batch adding shift book entries
  typedService.on("batchAddShiftBookEntries", async (req: any) => {
    const audit = AuditLogger.forAction("BATCH_ADD_SHIFTBOOK_ENTRIES", req);
    const { logs } = req.data;

    try {
      // Input validation
      if (!logs || !Array.isArray(logs) || logs.length === 0) {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid logs array",
          undefined,
          req.data
        );
        req.error(400, "Logs must be a non-empty array");
        return;
      }

      if (logs.length > 100) {
        audit.logFailure("ShiftBookLog", "Too many logs in batch", undefined, {
          logsLength: logs.length,
        });
        req.error(400, "Maximum 100 logs allowed per batch");
        return;
      }

      const results: any[] = [];
      const errors: string[] = [];

      // Process each log entry
      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        try {
          // Validate each log entry
          if (
            !log.werks ||
            typeof log.werks !== "string" ||
            log.werks.length < 1 ||
            log.werks.length > 4 ||
            !/^[A-Z0-9]+$/.test(log.werks)
          ) {
            errors.push(`Log ${i + 1}: Invalid werks format`);
            continue;
          }

          if (
            !log.shoporder ||
            typeof log.shoporder !== "string" ||
            log.shoporder.length === 0 ||
            log.shoporder.length > 30
          ) {
            errors.push(`Log ${i + 1}: Invalid shoporder`);
            continue;
          }

          if (
            !log.stepid ||
            typeof log.stepid !== "string" ||
            log.stepid.length === 0 ||
            log.stepid.length > 4
          ) {
            errors.push(`Log ${i + 1}: Invalid stepid`);
            continue;
          }

          if (
            !log.workcenter ||
            typeof log.workcenter !== "string" ||
            log.workcenter.length === 0 ||
            log.workcenter.length > 36
          ) {
            errors.push(`Log ${i + 1}: Invalid workcenter`);
            continue;
          }

          if (
            !log.user_id ||
            typeof log.user_id !== "string" ||
            log.user_id.length === 0 ||
            log.user_id.length > 512
          ) {
            errors.push(`Log ${i + 1}: Invalid user_id`);
            continue;
          }

          if (!log.category || typeof log.category !== "string") {
            errors.push(`Log ${i + 1}: Invalid category`);
            continue;
          }

          if (
            !log.subject ||
            typeof log.subject !== "string" ||
            log.subject.length === 0 ||
            log.subject.length > 1024
          ) {
            errors.push(`Log ${i + 1}: Invalid subject`);
            continue;
          }

          if (
            !log.message ||
            typeof log.message !== "string" ||
            log.message.length === 0 ||
            log.message.length > 4096
          ) {
            errors.push(`Log ${i + 1}: Invalid message`);
            continue;
          }

          if (
            log.split &&
            (typeof log.split !== "string" || log.split.length > 3)
          ) {
            errors.push(`Log ${i + 1}: Invalid split`);
            continue;
          }

          // Check if category exists for this plant
          const categoryExists = await SELECT.one
            .from("ShiftBookCategory")
            .where({ ID: log.category, werks: log.werks });

          if (!categoryExists) {
            errors.push(
              `Log ${i + 1}: Category ${log.category} not found for plant ${
                log.werks
              }`
            );
            continue;
          }

          // Create the log entry
          const logId = cds.utils.uuid();
          const logData = {
            ID: logId,
            werks: log.werks,
            shoporder: log.shoporder,
            stepid: log.stepid,
            split: log.split || "",
            workcenter: log.workcenter,
            user_id: log.user_id,
            log_dt: new Date(),
            category: log.category,
            subject: log.subject,
            message: log.message,
          };

          await INSERT.into("ShiftBookLog").entries(logData);

          // Get destination workcenters for this category
          const categoryWorkcenters = await SELECT.from(
            "ShiftBookCategoryWC"
          ).where({
            category_id: log.category,
          });

          // Insert ShiftBookLogWC entries for each destination workcenter
          if (categoryWorkcenters && categoryWorkcenters.length > 0) {
            for (const wc of categoryWorkcenters) {
              await INSERT.into("ShiftBookLogWC").entries({
                log_id: logId,
                workcenter: wc.workcenter,
              });
            }
          }

          results.push({
            guid: logId,
            werks: logData.werks,
            shoporder: logData.shoporder,
            stepid: logData.stepid,
            split: logData.split,
            workcenter: logData.workcenter,
            user_id: logData.user_id,
            log_dt: logData.log_dt,
            category: logData.category,
            subject: logData.subject,
            message: logData.message,
          });
        } catch (error) {
          errors.push(`Log ${i + 1}: ${error.message}`);
        }
      }

      const success = errors.length === 0;

      if (success) {
        audit.logSuccess("ShiftBookLog", `batch-${Date.now()}`, {
          logsCount: logs.length,
          successCount: results.length,
        });
      } else {
        audit.logFailure(
          "ShiftBookLog",
          "Batch operation completed with errors",
          `batch-${Date.now()}`,
          {
            logsCount: logs.length,
            successCount: results.length,
            errorCount: errors.length,
          }
        );
      }

      return {
        success,
        count: results.length,
        errors,
        logs: results,
      };
    } catch (error) {
      audit.logFailure("ShiftBookLog", error.message, undefined, req.data);
      throw error;
    }
  });

  // Handler for getting paginated shift book logs (OPTIMIZED)
  typedService.on("getShiftBookLogsPaginated", async (req: any) => {
    // Log the authorization token for debugging
    const authHeader =
      req.headers?.authorization || req._.req?.headers?.authorization;
    console.log(
      "🔐 getShiftBookLogsPaginated - Authorization Token:",
      authHeader
    );

    const audit = AuditLogger.forAction("GET_SHIFTBOOK_LOGS_PAGINATED", req);
    const {
      werks,
      workcenter,
      category,
      page = 1,
      pageSize = 20,
      language,
      include_dest_work_center = true, // whether to include destination workcenters
      include_orig_work_center = true, // whether to include origin workcenter
      lasttimestamp, // filter logs created after this timestamp (not included)
    } = req.data;

    // Language override logic: explicit parameter takes precedence
    let userLanguage = getUserLanguage(req);

    // If explicit language parameter is provided, validate and use it
    if (language) {
      if (!isLanguageSupported(language)) {
        req.error(
          400,
          getText(
            req,
            "error.unsupported.language",
            language,
            getSupportedLanguages().join(", ")
          )
        );
        return;
      }
      userLanguage = language.toLowerCase();
      console.log(
        `🌍 Using explicit language parameter for pagination: ${userLanguage}`
      );
    } else {
      console.log(`🌍 Using detected language for pagination: ${userLanguage}`);
    }

    try {
      // Input validation
      if (
        !werks ||
        typeof werks !== "string" ||
        werks.length < 1 ||
        werks.length > 4
      ) {
        audit.logFailure("ShiftBookLog", "Invalid werks", undefined, req.data);
        req.error(400, "Werks must be a 1-4 character string");
        return;
      }

      if (page < 1 || !Number.isInteger(page)) {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid page number",
          undefined,
          req.data
        );
        req.error(400, "Page must be a positive integer");
        return;
      }

      if (pageSize < 1 || pageSize > 100 || !Number.isInteger(pageSize)) {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid page size",
          undefined,
          req.data
        );
        req.error(400, "Page size must be between 1 and 100");
        return;
      }

      // Build base query conditions
      const baseConditions: any = { werks };

      if (category && typeof category === "string") {
        baseConditions.category = category;
      }

      // Add timestamp filter to get only logs created after lasttimestamp (not included)
      if (lasttimestamp) {
        baseConditions.log_dt = { ">": lasttimestamp };
        console.log(
          `🕐 Filtering logs created after timestamp: ${lasttimestamp}`
        );
      }

      let logIds: string[] = [];
      let useLogIdFilter = false;

      // Handle workcenter filtering based on include_dest_work_center and include_orig_work_center parameters
      if (workcenter) {
        if (include_dest_work_center && include_orig_work_center) {
          // Include logs where workcenter is either origin or destination
          // Get logs that have this workcenter as destination
          const logWorkcenters = await SELECT.from("ShiftBookLogWC")
            .columns("log_id")
            .where({ workcenter });

          const destinationLogIds = logWorkcenters.map(
            (lwc: any) => lwc.log_id
          );

          // Get logs that have this workcenter as origin
          const originLogs = await SELECT.from("ShiftBookLog")
            .columns("ID")
            .where({ ...baseConditions, workcenter });

          const originLogIds = originLogs.map((log: any) => log.ID);

          // Combine both sets of IDs (remove duplicates)
          const allLogIds = new Set([...destinationLogIds, ...originLogIds]);
          logIds = Array.from(allLogIds);

          useLogIdFilter = true;
          console.log(
            `🔧 Including both origin and destination workcenters. Found ${logIds.length} logs.`
          );
        } else if (include_dest_work_center && !include_orig_work_center) {
          // Only include logs where workcenter is a destination
          const logWorkcenters = await SELECT.from("ShiftBookLogWC")
            .columns("log_id")
            .where({ workcenter });

          logIds = logWorkcenters.map((lwc: any) => lwc.log_id);
          useLogIdFilter = true;
          console.log(
            `🔧 Only including destination workcenter filtering. Found ${logIds.length} logs.`
          );
        } else if (!include_dest_work_center && include_orig_work_center) {
          // Only include logs where workcenter is the origin
          baseConditions.workcenter = workcenter;
          console.log(`🔧 Only including origin workcenter filtering.`);
        } else {
          // Both are false - no workcenter filtering
          console.log(
            `🔧 Both include_dest_work_center and include_orig_work_center are false. No workcenter filtering applied.`
          );
        }
      }

      // Build final conditions
      let finalConditions = baseConditions;
      if (useLogIdFilter) {
        if (logIds.length === 0) {
          // No logs found with the specified workcenter, return empty result
          audit.logSuccess("ShiftBookLog", "paginated_query", {
            werks,
            workcenter,
            category,
            include_dest_work_center,
            include_orig_work_center,
            lasttimestamp,
            total: 0,
            page,
            pageSize,
          });

          return {
            logs: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
            lastChangeTimestamp: null,
            readCount: 0,
            unreadCount: 0,
          };
        }
        finalConditions = { ...baseConditions, ID: { in: logIds } };
      }

      // Get total count
      const totalResult = await SELECT.from("ShiftBookLog")
        .columns("count(*) as total")
        .where(finalConditions);
      const total = totalResult[0]?.total || 0;

      // Calculate pagination
      const offset = (page - 1) * pageSize;
      const totalPages = Math.ceil(total / pageSize);

      // Get the most recent timestamp across all matching logs (not just the current page)
      const latestLog = await SELECT.from("ShiftBookLog")
        .columns("log_dt")
        .where(finalConditions)
        .orderBy({ log_dt: "desc" })
        .limit(1);

      const lastChangeTimestamp = latestLog[0]?.log_dt || null;

      // Get paginated results
      const logs = await SELECT.from("ShiftBookLog")
        .where(finalConditions)
        .orderBy({ log_dt: "desc" })
        .limit(pageSize, offset);

      // Enhance logs with language-specific category descriptions and read status
      const logsWithTranslations = await Promise.all(
        logs.map(async (log: any) => {
          // Get category information with language-specific description
          const category = await SELECT.one
            .from("ShiftBookCategory")
            .where({ ID: log.category, werks: log.werks });

          // Get read status for the specified workcenter (if provided)
          let isRead = null;
          if (workcenter) {
            const isReadTimestamps = [];

            // Check if workcenter is the origin work center
            if (log.workcenter === workcenter && log.isRead) {
              isReadTimestamps.push(new Date(log.isRead));
            }

            // Check if workcenter is a destination work center
            const logWC = await SELECT.one
              .from("ShiftBookLogWC")
              .where({ log_id: log.ID, workcenter });

            if (logWC?.isRead) {
              isReadTimestamps.push(new Date(logWC.isRead));
            }

            // Return the most recent timestamp if any exist
            if (isReadTimestamps.length > 0) {
              isRead = new Date(
                Math.max(...isReadTimestamps.map((d) => d.getTime()))
              );
            }
          }

          if (category) {
            // Try to get language-specific description
            const translation = await SELECT.one
              .from("ShiftBookCategoryLng")
              .where({
                category: log.category,
                werks: log.werks,
                lng: userLanguage.toUpperCase(),
              });

            // If no translation found, try fallback language (en)
            let fallbackTranslation = null;
            if (!translation && userLanguage !== "en") {
              fallbackTranslation = await SELECT.one
                .from("ShiftBookCategoryLng")
                .where({
                  category: log.category,
                  werks: log.werks,
                  lng: "EN",
                });
            }

            return {
              ...log,
              category_desc:
                translation?.desc ||
                fallbackTranslation?.desc ||
                `Category ${log.category}`,
              category_language: translation
                ? userLanguage
                : fallbackTranslation
                ? "en"
                : "none",
              isRead,
            };
          }

          return {
            ...log,
            isRead,
          };
        })
      );

      // Count read and unread messages
      let readCount = 0;
      let unreadCount = 0;

      if (workcenter) {
        // Get all log IDs that match the filter conditions
        const allMatchingLogs = await SELECT.from("ShiftBookLog")
          .columns("ID", "workcenter", "isRead")
          .where(finalConditions);

        // Batch fetch all ShiftBookLogWC records in a single query to avoid N+1 problem
        const logIds = allMatchingLogs.map((log: any) => log.ID);
        const logWCRecords = await SELECT.from("ShiftBookLogWC")
          .columns("log_id", "isRead")
          .where({ log_id: { in: logIds }, workcenter });

        // Create a Map for O(1) lookups
        const logWCMap = new Map(
          logWCRecords.map((lwc: any) => [lwc.log_id, lwc])
        );

        // For each log, check if it's read or unread for the specified workcenter
        for (const log of allMatchingLogs) {
          let isRead = false;

          // Check if workcenter is the origin work center and has isRead timestamp
          if (log.workcenter === workcenter && log.isRead) {
            isRead = true;
          }

          // Check if workcenter is a destination work center with isRead timestamp
          if (!isRead) {
            const logWC = logWCMap.get(log.ID) as any;

            if (logWC?.isRead) {
              isRead = true;
            }
          }

          // Count as read or unread
          if (isRead) {
            readCount++;
          } else {
            unreadCount++;
          }
        }
      }

      audit.logSuccess("ShiftBookLog", "paginated_query", {
        werks,
        workcenter,
        category,
        include_dest_work_center,
        include_orig_work_center,
        lasttimestamp,
        total,
        page,
        pageSize,
        totalPages,
        returned: logsWithTranslations.length,
        lastChangeTimestamp,
        readCount,
        unreadCount,
      });

      return {
        logs: logsWithTranslations,
        total,
        page,
        pageSize,
        totalPages,
        lastChangeTimestamp,
        readCount,
        unreadCount,
      };
    } catch (error) {
      audit.logFailure("ShiftBookLog", error.message, undefined, req.data);
      throw error;
    }
  });

  // Handler for searching shift book logs by string (OPTIMIZED with regex support)
  typedService.on("searchShiftBookLogsByString", async (req: any) => {
    const authHeader =
      req.headers?.authorization || req._.req?.headers?.authorization;
    console.log(
      "🔍 searchShiftBookLogsByString - Authorization Token:",
      authHeader
    );

    const audit = AuditLogger.forAction("SEARCH_SHIFTBOOK_LOGS_BY_STRING", req);
    const {
      werks,
      searchString,
      workcenter,
      category,
      language,
      include_dest_work_center = true,
      include_orig_work_center = true,
    } = req.data;

    // Language override logic
    let userLanguage = getUserLanguage(req);

    if (language) {
      if (!isLanguageSupported(language)) {
        req.error(
          400,
          getText(
            req,
            "error.unsupported.language",
            language,
            getSupportedLanguages().join(", ")
          )
        );
        return;
      }
      userLanguage = language.toLowerCase();
      console.log(
        `🌍 Using explicit language parameter for search: ${userLanguage}`
      );
    } else {
      console.log(`🌍 Using detected language for search: ${userLanguage}`);
    }

    try {
      // Input validation
      if (
        !werks ||
        typeof werks !== "string" ||
        werks.length < 1 ||
        werks.length > 4
      ) {
        audit.logFailure("ShiftBookLog", "Invalid werks", undefined, req.data);
        req.error(400, "Werks must be a 1-4 character string");
        return;
      }

      if (
        !searchString ||
        typeof searchString !== "string" ||
        searchString.trim().length === 0
      ) {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid search string",
          undefined,
          req.data
        );
        req.error(400, "Search string is required and cannot be empty");
        return;
      }

      // Validate regex pattern if it looks like a regex
      let isRegex = false;
      let regexPattern: RegExp | null = null;
      try {
        // Check if the string is intended as a regex (contains regex special chars)
        if (/[.*+?^${}()|[\]\\]/.test(searchString)) {
          regexPattern = new RegExp(searchString, "i"); // case-insensitive
          isRegex = true;
          console.log(`🔍 Using regex pattern: ${searchString}`);
        }
      } catch (e) {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid regex pattern",
          undefined,
          req.data
        );
        req.error(400, `Invalid regular expression pattern: ${e.message}`);
        return;
      }

      // Build base query conditions
      const baseConditions: any = { werks };

      if (category && typeof category === "string") {
        baseConditions.category = category;
      }

      let logIds: string[] = [];
      let useLogIdFilter = false;

      // Handle workcenter filtering (same logic as getShiftBookLogsPaginated)
      if (workcenter) {
        if (include_dest_work_center && include_orig_work_center) {
          const logWorkcenters = await SELECT.from("ShiftBookLogWC")
            .columns("log_id")
            .where({ workcenter });

          const destinationLogIds = logWorkcenters.map(
            (lwc: any) => lwc.log_id
          );

          const originLogs = await SELECT.from("ShiftBookLog")
            .columns("ID")
            .where({ ...baseConditions, workcenter });

          const originLogIds = originLogs.map((log: any) => log.ID);

          const allLogIds = new Set([...destinationLogIds, ...originLogIds]);
          logIds = Array.from(allLogIds);
          useLogIdFilter = true;
          console.log(
            `🔧 Including both origin and destination workcenters. Found ${logIds.length} logs.`
          );
        } else if (include_dest_work_center && !include_orig_work_center) {
          const logWorkcenters = await SELECT.from("ShiftBookLogWC")
            .columns("log_id")
            .where({ workcenter });

          logIds = logWorkcenters.map((lwc: any) => lwc.log_id);
          useLogIdFilter = true;
          console.log(
            `🔧 Only including destination workcenter. Found ${logIds.length} logs.`
          );
        } else if (!include_dest_work_center && include_orig_work_center) {
          baseConditions.workcenter = workcenter;
          console.log(`🔧 Only including origin workcenter.`);
        } else {
          console.log(
            `🔧 Both flags are false. No workcenter filtering applied.`
          );
        }
      }

      // Build final conditions
      let finalConditions = baseConditions;
      if (useLogIdFilter) {
        if (logIds.length === 0) {
          audit.logSuccess("ShiftBookLog", "search_by_string", {
            werks,
            searchString,
            workcenter,
            category,
            resultsCount: 0,
          });
          return { logs: [], count: 0 };
        }
        finalConditions = { ...baseConditions, ID: { in: logIds } };
      }

      // Fetch all matching logs based on filters
      const allLogs = await SELECT.from("ShiftBookLog")
        .where(finalConditions)
        .orderBy({ log_dt: "desc" });

      console.log(
        `🔍 Found ${allLogs.length} logs matching base criteria, now filtering by search string...`
      );

      // PERFORMANCE OPTIMIZATION: Fetch all destination workcenters upfront
      const logIdsToCheck = allLogs.map((log: any) => log.ID);
      let destinationWorkcentersMap: Map<string, string[]> = new Map();

      if (logIdsToCheck.length > 0) {
        const allDestinationWCs = await SELECT.from("ShiftBookLogWC")
          .columns("log_id", "workcenter")
          .where({ log_id: { in: logIdsToCheck } });

        // Build a map of log_id -> workcenter array for quick lookup
        for (const dwc of allDestinationWCs) {
          if (!destinationWorkcentersMap.has(dwc.log_id)) {
            destinationWorkcentersMap.set(dwc.log_id, []);
          }
          destinationWorkcentersMap.get(dwc.log_id)!.push(dwc.workcenter);
        }
      }

      // Filter logs by search string across multiple fields
      // Fields to search: user_id, subject, message, workcenter (origin), recipient workcenters
      const matchingLogs = [];

      for (const log of allLogs) {
        let matches = false;

        // Helper function to check if a value matches the search string
        const matchesSearch = (value: any): boolean => {
          if (!value) return false;
          const strValue = String(value);

          if (isRegex && regexPattern) {
            return regexPattern.test(strValue);
          } else {
            return strValue.toLowerCase().includes(searchString.toLowerCase());
          }
        };

        // Search in User (user_id)
        if (matchesSearch(log.user_id)) {
          matches = true;
        }

        // Search in Subject
        if (!matches && matchesSearch(log.subject)) {
          matches = true;
        }

        // Search in Message
        if (!matches && matchesSearch(log.message)) {
          matches = true;
        }

        // Search in Origin Workcenter
        if (!matches && matchesSearch(log.workcenter)) {
          matches = true;
        }

        // Search in Recipient (destination workcenters) - using pre-fetched data
        if (!matches) {
          const destinationWCs = destinationWorkcentersMap.get(log.ID) || [];

          for (const workcenter of destinationWCs) {
            if (matchesSearch(workcenter)) {
              matches = true;
              break;
            }
          }
        }

        if (matches) {
          matchingLogs.push(log);
        }
      }

      console.log(
        `🔍 Found ${matchingLogs.length} logs matching search string`
      );

      // Enhance logs with language-specific category descriptions
      const logsWithTranslations = await Promise.all(
        matchingLogs.map(async (log: any) => {
          // Get category information with language-specific description
          const category = await SELECT.one
            .from("ShiftBookCategory")
            .where({ ID: log.category, werks: log.werks });

          if (category) {
            // Try to get language-specific description
            const translation = await SELECT.one
              .from("ShiftBookCategoryLng")
              .where({
                category: log.category,
                werks: log.werks,
                lng: userLanguage.toUpperCase(),
              });

            // If no translation found, try fallback language (en)
            let fallbackTranslation = null;
            if (!translation && userLanguage !== "en") {
              fallbackTranslation = await SELECT.one
                .from("ShiftBookCategoryLng")
                .where({
                  category: log.category,
                  werks: log.werks,
                  lng: "EN",
                });
            }

            return {
              ID: log.ID,
              werks: log.werks,
              shoporder: log.shoporder,
              stepid: log.stepid,
              split: log.split,
              workcenter: log.workcenter,
              user_id: log.user_id,
              log_dt: log.log_dt,
              category: log.category,
              subject: log.subject,
              message: log.message,
              isRead: log.isRead,
              category_desc:
                translation?.desc ||
                fallbackTranslation?.desc ||
                `Category ${log.category}`,
              category_language: translation
                ? userLanguage
                : fallbackTranslation
                ? "en"
                : "none",
            };
          }

          return {
            ID: log.ID,
            werks: log.werks,
            shoporder: log.shoporder,
            stepid: log.stepid,
            split: log.split,
            workcenter: log.workcenter,
            user_id: log.user_id,
            log_dt: log.log_dt,
            category: log.category,
            subject: log.subject,
            message: log.message,
            isRead: log.isRead,
          };
        })
      );

      // Count read and unread messages in the search results
      let readCount = 0;
      let unreadCount = 0;

      if (workcenter && matchingLogs.length > 0) {
        // Batch fetch all ShiftBookLogWC records in a single query to avoid N+1 problem
        const matchingLogIds = matchingLogs.map((log: any) => log.ID);
        const logWCRecords = await SELECT.from("ShiftBookLogWC")
          .columns("log_id", "isRead")
          .where({ log_id: { in: matchingLogIds }, workcenter });

        // Create a Map for O(1) lookups
        const logWCMap = new Map(
          logWCRecords.map((lwc: any) => [lwc.log_id, lwc])
        );

        // For each matching log, check if it's read or unread for the specified workcenter
        for (const log of matchingLogs) {
          let isRead = false;

          // Check if workcenter is the origin work center and has isRead timestamp
          if (log.workcenter === workcenter && log.isRead) {
            isRead = true;
          }

          // Check if workcenter is a destination work center with isRead timestamp
          if (!isRead) {
            const logWC = logWCMap.get(log.ID) as any;

            if (logWC?.isRead) {
              isRead = true;
            }
          }

          // Count as read or unread
          if (isRead) {
            readCount++;
          } else {
            unreadCount++;
          }
        }
      }

      audit.logSuccess("ShiftBookLog", "search_by_string", {
        werks,
        searchString,
        workcenter,
        category,
        include_dest_work_center,
        include_orig_work_center,
        resultsCount: logsWithTranslations.length,
        isRegex,
        readCount,
        unreadCount,
      });

      return {
        logs: logsWithTranslations,
        count: logsWithTranslations.length,
        readCount,
        unreadCount,
      };
    } catch (error) {
      audit.logFailure("ShiftBookLog", error.message, undefined, req.data);
      throw error;
    }
  });

  // Handler for adding a new shift book entry
  typedService.on("addShiftBookEntry", async (req: any) => {
    const audit = AuditLogger.forAction("ADD_SHIFTBOOK_ENTRY", req);
    const {
      werks,
      shoporder,
      stepid,
      split,
      workcenter,
      user_id,
      category,
      subject,
      message,
    } = req.data;

    try {
      // Enhanced input validation
      if (
        !werks ||
        typeof werks !== "string" ||
        werks.length < 1 ||
        werks.length > 4 ||
        !/^[A-Z0-9]+$/.test(werks)
      ) {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid werks format",
          undefined,
          req.data
        );
        req.error(400, "Werks must be a 1-4 character alphanumeric code");
        return;
      }

      if (
        !shoporder ||
        typeof shoporder !== "string" ||
        shoporder.length === 0 ||
        shoporder.length > 30
      ) {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid shoporder",
          undefined,
          req.data
        );
        req.error(
          400,
          "Shop order must be a non-empty string with maximum 30 characters"
        );
        return;
      }

      if (
        !stepid ||
        typeof stepid !== "string" ||
        stepid.length === 0 ||
        stepid.length > 4
      ) {
        audit.logFailure("ShiftBookLog", "Invalid stepid", undefined, req.data);
        req.error(
          400,
          "Step ID must be a non-empty string with maximum 4 characters"
        );
        return;
      }

      if (
        !workcenter ||
        typeof workcenter !== "string" ||
        workcenter.length === 0 ||
        workcenter.length > 36
      ) {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid workcenter",
          undefined,
          req.data
        );
        req.error(
          400,
          "Work center must be a non-empty string with maximum 36 characters"
        );
        return;
      }

      if (
        !user_id ||
        typeof user_id !== "string" ||
        user_id.length === 0 ||
        user_id.length > 512
      ) {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid user_id",
          undefined,
          req.data
        );
        req.error(
          400,
          "User ID must be a non-empty string with maximum 512 characters"
        );
        return;
      }

      if (!category || typeof category !== "string") {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid category",
          undefined,
          req.data
        );
        req.error(400, "Category must be a valid UUID string");
        return;
      }

      if (
        !subject ||
        typeof subject !== "string" ||
        subject.length === 0 ||
        subject.length > 1024
      ) {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid subject",
          undefined,
          req.data
        );
        req.error(
          400,
          "Subject must be a non-empty string with maximum 1024 characters"
        );
        return;
      }

      if (
        !message ||
        typeof message !== "string" ||
        message.length === 0 ||
        message.length > 4096
      ) {
        audit.logFailure(
          "ShiftBookLog",
          "Invalid message",
          undefined,
          req.data
        );
        req.error(
          400,
          "Message must be a non-empty string with maximum 4096 characters"
        );
        return;
      }

      // Validate split field (optional but must be valid if provided)
      if (split && (typeof split !== "string" || split.length > 3)) {
        audit.logFailure("ShiftBookLog", "Invalid split", undefined, req.data);
        req.error(400, "Split must be a string with maximum 3 characters");
        return;
      }

      // Check if category exists for this plant
      const categoryExists = await SELECT.one
        .from("ShiftBookCategory")
        .where({ ID: category, werks });

      if (!categoryExists) {
        const errorMsg = getText(
          req,
          "error.category.not.found",
          category,
          werks
        );
        audit.logFailure("ShiftBookLog", errorMsg, undefined, req.data);
        req.error(404, errorMsg);
        return;
      }

      // Create the log entry
      const logId = cds.utils.uuid();
      const logData = {
        ID: logId,
        werks,
        shoporder,
        stepid,
        split: split || "",
        workcenter,
        user_id,
        user_name: req.user?.name || req.user?.id || "Unknown",
        log_dt: new Date(),
        category,
        subject,
        message,
      };

      await INSERT.into("ShiftBookLog").entries(logData);

      // Get destination workcenters for this category
      const categoryWorkcenters = await SELECT.from(
        "ShiftBookCategoryWC"
      ).where({
        category_id: category,
      });

      // Insert ShiftBookLogWC entries for each destination workcenter
      if (categoryWorkcenters && categoryWorkcenters.length > 0) {
        for (const wc of categoryWorkcenters) {
          await INSERT.into("ShiftBookLogWC").entries({
            log_id: logId,
            workcenter: wc.workcenter,
          });
        }
      }

      // Send notifications (email + Teams) after log creation
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "INFO",
          message: `🔧 [addShiftBookEntry] Sending notifications for log ${logId}`,
          service: "shiftbook",
        })
      );
      try {
        const categoryMails = await SELECT.from("ShiftBookCategoryMail").where({
          category: category,
          werks: werks,
        });
        const recipients = categoryMails.map((m: any) => m.mail_address);

        const notificationLogData = {
          shoporder: logData.shoporder,
          stepid: logData.stepid,
          split: logData.split,
          workcenter: logData.workcenter,
          user_id: logData.user_id,
        };

        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "INFO",
            message: `🔧 [addShiftBookEntry] Found ${recipients.length} email recipients`,
            service: "shiftbook",
          })
        );

        // Call sendNotification even if no email recipients - it will still check for Teams channel
        await sendNotification(
          recipients,
          subject,
          message,
          category,
          werks,
          logId,
          req,
          notificationLogData
        );
      } catch (notificationError) {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "ERROR",
            message: `❌ [addShiftBookEntry] Notification failed`,
            error: notificationError,
            service: "shiftbook",
          })
        );
        // Don't fail the whole operation if notification fails
      }

      audit.logSuccess("ShiftBookLog", logId, {
        werks,
        shoporder,
        workcenter,
        category,
        subject,
        destinationWorkcentersCount: categoryWorkcenters?.length || 0,
      });

      return {
        guid: logId,
        werks: logData.werks,
        shoporder: logData.shoporder,
        stepid: logData.stepid,
        split: logData.split,
        workcenter: logData.workcenter,
        user_id: logData.user_id,
        log_dt: logData.log_dt,
        category: logData.category,
        subject: logData.subject,
        message: logData.message,
      };
    } catch (error) {
      audit.logFailure("ShiftBookLog", error.message, undefined, req.data);
      throw error;
    }
  });

  // Handler for getting all categories for a specific plant with language-specific descriptions
  typedService.on("getShiftbookCategories", async (req: any) => {
    const { werks, language } = req.data;

    // Language override logic: explicit parameter takes precedence
    let userLanguage = getUserLanguage(req);

    // If explicit language parameter is provided, validate and use it
    if (language) {
      if (!isLanguageSupported(language)) {
        req.error(
          400,
          getText(
            req,
            "error.unsupported.language",
            language,
            getSupportedLanguages().join(", ")
          )
        );
        return;
      }
      userLanguage = language.toLowerCase();
      console.log(`🌍 Using explicit language parameter: ${userLanguage}`);
    } else {
      // Fallback to automatic language detection
      console.log(`🌍 Using detected language: ${userLanguage}`);
    }

    console.log("🔍 getShiftbookCategories called with:", {
      werks,
      userLanguage,
    });

    try {
      // Get categories with their language-specific descriptions
      const categories = await SELECT.from("ShiftBookCategory")
        .where({ werks })
        .orderBy({ ID: "asc" });

      console.log("📋 Found categories:", categories);

      // For each category, get the language-specific description
      const categoriesWithTranslations = await Promise.all(
        categories.map(async (cat: any) => {
          console.log(
            `🔍 Looking for translation for category ${cat.ID} with language ${userLanguage}`
          );

          // Try to get language-specific description (convert to uppercase for database)
          const translation = await SELECT.one
            .from("ShiftBookCategoryLng")
            .where({
              category: cat.ID,
              werks: cat.werks,
              lng: userLanguage.toUpperCase(),
            });

          console.log(`📝 Translation found for ${userLanguage}:`, translation);

          // If no translation found, try fallback language (en)
          let fallbackTranslation = null;
          if (!translation && userLanguage !== "en") {
            console.log(`🔄 Trying fallback to English for category ${cat.ID}`);
            fallbackTranslation = await SELECT.one
              .from("ShiftBookCategoryLng")
              .where({
                category: cat.ID,
                werks: cat.werks,
                lng: "EN",
              });
            console.log(`📝 Fallback translation found:`, fallbackTranslation);
          }

          const result = {
            ID: cat.ID,
            werks: cat.werks,
            localized_desc:
              translation?.desc ||
              fallbackTranslation?.desc ||
              `Category ${cat.ID}`,
            language: translation
              ? userLanguage
              : fallbackTranslation
              ? "en"
              : "none",
            sendmail: cat.sendmail,
            sendworkcenters: cat.sendworkcenters,
            default_subject: cat.default_subject,
            default_message: cat.default_message,
            triggerproductionprocess: cat.triggerproductionprocess,
          };

          console.log(`✅ Final result for category ${cat.ID}:`, result);
          return result;
        })
      );

      // Sort categories by language preference: user language first, then English, then default
      const sortedCategories = categoriesWithTranslations.sort(
        (a: any, b: any) => {
          // Categories with user's language come first
          if (a.language === userLanguage && b.language !== userLanguage)
            return -1;
          if (a.language !== userLanguage && b.language === userLanguage)
            return 1;

          // Then categories with English translations
          if (a.language === "en" && b.language !== "en") return -1;
          if (a.language !== "en" && b.language === "en") return 1;

          // Finally sort by category ID
          return a.ID.localeCompare(b.ID);
        }
      );

      console.log(
        "🎯 Returning sorted categories with translations:",
        sortedCategories
      );
      return sortedCategories;
    } catch (error) {
      console.error("Error getting shiftbook categories:", error);
      req.error(500, "Internal server error while retrieving categories");
    }
  });

  // Handler for getting categories with explicit language parameter
  typedService.on("getShiftbookCategoriesByLanguage", async (req: any) => {
    const { werks, language } = req.data;

    // Validate language parameter
    if (language && !isLanguageSupported(language)) {
      req.error(
        400,
        `Unsupported language: ${language}. Supported languages: ${getSupportedLanguages().join(
          ", "
        )}`
      );
      return;
    }

    const userLanguage = language || getUserLanguage(req);

    try {
      // Get categories with their language-specific descriptions
      const categories = await SELECT.from("ShiftBookCategory")
        .where({ werks })
        .orderBy({ ID: "asc" });

      // For each category, get the language-specific description
      const categoriesWithTranslations = await Promise.all(
        categories.map(async (cat: any) => {
          // Try to get language-specific description (convert to uppercase for database)
          const translation = await SELECT.one
            .from("ShiftBookCategoryLng")
            .where({
              category: cat.ID,
              werks: cat.werks,
              lng: userLanguage.toUpperCase(),
            });

          // If no translation found, try fallback language (en)
          let fallbackTranslation = null;
          if (!translation && userLanguage !== "en") {
            fallbackTranslation = await SELECT.one
              .from("ShiftBookCategoryLng")
              .where({
                category: cat.ID,
                werks: cat.werks,
                lng: "EN",
              });
          }

          return {
            ID: cat.ID,
            werks: cat.werks,
            localized_desc:
              translation?.desc ||
              fallbackTranslation?.desc ||
              `Category ${cat.ID}`,
            language: translation
              ? userLanguage
              : fallbackTranslation
              ? "en"
              : "none",
            sendmail: cat.sendmail,
            sendworkcenters: cat.sendworkcenters,
            default_subject: cat.default_subject,
            default_message: cat.default_message,
          };
        })
      );

      return categoriesWithTranslations;
    } catch (error) {
      console.error("Error getting shiftbook categories by language:", error);
      req.error(500, "Internal server error while retrieving categories");
    }
  });

  // Handler for marking a log as read for a specific workcenter
  typedService.on("markLogAsRead", async (req: any) => {
    const audit = AuditLogger.forAction("MARK_LOG_AS_READ", req);
    const { log_id, workcenter } = req.data;

    try {
      // Validate input
      if (!log_id || typeof log_id !== "string") {
        audit.logFailure(
          "ShiftBookLogWC",
          "Invalid log_id",
          undefined,
          req.data
        );
        req.error(400, "Log ID must be a valid UUID string");
        return null;
      }

      if (
        !workcenter ||
        typeof workcenter !== "string" ||
        workcenter.length === 0 ||
        workcenter.length > 36
      ) {
        audit.logFailure(
          "ShiftBookLogWC",
          "Invalid workcenter",
          undefined,
          req.data
        );
        req.error(
          400,
          "Work center must be a non-empty string with maximum 36 characters"
        );
        return null;
      }

      // Check if the log-workcenter entry exists in destinations
      const logWC = await SELECT.one
        .from("ShiftBookLogWC")
        .where({ log_id, workcenter });

      // If not in destinations, check the origin workcenter
      if (!logWC) {
        const log = await SELECT.one
          .from("ShiftBookService.ShiftBookLog")
          .where({ ID: log_id });

        if (!log || log.workcenter !== workcenter) {
          audit.logFailure(
            "ShiftBookLogWC",
            "Log-workcenter entry not found",
            undefined,
            req.data
          );
          req.error(404, "Log entry not found for the specified workcenter");
          return null;
        }
      }

      // Set isRead to current timestamp
      const readTimestamp = new Date();

      // Update destination workcenter if it exists
      if (logWC) {
        await UPDATE("ShiftBookLogWC")
          .set({ isRead: readTimestamp })
          .where({ log_id, workcenter });
      }

      // Also update the ShiftBookLog isRead field if the workcenter matches the origin
      const log = await SELECT.one
        .from("ShiftBookService.ShiftBookLog")
        .where({ ID: log_id });

      if (log && log.workcenter === workcenter) {
        await UPDATE("ShiftBookService.ShiftBookLog")
          .set({ isRead: readTimestamp })
          .where({ ID: log_id });
      }

      audit.logSuccess("ShiftBookLogWC", `${log_id}-${workcenter}`, {
        log_id,
        workcenter,
        action: "marked_as_read",
        timestamp: readTimestamp,
      });

      return readTimestamp;
    } catch (error) {
      audit.logFailure("ShiftBookLogWC", error.message, undefined, req.data);
      throw error;
    }
  });

  // Handler for marking a log as unread for a specific workcenter
  typedService.on("markLogAsUnread", async (req: any) => {
    const audit = AuditLogger.forAction("MARK_LOG_AS_UNREAD", req);
    const { log_id, workcenter } = req.data;

    try {
      // Validate input
      if (!log_id || typeof log_id !== "string") {
        audit.logFailure(
          "ShiftBookLogWC",
          "Invalid log_id",
          undefined,
          req.data
        );
        req.error(400, "Log ID must be a valid UUID string");
        return false;
      }

      if (
        !workcenter ||
        typeof workcenter !== "string" ||
        workcenter.length === 0 ||
        workcenter.length > 36
      ) {
        audit.logFailure(
          "ShiftBookLogWC",
          "Invalid workcenter",
          undefined,
          req.data
        );
        req.error(
          400,
          "Work center must be a non-empty string with maximum 36 characters"
        );
        return false;
      }

      // Check if the log-workcenter entry exists in destinations
      const logWC = await SELECT.one
        .from("ShiftBookLogWC")
        .where({ log_id, workcenter });

      // If not in destinations, check the origin workcenter
      if (!logWC) {
        const log = await SELECT.one
          .from("ShiftBookService.ShiftBookLog")
          .where({ ID: log_id });

        if (!log || log.workcenter !== workcenter) {
          audit.logFailure(
            "ShiftBookLogWC",
            "Log-workcenter entry not found",
            undefined,
            req.data
          );
          req.error(404, "Log entry not found for the specified workcenter");
          return false;
        }
      }

      // Set isRead to null (unread) for destination workcenter if it exists
      if (logWC) {
        await UPDATE("ShiftBookLogWC")
          .set({ isRead: null })
          .where({ log_id, workcenter });
      }

      // Also update the ShiftBookLog isRead field if the workcenter matches the origin
      const log = await SELECT.one
        .from("ShiftBookService.ShiftBookLog")
        .where({ ID: log_id });

      if (log && log.workcenter === workcenter) {
        await UPDATE("ShiftBookService.ShiftBookLog")
          .set({ isRead: null })
          .where({ ID: log_id });
      }

      audit.logSuccess("ShiftBookLogWC", `${log_id}-${workcenter}`, {
        log_id,
        workcenter,
        action: "marked_as_unread",
      });

      return true;
    } catch (error) {
      audit.logFailure("ShiftBookLogWC", error.message, undefined, req.data);
      throw error;
    }
  });

  // Handler for batch marking logs as read
  typedService.on("batchMarkLogsAsRead", async (req: any) => {
    const audit = AuditLogger.forAction("BATCH_MARK_LOGS_AS_READ", req);
    const { logs } = req.data;

    try {
      // Validate input
      if (!logs || !Array.isArray(logs) || logs.length === 0) {
        audit.logFailure(
          "ShiftBookLogWC",
          "Invalid logs array",
          undefined,
          req.data
        );
        req.error(400, "Logs must be a non-empty array");
        return {
          success: false,
          totalCount: 0,
          successCount: 0,
          failedCount: 0,
          errors: ["Logs must be a non-empty array"],
        };
      }

      if (logs.length > 100) {
        audit.logFailure(
          "ShiftBookLogWC",
          "Too many logs",
          undefined,
          req.data
        );
        req.error(400, "Maximum 100 log-workcenter pairs allowed per batch");
        return {
          success: false,
          totalCount: logs.length,
          successCount: 0,
          failedCount: logs.length,
          errors: ["Maximum 100 log-workcenter pairs allowed per batch"],
        };
      }

      const readTimestamp = new Date();
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        // Validate each log entry
        if (!log.log_id || typeof log.log_id !== "string") {
          errors.push(`Log ${i + 1}: Invalid log_id`);
          failedCount++;
          continue;
        }

        if (
          !log.workcenter ||
          typeof log.workcenter !== "string" ||
          log.workcenter.length === 0 ||
          log.workcenter.length > 36
        ) {
          errors.push(`Log ${i + 1}: Invalid workcenter`);
          failedCount++;
          continue;
        }

        try {
          // Check if the log-workcenter entry exists in destinations
          const logWC = await SELECT.one
            .from("ShiftBookLogWC")
            .where({ log_id: log.log_id, workcenter: log.workcenter });

          // If not in destinations, check the origin workcenter
          if (!logWC) {
            const shiftBookLog = await SELECT.one
              .from("ShiftBookService.ShiftBookLog")
              .where({ ID: log.log_id });

            if (!shiftBookLog || shiftBookLog.workcenter !== log.workcenter) {
              errors.push(
                `Log ${i + 1}: Entry not found for log_id ${
                  log.log_id
                } and workcenter ${log.workcenter}`
              );
              failedCount++;
              continue;
            }
          }

          // Update isRead to current timestamp for destination workcenter if it exists
          if (logWC) {
            await UPDATE("ShiftBookLogWC")
              .set({ isRead: readTimestamp })
              .where({ log_id: log.log_id, workcenter: log.workcenter });
          }

          // Also update the ShiftBookLog isRead field if the workcenter matches the origin
          const shiftBookLog = await SELECT.one
            .from("ShiftBookService.ShiftBookLog")
            .where({ ID: log.log_id });

          if (shiftBookLog && shiftBookLog.workcenter === log.workcenter) {
            await UPDATE("ShiftBookService.ShiftBookLog")
              .set({ isRead: readTimestamp })
              .where({ ID: log.log_id });
          }

          successCount++;
        } catch (error) {
          errors.push(`Log ${i + 1}: ${error.message}`);
          failedCount++;
        }
      }

      const result = {
        success: failedCount === 0,
        totalCount: logs.length,
        successCount,
        failedCount,
        errors,
      };

      if (successCount > 0) {
        audit.logSuccess("ShiftBookLogWC", "batch", {
          action: "batch_marked_as_read",
          totalCount: logs.length,
          successCount,
          failedCount,
          timestamp: readTimestamp,
        });
      } else {
        audit.logFailure(
          "ShiftBookLogWC",
          "All batch operations failed",
          undefined,
          { totalCount: logs.length, errors }
        );
      }

      return result;
    } catch (error) {
      audit.logFailure("ShiftBookLogWC", error.message, undefined, req.data);
      throw error;
    }
  });

  // Handler for batch marking logs as unread
  typedService.on("batchMarkLogsAsUnread", async (req: any) => {
    const audit = AuditLogger.forAction("BATCH_MARK_LOGS_AS_UNREAD", req);
    const { logs } = req.data;

    try {
      // Validate input
      if (!logs || !Array.isArray(logs) || logs.length === 0) {
        audit.logFailure(
          "ShiftBookLogWC",
          "Invalid logs array",
          undefined,
          req.data
        );
        req.error(400, "Logs must be a non-empty array");
        return {
          success: false,
          totalCount: 0,
          successCount: 0,
          failedCount: 0,
          errors: ["Logs must be a non-empty array"],
        };
      }

      if (logs.length > 100) {
        audit.logFailure(
          "ShiftBookLogWC",
          "Too many logs",
          undefined,
          req.data
        );
        req.error(400, "Maximum 100 log-workcenter pairs allowed per batch");
        return {
          success: false,
          totalCount: logs.length,
          successCount: 0,
          failedCount: logs.length,
          errors: ["Maximum 100 log-workcenter pairs allowed per batch"],
        };
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        // Validate each log entry
        if (!log.log_id || typeof log.log_id !== "string") {
          errors.push(`Log ${i + 1}: Invalid log_id`);
          failedCount++;
          continue;
        }

        if (
          !log.workcenter ||
          typeof log.workcenter !== "string" ||
          log.workcenter.length === 0 ||
          log.workcenter.length > 36
        ) {
          errors.push(`Log ${i + 1}: Invalid workcenter`);
          failedCount++;
          continue;
        }

        try {
          // Check if the log-workcenter entry exists in destinations
          const logWC = await SELECT.one
            .from("ShiftBookLogWC")
            .where({ log_id: log.log_id, workcenter: log.workcenter });

          // If not in destinations, check the origin workcenter
          if (!logWC) {
            const shiftBookLog = await SELECT.one
              .from("ShiftBookService.ShiftBookLog")
              .where({ ID: log.log_id });

            if (!shiftBookLog || shiftBookLog.workcenter !== log.workcenter) {
              errors.push(
                `Log ${i + 1}: Entry not found for log_id ${
                  log.log_id
                } and workcenter ${log.workcenter}`
              );
              failedCount++;
              continue;
            }
          }

          // Set isRead to null (unread) for destination workcenter if it exists
          if (logWC) {
            await UPDATE("ShiftBookLogWC")
              .set({ isRead: null })
              .where({ log_id: log.log_id, workcenter: log.workcenter });
          }

          // Also update the ShiftBookLog isRead field if the workcenter matches the origin
          const shiftBookLog = await SELECT.one
            .from("ShiftBookService.ShiftBookLog")
            .where({ ID: log.log_id });

          if (shiftBookLog && shiftBookLog.workcenter === log.workcenter) {
            await UPDATE("ShiftBookService.ShiftBookLog")
              .set({ isRead: null })
              .where({ ID: log.log_id });
          }

          successCount++;
        } catch (error) {
          errors.push(`Log ${i + 1}: ${error.message}`);
          failedCount++;
        }
      }

      const result = {
        success: failedCount === 0,
        totalCount: logs.length,
        successCount,
        failedCount,
        errors,
      };

      if (successCount > 0) {
        audit.logSuccess("ShiftBookLogWC", "batch", {
          action: "batch_marked_as_unread",
          totalCount: logs.length,
          successCount,
          failedCount,
        });
      } else {
        audit.logFailure(
          "ShiftBookLogWC",
          "All batch operations failed",
          undefined,
          { totalCount: logs.length, errors }
        );
      }

      return result;
    } catch (error) {
      audit.logFailure("ShiftBookLogWC", error.message, undefined, req.data);
      throw error;
    }
  });

  typedService.on("getLastChangeTimestamp", async (req: any) => {
    const audit = AuditLogger.forAction("GET_LAST_CHANGE_TIMESTAMP", req);
    const {
      werks,
      workcenter,
      category,
      include_dest_work_center = true,
      include_orig_work_center = true,
    } = req.data;

    try {
      // Input validation
      if (
        !werks ||
        typeof werks !== "string" ||
        werks.length < 1 ||
        werks.length > 4
      ) {
        audit.logFailure("ShiftBookLog", "Invalid werks", undefined, req.data);
        req.error(400, "Werks must be a 1-4 character string");
        return null;
      }

      // Build base query conditions
      const baseConditions: any = { werks };

      if (category && typeof category === "string") {
        baseConditions.category = category;
      }

      let logIds: string[] = [];
      let useLogIdFilter = false;

      // Handle workcenter filtering based on include_dest_work_center and include_orig_work_center parameters
      if (workcenter) {
        if (include_dest_work_center && include_orig_work_center) {
          // Include logs where workcenter is either origin or destination
          // Get logs that have this workcenter as destination
          const logWorkcenters = await SELECT.from("ShiftBookLogWC")
            .columns("log_id")
            .where({ workcenter });

          const destinationLogIds = logWorkcenters.map(
            (lwc: any) => lwc.log_id
          );

          // Get logs that have this workcenter as origin
          const originLogs = await SELECT.from("ShiftBookLog")
            .columns("ID")
            .where({ ...baseConditions, workcenter });

          const originLogIds = originLogs.map((log: any) => log.ID);

          // Combine both sets of IDs (remove duplicates)
          const allLogIds = new Set([...destinationLogIds, ...originLogIds]);
          logIds = Array.from(allLogIds);

          useLogIdFilter = true;
          console.log(
            `🔧 getLastChangeTimestamp: Including both origin and destination workcenters. Found ${logIds.length} logs.`
          );
        } else if (include_dest_work_center && !include_orig_work_center) {
          // Only include logs where workcenter is a destination
          const logWorkcenters = await SELECT.from("ShiftBookLogWC")
            .columns("log_id")
            .where({ workcenter });

          logIds = logWorkcenters.map((lwc: any) => lwc.log_id);
          useLogIdFilter = true;
          console.log(
            `🔧 getLastChangeTimestamp: Only including destination workcenter filtering. Found ${logIds.length} logs.`
          );
        } else if (!include_dest_work_center && include_orig_work_center) {
          // Only include logs where workcenter is the origin
          baseConditions.workcenter = workcenter;
          console.log(
            `🔧 getLastChangeTimestamp: Only including origin workcenter filtering.`
          );
        } else {
          // Both are false - no workcenter filtering
          console.log(
            `🔧 getLastChangeTimestamp: Both include_dest_work_center and include_orig_work_center are false. No workcenter filtering applied.`
          );
        }
      }

      // Build final conditions
      let finalConditions = baseConditions;
      if (useLogIdFilter) {
        if (logIds.length === 0) {
          // No logs found with the specified workcenter, return null
          audit.logSuccess("ShiftBookLog", "last_change_timestamp", {
            werks,
            workcenter,
            category,
            include_dest_work_center,
            include_orig_work_center,
            result: null,
          });

          return null;
        }
        finalConditions = { ...baseConditions, ID: { in: logIds } };
      }

      // Get the most recent log_dt timestamp
      const result = await SELECT.from("ShiftBookLog")
        .columns("log_dt")
        .where(finalConditions)
        .orderBy({ log_dt: "desc" })
        .limit(1);

      const timestamp = result[0]?.log_dt || null;

      audit.logSuccess("ShiftBookLog", "last_change_timestamp", {
        werks,
        workcenter,
        category,
        include_dest_work_center,
        include_orig_work_center,
        timestamp,
      });

      return timestamp;
    } catch (error) {
      audit.logFailure("ShiftBookLog", error.message, undefined, req.data);
      throw error;
    }
  });
};
