# ShiftBook CAP Service - Governance & Compliance Rules

## Project Overview
**Project Name**: ShiftBook CAP Service  
**Technology Stack**: SAP CAP 9.2.0, TypeScript, HANA/SQLite, Node.js  
**Architecture**: Multi-tenant SaaS service with role-based access control  
**Deployment Target**: SAP Business Technology Platform (BTP)  
**Last Updated**: January 2025 - Agent Approval Workflow Implementation

---

## 1. Technology Stack & Dependencies

### Core Technology Requirements

**APPROVED**: Only these technologies are permitted in the project
- **Runtime**: Node.js (latest LTS version supported by CAP)
- **Framework**: SAP CAP 9.2.0+ (major version upgrades require approval)
- **Language**: TypeScript 5.8.3+ for service layer, CDS for data models
- **Database**: SAP HANA (production/hybrid), SQLite (development/test)
- **Authentication**: XSUAA for production, mock/dummy for development/test
- **Logging**: Winston with structured JSON format

**APPROVED Libraries** (package.json dependencies):
```javascript
// Core CAP dependencies - REQUIRED
"@sap/cds": "^9.2.0"
"@sap/cds-dk": "^9.2.0"  
"@sap/cds-mtxs": "^3.2.0"
"@cap-js/hana": "^2.1.2"

// Authentication & Security - REQUIRED
"@sap/xssec": "^4"
"@sap/xsenv": "^5.6.1"
"passport": "^0.7.0"

// Utilities - APPROVED
"winston": "^3.15.0" // Logging ONLY
"nodemailer": "^7.0.5" // Email ONLY
"handlebars": "^4.7.8" // Templates ONLY
"axios": "^1.10.0" // HTTP client ONLY
"uuid": "^11.1.0" // ID generation ONLY
```

**REJECTED**: These technologies are not permitted
- Express.js beyond what CAP provides
- Alternative ORM/database libraries (Prisma, TypeORM, etc.)
- Alternative authentication libraries
- Frontend frameworks (this is a backend-only service)
- Alternative logging libraries (console.log, etc.)

**Version Management**:
- Dependencies MUST use caret (^) ranges for patch updates
- Major version updates require governance approval
- Security updates take precedence over version constraints

---

## 2. Project Structure & Architecture

### Mandatory Directory Structure

```
/
├── db/                    # CDS data models - REQUIRED
│   └── schema.cds        # Main schema definition
├── srv/                   # Service layer - REQUIRED
│   ├── lib/              # TypeScript business logic
│   ├── shiftbook-service.cds  # Service definitions
│   └── server.js         # Server bootstrap
├── test/                  # Test suites - REQUIRED
│   ├── unit/            # Unit tests (70%+ coverage)
│   ├── integration/     # Integration tests
│   ├── e2e/            # End-to-end tests
│   └── setup/          # Test configuration
├── .taskmaster/         # Documentation - REQUIRED
├── gen/                 # Generated files - AUTO-GENERATED
├── mta.yaml            # Deployment descriptor - REQUIRED
├── package.json        # Project configuration - REQUIRED
└── xs-security.json    # Security configuration - REQUIRED
```

**REQUIRED**: All directories marked as REQUIRED must exist
**FORBIDDEN**: Direct modification of `/gen` directory (auto-generated only)

### File Naming Conventions

**CDS Files**:
- Schema files: `kebab-case.cds` (e.g., `schema.cds`, `shift-book-model.cds`)
- Service files: `kebab-case-service.cds` (e.g., `shiftbook-service.cds`)

**TypeScript Files**:
- Implementation files: `kebab-case.ts` (e.g., `email-service.ts`)
- Test files: `kebab-case.test.ts` or `kebab-case.spec.ts`
- Type definitions: `kebab-case.types.ts`

**Configuration Files**:
- Environment configs: `kebab-case.json` (e.g., `cds.env.json`)

---

## 3. Code Standards & Patterns

### TypeScript Standards

**Compiler Configuration** (tsconfig.json):
```javascript
{
  "compilerOptions": {
    "target": "ES2022",           // REQUIRED: ES2022 minimum
    "module": "commonjs",         // REQUIRED: CommonJS for CAP
    "strict": false,              // ALLOWED: For CAP compatibility
    "declaration": true,          // REQUIRED: Generate .d.ts files
    "sourceMap": true,           // REQUIRED: For debugging
    "outDir": "./gen/srv",       // REQUIRED: Build target
    "rootDir": "./srv"           // REQUIRED: Source root
  }
}
```

**Code Style Requirements**:
- **REQUIRED**: Use TypeScript for all business logic in `/srv/lib/`
- **REQUIRED**: Export interfaces for all complex types
- **FORBIDDEN**: `any` type (use proper typing)
- **REQUIRED**: Document public functions with JSDoc comments

**Example - Correct Implementation**:
```typescript
// ✅ DO: Proper TypeScript implementation
interface ShiftBookLogRequest {
  werks: string;
  shoporder: string;
  category: string;
  subject: string;
  message: string;
}

export class ShiftBookService {
  /**
   * Creates a new shift book log entry
   * @param request - The log entry data
   * @returns Promise with the created log entry
   */
  async createLogEntry(request: ShiftBookLogRequest): Promise<ShiftBookLogResult> {
    // Implementation
  }
}
```

**Example - Incorrect Implementation**:
```typescript
// ❌ DON'T: Avoid these patterns
function createLog(data: any) {  // No 'any' type
  console.log(data);            // No console.log
  return data;                  // No proper typing
}
```

### CDS Schema Standards

**Entity Definitions**:
- **REQUIRED**: Use `cuid` and `managed` for all entities
- **REQUIRED**: Define associations between entities
- **REQUIRED**: Use proper string length constraints
- **REQUIRED**: Include `@singular` annotations

**Example - Correct CDS Schema**:
```cds
// ✅ DO: Proper CDS entity definition
@singular: 'ShiftBookLog'
entity ShiftBookLog : cuid, managed {
    werks           : String(4);      // Proper length constraint
    shoporder       : String(12);
    category        : UUID;
    categoryDetails : Association to ShiftBookCategory
                        on categoryDetails.ID = category;
}
```

### Service Layer Architecture

**Pattern**: Domain-Driven Design with clear separation of concerns

**REQUIRED Structure**:
```
srv/lib/
├── business-validator.ts    # Business rule validation
├── email-service.ts        # Email functionality
├── auth-monitor.ts         # Authentication monitoring
├── audit-logger.ts         # Audit trail logging
├── error-handler.ts        # Error handling
└── performance-monitor.ts   # Performance tracking
```

**REQUIRED**: Each module must have single responsibility
**FORBIDDEN**: Cross-cutting concerns mixed with business logic

---

## 4. Testing Requirements

### Test Coverage Standards

**REQUIRED Coverage Thresholds** (jest.config.js):
```javascript
coverageThreshold: {
  global: {
    branches: 70,    // MINIMUM 70%
    functions: 70,   // MINIMUM 70%
    lines: 70,       // MINIMUM 70%
    statements: 70   // MINIMUM 70%
  }
}
```

**Test Structure** - REQUIRED:
```
test/
├── unit/              # Unit tests (business logic)
│   └── lib/          # Test each srv/lib module
├── integration/       # API integration tests
├── e2e/              # End-to-end workflows
├── workflow/         # Business workflow tests
└── setup/           # Test configuration
```

**Test Naming**: `{module-name}.test.ts` or `{module-name}.spec.ts`

### Test Implementation Standards

**REQUIRED**: Use Jest as testing framework
**REQUIRED**: TypeScript for all test files
**REQUIRED**: Mock external dependencies
**FORBIDDEN**: Tests depending on external services in unit tests

**Example - Correct Test Implementation**:
```typescript
// ✅ DO: Proper test structure
describe('EmailService', () => {
  beforeEach(async () => {
    mockClearAll();
  });

  describe('sendNotification', () => {
    it('should send email when category has mail recipients', async () => {
      // Test implementation with proper mocking
    });

    it('should throw error when no recipients found', async () => {
      // Error case testing
    });
  });
});
```

### Test Commands (package.json scripts)

**REQUIRED Scripts**:
```json
{
  "test": "jest --runInBand",
  "test:unit": "jest test/unit --runInBand",
  "test:integration": "jest test/integration --runInBand",
  "test:coverage": "jest test/unit --coverage --runInBand",
  "test:ci": "jest test/unit --ci --coverage --runInBand"
}
```

---

## 5. Security & Compliance

### Authentication & Authorization

**REQUIRED Security Model**:
```json
// xs-security.json - REQUIRED configuration
{
  "scopes": [
    { "name": "$XSAPPNAME.operator" },  // Read + Create logs
    { "name": "$XSAPPNAME.admin" }      // Full CRUD access
  ],
  "role-templates": [
    { "name": "shiftbook.operator" },
    { "name": "shiftbook.admin" }
  ]
}
```

**Service Authorization** (CDS annotations):
```cds
// ✅ DO: Proper service authorization
service ShiftBookService @(requires: ['shiftbook.operator', 'shiftbook.admin']) {
  @restrict: [
    { grant: 'READ', to: ['shiftbook.operator', 'shiftbook.admin'] },
    { grant: 'WRITE', to: 'shiftbook.admin' }
  ]
  entity ShiftBookCategory as projection on db.ShiftBookCategory;
}
```

**Environment-Specific Authentication**:
- **Development**: Mock authentication (users: alice, bob)
- **Test**: Dummy authentication with test users
- **Production/Hybrid**: XSUAA authentication ONLY

### Data Security Requirements

**REQUIRED**: All sensitive data must be encrypted at rest
**REQUIRED**: Use UUID for all entity IDs (no sequential IDs)
**FORBIDDEN**: Storing passwords or credentials in code
**REQUIRED**: Audit logging for all data modifications

**Example - Audit Trail**:
```typescript
// ✅ DO: Proper audit logging
await auditLogger.logOperation({
  action: 'CREATE',
  entity: 'ShiftBookLog',
  entityId: result.ID,
  userId: req.user.id,
  details: sanitizeLogData(request)
});
```

---

## 6. Deployment & Build Standards

### MTA Configuration (mta.yaml)

**REQUIRED Structure**:
```yaml
# Application metadata - REQUIRED
ID: shiftbook
version: 1.0.0
description: "SAP CAP Shift Book Backend Service"

# Build parameters - REQUIRED
build-parameters:
  before-all:
    - builder: custom
      commands:
        - npm ci          # REQUIRED: Use npm ci for production
        - npm run build   # REQUIRED: TypeScript compilation

# Service module - REQUIRED configuration
modules:
  - name: shiftbook-srv
    type: nodejs
    path: gen/srv       # REQUIRED: Use generated output
    parameters:
      memory: 512M      # MINIMUM memory allocation
      disk-quota: 2G    # MINIMUM disk allocation
      health-check-type: http
      health-check-http-endpoint: /health
```

**REQUIRED Resources**:
- `shiftbook-db`: HDI container for HANA
- `shiftbook-auth`: XSUAA service
- `shiftbook-destination`: Destination service
- `shiftbook-config`: User-provided service for configuration
- `shiftbook-logging`: Application logs service

### Build Process

**REQUIRED Build Steps** (package.json):
```json
{
  "build": "npm run clean && cds build --production && npm run build:ts && npm run copy:extras",
  "build:ts": "tsc",
  "clean": "rm -rf gen/"
}
```

**Build Validation**:
- **REQUIRED**: TypeScript compilation must pass without errors
- **REQUIRED**: CDS build must pass without warnings
- **REQUIRED**: All required files must be copied to `/gen/srv/`

### Environment Configuration

**REQUIRED**: Use User-Provided Service for configuration management
**FORBIDDEN**: Hard-coded configuration values in code
**REQUIRED**: Environment-specific CDS profiles

**Example - CDS Configuration**:
```json
// ✅ DO: Environment-specific database configuration
"requires": {
  "db": {
    "[development]": { "kind": "sqlite" },
    "[test]": { "kind": "sqlite", "credentials": { "url": ":memory:" } },
    "[production]": { "kind": "hana" }
  }
}
```

---

## 7. Documentation Requirements

### Code Documentation

**REQUIRED**: JSDoc comments for all public methods
**REQUIRED**: README.md in each major directory
**REQUIRED**: API documentation for all service endpoints

**Example - JSDoc Standard**:
```typescript
/**
 * Validates shift book log entry before creation
 * @param request - The log entry data to validate
 * @param context - Request context with user info
 * @returns Promise<ValidationResult> - Validation outcome with errors
 * @throws {ValidationError} When required fields are missing
 */
async validateLogEntry(
  request: ShiftBookLogRequest, 
  context: RequestContext
): Promise<ValidationResult> {
  // Implementation
}
```

### Project Documentation Structure

**REQUIRED Documentation**:
```
/
├── README.md                    # Project overview
├── TEST_ENGINEER_GUIDE.md      # Testing documentation
├── __documentation/            # Detailed documentation
│   ├── CONFIGURATION_MANAGEMENT.md
│   ├── BTP_DESTINATIONS_SUMMARY.md
│   └── MIGRATION_STATE.md
└── .claude-code/
    └── project-rules.md        # This file
```

**REQUIRED**: Keep documentation current with code changes
**REQUIRED**: Include examples in all documentation
**FORBIDDEN**: Outdated or contradictory documentation

---

## 8. Git Workflow & Branching Strategy

### Branch Naming Convention

**REQUIRED Patterns**:
- Feature branches: `feature/short-description` or `feat/short-description`
- Bug fixes: `fix/short-description` or `bugfix/short-description`
- Hot fixes: `hotfix/short-description`
- Release branches: `release/version-number`

**Current Branch Structure**:
- **Main branch**: `main` (production-ready code)
- **Current working branch**: `cap-local-setup` (local development setup)

### Commit Message Format

**REQUIRED Format**:
```
<type>: <description>

[optional body]

[optional footer]
```

**Types** (REQUIRED):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding/fixing tests
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

**Example**:
```
feat: Add CAP local setup configuration and testing scripts

- Configure SQLite for local development
- Add health check endpoints
- Implement structured logging
- Add comprehensive test suites

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Pull Request Requirements

**REQUIRED Before Merge**:
- All tests pass (`npm run test:ci`)
- Code coverage meets thresholds (70%+)
- TypeScript compilation successful
- Documentation updated
- Security scan passed
- Peer review completed

---

## 9. CAP-Specific Best Practices

### CDS Model Design

**REQUIRED**: Follow CAP naming conventions
- Services: PascalCase with "Service" suffix
- Entities: PascalCase singular
- Actions/Functions: camelCase

**Example - Service Definition**:
```cds
// ✅ DO: Proper CAP service structure
service ShiftBookService @(path: '/shiftbook/ShiftBookService') {
  // Entities with proper authorization
  entity ShiftBookLog as projection on db.ShiftBookLog;
  
  // Actions with proper parameters
  action addShiftBookEntry(
    werks: String(4),
    shoporder: String(12),
    category: UUID,
    subject: String(1024),
    message: String(4096)
  ) returns ShiftBookLogResult;
}
```

### CAP Event Handling

**REQUIRED Pattern**: Use CAP event handlers for business logic
**FORBIDDEN**: Direct database access outside of CAP framework

**Example - Event Handler**:
```typescript
// ✅ DO: Proper CAP event handling
this.on('CREATE', 'ShiftBookLog', async (req) => {
  // Validation
  await businessValidator.validateLogEntry(req.data);
  
  // Business logic
  const result = await super.run(req);
  
  // Post-processing
  await auditLogger.logCreation(result);
  
  return result;
});
```

### Database Connection Management

**REQUIRED**: Use CAP's built-in connection pooling
**REQUIRED**: Implement proper connection monitoring
**FORBIDDEN**: Manual database connection management

**Connection Pool Configuration**:
```json
// ✅ DO: Proper HANA connection pooling
"db": {
  "[production]": {
    "kind": "hana",
    "pool": {
      "min": 10,
      "max": 50,
      "acquireTimeoutMillis": 5000
    }
  }
}
```

---

## 10. Monitoring & Logging

### Structured Logging

**REQUIRED**: Use Winston with JSON format for production
**REQUIRED**: Log levels based on environment
**FORBIDDEN**: console.log statements in production code

**Logging Configuration** (package.json):
```json
"log": {
  "levels": {
    "shiftbook": "info",
    "shiftbook.auth": "info",
    "shiftbook.db": "debug",
    "shiftbook.business": "info",
    "shiftbook.error": "error"
  },
  "format": "json"
}
```

**Example - Proper Logging**:
```typescript
// ✅ DO: Structured logging with context
logger.info('Shift book log created', {
  component: 'shiftbook.business',
  action: 'CREATE_LOG',
  userId: req.user.id,
  werks: request.werks,
  category: request.category,
  duration: performance.now() - start
});
```

### Health Monitoring

**REQUIRED Endpoints**:
- `/health` - Comprehensive health status
- `/health/simple` - Basic health check
- `/health/cf` - Cloud Foundry health check
- `/metrics` - Prometheus metrics (if enabled)

**Health Check Requirements**:
- Database connectivity check
- External service availability
- Memory usage monitoring
- Response time tracking

---

## 11. Agent Approval Workflow - MANDATORY

### Overview

All agents operating within this project MUST seek approval from the Project Governance & Compliance Agent before implementing any changes. This ensures consistency, prevents rule violations, and maintains project integrity.

### Pre-Approval Requirements

**MANDATORY**: Before making ANY changes, agents must:

1. **Submit Approval Request** using the standard template (see below)
2. **Wait for APPROVED status** before proceeding
3. **Follow any CONDITIONAL requirements** specified in the approval
4. **Document the approval reference** in commit messages

### Standard Approval Request Template

**Required Format** - Use this exact template for all approval requests:

```
APPROVAL REQUEST
================

AGENT: [Agent Name/Type]
REQUEST TYPE: [CODE_CHANGE | ARCHITECTURE | DEPENDENCY | CONFIGURATION | DOCUMENTATION]
PRIORITY: [LOW | MEDIUM | HIGH | CRITICAL]

DESCRIPTION:
[Brief description of the proposed change]

SCOPE:
- Files to be modified: [List file paths]
- New files to be created: [List new files if any]
- Dependencies affected: [List any package.json changes]
- Tests required: [Describe test coverage plan]

RATIONALE:
[Explain why this change is necessary]

BUSINESS IMPACT:
[Describe impact on functionality, performance, security]

COMPLIANCE CHECK:
- Technology stack compliance: [Y/N with explanation]
- Security requirements: [Y/N with explanation]  
- Testing standards: [Y/N with explanation]
- Documentation requirements: [Y/N with explanation]

ROLLBACK PLAN:
[How to reverse this change if needed]
```

### Change Classification

#### SIGNIFICANT CHANGES - Require Full Approval

These changes ALWAYS require pre-approval:

**Architecture & Design**:
- New service endpoints or modifications to existing ones
- Database schema changes (entity modifications, new entities)
- Authentication/authorization changes
- Integration with external services
- Performance-critical algorithm changes

**Technology Stack**:
- Adding new dependencies to package.json
- Upgrading major versions of existing dependencies
- Changing build configurations (mta.yaml, tsconfig.json)
- Modifying deployment configurations

**Security & Compliance**:
- Changes to xs-security.json
- Authentication flow modifications
- Data access pattern changes
- Audit logging modifications

**Business Logic**:
- New business rules or validation logic
- Changes to existing business processes
- Data transformation logic modifications
- Email notification logic changes

#### MINOR CHANGES - Fast Track Approval

These changes can proceed with abbreviated approval:

**Code Quality**:
- Bug fixes that don't change business logic
- Code formatting and style improvements
- Adding code comments or JSDoc
- Refactoring without functional changes

**Testing**:
- Adding new test cases
- Improving existing test coverage
- Test configuration adjustments

**Documentation**:
- Updating README files
- Adding code examples
- Clarifying existing documentation

**Maintenance**:
- Updating log messages
- Error message improvements
- Performance monitoring additions

### Approval Response Format

The Governance Agent will respond with one of these statuses:

```
APPROVAL RESPONSE
=================

STATUS: [APPROVED | REJECTED | CONDITIONAL]
REQUEST ID: [Unique identifier]
REVIEWED BY: Project Governance & Compliance Agent
DATE: [ISO date]

DECISION RATIONALE:
[Detailed explanation of the decision]

REQUIREMENTS: (if CONDITIONAL)
[Specific conditions that must be met]

MONITORING REQUIREMENTS:
[Any special monitoring needed post-implementation]

APPROVAL REFERENCE: [Reference for commit messages]
```

### Implementation Workflow

**Step 1**: Agent submits approval request
**Step 2**: Governance agent validates against project rules
**Step 3**: Response provided (APPROVED/REJECTED/CONDITIONAL)
**Step 4**: Agent implements changes (if approved)
**Step 5**: Agent provides implementation confirmation

### Fast Track Process (Minor Changes)

For minor changes, agents can use this abbreviated format:

```
FAST TRACK APPROVAL
===================

AGENT: [Agent Name]
CHANGE TYPE: [BUG_FIX | DOCUMENTATION | TEST | REFACTOR]
FILES: [List of files]
DESCRIPTION: [One-line description]
COMPLIANCE: [Confirm no rules violated]
```

### Post-Implementation Requirements

After implementing approved changes:

1. **Commit Message Format** - Include approval reference:
```
<type>: <description>

Approved by: Project Governance & Compliance Agent
Approval Ref: [Reference from approval response]
Changes implemented per governance approval

[details]
```

2. **Confirmation Report** - Submit after implementation:
```
IMPLEMENTATION COMPLETE
=======================

APPROVAL REF: [Reference]
STATUS: [COMPLETED | PARTIAL | BLOCKED]
DEVIATIONS: [Any deviations from approved plan]
TESTING STATUS: [Test results]
ROLLBACK TESTED: [Y/N]
```

### Emergency Override Process

**CRITICAL SITUATIONS ONLY** - Use when immediate action required:

1. Security vulnerabilities requiring immediate patching
2. Production system failures
3. Data loss prevention

**Emergency Procedure**:
1. Implement critical fix immediately
2. Submit emergency approval request within 4 hours
3. Provide detailed post-incident report
4. Plan follow-up compliance review

### Violation Consequences

**Non-compliance penalties**:
- **First violation**: Warning and mandatory review
- **Second violation**: All future changes require enhanced approval
- **Third violation**: Agent restricted from autonomous changes

### Monitoring and Auditing

**Tracking Requirements**:
- All approval requests logged with timestamps
- Implementation status tracked
- Compliance metrics monitored
- Monthly governance reviews conducted

## Implementation in Practice

### Agent System Integration

To implement this workflow with the available agent system:

**For Code Generation Agents**:
```
1. Before generating any code:
   - Submit approval request
   - Wait for governance response
   - Implement only if approved

2. Include governance reference in all outputs
3. Provide implementation confirmation
```

**For Configuration Agents**:
```
1. Configuration changes require approval
2. Use fast track for minor adjustments
3. Always validate against security rules
```

**For Testing Agents**:
```
1. Test additions usually fast track
2. Test configuration changes need full approval
3. Coverage requirements must be maintained
```

### Practical Implementation Steps

**Phase 1**: Immediate Implementation
- All agents begin using approval requests
- Governance agent responds within reasonable timeframes
- Emergency procedures available for critical issues

**Phase 2**: Automation Enhancement
- Integrate approval workflow with CI/CD
- Automated compliance checking
- Approval tracking dashboard

**Phase 3**: Advanced Governance
- Predictive compliance analysis
- Automated fast track approvals for qualified changes
- Integration with project management tools

### Governance Agent Responsibilities

**Primary Functions**:
1. Review all approval requests against established rules
2. Provide clear, actionable responses
3. Track compliance metrics and patterns
4. Update rules based on project evolution
5. Conduct regular governance reviews

**Response Time Commitments**:
- CRITICAL requests: Immediate response
- HIGH priority: Within 1 hour
- MEDIUM priority: Within 4 hours  
- LOW priority: Within 24 hours
- Fast track: Within 30 minutes

## Compliance Validation Checklist

Before any code changes are approved, verify:

### Technology Compliance
- [ ] All dependencies are from approved list
- [ ] No forbidden libraries introduced
- [ ] Version constraints properly defined
- [ ] Security vulnerabilities addressed

### Code Standards Compliance
- [ ] TypeScript compilation passes
- [ ] Code follows naming conventions
- [ ] Proper error handling implemented
- [ ] Documentation updated

### Testing Compliance
- [ ] Test coverage meets 70% threshold
- [ ] All test types present (unit, integration, e2e)
- [ ] Tests pass in CI environment
- [ ] No external dependencies in unit tests

### Security Compliance
- [ ] Authentication properly configured
- [ ] Authorization rules enforced
- [ ] Audit logging implemented
- [ ] No credentials in code

### Deployment Compliance
- [ ] MTA configuration valid
- [ ] Build process completes successfully
- [ ] Environment configurations proper
- [ ] Health checks respond correctly

### Documentation Compliance
- [ ] Code documentation present
- [ ] API documentation updated
- [ ] Deployment guide current
- [ ] Test engineer guide updated

---

## Rule Enforcement

**STATUS MEANINGS**:
- **APPROVED**: Change complies with all applicable rules and may proceed
- **REJECTED**: Change violates one or more rules and must be modified before resubmission
- **CONDITIONAL**: Change requires specific modifications to comply before implementation

**MANDATORY APPROVAL PROCESS**: As of January 2025, all agents MUST follow the approval workflow defined in Section 11. No exceptions.

**ESCALATION**: Major architectural changes, rule exceptions, or conflicts between agents require approval from the project governance committee.

**RULE UPDATES**: This document is updated when new patterns emerge or technology requirements change. All changes are tracked with timestamps and rationale. The approval workflow ensures all agents are notified of rule changes.

**COMPLIANCE MONITORING**: The governance agent continuously monitors all changes for compliance and maintains metrics on approval patterns, violations, and overall project health.

---

**Last Modified**: January 2025 - Agent Approval Workflow Implementation  
**Version**: 2.0  
**Approved By**: Project Governance & Compliance Agent  
**Major Changes**: Added mandatory agent approval workflow (Section 11) with comprehensive templates and implementation guidelines