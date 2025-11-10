/**
 * Validation Middleware for ShiftBook Service
 *
 * This module provides middleware functions that integrate the BusinessValidator
 * with CAP service handlers for consistent validation across all operations.
 */

// Type imports
import type { ValidationContext } from "./business-validator";
import type { ValidationError, ValidationResponse } from "./validation-utils";

// Value imports (CommonJS for runtime compatibility)
const { BusinessValidator } = require("./business-validator");
const { ValidationUtils } = require("./validation-utils");
const AuditLogger =
  require("./audit-logger").default || require("./audit-logger");
const errorHandlerModule = require("./error-handler");
const { errorHandler } = errorHandlerModule;
const { ErrorCategory } = errorHandlerModule;
const { ErrorSeverity } = errorHandlerModule;

const cds = require("@sap/cds");
const { SELECT } = cds;

const auditLogger = new AuditLogger();

export interface ValidationMiddlewareOptions {
  enableAuditLogging?: boolean;
  strictMode?: boolean; // If true, warnings are treated as errors
  customValidationRules?: any;
}

export class ValidationMiddleware {
  private static defaultOptions: ValidationMiddlewareOptions = {
    enableAuditLogging: true,
    strictMode: false,
    customValidationRules: {},
  };

  /**
   * Helper method to create standardized error response for validation failures
   */
  private static createValidationErrorResponse(
    req: any,
    validationResult: ValidationResponse,
    entity: string,
    operation: string
  ) {
    const errorContext = errorHandler.createErrorContext(
      req,
      "validation-middleware",
      `${entity}-${operation}`
    );

    return errorHandler.handleError(
      new Error("Validation failed"),
      ErrorCategory.VALIDATION,
      errorContext,
      {
        severity: ErrorSeverity.LOW,
        code: "VALIDATION_FAILED",
        details: validationResult.errors.map((error) => ({
          field: error.field,
          message: error.message,
          code: error.code,
          severity: error.severity,
        })),
        retryable: false,
      }
    );
  }

  /**
   * Helper method to create standardized error response for system errors
   */
  private static createSystemErrorResponse(
    req: any,
    error: any,
    entity: string,
    operation: string
  ) {
    const errorContext = errorHandler.createErrorContext(
      req,
      "validation-middleware",
      `${entity}-${operation}`
    );

    return errorHandler.handleError(error, ErrorCategory.SYSTEM, errorContext, {
      severity: ErrorSeverity.HIGH,
      code: "VALIDATION_MIDDLEWARE_ERROR",
      details: [
        { component: "validation-middleware", entity, operation: operation },
      ],
      retryable: false,
    });
  }

  /**
   * Create a validation middleware for ShiftBookLog operations
   */
  static createShiftBookLogValidator(
    options: ValidationMiddlewareOptions = {}
  ) {
    const opts = { ...this.defaultOptions, ...options };

    return async (req: any, next: any) => {
      try {
        const context: ValidationContext = {
          entity: "syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookLog",
          operation: req.event,
          data: req.data,
          existingData: req.data?.ID
            ? await this.getExistingData(
                req,
                "syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookLog"
              )
            : undefined,
        };

        // Use the service's database connection
        const db = req.db || cds.tx(req) || cds.db;
        const validationResult = await BusinessValidator.validate(
          req.data,
          context,
          db
        );

        if (opts.strictMode && validationResult.warnings.length > 0) {
          validationResult.errors.push(...validationResult.warnings);
          validationResult.warnings = [];
          validationResult.isValid = false; // Mark as invalid when warnings become errors
        }

        if (!validationResult.isValid) {
          if (opts.enableAuditLogging) {
            try {
              await auditLogger.logValidationFailure(
                req,
                context,
                validationResult
              );
            } catch (auditError) {
              console.warn(
                "Audit logging failed, continuing with validation error:",
                auditError
              );
            }
          }

          const errorResponse = this.createValidationErrorResponse(
            req,
            validationResult,
            "shiftbook-log",
            "validation"
          );

          req.error(400, errorResponse);
          return;
        }

        if (validationResult.warnings.length > 0 && opts.enableAuditLogging) {
          try {
            await auditLogger.logValidationWarnings(
              req,
              context,
              validationResult.warnings
            );
          } catch (auditError) {
            console.warn(
              "Warning audit logging failed, continuing:",
              auditError
            );
          }
        }

        return next();
      } catch (error) {
        console.error("Validation middleware error:", error);

        const errorResponse = this.createSystemErrorResponse(
          req,
          error,
          "shiftbook-log",
          "validation"
        );

        req.error(500, errorResponse);
      }
    };
  }

  /**
   * Create a validation middleware for ShiftBookCategory operations
   */
  static createShiftBookCategoryValidator(
    options: ValidationMiddlewareOptions = {}
  ) {
    const opts = { ...this.defaultOptions, ...options };

    return async (req: any, next: any) => {
      try {
        const context: ValidationContext = {
          entity: "syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategory",
          operation: req.event,
          data: req.data,
          existingData: req.data?.ID
            ? await this.getExistingData(
                req,
                "syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategory"
              )
            : undefined,
        };

        // Use the service's database connection
        const db = req.db || cds.tx(req) || cds.db;
        const validationResult = await BusinessValidator.validate(
          req.data,
          context,
          db
        );

        if (opts.strictMode && validationResult.warnings.length > 0) {
          validationResult.errors.push(...validationResult.warnings);
          validationResult.warnings = [];
          validationResult.isValid = false; // Mark as invalid when warnings become errors
        }

        if (!validationResult.isValid) {
          if (opts.enableAuditLogging) {
            try {
              await auditLogger.logValidationFailure(
                req,
                context,
                validationResult
              );
            } catch (auditError) {
              console.warn(
                "Audit logging failed, continuing with validation error:",
                auditError
              );
            }
          }

          const errorResponse = this.createValidationErrorResponse(
            req,
            validationResult,
            "shiftbook-category",
            "validation"
          );

          req.error(400, errorResponse);
          return;
        }

        if (validationResult.warnings.length > 0 && opts.enableAuditLogging) {
          try {
            await auditLogger.logValidationWarnings(
              req,
              context,
              validationResult.warnings
            );
          } catch (auditError) {
            console.warn(
              "Warning audit logging failed, continuing:",
              auditError
            );
          }
        }

        return next();
      } catch (error) {
        console.error("Validation middleware error:", error);

        const errorResponse = this.createSystemErrorResponse(
          req,
          error,
          "shiftbook-category",
          "validation"
        );

        req.error(500, errorResponse);
      }
    };
  }

  /**
   * Create a validation middleware for ShiftBookCategoryLng operations
   */
  static createShiftBookCategoryLngValidator(
    options: ValidationMiddlewareOptions = {}
  ) {
    const opts = { ...this.defaultOptions, ...options };

    return async (req: any, next: any) => {
      try {
        const context: ValidationContext = {
          entity: "syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryLng",
          operation: req.event,
          data: req.data,
          existingData: req.data?.ID
            ? await this.getExistingData(
                req,
                "syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryLng"
              )
            : undefined,
        };

        // Use the service's database connection
        const db = req.db || cds.tx(req) || cds.db;
        const validationResult = await BusinessValidator.validate(
          req.data,
          context,
          db
        );

        if (opts.strictMode && validationResult.warnings.length > 0) {
          validationResult.errors.push(...validationResult.warnings);
          validationResult.warnings = [];
          validationResult.isValid = false; // Mark as invalid when warnings become errors
        }

        if (!validationResult.isValid) {
          if (opts.enableAuditLogging) {
            try {
              await auditLogger.logValidationFailure(
                req,
                context,
                validationResult
              );
            } catch (auditError) {
              console.warn(
                "Audit logging failed, continuing with validation error:",
                auditError
              );
            }
          }

          const errorResponse = this.createValidationErrorResponse(
            req,
            validationResult,
            "shiftbook-category-lng",
            "validation"
          );

          req.error(400, errorResponse);
          return;
        }

        if (validationResult.warnings.length > 0 && opts.enableAuditLogging) {
          try {
            await auditLogger.logValidationWarnings(
              req,
              context,
              validationResult.warnings
            );
          } catch (auditError) {
            console.warn(
              "Warning audit logging failed, continuing:",
              auditError
            );
          }
        }

        return next();
      } catch (error) {
        console.error("Validation middleware error:", error);

        const errorResponse = this.createSystemErrorResponse(
          req,
          error,
          "shiftbook-category-lng",
          "validation"
        );

        req.error(500, errorResponse);
      }
    };
  }

  /**
   * Create a validation middleware for ShiftBookCategoryMail operations
   */
  static createShiftBookCategoryMailValidator(
    options: ValidationMiddlewareOptions = {}
  ) {
    const opts = { ...this.defaultOptions, ...options };

    return async (req: any, next: any) => {
      try {
        const context: ValidationContext = {
          entity: "syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryMail",
          operation: req.event,
          data: req.data,
          existingData: req.data?.ID
            ? await this.getExistingData(
                req,
                "syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryMail"
              )
            : undefined,
        };

        // Use the service's database connection
        const db = req.db || cds.tx(req) || cds.db;
        const validationResult = await BusinessValidator.validate(
          req.data,
          context,
          db
        );

        if (opts.strictMode && validationResult.warnings.length > 0) {
          validationResult.errors.push(...validationResult.warnings);
          validationResult.warnings = [];
          validationResult.isValid = false; // Mark as invalid when warnings become errors
        }

        if (!validationResult.isValid) {
          if (opts.enableAuditLogging) {
            try {
              await auditLogger.logValidationFailure(
                req,
                context,
                validationResult
              );
            } catch (auditError) {
              console.warn(
                "Audit logging failed, continuing with validation error:",
                auditError
              );
            }
          }

          const errorResponse = this.createValidationErrorResponse(
            req,
            validationResult,
            "shiftbook-category-mail",
            "validation"
          );

          req.error(400, errorResponse);
          return;
        }

        if (validationResult.warnings.length > 0 && opts.enableAuditLogging) {
          try {
            await auditLogger.logValidationWarnings(
              req,
              context,
              validationResult.warnings
            );
          } catch (auditError) {
            console.warn(
              "Warning audit logging failed, continuing:",
              auditError
            );
          }
        }

        return next();
      } catch (error) {
        console.error("Validation middleware error:", error);

        const errorResponse = this.createSystemErrorResponse(
          req,
          error,
          "shiftbook-category-mail",
          "validation"
        );

        req.error(500, errorResponse);
      }
    };
  }

  /**
   * Create a generic validation middleware for any entity
   */
  static createGenericValidator(
    entity: string,
    options: ValidationMiddlewareOptions = {}
  ) {
    const opts = { ...this.defaultOptions, ...options };

    return async (req: any, next: any) => {
      try {
        const context: ValidationContext = {
          entity,
          operation: req.event,
          data: req.data,
          existingData: req.data?.ID
            ? await this.getExistingData(req, entity)
            : undefined,
        };

        // Use the service's database connection
        const db = req.db || cds.tx(req) || cds.db;
        const validationResult = await BusinessValidator.validate(
          req.data,
          context,
          db
        );

        if (opts.strictMode && validationResult.warnings.length > 0) {
          validationResult.errors.push(...validationResult.warnings);
          validationResult.warnings = [];
          validationResult.isValid = false; // Mark as invalid when warnings become errors
        }

        if (!validationResult.isValid) {
          if (opts.enableAuditLogging) {
            try {
              await auditLogger.logValidationFailure(
                req,
                context,
                validationResult
              );
            } catch (auditError) {
              console.warn(
                "Audit logging failed, continuing with validation error:",
                auditError
              );
            }
          }

          const errorResponse = this.createValidationErrorResponse(
            req,
            validationResult,
            entity,
            "validation"
          );

          req.error(400, errorResponse);
          return;
        }

        if (validationResult.warnings.length > 0 && opts.enableAuditLogging) {
          try {
            await auditLogger.logValidationWarnings(
              req,
              context,
              validationResult.warnings
            );
          } catch (auditError) {
            console.warn(
              "Warning audit logging failed, continuing:",
              auditError
            );
          }
        }

        return next();
      } catch (error) {
        console.error("Validation middleware error:", error);

        const errorResponse = this.createSystemErrorResponse(
          req,
          error,
          entity,
          "validation"
        );

        req.error(500, errorResponse);
      }
    };
  }

  /**
   * Create a batch validation middleware for multiple entities
   */
  static createBatchValidator(
    entities: string[],
    options: ValidationMiddlewareOptions = {}
  ) {
    const opts = { ...this.defaultOptions, ...options };

    return async (req: any, next: any) => {
      try {
        const allErrors: ValidationError[] = [];
        const allWarnings: ValidationError[] = [];

        for (const entity of entities) {
          const context: ValidationContext = {
            entity,
            operation: req.event,
            data: req.data,
            existingData: req.data?.ID
              ? await this.getExistingData(req, entity)
              : undefined,
          };

          // Use the service's database connection
          const db = req.db || cds.tx(req) || cds.db;
          const validationResult = await BusinessValidator.validate(
            req.data,
            context,
            db
          );
          allErrors.push(...validationResult.errors);
          allWarnings.push(...validationResult.warnings);
        }

        if (opts.strictMode && allWarnings.length > 0) {
          allErrors.push(...allWarnings);
          allWarnings.length = 0;
        }

        if (allErrors.length > 0) {
          if (opts.enableAuditLogging) {
            try {
              await auditLogger.logValidationFailure(
                req,
                {
                  entity: entities.join(","),
                  operation: req.event,
                  data: req.data,
                },
                { isValid: false, errors: allErrors, warnings: allWarnings }
              );
            } catch (auditError) {
              console.warn(
                "Batch validation audit logging failed, continuing with validation error:",
                auditError
              );
            }
          }

          // Create a mock validation result for the batch
          const batchValidationResult = {
            isValid: false,
            errors: allErrors,
            warnings: allWarnings,
          };

          const errorResponse = this.createValidationErrorResponse(
            req,
            batchValidationResult,
            entities.join(","),
            "batch-validation"
          );

          req.error(400, errorResponse);
          return;
        }

        if (allWarnings.length > 0 && opts.enableAuditLogging) {
          try {
            await auditLogger.logValidationWarnings(
              req,
              {
                entity: entities.join(","),
                operation: req.event,
                data: req.data,
              },
              allWarnings
            );
          } catch (auditError) {
            console.warn(
              "Batch warning audit logging failed, continuing:",
              auditError
            );
          }
        }

        return next();
      } catch (error) {
        console.error("Batch validation middleware error:", error);

        const errorResponse = this.createSystemErrorResponse(
          req,
          error,
          entities.join(","),
          "batch-validation"
        );

        req.error(500, errorResponse);
      }
    };
  }

  /**
   * Helper method to get existing data for updates
   */
  private static async getExistingData(req: any, entity: string): Promise<any> {
    try {
      if (req.data?.ID) {
        const result = await req.db.run(
          SELECT.from(entity).where({ ID: req.data.ID })
        );
        return result[0] || null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching existing data:", error);
      return null;
    }
  }

  /**
   * Create validation middleware for all ShiftBook entities
   */
  static createAllShiftBookValidators(
    options: ValidationMiddlewareOptions = {}
  ) {
    return {
      shiftBookLog: this.createShiftBookLogValidator(options),
      shiftBookCategory: this.createShiftBookCategoryValidator(options),
      shiftBookCategoryLng: this.createShiftBookCategoryLngValidator(options),
      shiftBookCategoryMail: this.createShiftBookCategoryMailValidator(options),
    };
  }
}

export default ValidationMiddleware;

// CommonJS compatibility
module.exports = ValidationMiddleware;
module.exports.ValidationMiddleware = ValidationMiddleware;
