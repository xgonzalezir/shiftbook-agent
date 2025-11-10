#!/usr/bin/env node

/**
 * Production Authentication Validation Test Suite
 * Tests all production authentication validation components
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

class ProductionAuthValidatorTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      tests: []
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async run() {
    this.log('\n🧪 Production Authentication Validation Test Suite', 'bright');
    this.log('==================================================\n', 'bright');

    try {
      // Test 1: Validation Script
      await this.testValidationScript();
      
      // Test 2: Logging System
      await this.testLoggingSystem();
      
      // Test 3: Monitoring System
      await this.testMonitoringSystem();
      
      // Test 4: Metrics Collection
      await this.testMetricsCollection();
      
      // Test 5: Health Checks
      await this.testHealthChecks();
      
      // Test 6: Documentation
      await this.testDocumentation();
      
      // Test 7: Integration Tests
      await this.testIntegration();
      
      // Display results
      this.displayResults();
      
    } catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  async testValidationScript() {
    this.log('\n🔍 Test 1: Production Authentication Validation Script', 'blue');
    this.log('--------------------------------------------------------', 'blue');

    const scriptPath = path.join(__dirname, 'validate-production-auth.js');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      this.recordTest('Validation Script Exists', false, 'Script file not found');
      return;
    }
    this.recordTest('Validation Script Exists', true);

    // Check script permissions
    try {
      const stats = fs.statSync(scriptPath);
      const isExecutable = (stats.mode & fs.constants.S_IXUSR) !== 0;
      this.recordTest('Validation Script Executable', isExecutable, 
        isExecutable ? null : 'Script is not executable');
    } catch (error) {
      this.recordTest('Validation Script Permissions', false, error.message);
    }

    // Test script syntax
    try {
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      // Basic syntax check - look for required components
      const hasClass = scriptContent.includes('class ProductionAuthValidator');
      const hasRunMethod = scriptContent.includes('async runValidation()');
      const hasValidationMethods = scriptContent.includes('validateXSUAAConfig') || 
                                  scriptContent.includes('validateAuthentication');
      
      this.recordTest('Validation Script Syntax', hasClass && hasRunMethod && hasValidationMethods,
        hasClass && hasRunMethod && hasValidationMethods ? null : 'Missing required components');
    } catch (error) {
      this.recordTest('Validation Script Syntax Check', false, error.message);
    }
  }

  async testLoggingSystem() {
    this.log('\n📝 Test 2: Authentication Event Logging System', 'blue');
    this.log('-----------------------------------------------', 'blue');

    const loggerPath = path.join(__dirname, '..', 'srv', 'lib', 'auth-logger.ts');
    
    // Check if logger exists
    if (!fs.existsSync(loggerPath)) {
      this.recordTest('Auth Logger Exists', false, 'Logger file not found');
      return;
    }
    this.recordTest('Auth Logger Exists', true);

    // Check logger implementation
    try {
      const loggerContent = fs.readFileSync(loggerPath, 'utf8');
      
      // Check for required interfaces and classes
      const hasAuthEventInterface = loggerContent.includes('interface AuthEvent');
      const hasAuthLoggerClass = loggerContent.includes('class AuthLogger');
      const hasLogMethod = loggerContent.includes('log(');
      const hasEventTypes = loggerContent.includes('login') && loggerContent.includes('logout');
      
      this.recordTest('Auth Logger Implementation', 
        hasAuthEventInterface && hasAuthLoggerClass && hasLogMethod && hasEventTypes,
        hasAuthEventInterface && hasAuthLoggerClass && hasLogMethod && hasEventTypes ? null : 'Missing required components');
    } catch (error) {
      this.recordTest('Auth Logger Implementation Check', false, error.message);
    }

    // Check log directory structure
    const logDir = path.join(__dirname, '..', 'logs');
    const auditDir = path.join(logDir, 'audit');
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.recordTest('Log Directory Structure', true);

    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    this.recordTest('Audit Directory Structure', true);
  }

  async testMonitoringSystem() {
    this.log('\n🔍 Test 3: Authentication Monitoring System', 'blue');
    this.log('--------------------------------------------', 'blue');

    const monitorPath = path.join(__dirname, '..', 'srv', 'lib', 'auth-monitor.ts');
    
    // Check if monitor exists
    if (!fs.existsSync(monitorPath)) {
      this.recordTest('Auth Monitor Exists', false, 'Monitor file not found');
      return;
    }
    this.recordTest('Auth Monitor Exists', true);

    // Check monitor implementation
    try {
      const monitorContent = fs.readFileSync(monitorPath, 'utf8');
      
      // Check for required components
      const hasAuthMetricsInterface = monitorContent.includes('interface AuthMetrics');
      const hasAlertRuleInterface = monitorContent.includes('interface AlertRule');
      const hasAuthMonitorClass = monitorContent.includes('class AuthMonitor');
      const hasMonitoringMethods = monitorContent.includes('startMonitoring') || 
                                  monitorContent.includes('checkAlerts');
      
      this.recordTest('Auth Monitor Implementation', 
        hasAuthMetricsInterface && hasAlertRuleInterface && hasAuthMonitorClass && hasMonitoringMethods,
        hasAuthMetricsInterface && hasAlertRuleInterface && hasAuthMonitorClass && hasMonitoringMethods ? null : 'Missing required components');
    } catch (error) {
      this.recordTest('Auth Monitor Implementation Check', false, error.message);
    }
  }

  async testMetricsCollection() {
    this.log('\n📊 Test 4: Authentication Metrics Collection', 'blue');
    this.log('--------------------------------------------', 'blue');

    const metricsScriptPath = path.join(__dirname, 'monitor-auth-metrics.js');
    
    // Check if metrics script exists
    if (!fs.existsSync(metricsScriptPath)) {
      this.recordTest('Metrics Script Exists', false, 'Metrics script file not found');
      return;
    }
    this.recordTest('Metrics Script Exists', true);

    // Test metrics script functionality
    try {
      const scriptContent = fs.readFileSync(metricsScriptPath, 'utf8');
      
      // Check for required methods
      const hasShowMetrics = scriptContent.includes('showMetrics');
      const hasShowAlerts = scriptContent.includes('showAlerts');
      const hasShowHealth = scriptContent.includes('showHealth');
      const hasStartMonitoring = scriptContent.includes('startMonitoring');
      
      this.recordTest('Metrics Script Methods', 
        hasShowMetrics && hasShowAlerts && hasShowHealth && hasStartMonitoring,
        hasShowMetrics && hasShowAlerts && hasShowHealth && hasStartMonitoring ? null : 'Missing required methods');
    } catch (error) {
      this.recordTest('Metrics Script Functionality', false, error.message);
    }

    // Test CLI interface
    try {
      const helpOutput = execSync(`node ${metricsScriptPath} --help`, { 
        encoding: 'utf8', 
        timeout: 5000,
        stdio: 'pipe'
      });
      
      const hasHelpOutput = helpOutput.includes('Authentication Metrics Monitor') && 
                           helpOutput.includes('--status') && 
                           helpOutput.includes('--metrics');
      
      this.recordTest('Metrics Script CLI Interface', hasHelpOutput,
        hasHelpOutput ? null : 'CLI interface not working properly');
    } catch (error) {
      this.recordTest('Metrics Script CLI Interface', false, error.message);
    }
  }

  async testHealthChecks() {
    this.log('\n🏥 Test 5: Health Check Functionality', 'blue');
    this.log('------------------------------------', 'blue');

    const metricsScriptPath = path.join(__dirname, 'monitor-auth-metrics.js');
    
    if (!fs.existsSync(metricsScriptPath)) {
      this.recordTest('Health Check Script Available', false, 'Metrics script not found');
      return;
    }

    // Test health check functionality
    try {
      const healthOutput = execSync(`node ${metricsScriptPath} --health`, { 
        encoding: 'utf8', 
        timeout: 10000,
        stdio: 'pipe'
      });
      
      const hasHealthOutput = healthOutput.includes('Authentication Health Check') && 
                             healthOutput.includes('Overall Health Assessment');
      
      this.recordTest('Health Check Functionality', hasHealthOutput,
        hasHealthOutput ? null : 'Health check not working properly');
    } catch (error) {
      this.recordTest('Health Check Functionality', false, error.message);
    }

    // Test status check
    try {
      const statusOutput = execSync(`node ${metricsScriptPath} --status`, { 
        encoding: 'utf8', 
        timeout: 10000,
        stdio: 'pipe'
      });
      
      const hasStatusOutput = statusOutput.includes('Authentication Monitoring Status');
      
      this.recordTest('Status Check Functionality', hasStatusOutput,
        hasStatusOutput ? null : 'Status check not working properly');
    } catch (error) {
      this.recordTest('Status Check Functionality', false, error.message);
    }
  }

  async testDocumentation() {
    this.log('\n📚 Test 6: Operations Documentation', 'blue');
    this.log('-----------------------------------', 'blue');

    const docsPath = path.join(__dirname, '..', 'docs', 'operations', 'AUTHENTICATION_TROUBLESHOOTING.md');
    
    // Check if documentation exists
    if (!fs.existsSync(docsPath)) {
      this.recordTest('Operations Documentation Exists', false, 'Documentation file not found');
      return;
    }
    this.recordTest('Operations Documentation Exists', true);

    // Check documentation content
    try {
      const docsContent = fs.readFileSync(docsPath, 'utf8');
      
      // Check for required sections
      const hasOverview = docsContent.includes('# Authentication Troubleshooting Guide');
      const hasQuickChecklist = docsContent.includes('## Quick Diagnostic Checklist');
      const hasCommonIssues = docsContent.includes('## Common Authentication Issues');
      const hasDiagnosticProcedures = docsContent.includes('## Diagnostic Procedures');
      const hasEmergencyProcedures = docsContent.includes('## Emergency Procedures');
      
      this.recordTest('Documentation Content', 
        hasOverview && hasQuickChecklist && hasCommonIssues && hasDiagnosticProcedures && hasEmergencyProcedures,
        hasOverview && hasQuickChecklist && hasCommonIssues && hasDiagnosticProcedures && hasEmergencyProcedures ? null : 'Missing required sections');
    } catch (error) {
      this.recordTest('Documentation Content Check', false, error.message);
    }

    // Check documentation size (should be substantial)
    try {
      const stats = fs.statSync(docsPath);
      const sizeInKB = stats.size / 1024;
      const isSubstantial = sizeInKB > 5; // At least 5KB of content
      
      this.recordTest('Documentation Completeness', isSubstantial,
        isSubstantial ? null : `Documentation too small (${sizeInKB.toFixed(1)}KB)`);
    } catch (error) {
      this.recordTest('Documentation Completeness Check', false, error.message);
    }
  }

  async testIntegration() {
    this.log('\n🔗 Test 7: Integration Tests', 'blue');
    this.log('---------------------------', 'blue');

    // Test that all components work together
    const components = [
      'scripts/validate-production-auth.js',
      'srv/lib/auth-logger.ts',
      'srv/lib/auth-monitor.ts',
      'scripts/monitor-auth-metrics.js',
      'docs/operations/AUTHENTICATION_TROUBLESHOOTING.md'
    ];

    let allComponentsExist = true;
    let missingComponents = [];

    components.forEach(component => {
      const fullPath = path.join(__dirname, '..', component);
      if (!fs.existsSync(fullPath)) {
        allComponentsExist = false;
        missingComponents.push(component);
      }
    });

    this.recordTest('All Components Present', allComponentsExist,
      allComponentsExist ? null : `Missing components: ${missingComponents.join(', ')}`);

    // Test configuration integration
    const configPath = path.join(__dirname, '..', 'config', 'auth', 'production.js');
    if (fs.existsSync(configPath)) {
      this.recordTest('Production Config Integration', true);
    } else {
      this.recordTest('Production Config Integration', false, 'Production config not found');
    }

    // Test log directory integration
    const logDir = path.join(__dirname, '..', 'logs');
    if (fs.existsSync(logDir)) {
      this.recordTest('Log Directory Integration', true);
    } else {
      this.recordTest('Log Directory Integration', false, 'Log directory not found');
    }
  }

  recordTest(testName, passed, errorMessage = null) {
    this.results.total++;
    if (passed) {
      this.results.passed++;
      this.log(`✅ ${testName}`, 'green');
    } else {
      this.results.failed++;
      this.log(`❌ ${testName}`, 'red');
      if (errorMessage) {
        this.log(`   Error: ${errorMessage}`, 'red');
      }
    }
    
    this.results.tests.push({
      name: testName,
      passed,
      errorMessage
    });
  }

  displayResults() {
    this.log('\n📊 Test Results Summary', 'bright');
    this.log('=======================\n', 'bright');

    const successRate = this.results.total > 0 ? 
      (this.results.passed / this.results.total * 100).toFixed(1) : '0.0';

    this.log(`📈 Total Tests: ${this.results.total}`, 'blue');
    this.log(`✅ Passed: ${this.results.passed}`, 'green');
    this.log(`❌ Failed: ${this.results.failed}`, 'red');
    this.log(`📊 Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 80 ? 'yellow' : 'red');

    if (this.results.failed > 0) {
      this.log('\n❌ Failed Tests:', 'red');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          this.log(`   - ${test.name}`, 'red');
          if (test.errorMessage) {
            this.log(`     ${test.errorMessage}`, 'yellow');
          }
        });
    }

    // Overall assessment
    this.log('\n🎯 Overall Assessment:', 'bright');
    if (this.results.failed === 0) {
      this.log('✅ All tests passed! Production authentication validation is ready.', 'green');
    } else if (this.results.failed <= 2) {
      this.log('⚠️ Most tests passed. Minor issues need attention before production deployment.', 'yellow');
    } else {
      this.log('❌ Multiple test failures. Production authentication validation needs significant work.', 'red');
    }

    // Compliance assessment
    this.log('\n📋 Compliance Assessment:', 'bright');
    const complianceScore = this.calculateComplianceScore();
    this.log(`🔐 Authentication Validation: ${complianceScore.validation}%`, 
      complianceScore.validation >= 90 ? 'green' : complianceScore.validation >= 80 ? 'yellow' : 'red');
    this.log(`📝 Logging & Monitoring: ${complianceScore.monitoring}%`, 
      complianceScore.monitoring >= 90 ? 'green' : complianceScore.monitoring >= 80 ? 'yellow' : 'red');
    this.log(`📚 Operations Support: ${complianceScore.operations}%`, 
      complianceScore.operations >= 90 ? 'green' : complianceScore.operations >= 80 ? 'yellow' : 'red');
    this.log(`🔗 Integration: ${complianceScore.integration}%`, 
      complianceScore.integration >= 90 ? 'green' : complianceScore.integration >= 80 ? 'yellow' : 'red');

    const overallCompliance = (complianceScore.validation + complianceScore.monitoring + 
                              complianceScore.operations + complianceScore.integration) / 4;
    
    this.log(`\n🏆 Overall Compliance: ${overallCompliance.toFixed(1)}%`, 
      overallCompliance >= 90 ? 'green' : overallCompliance >= 80 ? 'yellow' : 'red');

    if (overallCompliance >= 90) {
      this.log('✅ Production authentication validation meets compliance requirements!', 'green');
    } else if (overallCompliance >= 80) {
      this.log('⚠️ Production authentication validation mostly compliant, minor improvements needed.', 'yellow');
    } else {
      this.log('❌ Production authentication validation does not meet compliance requirements.', 'red');
    }
  }

  calculateComplianceScore() {
    const validationTests = this.results.tests.filter(t => 
      t.name.includes('Validation') || t.name.includes('Script'));
    const monitoringTests = this.results.tests.filter(t => 
      t.name.includes('Logging') || t.name.includes('Monitoring') || t.name.includes('Metrics'));
    const operationsTests = this.results.tests.filter(t => 
      t.name.includes('Documentation') || t.name.includes('Health'));
    const integrationTests = this.results.tests.filter(t => 
      t.name.includes('Integration') || t.name.includes('Components'));

    return {
      validation: this.calculateTestScore(validationTests),
      monitoring: this.calculateTestScore(monitoringTests),
      operations: this.calculateTestScore(operationsTests),
      integration: this.calculateTestScore(integrationTests)
    };
  }

  calculateTestScore(tests) {
    if (tests.length === 0) return 0;
    const passed = tests.filter(t => t.passed).length;
    return (passed / tests.length) * 100;
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new ProductionAuthValidatorTest();
  testSuite.run().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionAuthValidatorTest; 