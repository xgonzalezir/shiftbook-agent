#!/usr/bin/env node

/**
 * CAP Mock Authentication Test Script
 * 
 * This script tests the addShiftBookEntry action using CAP's built-in mock authentication.
 */

const axios = require('axios');

// Configuration for CAP mock authentication
const CONFIG = {
  baseUrl: 'http://localhost:4004',
  servicePath: '/shiftbook/ShiftBookService',
  timeout: 30000
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

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

async function makeRequest(method, url, data = null, authToken = null, description = '') {
  const startTime = Date.now();
  
  try {
    logInfo(`Making ${method.toUpperCase()} request to: ${url}`);
    if (description) {
      logInfo(`Description: ${description}`);
    }
    if (data) {
      logInfo(`Request data: ${JSON.stringify(data, null, 2)}`);
    }
    
    const config = {
      method,
      url,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: CONFIG.timeout
    };

    // Add authentication header if provided
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
      logInfo(`Using auth token: ${authToken}`);
    } else {
      logWarning('No authentication token provided');
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    logSuccess(`Request completed in ${duration}ms (${response.status})`);
    return {
      success: true,
      status: response.status,
      data: response.data,
      duration: duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error.response) {
      logError(`Request failed after ${duration}ms: ${error.response.status} ${error.response.statusText}`);
      logError(`Error details: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      logError(`Request failed after ${duration}ms: No response received`);
      logError(`Error details: ${error.message}`);
    } else {
      logError(`Request failed after ${duration}ms: ${error.message}`);
    }
    
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status,
      duration: duration
    };
  }
}

async function testCAPAuthentication() {
  console.log('\n=== CAP Mock Authentication Test ===');
  logInfo(`Testing against: ${CONFIG.baseUrl}${CONFIG.servicePath}`);
  logInfo(`Using CAP's built-in mock authentication`);
  
  // Test 1: Health check (no auth required)
  logInfo('\n--- Test 1: Health Check ---');
  const healthResult = await makeRequest('GET', `${CONFIG.baseUrl}/health`, null, null, 'Health check without authentication');
  if (!healthResult.success) {
    logError('Health check failed. Is the server running?');
    return;
  }
  
  // Test 2: Try to access service without authentication
  logInfo('\n--- Test 2: Service Access Without Auth ---');
  const noAuthResult = await makeRequest('GET', `${CONFIG.baseUrl}${CONFIG.servicePath}/ShiftBookCategory`, null, null, 'Access service without authentication');
  if (noAuthResult.success) {
    logWarning('Service accessible without authentication (unexpected)');
  } else {
    logSuccess('Service correctly requires authentication');
  }
  
  // Test 3: Access with CAP mock user 'alice'
  logInfo('\n--- Test 3: Access with CAP Mock User "alice" ---');
  const aliceResult = await makeRequest('GET', `${CONFIG.baseUrl}${CONFIG.servicePath}/ShiftBookCategory`, null, 'alice', 'Access service with CAP mock user "alice"');
  if (aliceResult.success) {
    logSuccess('Successfully authenticated with CAP mock user "alice"');
  } else {
    logError('Failed to authenticate with CAP mock user "alice"');
    return;
  }
  
  // Test 4: Test addShiftBookEntry action with 'alice'
  logInfo('\n--- Test 4: Test addShiftBookEntry Action ---');
  
  // First, get a category ID
  const categoryResult = await makeRequest('GET', `${CONFIG.baseUrl}${CONFIG.servicePath}/ShiftBookCategory?$top=1`, null, 'alice', 'Get a category for testing');
  
  let categoryId = '550e8400-e29b-41d4-a716-446655440999'; // Default fallback
  
  if (categoryResult.success && categoryResult.data && categoryResult.data.value && categoryResult.data.value.length > 0) {
    categoryId = categoryResult.data.value[0].ID;
    logSuccess(`Using existing category: ${categoryId}`);
  } else {
    logWarning(`No existing categories found, using default: ${categoryId}`);
  }
  
  // Test the addShiftBookEntry action
  const actionData = {
    werks: "1000",
    shoporder: "TEST123456",
    stepid: "0010",
    split: "001",
    workcenter: "WC_TEST_001",
    user_id: "test-user@example.com",
    category: categoryId,
    subject: "CAP Auth Test Entry",
    message: "This entry was created to test CAP mock authentication"
  };
  
  const actionResult = await makeRequest(
    'POST', 
    `${CONFIG.baseUrl}${CONFIG.servicePath}/addShiftBookEntry`, 
    actionData, 
    'alice', 
    'Test addShiftBookEntry action with CAP mock authentication'
  );
  
  if (actionResult.success) {
    logSuccess('✅ addShiftBookEntry action completed successfully!');
    logInfo(`Response: ${JSON.stringify(actionResult.data, null, 2)}`);
    
    // Test 5: Verify the entry was created
    logInfo('\n--- Test 5: Verify Entry Creation ---');
    const verifyResult = await makeRequest(
      'GET', 
      `${CONFIG.baseUrl}${CONFIG.servicePath}/ShiftBookLog?$filter=shoporder eq 'TEST123456'`, 
      null, 
      'alice', 
      'Verify the created entry exists'
    );
    
    if (verifyResult.success && verifyResult.data && verifyResult.data.value && verifyResult.data.value.length > 0) {
      logSuccess(`✅ Entry verified! Found ${verifyResult.data.value.length} matching entries`);
      logInfo(`Entry details: ${JSON.stringify(verifyResult.data.value[0], null, 2)}`);
    } else {
      logWarning('⚠️ Could not verify entry creation (this might be expected if the action doesn\'t return the created entity)');
    }
  } else {
    logError('❌ addShiftBookEntry action failed');
    if (actionResult.status === 401) {
      logError('Authentication failed - check if CAP mock authentication is properly configured');
    } else if (actionResult.status === 500) {
      logError('Server error - check server logs for details');
    }
  }
  
  // Test 6: Try with other CAP mock users
  logInfo('\n--- Test 6: Test Other CAP Mock Users ---');
  const otherUsers = ['bob', 'operator', 'admin', 'manager'];
  
  for (const user of otherUsers) {
    logInfo(`Testing user: ${user}`);
    const userResult = await makeRequest(
      'GET', 
      `${CONFIG.baseUrl}${CONFIG.servicePath}/ShiftBookCategory`, 
      null, 
      user, 
      `Test access with CAP mock user "${user}"`
    );
    
    if (userResult.success) {
      logSuccess(`✅ User "${user}" authenticated successfully`);
    } else {
      logError(`❌ User "${user}" authentication failed`);
    }
  }
  
  console.log('\n=== Test Summary ===');
  logSuccess('CAP Mock Authentication Test completed');
  logInfo('If you see authentication failures, check:');
  logInfo('1. Server is running with NODE_ENV=development');
  logInfo('2. CAP mock authentication is properly configured');
  logInfo('3. No conflicting authentication middleware');
}

// Run the test
if (require.main === module) {
  testCAPAuthentication().catch(error => {
    logError(`Test failed with error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { testCAPAuthentication, makeRequest };
