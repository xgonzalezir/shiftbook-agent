# Legacy Scripts Directory

This directory contains scripts that were previously used but are **not aligned with modern CAP 9.2.0 patterns**. These scripts have been moved here because CAP 9.2.0 provides built-in alternatives for most of their functionality.

## 📋 **Moved Scripts**

### **`mock-jwt-generator.js`**
- **Original Location:** `scripts/mock-jwt-generator.js`
- **Move Date:** August 11, 2025
- **Reason for Move:** Manual JWT generation - CAP has built-in authentication testing
- **Original Purpose:** Generate realistic JWT tokens for testing
- **CAP Alternative:** Use `cds test` with built-in auth testing
- **Status:** ❌ **LEGACY** - Not CAP 9.2.0 aligned

### **`test-authentication-scenarios.js`**
- **Original Location:** `scripts/test-authentication-scenarios.js`
- **Move Date:** August 11, 2025
- **Reason for Move:** Custom authentication testing - CAP has integrated auth testing
- **Original Purpose:** Comprehensive authentication testing scenarios
- **CAP Alternative:** Use `cds test` with built-in authentication testing
- **Status:** ❌ **LEGACY** - Not CAP 9.2.0 aligned

### **`local-testing-helper.js`**
- **Original Location:** `scripts/local-testing-helper.js`
- **Move Date:** August 11, 2025
- **Reason for Move:** Interactive testing helper - CAP has `cds watch` and built-in testing
- **Original Purpose:** Interactive CLI for testing different user scenarios
- **CAP Alternative:** Use `cds watch` for development and `cds test` for testing
- **Status:** ❌ **LEGACY** - Not CAP 9.2.0 aligned

### **`monitor-auth-metrics.js`**
- **Original Location:** `scripts/monitor-auth-metrics.js`
- **Move Date:** August 11, 2025
- **Reason for Move:** Custom monitoring - CAP has built-in observability
- **Original Purpose:** Monitor authentication metrics and alerts
- **CAP Alternative:** Use CAP's built-in monitoring and metrics
- **Status:** ❌ **LEGACY** - Not CAP 9.2.0 aligned

### **`validate-production-auth.js`**
- **Original Location:** `scripts/validate-production-auth.js`
- **Move Date:** August 11, 2025
- **Reason for Move:** Custom validation - CAP has built-in deployment validation
- **Original Purpose:** Validate production authentication configuration
- **CAP Alternative:** Use `cds deploy` with built-in validation
- **Status:** ❌ **LEGACY** - Not CAP 9.2.0 aligned

### **`test-production-auth-validation.js`**
- **Original Location:** `scripts/test-production-auth-validation.js`
- **Move Date:** August 11, 2025
- **Reason for Move:** Custom testing - CAP has integrated testing framework
- **Original Purpose:** Test production authentication validation
- **CAP Alternative:** Use `cds test` with production configuration
- **Status:** ❌ **LEGACY** - Not CAP 9.2.0 aligned

### **`setup-dev-data.sh`**
- **Original Location:** `scripts/setup-dev-data.sh`
- **Move Date:** August 11, 2025
- **Reason for Move:** Simple shell script - CAP has `cds deploy --with-mocks`
- **Original Purpose:** Setup development environment data
- **CAP Alternative:** Use `cds deploy --with-mocks` for automatic test data
- **Status:** ❌ **LEGACY** - Not CAP 9.2.0 aligned

### **`manage-config-service.sh`**
- **Original Location:** `scripts/manage-config-service.sh`
- **Move Date:** August 11, 2025
- **Reason for Move:** Cloud Foundry specific - not CAP-native
- **Original Purpose:** Manage Cloud Foundry configuration services
- **CAP Alternative:** Use CAP's built-in configuration management
- **Status:** ❌ **LEGACY** - Not CAP 9.2.0 aligned

### **`setup-simple-roles.sh`**
- **Original Location:** `scripts/setup-simple-roles.sh`
- **Move Date:** August 11, 2025
- **Reason for Move:** No active references found in current project
- **Original Purpose:** Simple role setup script (likely outdated)
- **CAP Alternative:** Use CAP's built-in role management
- **Status:** ❌ **UNUSED** - No references found

## 🔍 **Script Analysis Results**

During the CAP 8.9.4 to 9.2.0 upgrade project, a comprehensive analysis was conducted:

- **Total Scripts Analyzed:** 12
- **CAP 9.2.0 Aligned:** 3 scripts (kept in main directory)
- **Moved to Legacy:** 9 scripts (non-CAP aligned)
- **Missing Scripts Referenced in Docs:** 4 deployment-related scripts

## 📚 **Current CAP 9.2.0 Scripts**

The following scripts remain in the main `scripts/` directory and are fully CAP 9.2.0 aligned:

### **CAP 9.2.0 Upgrade Scripts**
- `validation-checklist-executor.js` - CAP upgrade validation (uses `cds compile`, `cds deploy`)
- `performance-benchmark.js` - Performance benchmarking (CAP 9.2.0 specific)

### **CDS Configuration Testing**
- `test-database-config.js` - CDS configuration testing (uses `cds compile`)

## 🎯 **Why Scripts Were Moved to Legacy**

### **CAP 9.2.0 Alignment Principles:**
1. **Use built-in CAP commands** instead of custom solutions
2. **Follow modern CAP patterns** and best practices
3. **Leverage framework capabilities** instead of reinventing
4. **Maintain consistency** with CAP ecosystem

### **Specific Reasons for Moving:**
1. **Manual JWT generation** → CAP has built-in auth testing
2. **Custom authentication testing** → CAP has integrated auth testing
3. **Interactive testing helpers** → CAP has `cds watch` and built-in testing
4. **Custom monitoring** → CAP has built-in observability
5. **Custom validation** → CAP has built-in deployment validation
6. **Shell scripts** → CAP has `cds deploy --with-mocks`
7. **Cloud Foundry specific** → Not CAP-native

## 📚 **Modern CAP 9.2.0 Alternatives**

### **Instead of Legacy Scripts, Use:**
- **`cds watch`** - Built-in development server with hot reload
- **`cds deploy --with-mocks`** - Automatic test data generation
- **`cds test`** - Integrated testing framework
- **`cds build`** - Modern build system
- **Built-in authentication testing** - CAP's integrated auth testing
- **Built-in observability** - CAP's monitoring and metrics

## 🚀 **Next Steps**

1. **Review legacy scripts** for any critical functionality not covered by CAP
2. **Migrate workflows** to use CAP 9.2.0 built-in capabilities
3. **Update documentation** to reflect CAP-aligned approaches
4. **Consider removing** this legacy directory once migration is complete

---

**Last Updated:** August 11, 2025  
**Analysis Performed During:** CAP 8.9.4 to 9.2.0 Upgrade Project  
**Status:** All scripts moved to legacy for CAP 9.2.0 alignment
