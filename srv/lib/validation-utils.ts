/**
 * Validation Utilities for ShiftBook Service
 *
 * Common validation functions and error handling utilities
 */

import cds from "@sap/cds";
import { ErrorCategory, errorHandler, ErrorSeverity } from "./error-handler";

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: "error" | "warning";
}

export interface ValidationResponse {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class ValidationUtils {
  /**
   * Validate required fields
   */
  static validateRequired(
    data: any,
    requiredFields: string[]
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of requiredFields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ""
      ) {
        errors.push({
          field,
          message: `Field '${field}' is required`,
          code: "REQUIRED_FIELD_MISSING",
          severity: "error",
        });
      }
    }

    return errors;
  }

  /**
   * Validate field length constraints
   */
  static validateLength(
    data: any,
    field: string,
    maxLength: number,
    minLength?: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const value = data[field];

    if (value !== undefined && value !== null) {
      const stringValue = String(value);

      if (minLength && stringValue.length < minLength) {
        errors.push({
          field,
          message: `Field '${field}' must be at least ${minLength} characters long`,
          code: "FIELD_TOO_SHORT",
          severity: "error",
        });
      }

      if (stringValue.length > maxLength) {
        errors.push({
          field,
          message: `Field '${field}' must not exceed ${maxLength} characters`,
          code: "FIELD_TOO_LONG",
          severity: "error",
        });
      }
    }

    return errors;
  }

  /**
   * Validate pattern matching
   */
  static validatePattern(
    data: any,
    field: string,
    pattern: RegExp,
    description: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const value = data[field];

    if (value !== undefined && value !== null && !pattern.test(String(value))) {
      errors.push({
        field,
        message: `Field '${field}' must match pattern: ${description}`,
        code: "INVALID_PATTERN",
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Validate date ranges
   */
  static validateDateRange(
    startDate: any,
    endDate: any,
    startField: string,
    endField: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        errors.push({
          field: endField,
          message: `${endField} must be after ${startField}`,
          code: "INVALID_DATE_RANGE",
          severity: "error",
        });
      }
    }

    return errors;
  }

  /**
   * Validate unique constraints
   */
  static async validateUnique(
    db: any,
    entity: string,
    field: string,
    value: any,
    excludeId?: string
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (value !== undefined && value !== null) {
      let query = cds.ql.SELECT.from(entity).where({ [field]: value });

      if (excludeId) {
        query = query.where({ ID: { "!=": excludeId } });
      }

      const result = await db.run(query);

      if (result.length > 0) {
        errors.push({
          field,
          message: `Value '${value}' for field '${field}' already exists`,
          code: "DUPLICATE_VALUE",
          severity: "error",
        });
      }
    }

    return errors;
  }

  /**
   * Validate foreign key relationships
   */
  static async validateForeignKey(
    db: any,
    entity: string,
    field: string,
    value: any,
    targetEntity: string
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (value !== undefined && value !== null) {
      const result = await db.run(
        cds.ql.SELECT.from(targetEntity).where({ ID: value })
      );

      if (result.length === 0) {
        errors.push({
          field,
          message: `Referenced ${targetEntity} with ID '${value}' does not exist`,
          code: "FOREIGN_KEY_VIOLATION",
          severity: "error",
        });
      }
    }

    return errors;
  }

  /**
   * Combine multiple validation results
   */
  static combineResults(...results: ValidationResponse[]): ValidationResponse {
    const combined: ValidationResponse = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    for (const result of results) {
      combined.errors.push(...result.errors);
      combined.warnings.push(...result.warnings);
      if (!result.isValid) {
        combined.isValid = false;
      }
    }

    return combined;
  }

  /**
   * Create a standardized error response using centralized error handling
   */
  static createErrorResponse(
    errors: ValidationError[],
    req?: any,
    context?: any
  ): any {
    // If we have request context, use centralized error handler
    if (req && context) {
      const errorContext = errorHandler.createErrorContext(
        req,
        "validation-utils",
        "create-error-response"
      );

      return errorHandler.handleError(
        new Error("Validation failed"),
        (ErrorCategory?.VALIDATION || "VALIDATION") as any,
        errorContext,
        {
          severity: (ErrorSeverity?.LOW || "LOW") as any,
          code: "VALIDATION_ERROR",
          details: errors.map((error) => ({
            field: error.field,
            message: error.message,
            code: error.code,
            severity: error.severity,
          })),
          retryable: false,
        }
      );
    }

    // Fallback to basic error response for backward compatibility
    return {
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: errors.map((error) => ({
          field: error.field,
          message: error.message,
          code: error.code,
        })),
      },
    };
  }
}

// CommonJS compatibility
module.exports = ValidationUtils;
module.exports.ValidationUtils = ValidationUtils;
