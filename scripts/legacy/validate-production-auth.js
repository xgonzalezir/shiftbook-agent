#!/usr/bin/env node

/**
 * Production Authentication Validation Script
 * Validates XSUAA configuration and authentication flow for production deployment
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class ProductionAuthValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    this.config = this.loadConfig();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'config', 'auth', 'production.js');
      if (fs.existsSync(configPath)) {
        return require(configPath);
      }
      return null;
    } catch (error) {
      this.log(`❌ Error loading config: ${error.message}`, 'red');
      return null;
    }
  }

  async runValidation() {
    this.log('\n🔐 Production Authentication Validation', 'bright');
    this.log('=====================================\n', 'bright');

    // Run all validation tests
    await this.validateXSUAAConfiguration();
    await this.validateAuthenticationFlow();
    await this.validateSecuritySettings();
    await this.validateMonitoringSetup();
    await this.validateErrorHandling();
    await this.validatePerformanceSettings();

    this.printResults();
  }

  async validateXSUAAConfiguration() {
    this.log('\n📋 Validating XSUAA Configuration...', 'blue');
    
    // Check xs-security.json
    const xsSecurityPath = path.join(__dirname, '..', 'xs-security.json');
    if (fs.existsSync(xsSecurityPath)) {
      try {
        const xsSecurity = JSON.parse(fs.readFileSync(xsSecurityPath, 'utf8'));
        this.addTest('XSUAA Security Descriptor', 'PASS', 'xs-security.json found and valid');
        
        // Validate required fields
        if (xsSecurity.xsappname) {
          this.addTest('XSUAA App Name', 'PASS', `App name: ${xsSecurity.xsappname}`);
        } else {
          this.addTest('XSUAA App Name', 'FAIL', 'xsappname is required');
        }

        if (xsSecurity.scopes && xsSecurity.scopes.length > 0) {
          this.addTest('XSUAA Scopes', 'PASS', `${xsSecurity.scopes.length} scopes defined`);
        } else {
          this.addTest('XSUAA Scopes', 'FAIL', 'At least one scope must be defined');
        }

        if (xsSecurity['role-templates'] && xsSecurity['role-templates'].length > 0) {
          this.addTest('XSUAA Role Templates', 'PASS', `${xsSecurity['role-templates'].length} role templates defined`);
        } else {
          this.addTest('XSUAA Role Templates', 'WARN', 'No role templates defined');
        }
      } catch (error) {
        this.addTest('XSUAA Security Descriptor', 'FAIL', `Invalid JSON: ${error.message}`);
      }
    } else {
      this.addTest('XSUAA Security Descriptor', 'FAIL', 'xs-security.json not found');
    }

    // Check mta.yaml for XSUAA service
    const mtaPath = path.join(__dirname, '..', 'mta.yaml');
    if (fs.existsSync(mtaPath)) {
      const mtaContent = fs.readFileSync(mtaPath, 'utf8');
      if (mtaContent.includes('xsuaa')) {
        this.addTest('MTA XSUAA Service', 'PASS', 'XSUAA service configured in mta.yaml');
      } else {
        this.addTest('MTA XSUAA Service', 'FAIL', 'XSUAA service not configured in mta.yaml');
      }
    } else {
      this.addTest('MTA XSUAA Service', 'WARN', 'mta.yaml not found');
    }
  }

  async validateAuthenticationFlow() {
    this.log('\n🔄 Validating Authentication Flow...', 'blue');
    
    // Check server.js authentication setup
    const serverPath = path.join(__dirname, '..', 'srv', 'server.js');
    if (fs.existsSync(serverPath)) {
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      if (serverContent.includes('xsuaa')) {
        this.addTest('Server XSUAA Setup', 'PASS', 'XSUAA authentication configured in server.js');
      } else {
        this.addTest('Server XSUAA Setup', 'FAIL', 'XSUAA authentication not configured in server.js');
      }

      if (serverContent.includes('@sap/xssec')) {
        this.addTest('XSUAA Library', 'PASS', '@sap/xssec library imported');
      } else {
        this.addTest('XSUAA Library', 'FAIL', '@sap/xssec library not imported');
      }

      if (serverContent.includes('JWTStrategy')) {
        this.addTest('JWT Strategy', 'PASS', 'JWT strategy configured');
      } else {
        this.addTest('JWT Strategy', 'WARN', 'JWT strategy not explicitly configured');
      }
    } else {
      this.addTest('Server Authentication', 'FAIL', 'server.js not found');
    }

    // Check package.json dependencies
    const packagePath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (dependencies['@sap/xssec']) {
        this.addTest('XSUAA Dependency', 'PASS', '@sap/xssec dependency installed');
      } else {
        this.addTest('XSUAA Dependency', 'FAIL', '@sap/xssec dependency not installed');
      }

      if (dependencies['passport']) {
        this.addTest('Passport Dependency', 'PASS', 'passport dependency installed');
      } else {
        this.addTest('Passport Dependency', 'FAIL', 'passport dependency not installed');
      }
    }
  }

  async validateSecuritySettings() {
    this.log('\n🔒 Validating Security Settings...', 'blue');
    
    if (this.config) {
      const auth = this.config.authentication;
      
      if (auth.security && auth.security.requireAuthentication) {
        this.addTest('Authentication Required', 'PASS', 'Authentication is required');
      } else {
        this.addTest('Authentication Required', 'FAIL', 'Authentication not required');
      }

      if (auth.security && auth.security.enableAuditLogging) {
        this.addTest('Audit Logging', 'PASS', 'Audit logging enabled');
      } else {
        this.addTest('Audit Logging', 'WARN', 'Audit logging not enabled');
      }

      if (auth.security && auth.security.enableRateLimiting) {
        this.addTest('Rate Limiting', 'PASS', 'Rate limiting enabled');
      } else {
        this.addTest('Rate Limiting', 'WARN', 'Rate limiting not enabled');
      }

      if (auth.xsuaa && auth.xsuaa.enableJWTValidation) {
        this.addTest('JWT Validation', 'PASS', 'JWT validation enabled');
      } else {
        this.addTest('JWT Validation', 'FAIL', 'JWT validation not enabled');
      }

      if (auth.xsuaa && auth.xsuaa.enableScopeValidation) {
        this.addTest('Scope Validation', 'PASS', 'Scope validation enabled');
      } else {
        this.addTest('Scope Validation', 'WARN', 'Scope validation not enabled');
      }
    } else {
      this.addTest('Security Configuration', 'FAIL', 'Production configuration not found');
    }
  }

  async validateMonitoringSetup() {
    this.log('\n📊 Validating Monitoring Setup...', 'blue');
    
    if (this.config && this.config.monitoring) {
      const monitoring = this.config.monitoring;
      
      if (monitoring.authenticationEvents) {
        this.addTest('Auth Event Monitoring', 'PASS', 'Authentication events monitoring enabled');
      } else {
        this.addTest('Auth Event Monitoring', 'WARN', 'Authentication events monitoring not enabled');
      }

      if (monitoring.securityViolations) {
        this.addTest('Security Violations', 'PASS', 'Security violations monitoring enabled');
      } else {
        this.addTest('Security Violations', 'WARN', 'Security violations monitoring not enabled');
      }

      if (monitoring.auditTrail) {
        this.addTest('Audit Trail', 'PASS', 'Audit trail enabled');
      } else {
        this.addTest('Audit Trail', 'WARN', 'Audit trail not enabled');
      }
    } else {
      this.addTest('Monitoring Configuration', 'WARN', 'Monitoring configuration not found');
    }

    // Check for logging configuration
    const logsDir = path.join(__dirname, '..', 'logs');
    if (fs.existsSync(logsDir)) {
      this.addTest('Logs Directory', 'PASS', 'Logs directory exists');
    } else {
      this.addTest('Logs Directory', 'WARN', 'Logs directory not found');
    }
  }

  async validateErrorHandling() {
    this.log('\n⚠️ Validating Error Handling...', 'blue');
    
    if (this.config && this.config.authentication && this.config.authentication.errorHandling) {
      const errorHandling = this.config.authentication.errorHandling;
      
      if (errorHandling.logAuthenticationFailures) {
        this.addTest('Auth Failure Logging', 'PASS', 'Authentication failures will be logged');
      } else {
        this.addTest('Auth Failure Logging', 'WARN', 'Authentication failures not logged');
      }

      if (errorHandling.logSecurityEvents) {
        this.addTest('Security Event Logging', 'PASS', 'Security events will be logged');
      } else {
        this.addTest('Security Event Logging', 'WARN', 'Security events not logged');
      }

      if (!errorHandling.showStackTraces) {
        this.addTest('Stack Trace Security', 'PASS', 'Stack traces hidden in production');
      } else {
        this.addTest('Stack Trace Security', 'FAIL', 'Stack traces visible in production');
      }
    } else {
      this.addTest('Error Handling', 'WARN', 'Error handling configuration not found');
    }
  }

  async validatePerformanceSettings() {
    this.log('\n⚡ Validating Performance Settings...', 'blue');
    
    if (this.config && this.config.features) {
      const features = this.config.features;
      
      if (features.tokenValidation) {
        this.addTest('Token Validation', 'PASS', 'Token validation enabled');
      } else {
        this.addTest('Token Validation', 'FAIL', 'Token validation not enabled');
      }

      if (features.productionLogging) {
        this.addTest('Production Logging', 'PASS', 'Production logging enabled');
      } else {
        this.addTest('Production Logging', 'WARN', 'Production logging not enabled');
      }

      if (features.securityMonitoring) {
        this.addTest('Security Monitoring', 'PASS', 'Security monitoring enabled');
      } else {
        this.addTest('Security Monitoring', 'WARN', 'Security monitoring not enabled');
      }
    } else {
      this.addTest('Performance Configuration', 'WARN', 'Performance configuration not found');
    }
  }

  addTest(name, status, message) {
    const test = {
      name,
      status,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.results.tests.push(test);
    
    if (status === 'PASS') {
      this.results.passed++;
      this.log(`✅ ${name}: ${message}`, 'green');
    } else if (status === 'FAIL') {
      this.results.failed++;
      this.log(`❌ ${name}: ${message}`, 'red');
    } else if (status === 'WARN') {
      this.results.warnings++;
      this.log(`⚠️ ${name}: ${message}`, 'yellow');
    }
  }

  printResults() {
    this.log('\n📊 Validation Results Summary', 'bright');
    this.log('==========================', 'bright');
    
    this.log(`\n✅ Passed: ${this.results.passed}`, 'green');
    this.log(`❌ Failed: ${this.results.failed}`, 'red');
    this.log(`⚠️ Warnings: ${this.results.warnings}`, 'yellow');
    this.log(`📋 Total: ${this.results.tests.length}`, 'blue');
    
    const successRate = ((this.results.passed / this.results.tests.length) * 100).toFixed(1);
    this.log(`\n📈 Success Rate: ${successRate}%`, 'bright');
    
    if (this.results.failed === 0) {
      this.log('\n🎉 Production authentication validation PASSED!', 'green');
      this.log('✅ Ready for production deployment', 'green');
    } else {
      this.log('\n⚠️ Production authentication validation has issues', 'yellow');
      this.log('❌ Please fix the failed tests before deployment', 'red');
    }
    
    if (this.results.warnings > 0) {
      this.log('\n💡 Recommendations:', 'cyan');
      this.log('Consider addressing the warnings for better security and monitoring', 'cyan');
    }
    
    // Save results to file
    const resultsPath = path.join(__dirname, '..', 'logs', 'auth-validation-results.json');
    try {
      if (!fs.existsSync(path.dirname(resultsPath))) {
        fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
      }
      fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
      this.log(`\n📄 Results saved to: ${resultsPath}`, 'blue');
    } catch (error) {
      this.log(`\n❌ Error saving results: ${error.message}`, 'red');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ProductionAuthValidator();
  validator.runValidation().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionAuthValidator; 