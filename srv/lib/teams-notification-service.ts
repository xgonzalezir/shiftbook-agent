/**
 * Microsoft Teams webhook notification service
 * Handles sending formatted messages to Teams channels via webhooks
 */

import * as https from "https";
import * as url from "url";

interface TeamsMessage {
  attachments: TeamsAttachment[];
}

interface TeamsAttachment {
  contentType: string;
  content: AdaptiveCardContent;
}

interface AdaptiveCardContent {
  type: string;
  body: CardElement[];
  $schema: string;
  version: string;
}

interface CardElement {
  type: string;
  text?: string;
  weight?: string;
  size?: string;
  wrap?: boolean;
  markdown?: boolean;
  facts?: TeamsFact[];
}

interface TeamsFact {
  title: string;
  value: string;
}

export class TeamsNotificationService {
  /**
   * Send notification to Teams channel via webhook
   */
  static async sendTeamsNotification(
    webhookURL: string,
    subject: string,
    message: string,
    categoryDetails: any,
    logDetails: any
  ): Promise<boolean> {
    try {
      console.log(
        `📢 [TEAMS] Sending notification to webhook: ${webhookURL.substring(
          0,
          50
        )}...`
      );

      const teamsMessage = this.buildTeamsMessage(
        subject,
        message,
        categoryDetails,
        logDetails
      );

      // Configure fetch options based on environment
      const fetchOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(teamsMessage),
      };

      // In development, we might need to handle self-signed certificates
      // Note: In Node.js 18+, we need to use node-fetch or configure the global agent
      const isDevelopment =
        process.env.NODE_ENV === "development" ||
        process.env.CDS_ENV === "development" ||
        process.env.TEAMS_IGNORE_SSL === "true";

      if (isDevelopment) {
        // For development environments, we can set rejectUnauthorized to false
        // This is NOT recommended for production
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        console.log(
          "⚠️  [TEAMS] SSL certificate verification disabled for development"
        );
      }

      const response = await fetch(webhookURL, fetchOptions);

      // Reset SSL settings after request in development
      if (isDevelopment) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "1";
      }

      if (response.ok) {
        console.log(
          `✅ [TEAMS] Notification sent successfully to ${
            categoryDetails.name || "Teams channel"
          }`
        );
        return true;
      } else {
        const errorText = await response.text();
        console.error(
          `❌ [TEAMS] Failed to send notification. Status: ${response.status}, Error: ${errorText}`
        );
        return false;
      }
    } catch (error) {
      console.error("❌ [TEAMS] Error sending Teams notification:", error);
      return false;
    }
  }

  /**
   * Alternative method using native https module for better SSL control
   * This method provides more control over SSL/TLS settings
   */
  static async sendTeamsNotificationWithHttps(
    webhookURL: string,
    subject: string,
    message: string,
    categoryDetails: any,
    logDetails: any
  ): Promise<boolean> {
    try {
      console.log(
        `📢 [TEAMS-HTTPS] Sending notification to webhook: ${webhookURL.substring(
          0,
          50
        )}...`
      );

      const teamsMessage = this.buildTeamsMessage(
        subject,
        message,
        categoryDetails,
        logDetails
      );

      const messageData = JSON.stringify(teamsMessage);
      const parsedUrl = url.parse(webhookURL);

      // Configure HTTPS options
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(messageData),
        },
        // SSL/TLS options
        rejectUnauthorized: process.env.NODE_ENV === "production", // Only enforce SSL in production
        timeout: 10000, // 10 second timeout
      };

      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let responseData = "";

          res.on("data", (chunk) => {
            responseData += chunk;
          });

          res.on("end", () => {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              console.log(
                `✅ [TEAMS-HTTPS] Notification sent successfully to ${
                  categoryDetails.name || "Teams channel"
                }`
              );
              resolve(true);
            } else {
              console.error(
                `❌ [TEAMS-HTTPS] Failed to send notification. Status: ${res.statusCode}, Response: ${responseData}`
              );
              resolve(false);
            }
          });
        });

        req.on("error", (error) => {
          console.error(
            "❌ [TEAMS-HTTPS] Error sending Teams notification:",
            error
          );
          resolve(false);
        });

        req.on("timeout", () => {
          console.error("❌ [TEAMS-HTTPS] Request timeout");
          req.destroy();
          resolve(false);
        });

        req.write(messageData);
        req.end();
      });
    } catch (error) {
      console.error(
        "❌ [TEAMS-HTTPS] Error sending Teams notification:",
        error
      );
      return false;
    }
  }

  /**
   * Build Teams message card with proper formatting for Power Automate compatibility
   */
  private static buildTeamsMessage(
    subject: string,
    message: string,
    categoryDetails: any,
    logDetails: any
  ): TeamsMessage {
    const facts: TeamsFact[] = [
      {
        title: "Plant",
        value: categoryDetails.werks || logDetails.werks || "N/A",
      },
      { title: "Shop Order", value: logDetails.shoporder || "N/A" },
      {
        title: "Step/Split",
        value:
          logDetails.stepid && logDetails.split
            ? `${logDetails.stepid}/${logDetails.split}`
            : "N/A",
      },
      { title: "Workcenter", value: logDetails.workcenter || "N/A" },
      { title: "User", value: logDetails.user_id || "N/A" },
      {
        title: "Timestamp",
        value: logDetails.timestamp
          ? new Date(logDetails.timestamp).toLocaleString()
          : new Date().toLocaleString(),
      },
    ];

    const cardContent: AdaptiveCardContent = {
      type: "AdaptiveCard",
      body: [
        {
          type: "TextBlock",
          text: `🚨 ${subject}`,
          weight: "Bolder",
          size: "Medium",
        },
        {
          type: "FactSet",
          facts: facts,
        },
        {
          type: "TextBlock",
          text: this.htmlToMarkdown(message),
          wrap: true,
          markdown: true,
        },
      ],
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
    };

    const teamsMessage: TeamsMessage = {
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: cardContent,
        },
      ],
    };

    return teamsMessage;
  }

  /**
   * Convert basic HTML to Markdown for Teams formatting
   */
  private static htmlToMarkdown(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n") // <br> to newline
      .replace(/<b>(.*?)<\/b>/gi, "**$1**") // <b> to bold
      .replace(/<strong>(.*?)<\/strong>/gi, "**$1**") // <strong> to bold
      .replace(/<i>(.*?)<\/i>/gi, "*$1*") // <i> to italic
      .replace(/<em>(.*?)<\/em>/gi, "*$1*") // <em> to italic
      .replace(/<p>(.*?)<\/p>/gi, "$1\n\n") // <p> to paragraph with double newline
      .replace(/<[^>]*>/g, ""); // Remove any remaining HTML tags
  }
  private static getThemeColorByCategory(categoryDetails: any): string {
    // Default color scheme - can be customized based on category
    const colors = {
      error: "#FF4444", // Red for errors/critical
      warning: "#FF8C00", // Orange for warnings
      info: "#0078D4", // Blue for information
      success: "#107C10", // Green for success
      maintenance: "#6264A7", // Purple for maintenance
      quality: "#D83B01", // Dark red for quality issues
      default: "#0078D4", // Default blue
    };

    // You can extend this logic based on category names or other properties
    const categoryName = (categoryDetails.name || "").toLowerCase();

    if (categoryName.includes("error") || categoryName.includes("critical")) {
      return colors.error;
    }
    if (categoryName.includes("warning") || categoryName.includes("alert")) {
      return colors.warning;
    }
    if (categoryName.includes("maintenance")) {
      return colors.maintenance;
    }
    if (categoryName.includes("quality")) {
      return colors.quality;
    }
    if (categoryName.includes("success") || categoryName.includes("complete")) {
      return colors.success;
    }

    return colors.default;
  }

  /**
   * Validate webhook URL format
   */
  static isValidWebhookURL(webhookURL: string): boolean {
    try {
      const url = new URL(webhookURL);
      // Teams webhook URLs should be HTTPS and point to outlook.office.com or similar
      return (
        url.protocol === "https:" &&
        (url.hostname.includes("outlook.office.com") ||
          url.hostname.includes("webhook.office.com") ||
          url.hostname.includes("outlook.office365.com"))
      );
    } catch {
      return false;
    }
  }
}
