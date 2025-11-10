# ShiftBook - SAP CAP Shift Management Service

## Table of Contents
- [Business Purpose](#business-purpose)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
  - [Backend Architecture](#backend-architecture)
  - [Frontend Architecture](#frontend-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Security](#security)
- [Governance & Compliance](#governance--compliance)

---

## Business Purpose

ShiftBook is an enterprise-grade shift management and communication system designed for SAP Digital Manufacturing Environment (DME). It provides a comprehensive solution for managing shift logs, categories, and communications across multiple work centers and plants (werks).

### Key Business Features

- **Shift Log Management**: Create, read, update, and track shift logs with rich metadata including shop orders, work centers, and timestamps
- **Category Management**: Organize logs into configurable categories with multilingual support (English, German, Spanish, French, Italian, Portuguese)
- **Multi-Channel Notifications**: Automated email and Microsoft Teams notifications based on category configuration
- **Work Center Routing**: Smart distribution of logs to destination work centers with read/unread tracking
- **Audit Trail**: Comprehensive audit logging for compliance and traceability
- **Role-Based Access Control**: Granular permissions with Operator and Administrator roles
- **Multi-Tenant Support**: Isolated data per plant (werks) for enterprise-wide deployment

### Use Cases

- Shift handover documentation and communication
- Production issue tracking and escalation
- Cross-shift knowledge transfer
- Maintenance and quality incident logging
- Real-time notifications to relevant work centers and stakeholders

---

## Technology Stack

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **SAP Cloud Application Programming Model (CAP)** | ^9.2.0 | Core framework for service development |
| **Node.js** | ^18.x | JavaScript runtime |
| **TypeScript** | ^5.8.3 | Type-safe development |
| **SAP HANA Cloud** | Latest | Production database (HDI containers) |
| **SQLite** | ^2.0.2 | Development and testing database |
| **Express** | ^4.x | HTTP server framework |
| **XSUAA** | ^4.x | Authentication and authorization |

### Key Libraries

- **@cap-js/hana**: HANA database integration
- **@sap/cds-mtxs**: Multi-tenancy and extensibility
- **@sap-cloud-sdk**: SAP Cloud SDK for connectivity
- **nodemailer**: Email service integration
- **winston**: Structured logging with daily rotation
- **axios**: HTTP client for external services
- **passport**: Authentication middleware
- **handlebars**: Email template engine

### Development Tools

- **Jest**: Unit, integration, and E2E testing
- **TypeScript**: Static type checking
- **ESLint**: Code linting
- **ts-jest**: TypeScript support for Jest
- **@cap-js/cds-typer**: Type generation from CDS models

### Cloud Platform

- **SAP Business Technology Platform (BTP)**
- **Cloud Foundry Runtime**
- **XSUAA Service**: User authentication
- **Destination Service**: External system connectivity
- **SAP HANA Cloud**: Database service

---

## Architecture

### Backend Architecture

ShiftBook follows a layered architecture based on SAP CAP best practices:

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (OData V4)                      │
│              /shiftbook/ShiftBookService                     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer (CAP)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ ShiftBook    │  │ Category     │  │ Notification    │  │
│  │ Service      │  │ Management   │  │ Service         │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Validators   │  │ Email        │  │ Teams           │  │
│  │              │  │ Service      │  │ Integration     │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Query        │  │ Performance  │  │ Circuit         │  │
│  │ Optimizer    │  │ Monitor      │  │ Breaker         │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Middleware Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Auth         │  │ Logging      │  │ Error           │  │
│  │ Middleware   │  │ Middleware   │  │ Handler         │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Language     │  │ Audit        │                        │
│  │ Detector     │  │ Logger       │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Data Access Layer                          │
│              CDS Database Abstraction                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Connection   │  │ Pool         │  │ Query           │  │
│  │ Manager      │  │ Monitor      │  │ Service         │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
│     SAP HANA Cloud (Production) / SQLite (Development)       │
└─────────────────────────────────────────────────────────────┘
```

#### Key Backend Components

1. **Service Layer** (`srv/shiftbook-service.ts`)
   - OData V4 service implementation
   - Business actions and functions
   - Authorization enforcement

2. **Business Logic** (`srv/lib/`)
   - `business-validator.ts`: Input validation and business rules
   - `email-service.ts`: Multi-channel email delivery
   - `email-templates.ts`: Handlebars-based templating
   - `optimized-query-service.ts`: Query optimization and caching

3. **Middleware** (`srv/lib/`)
   - `auth-logger.ts`: Authentication tracking
   - `auth-monitor.ts`: Security monitoring
   - `logging-middleware.ts`: Request/response logging
   - `language-middleware.ts`: I18n support
   - `error-handler.ts`: Centralized error handling

4. **Monitoring & Resilience** (`srv/lib/`)
   - `performance-monitor.ts`: Performance metrics
   - `connection-pool-monitor.ts`: Database connection tracking
   - `circuit-breaker.ts`: External service protection
   - `audit-logger.ts`: Compliance logging

5. **Data Model** (`db/schema.cds`)
   - `ShiftBookLog`: Core shift log entity
   - `ShiftBookCategory`: Category configuration
   - `ShiftBookCategoryLng`: Translations
   - `ShiftBookCategoryMail`: Email recipients
   - `ShiftBookCategoryWC`: Work center assignments
   - `ShiftBookLogWC`: Log-to-workcenter relationships
   - `ShiftBookTeamsChannel`: Teams integration
   - `AuditLog`: Audit trail

### Frontend Architecture

The frontend is designed for SAP Fiori integration, typically deployed as SAP Fiori Elements or custom UI5 applications.

```
┌─────────────────────────────────────────────────────────────┐
│                   SAP Fiori Launchpad                        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   UI5 Applications                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Shift Log    │  │ Category     │  │ Reports &       │  │
│  │ Management   │  │ Admin        │  │ Analytics       │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   OData V4 Client                            │
│              (@sap-cloud-sdk/http-client)                    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   ShiftBook CAP Service                      │
│              /shiftbook/ShiftBookService                     │
└─────────────────────────────────────────────────────────────┘
```

#### Frontend Integration Points

- **OData V4 Service**: Full CRUD operations via `/shiftbook/ShiftBookService`
- **Custom Actions**: Batch operations, advanced search, pagination
- **Authentication**: XSUAA-based SSO integration
- **I18n**: Multilingual support via service-side translations

---

## Project Structure

```
shift-book/
├── db/                              # Database models and artifacts
│   ├── schema.cds                   # Core data model definitions
│   ├── data/                        # Initial/test data
│   │   ├── dev/                     # Development seed data
│   │   └── backup/                  # Data backups
│   ├── src/                         # Database procedures/functions
│   └── package.json                 # Database deployer config
│
├── srv/                             # Service layer
│   ├── shiftbook-service.cds        # Service definitions
│   ├── ShiftBookService.ts          # Service implementation #1 (must sync!)
│   ├── shiftbook-service.ts         # Service implementation #2 (must sync!)
│   ├── server.js                    # Custom Express server
│   ├── health-check.ts              # Health check endpoints
│   └── lib/                         # Business logic libraries
│       ├── audit-logger.ts          # Audit logging
│       ├── auth-logger.ts           # Authentication logging
│       ├── auth-monitor.ts          # Security monitoring
│       ├── business-validator.ts    # Validation rules
│       ├── circuit-breaker.ts       # Resilience patterns
│       ├── connection-pool-monitor.ts
│       ├── database-connection.ts   # DB utilities
│       ├── email-service.ts         # Email delivery
│       ├── email-templates.ts       # Email templating
│       ├── error-handler.ts         # Error handling
│       ├── error-messages.ts        # Error message catalog
│       ├── language-detector.ts     # I18n detection
│       ├── language-middleware.ts   # I18n middleware
│       ├── logging-middleware.ts    # Request logging
│       ├── optimized-query-service.ts
│       └── performance-monitor.ts
│
├── test/                            # Test suites
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   ├── e2e/                         # End-to-end tests
│   ├── service/                     # Service layer tests
│   ├── workflow/                    # Workflow tests
│   ├── fixtures/                    # Test data
│   ├── utils/                       # Test utilities
│   └── README.md                    # Testing documentation
│
├── _i18n/                           # Internationalization
│   ├── en.json                      # English translations
│   ├── de.json                      # German translations
│   ├── es.json                      # Spanish translations
│   ├── fr.json                      # French translations
│   ├── it.json                      # Italian translations
│   └── pt.json                      # Portuguese translations
│
├── config/                          # Configuration files
│   ├── auth/                        # Auth configurations
│   └── database.js                  # Database configurations
│
├── scripts/                         # Utility scripts
│   ├── setup-dev-data.js            # Development data setup
│   ├── generate-coverage-report.js  # Test coverage reporting
│   ├── test-connection-pool.js      # Connection pool testing
│   ├── test-performance-monitoring.js
│   └── test-structured-logging.js
│
├── __frontend/                      # Frontend placeholder
│   └── xs.security.json             # Frontend security config
│
├── .taskmaster/                     # Project documentation and governance
├── docs/                            # Additional documentation
├── coverage-reports/                # Test coverage reports
├── performance-reports/             # Performance metrics
│
├── .env.example                     # Environment template
├── package.json                     # Node.js dependencies
├── tsconfig.json                    # TypeScript configuration
├── jest.config.js                   # Jest test configuration
├── eslint.config.mjs                # ESLint configuration
├── mta.yaml                         # MTA deployment descriptor
├── manifest.yml                     # Cloud Foundry manifest
├── xs-security.json                 # XSUAA security configuration
├── docs/
│   ├── CHANGELOG.md                 # Version history
│   ├── CONTRIBUTING.md              # Contribution guidelines
│   └── DESTINATION_CONFIG.md        # Destination configuration guide
└── LICENSE                          # License information
```

---

## Getting Started

### Prerequisites

Before setting up the ShiftBook application, ensure you have the following installed:

#### Required Software

| Software | Minimum Version | Purpose |
|----------|----------------|---------|
| **Node.js** | 18.x or higher | JavaScript runtime |
| **npm** | 8.x or higher | Package manager |
| **@sap/cds-dk** | 9.x | SAP CAP development toolkit |
| **Cloud Foundry CLI** | Latest | BTP deployment (production) |
| **MBT** | Latest | Multi-target application build tool |
| **Git** | Latest | Version control |

#### Optional Software (for specific scenarios)

- **SQLite3**: For local database inspection (pre-installed on macOS/Linux)
- **SAP HANA Client**: For direct HANA database access
- **Docker**: For containerized development (optional)

#### SAP BTP Services (for production deployment)

- SAP HANA Cloud instance
- XSUAA service instance
- Destination service instance
- Cloud Foundry space with appropriate quotas

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/syntax-gbi/shift-book-1.git
cd shift-book
```

#### 2. Install Dependencies

```bash
npm install
```

This will install all required Node.js dependencies including:
- SAP CAP framework
- TypeScript compiler
- Testing frameworks
- Business logic libraries

#### 3. Install SAP CDS Development Kit (if not already installed)

```bash
npm install -g @sap/cds-dk
```

Verify installation:
```bash
cds version
```

#### 4. Install Cloud Foundry CLI (for BTP deployment)

Follow the [Cloud Foundry CLI installation guide](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html) for your operating system.

#### 5. Install MBT Build Tool (for MTA deployment)

```bash
npm install -g mbt
```

### Database Setup

ShiftBook supports multiple database configurations depending on the environment.

#### Development Environment (SQLite)

SQLite is used for local development with minimal setup required.

##### 1. Initialize Development Database

```bash
npm run setup:dev-data
```

This script will:
- Create the SQLite database file at `db/shiftbook-dev.db`
- Deploy the schema
- Load initial seed data from `db/data/dev/`

##### 2. Deploy Database Schema

```bash
npm run db:deploy:dev
```

This executes `cds deploy` with development-specific configuration.

##### 3. Verify Database

```bash
sqlite3 db/shiftbook-dev.db ".tables"
```

You should see the following tables:
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookLog`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategory`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategoryMail`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategoryLng`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategoryWC`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookLogWC`
- `syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookTeamsChannel`
- `syntax_gbi_sap_dme_plugins_shiftbook_AuditLog`

#### Test Environment (In-Memory SQLite)

For testing, an in-memory SQLite database is used:

```bash
npm run db:deploy:test
```

This is automatically handled by the test framework.

#### Hybrid Environment (SAP HANA Cloud)

Hybrid mode connects to SAP HANA Cloud while running locally.

##### Prerequisites
- SAP HANA Cloud instance provisioned
- Service key created for HDI container
- Credentials configured in `cds.env.json`

##### 1. Create Service Key

```bash
cf create-service-key shiftbook-db shiftbook-db-key
cf service-key shiftbook-db shiftbook-db-key
```

##### 2. Configure Local Environment

Create or update `cds.env.json`:

```json
{
  "requires": {
    "db": {
      "kind": "hana",
      "credentials": {
        "host": "<hana-host>",
        "port": "<hana-port>",
        "user": "<user>",
        "password": "<password>",
        "schema": "<schema>",
        "encrypt": true
      }
    }
  }
}
```

##### 3. Deploy to HANA

```bash
npm run db:deploy:hybrid
```

#### Production Environment (SAP HANA Cloud on BTP)

Production deployment is handled through the MTA build and deployment process.

```bash
npm run build:mta
cf deploy mta_archives/shiftbook_1.0.0.mtar
```

The database deployer module (`shiftbook-db-deployer`) will automatically:
1. Create the HDI container
2. Deploy all schema objects
3. Create database artifacts
4. Set up necessary permissions

### Running the Application

#### Development Mode (with hot reload)

```bash
npm run dev
```

This will:
- Set up development data
- Start the CAP server with `cds watch`
- Enable hot reload on file changes
- Use SQLite database
- Use dummy authentication
- Start on `http://localhost:4004`

Access the service:
- **Service root**: http://localhost:4004
- **Service metadata**: http://localhost:4004/shiftbook/ShiftBookService/$metadata
- **Health check**: http://localhost:4004/health
- **Fiori preview**: http://localhost:4004/fiori.html

#### Production Mode (local)

```bash
npm run prod
```

This simulates production configuration locally:
- Production environment variables
- Optimized performance settings
- Structured JSON logging

#### Hybrid Mode (local + HANA Cloud)

```bash
npm run hybrid
```

Run locally but connect to SAP HANA Cloud database.

#### Test Mode

```bash
npm run dev:test
```

Run with test-specific configuration and in-memory database.

---

## Development

### Development Workflow

⚠️ **Important**: When modifying service implementations, remember to update BOTH:
- `srv/ShiftBookService.ts` 
- `srv/shiftbook-service.ts`

See `docs/CONTRIBUTING.md` for details on this critical requirement.

1. **Make Changes**: Edit TypeScript files in `srv/` or CDS files in `db/` or `srv/`
2. **Update Both Files**: If changing service logic, update both implementation files
3. **Hot Reload**: Changes are automatically detected in development mode
4. **Type Safety**: Run TypeScript compiler:
   ```bash
   npm run build:ts
   ```
5. **Linting**: Check code quality:
   ```bash
   npm run lint
   ```

### Available Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Start production server |
| `npm run dev` | Development mode with hot reload |
| `npm run watch` | Watch mode (alternative to dev) |
| `npm run build` | Full production build |
| `npm run build:dev` | Development build |
| `npm run build:ts` | Compile TypeScript only |
| `npm run build:mta` | Build MTA archive for deployment |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:coverage` | Generate coverage report |

### Working with TypeScript

The project uses TypeScript for type safety. Generated types from CDS models are available:

```typescript
import { ShiftBookLog, ShiftBookCategory } from '#cds-models/syntax.gbi.sap.dme.plugins.shiftbook';
```

Regenerate types after CDS model changes:

```bash
cds build
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=4004
NODE_ENV=development
CDS_ENV=development

# Database
DB_KIND=sqlite
DB_URL=db/shiftbook-dev.db

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Email Service (optional for development)
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your-email@example.com
MAIL_PASSWORD=your-password
MAIL_FROM=noreply@example.com

# Authentication (for hybrid/production)
XSUAA_URL=
XSUAA_CLIENTID=
XSUAA_CLIENTSECRET=
```

---

## Testing

ShiftBook includes comprehensive test coverage across multiple levels.

### Test Structure

```
test/
├── unit/                 # Fast, isolated unit tests
├── integration/          # Integration tests with database
├── e2e/                  # End-to-end workflow tests
├── service/              # Service layer tests
└── workflow/             # Business workflow tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage

# Watch mode for TDD
npm run test:watch

# Clean Jest cache
npm run test:clean
```

### Test Configuration

Tests use Jest with the following configurations:
- `jest.config.js`: Main configuration
- `jest.integration.config.js`: Integration tests
- `jest.e2e.config.js`: E2E tests
- `jest.debug.config.js`: Debugging configuration

### Test Coverage Requirements

- **Minimum 70% code coverage** across all test types
- Unit tests must not have external dependencies
- Integration tests should use test database
- E2E tests should cover critical business workflows

### Writing Tests

Example unit test:

```typescript
import cds from '@sap/cds';

describe('ShiftBookService', () => {
  let service: any;

  beforeAll(async () => {
    service = await cds.connect.to('ShiftBookService');
  });

  test('should create shift log', async () => {
    const result = await service.addShiftBookEntry({
      werks: '1000',
      shoporder: 'SO123',
      workcenter: 'WC001',
      category: 'category-uuid',
      subject: 'Test Log',
      message: 'Test Message'
    });
    
    expect(result).toBeDefined();
    expect(result.guid).toBeDefined();
  });
});
```

---

## Deployment

### Cloud Foundry Deployment

#### 1. Build MTA Archive

```bash
npm run build:mta
```

This creates `mta_archives/shiftbook_1.0.0.mtar`.

#### 2. Login to Cloud Foundry

```bash
cf login -a <api-endpoint> -o <org> -s <space>
```

#### 3. Deploy Application

```bash
npm run deploy
```

Or manually:

```bash
cf deploy mta_archives/shiftbook_1.0.0.mtar --retries 1
```

#### 4. Verify Deployment

```bash
cf apps
cf services
```

Check health:

```bash
npm run health:check:prod
```

### Undeploy Application

```bash
npm run undeploy
```

This will:
- Delete the application
- Delete service instances
- Delete service keys

### Multi-Target Application (MTA) Structure

The `mta.yaml` defines:

**Modules:**
- `shiftbook-srv`: Node.js application module
- `shiftbook-db-deployer`: HDI database deployer

**Resources:**
- `shiftbook-db`: SAP HANA HDI container
- `shiftbook-auth`: XSUAA service instance
- `shiftbook-destination`: Destination service
- `shiftbook-config`: Configuration service

### Environment-Specific Deployments

ShiftBook can be deployed to multiple spaces (dev, test, prod):

```bash
# Development
cf target -s dev
cf deploy mta_archives/shiftbook_1.0.0.mtar

# Test
cf target -s test
cf deploy mta_archives/shiftbook_1.0.0.mtar

# Production
cf target -s prod
cf deploy mta_archives/shiftbook_1.0.0.mtar
```

---

## Configuration

### CDS Configuration

Configuration is managed through `package.json` under the `cds` section.

#### Database Configuration

```json
{
  "cds": {
    "requires": {
      "db": {
        "[development]": {
          "kind": "sqlite",
          "credentials": { "url": "db/shiftbook-dev.db" }
        },
        "[production]": {
          "kind": "hana",
          "pool": {
            "min": 20,
            "max": 100
          }
        }
      }
    }
  }
}
```

#### Authentication Configuration

```json
{
  "cds": {
    "requires": {
      "auth": {
        "[development]": {
          "kind": "dummy",
          "users": {
            "admin": { "roles": ["admin", "operator"] }
          }
        },
        "[production]": {
          "kind": "xsuaa"
        }
      }
    }
  }
}
```

#### Logging Configuration

```json
{
  "cds": {
    "log": {
      "levels": {
        "shiftbook": "info",
        "shiftbook.db": "debug",
        "shiftbook.perf": "info"
      },
      "format": "json"
    }
  }
}
```

#### Internationalization

```json
{
  "cds": {
    "i18n": {
      "folders": ["_i18n"],
      "default_language": "en",
      "supported_languages": ["en", "de", "es", "fr", "it", "pt"]
    }
  }
}
```

### Service Configuration

#### Email Service

Configure in environment or destination service:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=ShiftBook <noreply@yourcompany.com>
```

#### Microsoft Teams Integration

Configure webhook URLs in category settings through the API or admin UI.

### Performance Tuning

Connection pool settings in `package.json`:

```json
{
  "cds": {
    "requires": {
      "db": {
        "[production]": {
          "pool": {
            "min": 20,
            "max": 100,
            "acquireTimeoutMillis": 5000,
            "idleTimeoutMillis": 180000
          }
        }
      }
    }
  }
}
```

---

## Security

### Authentication & Authorization

ShiftBook uses **SAP XSUAA** (Extended Services for User Account and Authentication) for secure access control.

#### Roles

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Operator** | Read categories, Create/Read logs | Regular shift workers |
| **Admin** | Full CRUD access | System administrators |

#### Authorization Model

Defined in `xs-security.json`:

```json
{
  "xsappname": "shiftbook-srv",
  "tenant-mode": "dedicated",
  "scopes": [
    { "name": "$XSAPPNAME.operator", "description": "Operator role" },
    { "name": "$XSAPPNAME.admin", "description": "Admin role" }
  ],
  "role-templates": [
    { "name": "operator", "scope-references": ["$XSAPPNAME.operator"] },
    { "name": "admin", "scope-references": ["$XSAPPNAME.admin"] }
  ]
}
```

#### Service-Level Authorization

Enforced through `@restrict` annotations in `srv/shiftbook-service.cds`:

```cds
@restrict: [
  { grant: 'READ', to: 'operator' },
  { grant: ['*'], to: 'admin' }
]
entity ShiftBookLog as projection on db.ShiftBookLog;
```

### Security Features

1. **Audit Logging**: All operations logged to `AuditLog` entity
2. **Authentication Monitoring**: Real-time auth event tracking
3. **Circuit Breaker**: Protection against cascading failures
4. **Input Validation**: Comprehensive business rule validation
5. **SQL Injection Prevention**: Parameterized queries via CDS
6. **XSS Prevention**: Output encoding and sanitization
7. **CSRF Protection**: Token-based CSRF protection

### Secure Communication

- **TLS/SSL**: All production traffic encrypted
- **Token Validation**: JWT token validation on every request
- **Token Expiry**: Configurable token validity (default: 2 hours)
- **Refresh Tokens**: Long-lived refresh tokens (default: 24 hours)

### Data Privacy

- **Tenant Isolation**: Multi-tenant data isolation via `werks` field
- **Audit Trail**: Immutable audit logs for compliance
- **Personal Data Handling**: User IDs tracked for GDPR compliance
- **Data Encryption**: Encryption at rest in SAP HANA Cloud

---

## Governance & Compliance

### Project Governance

ShiftBook follows strict governance rules defined in `.claude-code/project-rules.md`. Key compliance requirements:

#### Technology Standards

- **Approved Technologies Only**: Only technologies listed in the project rules are permitted
- **Version Control**: Dependencies use caret (^) ranges; major updates require governance approval
- **Security First**: Security updates take precedence over version constraints

#### Code Quality Standards

- **Minimum 70% Test Coverage**: All code changes must maintain or improve test coverage
- **TypeScript Required**: All business logic must be implemented in TypeScript
- **Type Safety**: Avoid `any` type; use proper TypeScript interfaces
- **Documentation**: JSDoc comments required for all public functions

#### File Synchronization

⚠️ **Critical Requirement**: When modifying service implementations:
- Both `srv/ShiftBookService.ts` and `srv/shiftbook-service.ts` must be updated
- Business logic must be identical in both files
- See `docs/CONTRIBUTING.md` for detailed synchronization workflow

#### Testing Requirements

- **Unit Tests**: Must have no external dependencies
- **Integration Tests**: Must use test database (SQLite in-memory)
- **E2E Tests**: Must cover critical business workflows
- **CI/CD**: All tests must pass before deployment

#### Security Compliance

- **Authentication**: XSUAA in production, mock/dummy in development
- **Authorization**: Role-based access control enforced at service level
- **Audit Logging**: All critical operations must be logged
- **No Credentials in Code**: All credentials via environment variables or BTP services

#### Deployment Standards

- **MTA Descriptor**: All deployment via `mta.yaml`
- **Health Checks**: All deployed services must respond to `/health` endpoint
- **Environment Isolation**: Separate configurations for dev, test, and production

### Compliance Validation

Before submitting changes, ensure:

- [ ] All approved technologies and dependencies used
- [ ] TypeScript compilation passes without errors
- [ ] Minimum 70% test coverage maintained
- [ ] Both service implementation files synchronized (if applicable)
- [ ] All tests pass (unit, integration, E2E)
- [ ] Security best practices followed
- [ ] Documentation updated
- [ ] No credentials or secrets in code

For detailed governance rules and approval workflows, see `.claude-code/project-rules.md`.

---

## Health Monitoring

ShiftBook includes comprehensive health check endpoints:

```bash
# Local health check
curl http://localhost:4004/health

# Detailed health information
curl http://localhost:4004/health/simple
```

Health check scripts:

```bash
npm run health:check:local      # Local development
npm run health:check:dev        # Development environment
npm run health:check:prod       # Production environment
```

---

## Support & Contribution

- **Issues**: Report issues via the repository issue tracker
- **Documentation**: See `docs/` folder for detailed documentation
- **Contributing**: See `docs/CONTRIBUTING.md` for contribution guidelines
- **Changelog**: See `docs/CHANGELOG.md` for version history

### ⚠️ Important for Contributors

**Critical: Duplicate Implementation Files**

The ShiftBook service has **TWO implementation files that must be kept in sync**:
- `srv/ShiftBookService.ts` (uppercase S)
- `srv/shiftbook-service.ts` (lowercase s)

When making ANY changes to service handlers or business logic, you **MUST update BOTH files**. See `docs/CONTRIBUTING.md` for detailed guidelines on this requirement and proper workflow.

---

## License

See [LICENSE](LICENSE) file for details.

---

## Additional Resources

- [SAP Cloud Application Programming Model](https://cap.cloud.sap/)
- [SAP Business Technology Platform](https://www.sap.com/products/business-technology-platform.html)
- [SAP HANA Cloud](https://www.sap.com/products/technology-platform/hana.html)
- [SAP Fiori Design Guidelines](https://experience.sap.com/fiori-design/)
- [Cloud Foundry Documentation](https://docs.cloudfoundry.org/)

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Maintained by**: Syntax GBI - SAP Development Team
