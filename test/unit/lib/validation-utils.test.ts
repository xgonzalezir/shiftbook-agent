import {
  ValidationError,
  ValidationResponse,
  ValidationUtils,
} from "../../../srv/lib/validation-utils";
import { errorHandler } from "../../../srv/lib/error-handler";

// Mock CAP CDS
jest.mock("@sap/cds", () => ({
  default: {
    ql: {
      SELECT: {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      },
    },
  },
  ql: {
    SELECT: {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
    },
  },
}));

// Mock the error handler
jest.mock("../../../srv/lib/error-handler", () => ({
  errorHandler: {
    createErrorContext: jest.fn(),
    handleError: jest.fn(),
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

describe("ValidationUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateRequired", () => {
    it("should return no errors for valid data with all required fields", () => {
      const data = {
        name: "John Doe",
        email: "john@example.com",
        age: 25,
      };
      const requiredFields = ["name", "email", "age"];

      const result = ValidationUtils.validateRequired(data, requiredFields);

      expect(result).toEqual([]);
    });

    it("should return errors for missing required fields", () => {
      const data = {
        name: "John Doe",
        email: "",
      };
      const requiredFields = ["name", "email", "age"];

      const result = ValidationUtils.validateRequired(data, requiredFields);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        field: "email",
        message: "Field 'email' is required",
        code: "REQUIRED_FIELD_MISSING",
        severity: "error",
      });
      expect(result[1]).toEqual({
        field: "age",
        message: "Field 'age' is required",
        code: "REQUIRED_FIELD_MISSING",
        severity: "error",
      });
    });

    it("should return errors for null and undefined values", () => {
      const data = {
        name: null,
        email: undefined,
        age: 0,
      };
      const requiredFields = ["name", "email"];

      const result = ValidationUtils.validateRequired(data, requiredFields);

      expect(result).toHaveLength(2);
      expect(result[0].field).toBe("name");
      expect(result[1].field).toBe("email");
    });

    it("should not return error for zero value if field is present", () => {
      const data = {
        age: 0,
        count: 0,
      };
      const requiredFields = ["age", "count"];

      const result = ValidationUtils.validateRequired(data, requiredFields);

      expect(result).toEqual([]);
    });
  });

  describe("validateLength", () => {
    it("should return no errors for valid length", () => {
      const data = { title: "Valid Title" };

      const result = ValidationUtils.validateLength(data, "title", 20, 5);

      expect(result).toEqual([]);
    });

    it("should return error when field exceeds maximum length", () => {
      const data = { title: "This title is way too long for the field" };

      const result = ValidationUtils.validateLength(data, "title", 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        field: "title",
        message: "Field 'title' must not exceed 10 characters",
        code: "FIELD_TOO_LONG",
        severity: "error",
      });
    });

    it("should return error when field is shorter than minimum length", () => {
      const data = { password: "123" };

      const result = ValidationUtils.validateLength(data, "password", 20, 8);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        field: "password",
        message: "Field 'password' must be at least 8 characters long",
        code: "FIELD_TOO_SHORT",
        severity: "error",
      });
    });

    it("should return both errors when field violates both min and max length", () => {
      const data = { field: "ab" }; // Too short for min, but we test max first

      const result = ValidationUtils.validateLength(data, "field", 1, 5);

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe("FIELD_TOO_SHORT");
      expect(result[1].code).toBe("FIELD_TOO_LONG");
    });

    it("should handle non-string values by converting to string", () => {
      const data = { number: 12345 };

      const result = ValidationUtils.validateLength(data, "number", 3);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("FIELD_TOO_LONG");
    });

    it("should return no errors for null or undefined values", () => {
      const data = { title: null, description: undefined };

      const result1 = ValidationUtils.validateLength(data, "title", 10);
      const result2 = ValidationUtils.validateLength(data, "description", 10);

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });

  describe("validatePattern", () => {
    it("should return no errors for valid pattern match", () => {
      const data = { email: "test@example.com" };
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const result = ValidationUtils.validatePattern(
        data,
        "email",
        emailPattern,
        "valid email format"
      );

      expect(result).toEqual([]);
    });

    it("should return error for invalid pattern match", () => {
      const data = { email: "invalid-email" };
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const result = ValidationUtils.validatePattern(
        data,
        "email",
        emailPattern,
        "valid email format"
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        field: "email",
        message: "Field 'email' must match pattern: valid email format",
        code: "INVALID_PATTERN",
        severity: "error",
      });
    });

    it("should return no errors for null or undefined values", () => {
      const data = { email: null };
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const result = ValidationUtils.validatePattern(
        data,
        "email",
        emailPattern,
        "valid email format"
      );

      expect(result).toEqual([]);
    });

    it("should handle non-string values by converting to string", () => {
      const data = { code: 12345 };
      const numberPattern = /^\d{4}$/;

      const result = ValidationUtils.validatePattern(
        data,
        "code",
        numberPattern,
        "4-digit number"
      );

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("INVALID_PATTERN");
    });
  });

  describe("validateDateRange", () => {
    it("should return no errors for valid date range", () => {
      const startDate = "2023-01-01";
      const endDate = "2023-12-31";

      const result = ValidationUtils.validateDateRange(
        startDate,
        endDate,
        "startDate",
        "endDate"
      );

      expect(result).toEqual([]);
    });

    it("should return error when start date is after end date", () => {
      const startDate = "2023-12-31";
      const endDate = "2023-01-01";

      const result = ValidationUtils.validateDateRange(
        startDate,
        endDate,
        "startDate",
        "endDate"
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        field: "endDate",
        message: "endDate must be after startDate",
        code: "INVALID_DATE_RANGE",
        severity: "error",
      });
    });

    it("should return no errors when either date is missing", () => {
      const result1 = ValidationUtils.validateDateRange(
        null,
        "2023-12-31",
        "startDate",
        "endDate"
      );
      const result2 = ValidationUtils.validateDateRange(
        "2023-01-01",
        null,
        "startDate",
        "endDate"
      );
      const result3 = ValidationUtils.validateDateRange(
        null,
        null,
        "startDate",
        "endDate"
      );

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(result3).toEqual([]);
    });

    it("should handle Date objects", () => {
      const startDate = new Date("2023-12-31");
      const endDate = new Date("2023-01-01");

      const result = ValidationUtils.validateDateRange(
        startDate,
        endDate,
        "from",
        "to"
      );

      expect(result).toHaveLength(1);
      expect(result[0].field).toBe("to");
    });
  });

  describe("validateUnique", () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {
        run: jest.fn(),
      };
    });

    it("should return no errors when value is unique", async () => {
      mockDb.run.mockResolvedValue([]);

      const result = await ValidationUtils.validateUnique(
        mockDb,
        "Users",
        "email",
        "test@example.com"
      );

      expect(result).toEqual([]);
      expect(mockDb.run).toHaveBeenCalledTimes(1);
    });

    it("should return error when value is not unique", async () => {
      mockDb.run.mockResolvedValue([{ ID: "existing-id" }]);

      const result = await ValidationUtils.validateUnique(
        mockDb,
        "Users",
        "email",
        "test@example.com"
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        field: "email",
        message: "Value 'test@example.com' for field 'email' already exists",
        code: "DUPLICATE_VALUE",
        severity: "error",
      });
    });

    it("should exclude specific ID from uniqueness check", async () => {
      mockDb.run.mockResolvedValue([]);

      await ValidationUtils.validateUnique(
        mockDb,
        "Users",
        "email",
        "test@example.com",
        "current-id"
      );

      expect(mockDb.run).toHaveBeenCalledTimes(1);
    });

    it("should return no errors for null or undefined values", async () => {
      const result1 = await ValidationUtils.validateUnique(
        mockDb,
        "Users",
        "email",
        null
      );
      const result2 = await ValidationUtils.validateUnique(
        mockDb,
        "Users",
        "email",
        undefined
      );

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });

  describe("validateForeignKey", () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {
        run: jest.fn(),
      };
    });

    it("should return no errors when foreign key exists", async () => {
      mockDb.run.mockResolvedValue([{ ID: "target-id" }]);

      const result = await ValidationUtils.validateForeignKey(
        mockDb,
        "Orders",
        "customerId",
        "target-id",
        "Customers"
      );

      expect(result).toEqual([]);
      expect(mockDb.run).toHaveBeenCalledTimes(1);
    });

    it("should return error when foreign key does not exist", async () => {
      mockDb.run.mockResolvedValue([]);

      const result = await ValidationUtils.validateForeignKey(
        mockDb,
        "Orders",
        "customerId",
        "non-existent-id",
        "Customers"
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        field: "customerId",
        message:
          "Referenced Customers with ID 'non-existent-id' does not exist",
        code: "FOREIGN_KEY_VIOLATION",
        severity: "error",
      });
    });

    it("should return no errors for null or undefined values", async () => {
      const result1 = await ValidationUtils.validateForeignKey(
        mockDb,
        "Orders",
        "customerId",
        null,
        "Customers"
      );
      const result2 = await ValidationUtils.validateForeignKey(
        mockDb,
        "Orders",
        "customerId",
        undefined,
        "Customers"
      );

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });

  describe("combineResults", () => {
    it("should combine multiple validation results correctly", () => {
      const result1: ValidationResponse = {
        isValid: true,
        errors: [],
        warnings: [
          {
            field: "field1",
            message: "Warning 1",
            code: "WARN_1",
            severity: "warning",
          },
        ],
      };

      const result2: ValidationResponse = {
        isValid: false,
        errors: [
          {
            field: "field2",
            message: "Error 1",
            code: "ERR_1",
            severity: "error",
          },
        ],
        warnings: [],
      };

      const result3: ValidationResponse = {
        isValid: true,
        errors: [],
        warnings: [
          {
            field: "field3",
            message: "Warning 2",
            code: "WARN_2",
            severity: "warning",
          },
        ],
      };

      const combined = ValidationUtils.combineResults(
        result1,
        result2,
        result3
      );

      expect(combined.isValid).toBe(false);
      expect(combined.errors).toHaveLength(1);
      expect(combined.warnings).toHaveLength(2);
      expect(combined.errors[0].field).toBe("field2");
      expect(combined.warnings.map((w) => w.field)).toEqual([
        "field1",
        "field3",
      ]);
    });

    it("should return valid result when all inputs are valid", () => {
      const result1: ValidationResponse = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      const result2: ValidationResponse = {
        isValid: true,
        errors: [],
        warnings: [
          {
            field: "field1",
            message: "Warning",
            code: "WARN",
            severity: "warning",
          },
        ],
      };

      const combined = ValidationUtils.combineResults(result1, result2);

      expect(combined.isValid).toBe(true);
      expect(combined.errors).toEqual([]);
      expect(combined.warnings).toHaveLength(1);
    });

    it("should handle empty input", () => {
      const combined = ValidationUtils.combineResults();

      expect(combined.isValid).toBe(true);
      expect(combined.errors).toEqual([]);
      expect(combined.warnings).toEqual([]);
    });
  });

  describe("createErrorResponse", () => {
    const mockErrors: ValidationError[] = [
      {
        field: "name",
        message: "Name is required",
        code: "REQUIRED",
        severity: "error",
      },
      {
        field: "email",
        message: "Invalid email",
        code: "INVALID_EMAIL",
        severity: "error",
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    });

    it("should return basic error response without request context (sanity check)", () => {
      const result = ValidationUtils.createErrorResponse(mockErrors);

      expect(result).toBeDefined();
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe("VALIDATION_ERROR");
    });

    it("should use centralized error handler when request context is provided", () => {
      const mockReq = { method: "POST", url: "/test" };
      const mockContext = { operation: "CREATE" };

      const mockErrorContext = {
        correlationId: "test-correlation-id",
        timestamp: new Date().toISOString(),
        environment: "test",
        component: "validation-utils",
        operation: "create-error-response",
      };

      const mockErrorResponse = {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: mockErrors,
        category: "VALIDATION" as any,
        severity: "LOW" as any,
        correlationId: "test-correlation-id",
        timestamp: new Date().toISOString(),
        retryable: false,
      };

      // Spy on the error handler methods
      const createErrorContextSpy = jest
        .spyOn(errorHandler, "createErrorContext")
        .mockReturnValue(mockErrorContext as any);

      const handleErrorSpy = jest
        .spyOn(errorHandler, "handleError")
        .mockReturnValue(mockErrorResponse as any);

      const result = ValidationUtils.createErrorResponse(
        mockErrors,
        mockReq,
        mockContext
      );

      expect(createErrorContextSpy).toHaveBeenCalledWith(
        mockReq,
        "validation-utils",
        "create-error-response"
      );
      expect(handleErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        "VALIDATION",
        mockErrorContext,
        expect.objectContaining({
          severity: "LOW",
          code: "VALIDATION_ERROR",
          details: expect.arrayContaining([
            expect.objectContaining({
              field: "name",
              message: "Name is required",
              code: "REQUIRED",
              severity: "error",
            }),
          ]),
          retryable: false,
        })
      );
      expect(result).toBe(mockErrorResponse);

      // Cleanup
      createErrorContextSpy.mockRestore();
      handleErrorSpy.mockRestore();
    });

    it("should return basic error response when no request context provided", () => {
      const result = ValidationUtils.createErrorResponse(mockErrors);

      expect(result).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: [
            {
              field: "name",
              message: "Name is required",
              code: "REQUIRED",
            },
            {
              field: "email",
              message: "Invalid email",
              code: "INVALID_EMAIL",
            },
          ],
        },
      });
    });

    it("should handle empty errors array", () => {
      const result = ValidationUtils.createErrorResponse([]);

      expect(result).toEqual({
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: [],
        },
      });
    });
  });

  describe("Edge Cases and Integration", () => {
    it("should handle complex validation scenario", async () => {
      const data = {
        name: "",
        email: "invalid-email",
        password: "123",
        confirmPassword: "different",
        startDate: "2023-12-31",
        endDate: "2023-01-01",
      };

      const requiredErrors = ValidationUtils.validateRequired(data, ["name"]);
      const lengthErrors = ValidationUtils.validateLength(
        data,
        "password",
        50,
        8
      );
      const patternErrors = ValidationUtils.validatePattern(
        data,
        "email",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "valid email"
      );
      const dateErrors = ValidationUtils.validateDateRange(
        data.startDate,
        data.endDate,
        "startDate",
        "endDate"
      );

      expect(requiredErrors).toHaveLength(1);
      expect(lengthErrors).toHaveLength(1);
      expect(patternErrors).toHaveLength(1);
      expect(dateErrors).toHaveLength(1);

      const combined = ValidationUtils.combineResults(
        {
          isValid: requiredErrors.length === 0,
          errors: requiredErrors,
          warnings: [],
        },
        {
          isValid: lengthErrors.length === 0,
          errors: lengthErrors,
          warnings: [],
        },
        {
          isValid: patternErrors.length === 0,
          errors: patternErrors,
          warnings: [],
        },
        { isValid: dateErrors.length === 0, errors: dateErrors, warnings: [] }
      );

      expect(combined.isValid).toBe(false);
      expect(combined.errors).toHaveLength(4);
    });

    it("should work with all validation functions returning no errors", async () => {
      const validData = {
        name: "John Doe",
        email: "john@example.com",
        password: "securepassword123",
        startDate: "2023-01-01",
        endDate: "2023-12-31",
      };

      const mockDb = {
        run: jest.fn().mockResolvedValue([]),
      };

      const requiredErrors = ValidationUtils.validateRequired(validData, [
        "name",
        "email",
      ]);
      const lengthErrors = ValidationUtils.validateLength(
        validData,
        "password",
        50,
        8
      );
      const patternErrors = ValidationUtils.validatePattern(
        validData,
        "email",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "valid email"
      );
      const dateErrors = ValidationUtils.validateDateRange(
        validData.startDate,
        validData.endDate,
        "startDate",
        "endDate"
      );
      const uniqueErrors = await ValidationUtils.validateUnique(
        mockDb,
        "Users",
        "email",
        validData.email
      );

      expect(requiredErrors).toEqual([]);
      expect(lengthErrors).toEqual([]);
      expect(patternErrors).toEqual([]);
      expect(dateErrors).toEqual([]);
      expect(uniqueErrors).toEqual([]);
    });
  });
});
