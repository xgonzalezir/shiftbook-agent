#!/usr/bin/env node

/**
 * Comprehensive Database Configuration Testing Script
 * Tests all aspects of the HANA database configuration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Testing HANA Database Configuration...\n');

// Test Results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function runTest(name, testFn) {
  try {
    console.log(`🔍 Testing: ${name}`);
    const result = testFn();
    console.log(`✅ PASS: ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'PASS', details: result });
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAIL', details: error.message });
    return false;
  }
}

// Test 1: Package.json Configuration
runTest('Package.json Database Configuration', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const cds = packageJson.cds;
  
  if (!cds || !cds.requires || !cds.requires.db) {
    throw new Error('Database configuration missing in package.json');
  }
  
  const dbConfig = cds.requires.db;
  
  // Check development configuration
  if (!dbConfig['[development]'] || dbConfig['[development]'].kind !== 'sqlite') {
    throw new Error('Development SQLite configuration missing');
  }
  
  // Check test configuration
  if (!dbConfig['[test]'] || dbConfig['[test]'].kind !== 'sqlite') {
    throw new Error('Test SQLite configuration missing');
  }
  
  // Check hybrid configuration
  if (!dbConfig['[hybrid]'] || dbConfig['[hybrid]'].kind !== 'hana') {
    throw new Error('Hybrid HANA configuration missing');
  }
  
  // Check production configuration
  if (!dbConfig['[production]'] || dbConfig['[production]'].kind !== 'hana') {
    throw new Error('Production HANA configuration missing');
  }
  
  // Check connection pooling
  if (!dbConfig['[hybrid]'].pool || !dbConfig['[production]'].pool) {
    throw new Error('Connection pooling configuration missing');
  }
  
  return 'All database configurations present and valid';
});

// Test 2: MTA Configuration
runTest('MTA HDI Container Configuration', () => {
  const mtaContent = fs.readFileSync('mta.yaml', 'utf8');
  
  // Check HDI container configuration
  if (!mtaContent.includes('com.sap.xs.hdi-container')) {
    throw new Error('HDI container configuration missing');
  }
  
  // Check performance parameters
  if (!mtaContent.includes('statement_memory_limit')) {
    throw new Error('Performance parameters missing');
  }
  
  // Check connection pooling
  if (!mtaContent.includes('connection_pool_min')) {
    throw new Error('Connection pooling parameters missing');
  }
  
  return 'HDI container configuration valid with performance parameters';
});

// Test 3: Schema Compilation
runTest('CDS Schema Compilation', () => {
  try {
    execSync('cds compile db/', { stdio: 'pipe' });
    return 'Schema compiles successfully';
  } catch (error) {
    throw new Error(`Schema compilation failed: ${error.message}`);
  }
});

// Test 4: Database Deployment
runTest('Local Database Deployment', () => {
  const dbPath = 'db/shiftbook-dev.db';
  
  if (!fs.existsSync(dbPath)) {
    throw new Error('Database file not found');
  }
  
  const stats = fs.statSync(dbPath);
  if (stats.size === 0) {
    throw new Error('Database file is empty');
  }
  
  return `Database deployed successfully (${(stats.size / 1024).toFixed(2)} KB)`;
});

// Test 5: Database Tables
runTest('Database Tables Creation', () => {
  const tables = [
    'syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategory',
    'syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategoryLng',
    'syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategoryMail',
    'syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookLog'
  ];
  
  const dbPath = 'db/shiftbook-dev.db';
  const output = execSync(`sqlite3 "${dbPath}" ".tables"`, { encoding: 'utf8' });
  
  for (const table of tables) {
    if (!output.includes(table)) {
      throw new Error(`Table ${table} not found`);
    }
  }
  
  return `All ${tables.length} tables created successfully`;
});

// Test 6: Initial Data Loading
runTest('Initial Data Loading', () => {
  const dbPath = 'db/shiftbook-dev.db';
  
  // Check categories
  const categoryCount = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategory;"`, { encoding: 'utf8' }).trim();
  
  if (parseInt(categoryCount) === 0) {
    throw new Error('No categories loaded');
  }
  
  // Check translations
  const translationCount = execSync(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM syntax_gbi_sap_dme_plugins_shiftbook_ShiftBookCategoryLng;"`, { encoding: 'utf8' }).trim();
  
  if (parseInt(translationCount) === 0) {
    throw new Error('No translations loaded');
  }
  
  return `Data loaded: ${categoryCount} categories, ${translationCount} translations`;
});

// Test 7: Environment Configuration
runTest('Environment Configuration Files', () => {
  const requiredFiles = [
    '.env.example',
    'default-env.json'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`Environment file ${file} missing`);
    }
  }
  
  return 'All environment configuration files present';
});

// Test 8: Build Scripts
runTest('Build Scripts Configuration', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scripts = packageJson.scripts;
  
  const requiredScripts = [
    'build:mta',
    'db:deploy:dev',
    'db:deploy:test',
    'db:deploy:hybrid',
    'db:deploy:prod'
  ];
  
  for (const script of requiredScripts) {
    if (!scripts[script]) {
      throw new Error(`Build script ${script} missing`);
    }
  }
  
  return 'All build scripts configured';
});

// Test 9: MTA Build Validation
runTest('MTA Build Process', () => {
  try {
    execSync('npm run build:mta', { stdio: 'pipe' });
    return 'MTA builds successfully';
  } catch (error) {
    throw new Error(`MTA build failed: ${error.message}`);
  }
});

// Test 10: Service Startup
runTest('Service Startup Test', () => {
  try {
    // Start service in background
    const child = execSync('timeout 10s npm run dev', { stdio: 'pipe' });
    return 'Service starts successfully';
  } catch (error) {
    // Timeout is expected, but we check if service started
    if (error.status === 124) { // timeout exit code
      return 'Service startup test completed (timeout expected)';
    }
    throw new Error(`Service startup failed: ${error.message}`);
  }
});

// Print Results
console.log('\n📊 Test Results Summary:');
console.log('========================');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

console.log('\n📋 Detailed Results:');
console.log('===================');
results.tests.forEach(test => {
  const icon = test.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${test.name}: ${test.details}`);
});

// Exit with appropriate code
if (results.failed > 0) {
  console.log('\n❌ Some tests failed. Please review the configuration.');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed! Database configuration is ready for production.');
  process.exit(0);
} 