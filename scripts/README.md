# Scripts Directory - CAP 9.2.0 Testing & Deployment Scripts

This directory contains scripts supporting the CAP 9.2.0 testing pyramid architecture and deployment processes.

## 🧪 **Testing Scripts (Aligned with Testing Pyramid)**

### **Unit Testing**
#### **`generate-coverage-report.js`**
- **Purpose:** Generate coverage reports for unit tests (business logic only)
- **Usage:** `node scripts/generate-coverage-report.js`
- **Testing Level:** Unit (srv/lib/*.ts)
- **Features:**
  - Focused on business logic modules (srv/lib/*.ts)
  - Generates HTML coverage reports for unit tests
  - Aligns with unit-test-only coverage philosophy
  - JSON summary reports for CI/CD integration
- **Status:** ✅ **ACTIVE** - Core unit testing coverage tool

### **Integration & HTTP Testing**
#### **`test-connection-pool.js`**
- **Purpose:** HTTP-based connection pool load testing
- **Usage:** `node scripts/test-connection-pool.js`
- **Testing Level:** HTTP Integration
- **Features:**
  - Concurrent HTTP request testing via Axios
  - Connection pool monitoring and metrics
  - Real server load testing scenarios
  - Performance metrics collection
  - Saves detailed test results to files
- **Status:** ✅ **ACTIVE** - Connection pool validation tool

#### **`smoke-test.js`**
- **Purpose:** HTTP-based service validation
- **Usage:** `node scripts/smoke-test.js`
- **Testing Level:** HTTP Integration
- **Features:**
  - Real HTTP requests to running server
  - CRUD operations and business logic validation
  - Authentication and error handling testing
  - Service health validation
- **Status:** ✅ **ACTIVE** - Service integration testing tool

#### **`test-quick.js`**
- **Purpose:** Fast HTTP endpoint validation
- **Usage:** `node scripts/test-quick.js`
- **Testing Level:** HTTP Integration
- **Features:**
  - Quick HTTP endpoint health checks
  - Basic service availability validation
  - Fast feedback for development
- **Status:** ✅ **ACTIVE** - Quick validation tool

### **Service Testing**
#### **`test-update-category-action.js`**
- **Purpose:** Comprehensive testing of updateCategoryWithDetails action
- **Usage:** `node scripts/test-update-category-action.js`
- **Testing Level:** Service/Workflow
- **Features:**
  - Complete business workflow testing
  - Category creation, update, and validation
  - Translation and email address management testing
  - Integration with getShiftbookCategories action
  - Detailed colored output and validation
- **Status:** ✅ **ACTIVE** - Business workflow testing tool
- **Documentation:** See `scripts/README-update-category-test.md`

#### **`test-update-category-curl.sh`**
- **Purpose:** Bash/curl version of category action testing
- **Usage:** `./scripts/test-update-category-curl.sh`
- **Testing Level:** Service/Workflow
- **Features:**
  - Shell script alternative for category testing
  - No Node.js dependencies
  - Basic curl-based validation
- **Status:** ✅ **ACTIVE** - Alternative workflow testing tool

#### **`test-database-config.js`**
- **Purpose:** CDS database configuration and connectivity testing
- **Usage:** `node scripts/test-database-config.js`
- **Testing Level:** Service/Workflow
- **Features:**
  - CDS configuration validation
  - Database connection testing
  - Model structure verification
  - Environment variable validation
- **Status:** ✅ **ACTIVE** - CDS configuration validation tool

## 🚀 **Deployment & Operations**

### **`deploy.sh`**
- **Purpose:** Multi-environment CAP application deployment
- **Usage:** `./scripts/deploy.sh [dev|test|prod] [--blue-green]`
- **Features:**
  - Cloud Foundry deployment automation
  - Blue-green deployment strategy (production)
  - Environment-specific configuration
  - Health check validation post-deployment
  - Integration with health-check.config.js
- **Status:** ✅ **ACTIVE** - Deployment automation tool

## 🔧 **Performance & Monitoring**

### **`performance-benchmark.js`**
- **Purpose:** CAP 9.2.0 performance baseline establishment
- **Usage:** `node scripts/performance-benchmark.js`
- **Features:**
  - Load testing scenarios (normal, peak, burst)
  - Database performance testing
  - Resource monitoring (memory, CPU, connections)
  - CAP 9.2.0 specific performance metrics
- **Status:** ✅ **ACTIVE** - Performance testing tool

### **Connection Pool Monitoring**
#### **`test-pool-monitoring.js`**
- **Purpose:** Connection pool health monitoring
- **Usage:** `node scripts/test-pool-monitoring.js`
- **Features:**
  - Real-time pool metrics collection
  - Connection lifecycle monitoring
  - Health status validation
- **Status:** ✅ **ACTIVE** - Pool monitoring tool

#### **`test-performance-monitoring.js`**
- **Purpose:** Application performance monitoring
- **Usage:** `node scripts/test-performance-monitoring.js`
- **Features:**
  - Performance metrics collection
  - Response time monitoring
  - Resource usage tracking
- **Status:** ✅ **ACTIVE** - Performance monitoring tool

### **Logging & Diagnostics**
#### **`test-structured-logging.js`**
- **Purpose:** Structured logging validation
- **Usage:** `node scripts/test-structured-logging.js`
- **Features:**
  - Log format validation
  - Structured log output testing
  - Log level configuration testing
- **Status:** ✅ **ACTIVE** - Logging validation tool

#### **`test-log-rotation.js`**
- **Purpose:** Log rotation mechanism testing
- **Usage:** `node scripts/test-log-rotation.js`
- **Features:**
  - Log rotation policy testing
  - File cleanup validation
  - Disk space management testing
- **Status:** ✅ **ACTIVE** - Log management tool

## 🧾 **Legacy Validation**

> **Note:** Validation artifacts have been removed as the CAP 8.9.4 to 9.2.0 upgrade is complete.

## 📁 **Directory Structure**

```
scripts/
├── README.md                           # This file (updated)
├── README-update-category-test.md      # updateCategoryWithDetails testing docs
├── deploy.sh                          # Multi-environment deployment
├── generate-coverage-report.js        # Unit test coverage generation
├── legacy/                            # Legacy/non-CAP scripts
│   ├── README.md                      # Legacy scripts documentation
│   ├── local-testing-helper.js        # Interactive testing (legacy)
│   ├── manage-config-service.sh       # Cloud Foundry specific (legacy)
│   ├── mock-jwt-generator.js          # Manual JWT generation (legacy)
│   ├── monitor-auth-metrics.js        # Custom monitoring (legacy)
│   ├── setup-dev-data.sh              # Simple shell script (legacy)
│   ├── setup-simple-roles.sh          # Unused script (legacy)
│   ├── test-authentication-scenarios.js # Custom auth testing (legacy)
│   ├── test-production-auth-validation.js # Custom testing (legacy)
│   └── validate-production-auth.js     # Custom validation (legacy)
├── performance-benchmark.js           # Performance baseline testing
├── results/                           # Test results directory (auto-created)
├── smoke-test.js                      # HTTP service integration testing
├── test-connection-pool.js            # HTTP connection pool load testing
├── test-database-config.js            # CDS configuration testing
├── test-log-rotation.js               # Log rotation mechanism testing
├── test-performance-monitoring.js     # Application performance monitoring
├── test-pool-monitoring.js            # Connection pool health monitoring
├── test-quick.js                      # Quick HTTP endpoint validation
├── test-structured-logging.js         # Structured logging validation
├── test-update-category-action.js     # Category action workflow testing
└── test-update-category-curl.sh       # Bash version category testing
```

## 🔍 **Script Analysis Summary**

- **Total Scripts:** 14 active scripts (updated count)
- **Testing Pyramid Aligned:** All scripts categorized by test layer
- **Coverage Areas:**
  - Unit testing (business logic coverage)
  - HTTP integration testing (service validation)  
  - Service workflow testing (business processes)
  - Performance & monitoring (load testing, metrics)
  - Deployment automation (multi-environment)

## 🚀 **Quick Start Commands**

### **Unit Testing & Coverage**
```bash
# Generate unit test coverage (business logic only)
node scripts/generate-coverage-report.js
```

### **HTTP Integration Testing**
```bash
# Quick endpoint validation
node scripts/test-quick.js

# Comprehensive service testing (server must be running)
npm start &
node scripts/smoke-test.js

# Connection pool load testing
node scripts/test-connection-pool.js
```

### **Service Workflow Testing**
```bash
# Test CDS database configuration
node scripts/test-database-config.js

# Test updateCategoryWithDetails action
node scripts/test-update-category-action.js

# Alternative bash version
./scripts/test-update-category-curl.sh
```

### **Performance & Monitoring**
```bash
# Performance benchmarks
node scripts/performance-benchmark.js

# Connection pool monitoring
node scripts/test-pool-monitoring.js

# Performance monitoring
node scripts/test-performance-monitoring.js
```

### **Deployment**
```bash
# Deploy to development
./scripts/deploy.sh dev

# Deploy to production with blue-green
./scripts/deploy.sh prod --blue-green
```


## 🎯 **Testing Pyramid Alignment**

### **Unit Tests (srv/lib/*.ts)**
- **Focus:** Business logic modules only
- **Coverage:** Yes - meaningful for isolated business logic
- **Scripts:** `generate-coverage-report.js`

### **HTTP Integration Tests**
- **Focus:** Real HTTP requests to running server
- **Coverage:** No - functional validation instead  
- **Scripts:** `smoke-test.js`, `test-connection-pool.js`, `test-quick.js`

### **Service/Workflow Tests**
- **Focus:** Complete business processes
- **Coverage:** No - workflow validation instead
- **Scripts:** `test-update-category-action.js`, `test-update-category-curl.sh`

### **Performance Tests**
- **Focus:** Load testing and performance baselines
- **Coverage:** No - performance metrics instead
- **Scripts:** `performance-benchmark.js`, monitoring scripts

## 📚 **Documentation References**

- **Testing Architecture:** `docs/testing/README.md`
- **Coverage Configuration:** `docs/testing/coverage-configuration.md`
- **Category Testing:** `scripts/README-update-category-test.md`
- **Development Guides:** `docs/development/README.md`

---

**Last Updated:** August 18, 2025  
**Status:** Scripts documentation updated for testing pyramid alignment  
**Coverage Philosophy:** Unit tests only (business logic focus)  
**Testing Approach:** HTTP-based integration and service workflow validation
