# Test Suite Documentation

This document describes the test suite structure for the SAP CAP ShiftBook application.

## Test Structure - Proper Testing Pyramid

The test suite follows industry-standard testing pyramid principles with clear separation of concerns:

```
              /\
             /  \
            /E2E \      ← Fewer tests, HTTP-based, full user scenarios
           /______\
          /        \
         /Integration\    ← HTTP requests, full stack validation  
        /__________\
       /            \
      /   Service    \    ← CAP service layer, business logic
     /________________\
    /                  \
   /       Unit         \  ← Many tests, fast, mocked dependencies
  /______________________\
```

The test suite is organized into four main categories:

### 1. Unit Tests (`test/unit/`)

**Purpose**: Test individual components in isolation with all external dependencies mocked.

**Characteristics**:
- ✅ Fast execution (typically <2 seconds)
- ✅ No external dependencies (database, services, etc.)
- ✅ Consistent results regardless of environment
- ✅ Perfect for CI/CD pipelines
- ✅ Isolated tests that don't affect each other

**Location**: `test/unit/`
- `test/unit/lib/` - Library and utility function unit tests (26 test files)
  - All external dependencies are mocked for isolation
  - Fast execution with comprehensive coverage collection
  - Includes health-check service testing with complex mocking patterns

**Usage**:
```bash
# Run only unit tests
npm run test:unit

# Run unit tests with coverage
npm run test:coverage
```

### 2. Service Layer Tests (`test/service/`)

**Purpose**: Test CAP service interactions using internal CAP APIs.

**Characteristics**:
- 🔧 Tests service logic and database operations
- 🔧 Uses CAP internal service APIs (not HTTP)
- 🔧 Tests business logic and data validation
- 🔧 Database operations with in-memory SQLite
- 🔧 Faster than HTTP tests, focused on business logic

**Location**: `test/service/`
- `test/service/actions/` - Service action tests
- `test/service/auth/` - Authentication service tests
- `test/service/business/` - Business logic tests
- `test/service/crud/` - CRUD operation tests  
- `test/service/email/` - Email service tests
- `test/service/events/` - Event handling tests
- `test/service/i18n/` - Internationalization tests
- `test/service/odata/` - OData service tests
- `test/service/performance/` - Service performance tests
- `test/service/security/` - Security service tests
- `test/service/services/` - Core service tests

**Usage**:
```bash
# Run service layer tests
npm run test:service
```

### 3. Integration Tests (`test/integration/`)

**Purpose**: Test the complete HTTP stack with real HTTP requests.

**Characteristics**:
- 🌐 Makes actual HTTP requests to running server
- 🌐 Tests authentication middleware, routing, serialization
- 🌐 Catches HTTP-specific issues that service tests miss
- 🌐 Tests status codes, headers, content negotiation
- 🌐 Full stack validation including middleware

**Location**: `test/integration/`
- `shiftbook-http.integration.test.ts` - Complete HTTP stack testing

**Features Tested**:
- ✅ Public health endpoints (no authentication)
- ✅ Authentication & authorization (401/403 responses)
- ✅ CRUD operations via HTTP
- ✅ OData query parameters and filtering  
- ✅ Error handling and response formats
- ✅ Performance and concurrent requests
- ✅ Content negotiation and CORS

**Usage**:
```bash
# Run HTTP integration tests (requires running server)
npm run test:integration
```

### 4. Workflow Tests (`test/workflow/`)

**Purpose**: Test complete business workflows using CAP service layer APIs.

**Characteristics**:
- 🔄 Complete workflow validation using service layer
- 🔄 Tests entire business logic stack
- 🔄 Database persistence and email notifications  
- 🔄 Multi-language and user role testing
- 🔄 Uses CAP internal service APIs
- 🔄 Focus on business processes and data flows

**Location**: `test/workflow/`
- `test/workflow/scenarios/` - Critical business workflows
- `test/workflow/workflows/` - Complete user journeys

**Test Coverage**:
- ✅ Critical production alert workflows with email notifications
- ✅ Multi-language internationalization (EN, DE, ES, FR support)
- ✅ Complete operator shift workflows and user journeys
- ✅ Administrative category and recipient management

**Usage**:
```bash
# Run workflow tests
npm run test:workflow
```

### 5. End-to-End Tests (`test/e2e/`)

**Purpose**: Test complete user workflows via HTTP requests - closest to production usage.

**Characteristics**:
- 🚀 **TRUE** end-to-end testing with actual HTTP requests
- 🚀 Simulates real user interactions via HTTP APIs
- 🚀 Tests complete HTTP stack from authentication to response
- 🚀 Multi-user scenarios and concurrent operations
- 🚀 Realistic production-like testing scenarios

**Location**: `test/e2e/`
- `user-workflow.e2e.test.ts` - Complete HTTP user workflows

**Test Scenarios**:
- ✅ **Operator Daily Workflow** - Complete shift operations via HTTP
- ✅ **Admin Management Tasks** - Administrative workflows via HTTP  
- ✅ **Multi-User Concurrent Operations** - Realistic concurrent user scenarios
- ✅ **Error Recovery Scenarios** - HTTP error handling and recovery
- ✅ **Performance Under Load** - HTTP performance and load testing

**Usage**:
```bash
# Run HTTP E2E tests (requires running server)
npm run test:e2e
```

## Test Utilities

### Unit Test Utilities (`test/utils/unit-test-utils.ts`)

Provides mocked services and entities for pure unit testing:

```typescript
import { unitTestUtils } from '../../utils/unit-test-utils';

describe('My Unit Test', () => {
  let mockService: any;
  let entities: any;

  beforeEach(async () => {
    await unitTestUtils.initialize();
    mockService = await unitTestUtils.getMockService('ShiftBookService');
    entities = unitTestUtils.getMockEntities('ShiftBookService');
  });

  afterEach(async () => {
    unitTestUtils.clearMockData();
  });

  it('should create a new entry', async () => {
    const result = await mockService.run({
      INSERT: { into: entities.ShiftBookLog },
      entries: [{ subject: 'Test' }]
    });
    
    expect(result.length).toBe(1);
    expect(result[0].subject).toBe('Test');
  });
});
```

**Key Features**:
- Mocked service methods (`run`, `read`, `create`, `update`, `delete`, `send`)
- In-memory data storage for test isolation
- Automatic ID generation
- Query simulation for INSERT, SELECT, UPDATE, DELETE operations

### Integration Test Utilities (`test/utils/cap-test-utils.ts`)

Provides real CAP service connections for integration testing:

```typescript
import { capTestUtils } from '../../utils/cap-test-utils';

describe('My Integration Test', () => {
  let testService: any;
  let entities: any;

  beforeEach(async () => {
    await capTestUtils.initialize();
    const serviceInfo = await capTestUtils.connectToService('ShiftBookService');
    testService = serviceInfo.service;
    entities = serviceInfo.entities;
  });

  afterEach(async () => {
    await capTestUtils.cleanupTestData();
  });

  it('should create a new entry in database', async () => {
    const result = await testService.run(
      cds.ql.INSERT.into(entities.ShiftBookLog).entries({
        subject: 'Integration Test',
        message: 'Test message'
      })
    );
    
    expect(result.length).toBe(1);
    expect(result[0].subject).toBe('Integration Test');
  });
});
```

**Key Features**:
- Real CAP service connections
- Database operations
- Automatic cleanup
- CDS model integration

### End-to-End Test Utilities (`test/utils/e2e-test-utils.ts`)

Provides complete workflow testing infrastructure for E2E scenarios:

```typescript
import { e2eTestUtils, E2ETestContext } from '../../utils/e2e-test-utils';

describe('My E2E Test', () => {
  let testContext: E2ETestContext;

  beforeAll(async () => {
    testContext = await e2eTestUtils.initialize();
  });

  afterAll(async () => {
    await e2eTestUtils.shutdown();
  });

  beforeEach(async () => {
    await e2eTestUtils.loadTestFixtures();
  });

  afterEach(async () => {
    await e2eTestUtils.cleanupTestData();
  });

  it('should complete workflow with email notification', async () => {
    // Create critical log entry
    const logData = {
      werks: '1000',
      shoporder: 'E2E-TEST-001',
      category: 1,
      subject: 'E2E Test Alert',
      message: 'Testing complete workflow'
    };

    await testContext.db.run(
      require('@sap/cds').ql.INSERT
        .into(testContext.entities.ShiftBookLog)
        .entries(logData)
    );

    // Verify email notification
    const emailTriggered = await e2eTestUtils.assertEmailNotification(
      'E2E-TEST-001', 
      1
    );
    
    expect(emailTriggered).toBe(true);
  });
});
```

**Key Features**:
- Complete service lifecycle management
- HTTP client with authentication simulation
- Database verification and pattern matching
- Email notification testing
- Test data fixtures and cleanup
- Multi-language scenario support
- Performance timing and benchmarks

## Running Tests

### Available Commands

```bash
# Run unit tests only (fast, mocked dependencies)
npm run test:unit

# Run service layer tests (CAP internal APIs)
npm run test:service

# Run HTTP integration tests (requires running server)
npm run test:integration

# Run workflow tests (business processes via CAP APIs) 
npm run test:workflow

# Run HTTP E2E tests (requires running server, closest to production)  
npm run test:e2e

# Run all tests (complete test pyramid)
npm run test:all

# Run tests with coverage (unit tests only)
npm run test:coverage

# Generate coverage reports
npm run test:coverage:report

# Run tests for CI/CD pipeline
npm run test:ci

# Run tests in watch mode
npm run test:watch

# Clean Jest cache
npm run test:clean

# Run specific E2E test suite
npm test -- test/e2e/scenarios/critical-workflow.e2e.test.ts
npm test -- test/e2e/workflows/user-journey.e2e.test.ts
npm test -- test/e2e/scenarios/multilanguage-workflow.e2e.test.ts
npm test -- test/e2e/workflows/admin-management.e2e.test.ts
```

### CI/CD Integration

For CI/CD pipelines, use the testing pyramid approach:
```bash
# Fast unit tests for quick feedback (< 5 seconds)
npm run test:unit

# Service layer validation (business logic)
npm run test:service

# HTTP integration validation (requires running server)
npm run test:integration

# Business workflow validation (CAP service workflows)
npm run test:workflow

# HTTP E2E validation (closest to production, requires server)
npm run test:e2e

# Full test suite for release validation
npm run test:all
```

**Recommended CI/CD Pipeline Stages**:
1. **Pull Request**: `npm run test:unit` (fast feedback, < 5s)
2. **Integration Branch**: `npm run test:service` (business logic validation)
3. **Pre-deployment**: `npm run test:integration` (HTTP stack validation)  
4. **Post-deployment**: `npm run test:e2e` (production-like HTTP validation)
5. **Release**: `npm run test:all` (complete pyramid validation)

**Server Requirements**:
- `test:integration` and `test:e2e` require a running server instance
- Start server with: `npm start` or `npm run serve`
- Verify server health: `curl http://localhost:4004/health`
- Service layer tests (`test:service`, `test:workflow`) work without running server

## Test Configuration

### Jest Configuration (`jest.config.js`)

- **Test Environment**: Node.js
- **TypeScript Support**: ts-jest preset
- **Coverage Provider**: V8 (experimental) - may have instrumentation limitations for complex modules
- **Coverage**: Collects coverage from `srv/lib/**/*.ts` and `srv/health-check.ts`
- **Coverage Exclusions**: Integration and E2E tests (per SAP CAP best practices)
- **Timeout**: 120 seconds for E2E, 60 seconds for integration, 30 seconds for unit tests

### Environment Setup

- **Unit Tests**: Use `NODE_ENV=test` and `CDS_ENV=test`
- **Integration Tests**: Require database connection (SQLite in-memory or HANA)

## Best Practices

### Unit Tests
1. **Mock everything external** - No real database, services, or external APIs
2. **Test one thing at a time** - Focus on single function or method
3. **Use descriptive test names** - Clear what is being tested
4. **Arrange-Act-Assert pattern** - Clear test structure
5. **Clean up after each test** - Use `afterEach` to reset state

### Integration Tests
1. **Test real interactions** - Use actual database and services
2. **Clean up data** - Ensure test data doesn't persist
3. **Test complete workflows** - End-to-end scenarios
4. **Handle setup/teardown** - Initialize and cleanup test environment
5. **Use realistic data** - Test with production-like data structures

### End-to-End Tests
1. **Test complete business workflows** - Full user journeys from start to finish
2. **Validate cross-system interactions** - Database, email, notifications
3. **Use production scenarios** - Real-world usage patterns
4. **Test performance boundaries** - SLA validation and load testing
5. **Include error recovery** - Test system resilience and fallbacks
6. **Validate multi-user scenarios** - Concurrent operations and role-based access
7. **Test internationalization** - Multi-language support and fallbacks

### General
1. **Keep tests independent** - Tests should not affect each other
2. **Use meaningful assertions** - Test behavior, not implementation
3. **Document complex scenarios** - Add comments for complex test logic
4. **Follow naming conventions** - Consistent file and test naming
5. **Maintain test data** - Keep test data up-to-date with schema changes

## Test Fixtures

### E2E Test Data (`test/fixtures/test-data.json`)

Centralized test data for E2E scenarios:

```json
{
  "categories": [
    {
      "category": 1,
      "werks": "1000",
      "default_desc": "Critical Production Issues",
      "sendmail": 1
    }
  ],
  "recipients": [
    {
      "category": 1,
      "werks": "1000",
      "mail_address": "production.manager@company.com"
    }
  ],
  "translations": [
    {
      "category": 1,
      "werks": "1000",
      "lng": "EN",
      "desc": "Critical Production Issues"
    },
    {
      "category": 1,
      "werks": "1000", 
      "lng": "DE",
      "desc": "Kritische Produktionsprobleme"
    }
  ],
  "users": {
    "operator": {
      "user_id": "operator.user",
      "role": "shiftbook.operator",
      "werks": ["1000"]
    },
    "admin": {
      "user_id": "admin.user",
      "role": "shiftbook.admin", 
      "werks": ["1000", "2000"]
    }
  }
}
```

**Usage**: Automatically loaded by E2E test utilities with proper cleanup.

## Troubleshooting

### Common Issues

1. **CDS model not loaded**: Ensure `jest.setup.ts` is properly configured
2. **Mock service not working**: Check `unit-test-utils.ts` mock implementations
3. **Integration tests failing**: Verify database connection and CDS model loading
4. **TypeScript errors**: Check `tsconfig.json` and Jest TypeScript configuration
5. **E2E tests hanging**: Check for unclosed intervals or database connections
6. **SQLite constraint errors**: Use pattern matching instead of complex WHERE clauses
7. **Email notification tests failing**: Verify mock email service configuration
8. **Zero coverage despite passing tests**: Known issue with V8 coverage provider on heavily mocked modules - tests validate functionality correctly even when coverage shows 0%

### Debug Mode

To run tests in debug mode:
```bash
# Debug unit tests
npm run test:unit -- --verbose

# Debug integration tests
npm run test:integration -- --verbose

# Debug E2E tests
npm run test:e2e -- --verbose

# Debug specific E2E test with open handle detection
npm run test:e2e -- --testNamePattern="specific test name" --detectOpenHandles

# Run E2E tests with timing information
npm run test:e2e -- --verbose
```

## Migration from Legacy Tests

The legacy test suite has been backed up to `test/legacy-backup/`. 

**Key Changes**:
- Separated unit and integration concerns
- Added proper mocking for unit tests
- Improved test isolation and cleanup
- Better error handling and debugging
- Enhanced test utilities and helpers

**Migration Steps**:
1. Identify test type (unit vs integration)
2. Move to appropriate directory
3. Update imports to use new utilities
4. Refactor to use mocked services (unit) or real services (integration)
5. Update test data and assertions
6. Verify test isolation and cleanup 