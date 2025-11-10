#!/usr/bin/env node

/**
 * Test Script for updateCategoryWithDetails Action
 * 
 * This script tests the updateCategoryWithDetails action to ensure it works correctly.
 * It creates a test category, updates it with new details, and verifies the changes.
 * 
 * Usage:
 *   node scripts/test-update-category-action.js
 *   
 * Prerequisites:
 *   - Server must be running on http://localhost:4004
 *   - Valid authentication token (default: 'admin')
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:4004',
  servicePath: '/shiftbook/ShiftBookService',
  authToken: 'alice',
  timeout: 30000,
  testPrefix: 'UPDATE_TEST_'
};

// Test data
const TEST_DATA = {
  ID: "550e8400-e29b-41d4-a716-446655440888",
  werks: 'TEST',
  default_desc: 'Original Test Category',
  sendmail: 1,
  translations: [
    { lng: 'EN', desc: 'Original Test Category EN' },
    { lng: 'DE', desc: 'Original Test Kategorie DE' }
  ],
  mails: [
    { mail_address: 'original1@example.com' },
    { mail_address: 'original2@example.com' }
  ]
};

// Updated test data
const UPDATED_DATA = {
  ID: "550e8400-e29b-41d4-a716-446655440888",
  werks: 'TEST',
  default_desc: 'Updated Test Category',
  sendmail: 0,
  translations: [
    { lng: 'EN', desc: 'Updated Test Category EN' },
    { lng: 'DE', desc: 'Updated Test Kategorie DE' },
    { lng: 'ES', desc: 'Categoría de Prueba Actualizada ES' }
  ],
  mails: [
    { mail_address: 'updated1@example.com' },
    { mail_address: 'updated2@example.com' },
    { mail_address: 'updated3@example.com' }
  ]
};

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

// Test results
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Utility functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logHeader(message) {
  log(`\n${colors.bright}=== ${message} ===${colors.reset}`, colors.cyan);
}

// HTTP request helper
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(CONFIG.authToken + ':').toString('base64')}`,
        'Accept': 'application/json'
      },
      timeout: CONFIG.timeout
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(requestOptions, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        let data;
        try {
          data = rawData ? JSON.parse(rawData) : null;
        } catch (e) {
          data = null;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          rawData: rawData
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testCreateCategory() {
  logInfo('Creating test category...');
  
  const response = await makeRequest({
    url: `${CONFIG.baseUrl}${CONFIG.servicePath}/createCategoryWithDetails`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, {
    werks: TEST_DATA.werks,
    default_desc: TEST_DATA.default_desc,
    sendmail: TEST_DATA.sendmail,
    translations: TEST_DATA.translations,
    mails: TEST_DATA.mails
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`createCategoryWithDetails failed with status ${response.statusCode}: ${response.rawData}`);
  }
  
  if (response.data.value !== TEST_DATA.ID) {
    throw new Error(`createCategoryWithDetails returned ${response.data.value}, expected ${TEST_DATA.ID}`);
  }
  
  logSuccess('Test category created successfully');
}

async function testUpdateCategoryWithDetails() {
  logInfo('Testing updateCategoryWithDetails action...');
  
  const response = await makeRequest({
    url: `${CONFIG.baseUrl}${CONFIG.servicePath}/updateCategoryWithDetails`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, {
    category: UPDATED_DATA.ID,
    werks: UPDATED_DATA.werks,
    default_desc: UPDATED_DATA.default_desc,
    sendmail: UPDATED_DATA.sendmail,
    translations: UPDATED_DATA.translations,
    mails: UPDATED_DATA.mails
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`updateCategoryWithDetails failed with status ${response.statusCode}: ${response.rawData}`);
  }
  
  if (response.data.value !== UPDATED_DATA.ID) {
    throw new Error(`updateCategoryWithDetails returned ${response.data.value}, expected ${UPDATED_DATA.ID}`);
  }
  
  logSuccess('updateCategoryWithDetails action executed successfully');
}

async function verifyCategoryUpdate() {
  logInfo('Verifying category update using getShiftbookCategories action...');
  
  // Get the updated category using getShiftbookCategories action
  const response = await makeRequest({
    url: `${CONFIG.baseUrl}${CONFIG.servicePath}/getShiftbookCategories`,
    method: 'POST'
  }, {
    werks: UPDATED_DATA.werks,
    language: 'en'
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Failed to get updated category with status ${response.statusCode}: ${response.rawData}`);
  }
  
  // Handle different response structures
  let categories;
  if (response.data.value) {
    categories = response.data.value;
  } else if (response.data.d && response.data.d.results) {
    categories = response.data.d.results;
  } else if (response.data.d && Array.isArray(response.data.d)) {
    categories = response.data.d;
  } else if (Array.isArray(response.data)) {
    categories = response.data;
  } else {
    throw new Error('Unexpected response structure: ' + JSON.stringify(response.data));
  }
  
  if (!categories || categories.length === 0) {
    throw new Error('No categories found for the specified werks');
  }
  
  const category = categories.find(cat => cat.ID === UPDATED_DATA.ID);
  if (!category) {
    throw new Error(`Category ${UPDATED_DATA.ID} not found in getShiftbookCategories result`);
  }
  
  if (category.default_desc !== UPDATED_DATA.default_desc) {
    throw new Error(`Category description not updated. Expected: ${UPDATED_DATA.default_desc}, Got: ${category.default_desc}`);
  }
  
  if (category.sendmail !== UPDATED_DATA.sendmail) {
    throw new Error(`Category sendmail not updated. Expected: ${UPDATED_DATA.sendmail}, Got: ${category.sendmail}`);
  }
  
  logSuccess('Category basic details updated correctly (verified via getShiftbookCategories)');
}

async function verifyTranslationsUpdate() {
  logInfo('Verifying translations update...');
  
  // Get all translations for the category
  const response = await makeRequest({
    url: `${CONFIG.baseUrl}${CONFIG.servicePath}/ShiftBookCategoryLng?$filter=category eq ${UPDATED_DATA.ID} and werks eq '${UPDATED_DATA.werks}'`,
    method: 'GET'
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Failed to get translations with status ${response.statusCode}: ${response.rawData}`);
  }
  
  // Handle different response structures
  let translations;
  if (response.data.value) {
    translations = response.data.value;
  } else if (response.data.d && response.data.d.results) {
    translations = response.data.d.results;
  } else if (response.data.d && Array.isArray(response.data.d)) {
    translations = response.data.d;
  } else if (Array.isArray(response.data)) {
    translations = response.data;
  } else {
    throw new Error('Unexpected response structure: ' + JSON.stringify(response.data));
  }
  
  // Check if we have the expected number of translations
  if (translations.length !== UPDATED_DATA.translations.length) {
    throw new Error(`Expected ${UPDATED_DATA.translations.length} translations, got ${translations.length}`);
  }
  
  // Verify each translation
  for (const expectedTranslation of UPDATED_DATA.translations) {
    const found = translations.find(t => t.lng === expectedTranslation.lng);
    if (!found) {
      throw new Error(`Translation for language ${expectedTranslation.lng} not found`);
    }
    if (found.desc !== expectedTranslation.desc) {
      throw new Error(`Translation for ${expectedTranslation.lng} not updated. Expected: ${expectedTranslation.desc}, Got: ${found.desc}`);
    }
  }
  
  logSuccess('Translations updated correctly');
}

async function verifyMailsUpdate() {
  logInfo('Verifying email addresses update...');
  
  // Get all email addresses for the category
  const response = await makeRequest({
    url: `${CONFIG.baseUrl}${CONFIG.servicePath}/ShiftBookCategoryMail?$filter=category eq ${UPDATED_DATA.ID} and werks eq '${UPDATED_DATA.werks}'`,
    method: 'GET'
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`Failed to get email addresses with status ${response.statusCode}: ${response.rawData}`);
  }
  
  // Handle different response structures
  let mails;
  if (response.data.value) {
    mails = response.data.value;
  } else if (response.data.d && response.data.d.results) {
    mails = response.data.d.results;
  } else if (response.data.d && Array.isArray(response.data.d)) {
    mails = response.data.d;
  } else if (Array.isArray(response.data)) {
    mails = response.data;
  } else {
    throw new Error('Unexpected response structure: ' + JSON.stringify(response.data));
  }
  
  // Check if we have the expected number of email addresses
  if (mails.length !== UPDATED_DATA.mails.length) {
    throw new Error(`Expected ${UPDATED_DATA.mails.length} email addresses, got ${mails.length}`);
  }
  
  // Verify each email address
  for (const expectedMail of UPDATED_DATA.mails) {
    const found = mails.find(m => m.mail_address === expectedMail.mail_address);
    if (!found) {
      throw new Error(`Email address ${expectedMail.mail_address} not found`);
    }
  }
  
  logSuccess('Email addresses updated correctly');
}

async function testGetShiftbookCategories() {
  logInfo('Testing getShiftbookCategories to verify updated data...');
  
  const response = await makeRequest({
    url: `${CONFIG.baseUrl}${CONFIG.servicePath}/getShiftbookCategories`,
    method: 'POST'
  }, {
    werks: UPDATED_DATA.werks,
    language: 'en'
  });
  
  if (response.statusCode !== 200) {
    throw new Error(`getShiftbookCategories failed with status ${response.statusCode}: ${response.rawData}`);
  }
  
  if (!Array.isArray(response.data.value)) {
    throw new Error('getShiftbookCategories did not return an array in value property');
  }
  
  const updatedCategory = response.data.value.find(cat => cat.ID === UPDATED_DATA.ID);
  if (!updatedCategory) {
    throw new Error('Updated category not found in getShiftbookCategories result');
  }
  
  if (updatedCategory.default_desc !== UPDATED_DATA.default_desc) {
    throw new Error(`Category description in getShiftbookCategories not updated. Expected: ${UPDATED_DATA.default_desc}, Got: ${updatedCategory.default_desc}`);
  }
  
  logSuccess('getShiftbookCategories shows updated category correctly');
}

async function cleanupTestData() {
  logInfo('Cleaning up test data...');
  
  try {
    const response = await makeRequest({
      url: `${CONFIG.baseUrl}${CONFIG.servicePath}/deleteCategoryCascade`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      category: UPDATED_DATA.ID,
      werks: UPDATED_DATA.werks
    });
    
    if (response.statusCode !== 200) {
      logWarning(`Cleanup failed with status ${response.statusCode}: ${response.rawData}`);
    } else {
      logSuccess('Test data cleaned up successfully');
    }
  } catch (error) {
    logWarning(`Cleanup error: ${error.message}`);
  }
}

// Test runner
async function runTest(testName, testFunction) {
  testResults.total++;
  try {
    logInfo(`Running: ${testName}`);
    await testFunction();
    testResults.passed++;
    logSuccess(`${testName} - PASSED`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    logError(`${testName} - FAILED: ${error.message}`);
  }
}

async function runAllTests() {
  logHeader('Starting updateCategoryWithDetails Action Test');
  logInfo(`Base URL: ${CONFIG.baseUrl}`);
  logInfo(`Service Path: ${CONFIG.servicePath}`);
  logInfo(`Test Category: ${TEST_DATA.ID}`);
  
  try {
    // Run tests in sequence
    await runTest('Create Test Category', testCreateCategory);
    await runTest('Update Category With Details', testUpdateCategoryWithDetails);
    await runTest('Verify Category Update', verifyCategoryUpdate);
    await runTest('Verify Translations Update', verifyTranslationsUpdate);
    await runTest('Verify Mails Update', verifyMailsUpdate);
    await runTest('Test getShiftbookCategories', testGetShiftbookCategories);
    
    // Cleanup
    await cleanupTestData();
    
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
  }
  
  // Print results
  logHeader('Test Results Summary');
  logInfo(`Total Tests: ${testResults.total}`);
  logSuccess(`Passed: ${testResults.passed}`);
  if (testResults.failed > 0) {
    logError(`Failed: ${testResults.failed}`);
    logHeader('Failed Tests:');
    testResults.errors.forEach(({ test, error }) => {
      logError(`${test}: ${error}`);
    });
  } else {
    logSuccess('All tests passed! 🎉');
  }
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testUpdateCategoryWithDetails,
  verifyCategoryUpdate,
  verifyTranslationsUpdate,
  verifyMailsUpdate
};
