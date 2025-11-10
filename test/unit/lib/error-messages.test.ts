// Mock error-handler
jest.mock("../../../srv/lib/error-handler", () => ({
  ErrorCategory: {
    VALIDATION: "VALIDATION",
    AUTHENTICATION: "AUTHENTICATION",
    AUTHORIZATION: "AUTHORIZATION",
    BUSINESS_LOGIC: "BUSINESS_LOGIC",
    EXTERNAL_SERVICE: "EXTERNAL_SERVICE",
    DATABASE: "DATABASE",
    SYSTEM: "SYSTEM",
    NETWORK: "NETWORK",
    TIMEOUT: "TIMEOUT",
    RATE_LIMIT: "RATE_LIMIT",
    EMAIL_SERVICE: "EMAIL_SERVICE",
  },
}));

// Import modules using ES6 imports to avoid TypeScript redeclaration conflicts
import {
  ErrorMessageManager,
  errorMessageManager,
} from "../../../srv/lib/error-messages";
const errorHandlerModule = require("../../../srv/lib/error-handler");
const { ErrorCategory } = errorHandlerModule;

describe("ErrorMessageManager", () => {
  let manager: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Reset environment
    process.env.NODE_ENV = "development";
    delete process.env.HELP_BASE_URL;

    // Reset ErrorMessageManager singleton
    ErrorMessageManager.resetInstance();

    // Create fresh instance for testing
    manager = ErrorMessageManager.getInstance();

    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = ErrorMessageManager.getInstance();
      const instance2 = ErrorMessageManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(ErrorMessageManager);
    });

    it("should provide pre-created singleton instance", () => {
      expect(errorMessageManager).toBeDefined();
      expect(errorMessageManager).toBeInstanceOf(ErrorMessageManager);
    });
  });

  describe("Configuration", () => {
    it("should initialize with default configuration", () => {
      const config = manager.getConfig();

      expect(config.language).toBe("en");
      expect(config.fallbackLanguage).toBe("en");
      expect(config.enableTechnicalDetails).toBe(true); // development mode
      expect(config.enableHelpLinks).toBe(true);
      expect(config.enableProgressiveDisclosure).toBe(true);
      expect(config.enableActionableMessages).toBe(true);
      expect(config.enableContextualHelp).toBe(true);
      expect(config.helpBaseUrl).toBe("/help");
    });

    it("should disable technical details in production", () => {
      process.env.NODE_ENV = "production";

      // Create new instance to pick up environment change
      const prodManager = new (ErrorMessageManager as any)();
      const config = prodManager.getConfig();

      expect(config.enableTechnicalDetails).toBe(false);
    });

    it("should use custom help base URL from environment", () => {
      process.env.HELP_BASE_URL = "https://help.example.com";

      const customManager = new (ErrorMessageManager as any)();
      const config = customManager.getConfig();

      expect(config.helpBaseUrl).toBe("https://help.example.com");
    });

    it("should update configuration", () => {
      manager.updateConfig({
        language: "de",
        enableHelpLinks: false,
      });

      const config = manager.getConfig();

      expect(config.language).toBe("de");
      expect(config.enableHelpLinks).toBe(false);
      expect(config.fallbackLanguage).toBe("en"); // Should remain unchanged
    });

    it("should return copy of configuration to prevent mutation", () => {
      const config1 = manager.getConfig();
      const config2 = manager.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);

      config1.language = "modified";
      expect(manager.getConfig().language).not.toBe("modified");
    });
  });

  describe("Basic Message Retrieval", () => {
    it("should get message in default language (English)", () => {
      const message = manager.getMessage(ErrorCategory.VALIDATION);

      expect(message).toBe("Please check your input and try again.");
    });

    it("should get message in German", () => {
      const message = manager.getMessage(ErrorCategory.VALIDATION, "de");

      expect(message).toBe(
        "Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut."
      );
    });

    it("should get message in Spanish", () => {
      const message = manager.getMessage(ErrorCategory.AUTHENTICATION, "es");

      expect(message).toBe(
        "Por favor, inicie sesión nuevamente para continuar."
      );
    });

    it("should fallback to English for unsupported language", () => {
      const message = manager.getMessage(ErrorCategory.VALIDATION, "fr");

      expect(message).toBe("Please check your input and try again.");
    });

    it("should return system error for unknown category", () => {
      const message = manager.getMessage("UNKNOWN_CATEGORY" as any);

      expect(message).toBe(
        "An unexpected error occurred. Please try again later."
      );
    });

    it("should use configured language when not specified", () => {
      manager.updateConfig({ language: "de" });
      const message = manager.getMessage(ErrorCategory.VALIDATION);

      expect(message).toBe(
        "Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut."
      );
    });
  });

  describe("Context-aware Message Handling", () => {
    it("should handle field-specific validation messages", () => {
      const context = { field: "email" };
      const message = manager.getMessage(
        ErrorCategory.VALIDATION,
        "en",
        context
      );

      // Should use field-specific message or fallback to generic
      expect(message).toContain("check your input");
    });

    it("should include technical details when enabled", () => {
      manager.updateConfig({ enableProgressiveDisclosure: true });

      const context = {
        technicalDetails: "SQLException: Connection timeout",
      };
      const message = manager.getMessage(ErrorCategory.DATABASE, "en", context);

      expect(message).toContain(
        "Technical Details: SQLException: Connection timeout"
      );
    });

    it("should not include technical details when disabled", () => {
      manager.updateConfig({
        enableProgressiveDisclosure: false,
        enableTechnicalDetails: false,
      });

      const context = {
        technicalDetails: "SQLException: Connection timeout",
      };
      const message = manager.getMessage(ErrorCategory.DATABASE, "en", context);

      expect(message).not.toContain("Technical Details:");
    });

    it("should handle operation-specific context", () => {
      const context = {
        operation: "create",
        entity: "category",
      };
      const message = manager.getMessage(
        ErrorCategory.BUSINESS_LOGIC,
        "en",
        context
      );

      expect(message).toBeDefined();
      expect(typeof message).toBe("string");
    });
  });

  describe("Help Messages", () => {
    it("should get help message for validation errors", () => {
      const help = manager.getHelpMessage(ErrorCategory.VALIDATION);

      expect(help).toBe(
        "Check that all required fields are filled and data is in the correct format."
      );
    });

    it("should get help message in German", () => {
      const help = manager.getHelpMessage(ErrorCategory.AUTHENTICATION, "de");

      expect(help).toBe(
        "Versuchen Sie, sich abzumelden und wieder anzumelden, oder kontaktieren Sie den Support, wenn das Problem weiterhin besteht."
      );
    });

    it("should fallback to generic error for unknown help", () => {
      const help = manager.getHelpMessage("UNKNOWN_CATEGORY" as any);

      expect(help).toBe(
        "An unexpected error occurred. Please try again later."
      );
    });
  });

  describe("Action Messages", () => {
    it("should get action message for validation errors", () => {
      const action = manager.getActionMessage(ErrorCategory.VALIDATION);

      expect(action).toBe(
        "Review the highlighted fields and correct any errors."
      );
    });

    it("should get action message in German", () => {
      const action = manager.getActionMessage(
        ErrorCategory.AUTHORIZATION,
        "de"
      );

      expect(action).toBe(
        "Kontaktieren Sie Ihren Systemadministrator für den Zugriff."
      );
    });

    it("should get action message for rate limit", () => {
      const action = manager.getActionMessage(ErrorCategory.RATE_LIMIT);

      expect(action).toBe("Wait a moment before making another request.");
    });
  });

  describe("Help URL Generation", () => {
    it("should generate basic help URL", () => {
      const url = manager.getHelpUrl(ErrorCategory.VALIDATION);

      expect(url).toBe("/help/validation");
    });

    it("should generate help URL with field parameter", () => {
      const context = { field: "email" };
      const url = manager.getHelpUrl(ErrorCategory.VALIDATION, context);

      expect(url).toBe("/help/validation?field=email");
    });

    it("should generate help URL with operation parameter", () => {
      const context = { operation: "create" };
      const url = manager.getHelpUrl(ErrorCategory.BUSINESS_LOGIC, context);

      expect(url).toBe("/help/business-logic?operation=create");
    });

    it("should generate help URL with both field and operation", () => {
      const context = {
        field: "category",
        operation: "update",
      };
      const url = manager.getHelpUrl(ErrorCategory.VALIDATION, context);

      expect(url).toBe("/help/validation?field=category&operation=update");
    });

    it("should return empty string when help links are disabled", () => {
      manager.updateConfig({ enableHelpLinks: false });

      const url = manager.getHelpUrl(ErrorCategory.VALIDATION);

      expect(url).toBe("");
    });

    it("should use custom help base URL", () => {
      manager.updateConfig({ helpBaseUrl: "https://docs.example.com" });

      const url = manager.getHelpUrl(ErrorCategory.AUTHENTICATION);

      expect(url).toBe("https://docs.example.com/authentication");
    });

    it("should handle underscores in category names", () => {
      const url = manager.getHelpUrl(ErrorCategory.EXTERNAL_SERVICE);

      expect(url).toBe("/help/external-service");
    });
  });

  describe("Comprehensive Error Information", () => {
    it("should get comprehensive error info", () => {
      const context = {
        field: "email",
        operation: "create",
        technicalDetails: "Validation failed",
        errorCode: "VAL001",
      };

      const errorInfo = manager.getComprehensiveErrorInfo(
        ErrorCategory.VALIDATION,
        "en",
        context
      );

      expect(errorInfo.userMessage).toContain("check your input");
      expect(errorInfo.helpMessage).toContain("required fields");
      expect(errorInfo.actionMessage).toContain("Review the highlighted");
      expect(errorInfo.helpUrl).toBe(
        "/help/validation?field=email&operation=create"
      );
      expect(errorInfo.technicalDetails).toBe("Validation failed");
      expect(errorInfo.errorCode).toBe("VAL001");
    });

    it("should get comprehensive error info in German", () => {
      const errorInfo = manager.getComprehensiveErrorInfo(
        ErrorCategory.AUTHENTICATION,
        "de"
      );

      expect(errorInfo.userMessage).toContain("melden Sie sich erneut an");
      expect(errorInfo.helpMessage).toContain(
        "abzumelden und wieder anzumelden"
      );
      expect(errorInfo.actionMessage).toContain("Anmelden");
      expect(errorInfo.helpUrl).toBe("/help/authentication");
    });
  });

  describe("Enhanced Error Message Formatting", () => {
    it("should format enhanced error message with all components enabled", () => {
      manager.updateConfig({
        enableActionableMessages: true,
        enableContextualHelp: true,
        enableHelpLinks: true,
        enableProgressiveDisclosure: true,
      });

      const context = {
        technicalDetails: "Network timeout after 30s",
        errorCode: "NET001",
      };

      const formatted = manager.formatEnhancedErrorMessage(
        ErrorCategory.NETWORK,
        "en",
        context
      );

      expect(formatted).toContain("Network connection issue");
      expect(formatted).toContain("For more help, visit:");
      expect(formatted).toContain(
        "Technical Details: Network timeout after 30s"
      );
    });

    it("should format enhanced error message with minimal components", () => {
      manager.updateConfig({
        enableActionableMessages: false,
        enableContextualHelp: false,
        enableHelpLinks: false,
        enableProgressiveDisclosure: false,
      });

      const formatted = manager.formatEnhancedErrorMessage(
        ErrorCategory.VALIDATION
      );

      expect(formatted).toBe("Please check your input and try again.");
      expect(formatted).not.toContain("For more help");
      expect(formatted).not.toContain("Technical Details");
    });

    it("should format enhanced error message with selective components", () => {
      manager.updateConfig({
        enableActionableMessages: true,
        enableContextualHelp: false,
        enableHelpLinks: true,
        enableProgressiveDisclosure: false,
      });

      const formatted = manager.formatEnhancedErrorMessage(
        ErrorCategory.AUTHENTICATION
      );

      expect(formatted).toContain("Please log in again to continue");
      expect(formatted).toContain('Click "Log In" to authenticate');
      expect(formatted).toContain("For more help, visit: /help/authentication");
      expect(formatted).not.toContain("Try logging out and logging back in");
    });
  });

  describe("Message Formatting with Placeholders", () => {
    it("should format message with placeholders", () => {
      const message = 'The field "{field}" is required.';
      const placeholders = { field: "email" };

      const formatted = manager.formatMessage(message, placeholders);

      expect(formatted).toBe('The field "email" is required.');
    });

    it("should format message with multiple placeholders", () => {
      const message = 'User "{user}" cannot access "{resource}".';
      const placeholders = {
        user: "john.doe",
        resource: "admin-panel",
      };

      const formatted = manager.formatMessage(message, placeholders);

      expect(formatted).toBe('User "john.doe" cannot access "admin-panel".');
    });

    it("should handle missing placeholders gracefully", () => {
      const message = 'The field "{field}" has value "{value}".';
      const placeholders = { field: "email" };

      const formatted = manager.formatMessage(message, placeholders);

      expect(formatted).toBe('The field "email" has value "{value}".');
    });

    it("should handle empty placeholders", () => {
      const message = 'The field "{field}" is required.';
      const placeholders = {};

      const formatted = manager.formatMessage(message, placeholders);

      expect(formatted).toBe('The field "{field}" is required.');
    });

    it("should replace multiple occurrences of same placeholder", () => {
      const message = 'Field "{field}" error: "{field}" is invalid.';
      const placeholders = { field: "password" };

      const formatted = manager.formatMessage(message, placeholders);

      expect(formatted).toBe('Field "password" error: "password" is invalid.');
    });
  });

  describe("Language Management", () => {
    it("should get available languages", () => {
      const languages = manager.getAvailableLanguages();

      expect(languages).toContain("en");
      expect(languages).toContain("de");
      expect(languages).toContain("es");
      expect(languages.length).toBeGreaterThanOrEqual(3);
    });

    it("should return unique languages", () => {
      const languages = manager.getAvailableLanguages();
      const uniqueLanguages = [...new Set(languages)];

      expect(languages.length).toBe(uniqueLanguages.length);
    });
  });

  describe("Custom Message Management", () => {
    it("should add custom message", () => {
      manager.addCustomMessage("custom_error", {
        en: "This is a custom error message.",
        de: "Dies ist eine benutzerdefinierte Fehlermeldung.",
      });

      // Access through the private messages property for testing
      const messages = manager["messages"];
      expect(messages.custom_error).toBeDefined();
      expect(messages.custom_error.en).toBe("This is a custom error message.");
      expect(messages.custom_error.de).toBe(
        "Dies ist eine benutzerdefinierte Fehlermeldung."
      );
    });

    it("should merge custom message with existing", () => {
      // Add initial custom message
      manager.addCustomMessage("custom_error", {
        en: "Custom error in English.",
      });

      // Add additional language
      manager.addCustomMessage("custom_error", {
        de: "Custom error in German.",
      });

      const messages = manager["messages"];
      expect(messages.custom_error.en).toBe("Custom error in English.");
      expect(messages.custom_error.de).toBe("Custom error in German.");
    });

    it("should remove custom message", () => {
      manager.addCustomMessage("temp_error", {
        en: "Temporary error message.",
      });

      let messages = manager["messages"];
      expect(messages.temp_error).toBeDefined();

      manager.removeCustomMessage("temp_error");

      messages = manager["messages"];
      expect(messages.temp_error).toBeUndefined();
    });

    it("should handle removing non-existent message", () => {
      expect(() => {
        manager.removeCustomMessage("non_existent_message");
      }).not.toThrow();
    });
  });

  describe("ShiftBook-specific Messages", () => {
    it("should get ShiftBook category exists message", () => {
      const message = manager.getMessage(
        "SHIFTBOOK_CATEGORY_EXISTS" as any,
        "en"
      );

      expect(message).toBe(
        "A category with this name already exists for this plant."
      );
    });

    it("should get ShiftBook email exists message in German", () => {
      const message = manager.getMessage("SHIFTBOOK_EMAIL_EXISTS" as any, "de");

      expect(message).toBe(
        "Diese E-Mail-Adresse ist bereits für diese Kategorie registriert."
      );
    });

    it("should get ShiftBook translation exists message", () => {
      const message = manager.getMessage(
        "SHIFTBOOK_TRANSLATION_EXISTS" as any,
        "es"
      );

      expect(message).toBe(
        "Una traducción ya existe para esta categoría e idioma."
      );
    });

    it("should get ShiftBook no recipients message", () => {
      const message = manager.getMessage(
        "SHIFTBOOK_NO_RECIPIENTS" as any,
        "en"
      );

      expect(message).toBe(
        "No email recipients found for this category. Please add recipients first."
      );
    });
  });

  describe("Fallback Behavior", () => {
    it("should fallback to configured fallback language", () => {
      manager.updateConfig({ fallbackLanguage: "de" });

      const message = manager.getMessage(ErrorCategory.VALIDATION, "fr");

      expect(message).toBe(
        "Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut."
      );
    });

    it("should fallback to English when fallback language not available", () => {
      manager.updateConfig({ fallbackLanguage: "jp" }); // Non-existent language

      const message = manager.getMessage(ErrorCategory.VALIDATION, "fr");

      expect(message).toBe("Please check your input and try again.");
    });

    it("should use last resort message when no language available", () => {
      // Create a message with no English translation for testing
      manager.addCustomMessage("no_english", { de: "Nur Deutsch" });

      const message = manager["getLocalizedMessage"]("no_english", "fr");

      expect(message).toBe("An error occurred. Please try again.");
    });
  });

  describe("Error Category Handling", () => {
    it("should handle all standard error categories", () => {
      const categories = [
        ErrorCategory.VALIDATION,
        ErrorCategory.AUTHENTICATION,
        ErrorCategory.AUTHORIZATION,
        ErrorCategory.BUSINESS_LOGIC,
        ErrorCategory.EXTERNAL_SERVICE,
        ErrorCategory.DATABASE,
        ErrorCategory.SYSTEM,
        ErrorCategory.NETWORK,
        ErrorCategory.TIMEOUT,
        ErrorCategory.RATE_LIMIT,
        ErrorCategory.EXTERNAL_SERVICE,
      ];

      categories.forEach((category) => {
        const message = manager.getMessage(category);
        expect(message).toBeDefined();
        expect(typeof message).toBe("string");
        expect(message.length).toBeGreaterThan(0);
      });
    });

    it("should handle email service specific messages", () => {
      const message = manager.getMessage(ErrorCategory.EXTERNAL_SERVICE);

      expect(message).toContain("Service temporarily unavailable");
    });

    it("should handle rate limit specific messages", () => {
      const message = manager.getMessage(ErrorCategory.RATE_LIMIT);

      expect(message).toContain("Too many requests");
    });

    it("should handle timeout specific messages", () => {
      const message = manager.getMessage(ErrorCategory.TIMEOUT);

      expect(message).toContain("Request timed out");
    });
  });

  describe("Edge Cases", () => {
    it("should handle null context gracefully", () => {
      expect(() => {
        manager.getMessage(ErrorCategory.VALIDATION, "en", null);
      }).not.toThrow();
    });

    it("should handle undefined context gracefully", () => {
      expect(() => {
        manager.getMessage(ErrorCategory.VALIDATION, "en", undefined);
      }).not.toThrow();
    });

    it("should handle empty string language", () => {
      const message = manager.getMessage(ErrorCategory.VALIDATION, "");

      expect(message).toBe("Please check your input and try again.");
    });

    it("should handle null language", () => {
      const message = manager.getMessage(ErrorCategory.VALIDATION, null as any);

      expect(message).toBe("Please check your input and try again.");
    });

    it("should handle very long technical details", () => {
      const longTechnicalDetails = "A".repeat(10000);

      manager.updateConfig({ enableProgressiveDisclosure: true });

      const context = { technicalDetails: longTechnicalDetails };
      const message = manager.getMessage(ErrorCategory.SYSTEM, "en", context);

      expect(message).toContain("Technical Details:");
      expect(message).toContain("A".repeat(100)); // Should contain part of the long string
    });

    it("should handle special characters in context", () => {
      const context = {
        field: 'special<>&"field',
        operation: "test&operation",
      };

      expect(() => {
        manager.getMessage(ErrorCategory.VALIDATION, "en", context);
      }).not.toThrow();
    });
  });
});
