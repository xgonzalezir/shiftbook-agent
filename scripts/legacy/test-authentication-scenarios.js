#!/usr/bin/env node

/**
 * Authentication Test Scenarios for Local Testing
 * Comprehensive test scripts for different user roles and scenarios
 */

const axios = require('axios');
const { generateJWTToken, USER_PROFILES } = require('./mock-jwt-generator');

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:4004',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Test scenarios
const TEST_SCENARIOS = {
  // Basic authentication tests
  'basic-auth': {
    name: 'Basic Authentication Tests',
    description: 'Test basic authentication with different users',
    tests: [
      {
        name: 'Test admin user authentication',
        user: 'admin',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookCategory',
        method: 'GET',
        expectedStatus: 200
      },
      {
        name: 'Test operator user authentication',
        user: 'operator',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookCategory',
        method: 'GET',
        expectedStatus: 200
      },
      {
        name: 'Test unauthorized access (no token)',
        user: null,
        endpoint: '/shiftbook/ShiftBookService/ShiftBookCategory',
        method: 'GET',
        expectedStatus: 401
      }
    ]
  },

  // Role-based access control tests
  'rbac': {
    name: 'Role-Based Access Control Tests',
    description: 'Test access control based on user roles and scopes',
    tests: [
      {
        name: 'Admin can access all endpoints',
        user: 'admin',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookCategory',
        method: 'GET',
        expectedStatus: 200
      },
      {
        name: 'Admin can create categories',
        user: 'admin',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookCategory',
        method: 'POST',
        data: {
          category: 9999,
          werks: 'TEST',
          default_desc: 'Test Category',
          sendmail: 0
        },
        expectedStatus: 201
      },
      {
        name: 'Operator can read categories',
        user: 'operator',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookCategory',
        method: 'GET',
        expectedStatus: 200
      },
      {
        name: 'Read-only user can only read',
        user: 'test-readonly',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookCategory',
        method: 'GET',
        expectedStatus: 200
      }
    ]
  },

  // Custom actions tests
  'custom-actions': {
    name: 'Custom Actions Tests',
    description: 'Test custom actions with different user permissions',
    tests: [
      {
        name: 'Admin can send emails by category',
        user: 'admin',
        endpoint: '/shiftbook/ShiftBookService/sendMailByCategory',
        method: 'POST',
        data: {
          category: 1,
          werks: 'TEST'
        },
        expectedStatus: 200
      },
      {
        name: 'Manager cannot send emails (no email scope)',
        user: 'manager',
        endpoint: '/shiftbook/ShiftBookService/sendMailByCategory',
        method: 'POST',
        data: {
          category: 1,
          werks: 'TEST'
        },
        expectedStatus: 403
      },
      {
        name: 'Operator cannot send emails',
        user: 'operator',
        endpoint: '/shiftbook/ShiftBookService/sendMailByCategory',
        method: 'POST',
        data: {
          category: 1,
          werks: 'TEST'
        },
        expectedStatus: 403
      }
    ]
  },

  // CRUD operations tests
  'crud-operations': {
    name: 'CRUD Operations Tests',
    description: 'Test Create, Read, Update, Delete operations with different users',
    tests: [
      {
        name: 'Admin can create log entry',
        user: 'admin',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookLog',
        method: 'POST',
        data: {
          werks: 'TEST',
          shoporder: 'SO_TEST',
          stepid: 'STEP_TEST',
          workcenter: 'WC_TEST',
          user_id: 'TEST_USER',
          category: 1,
          subject: 'Test Subject',
          message: 'Test Message'
        },
        expectedStatus: 201
      },
      {
        name: 'Operator can create log entry',
        user: 'operator',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookLog',
        method: 'POST',
        data: {
          werks: 'TEST',
          shoporder: 'SO_TEST2',
          stepid: 'STEP_TEST2',
          workcenter: 'WC_TEST2',
          user_id: 'TEST_USER2',
          category: 1,
          subject: 'Test Subject 2',
          message: 'Test Message 2'
        },
        expectedStatus: 201
      },
      {
        name: 'Read-only user cannot create log entry',
        user: 'test-readonly',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookLog',
        method: 'POST',
        data: {
          werks: 'TEST',
          shoporder: 'SO_TEST3',
          stepid: 'STEP_TEST3',
          workcenter: 'WC_TEST3',
          user_id: 'TEST_USER3',
          category: 1,
          subject: 'Test Subject 3',
          message: 'Test Message 3'
        },
        expectedStatus: 403
      }
    ]
  },

  // Error handling tests
  'error-handling': {
    name: 'Error Handling Tests',
    description: 'Test error handling for various scenarios',
    tests: [
      {
        name: 'Invalid token returns 401',
        user: 'invalid-token',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookCategory',
        method: 'GET',
        expectedStatus: 401,
        customToken: 'invalid-token-string'
      },
      {
        name: 'Expired token handling',
        user: 'admin',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookCategory',
        method: 'GET',
        expectedStatus: 401,
        customOptions: { expiresIn: -3600 } // Expired 1 hour ago
      },
      {
        name: 'Invalid endpoint returns 404',
        user: 'admin',
        endpoint: '/shiftbook/ShiftBookService/InvalidEndpoint',
        method: 'GET',
        expectedStatus: 404
      }
    ]
  }
};

/**
 * Run a single test
 */
async function runTest(test, scenarioName) {
  const { name, user, endpoint, method, data, expectedStatus, customToken, customOptions } = test;
  
  console.log(`\n🧪 Running: ${name}`);
  console.log(`   User: ${user || 'None'}`);
  console.log(`   Endpoint: ${method} ${endpoint}`);
  
  try {
    // Prepare request configuration
    const config = {
      ...TEST_CONFIG,
      method: method.toLowerCase(),
      url: endpoint
    };

    // Add authentication header
    if (user && user !== 'invalid-token') {
      let token;
      if (customToken) {
        token = customToken;
      } else {
        const tokenInfo = generateJWTToken(user, customOptions);
        token = tokenInfo.token;
      }
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request data for POST/PUT requests
    if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
      config.data = data;
    }

    // Make the request
    const response = await axios(config);
    
    // Check status code
    if (response.status === expectedStatus) {
      console.log(`   ✅ PASS: Expected ${expectedStatus}, got ${response.status}`);
      return { passed: true, status: response.status };
    } else {
      console.log(`   ❌ FAIL: Expected ${expectedStatus}, got ${response.status}`);
      return { passed: false, expected: expectedStatus, actual: response.status };
    }
    
  } catch (error) {
    const status = error.response?.status || 'Network Error';
    
    if (status === expectedStatus) {
      console.log(`   ✅ PASS: Expected ${expectedStatus}, got ${status}`);
      return { passed: true, status };
    } else {
      console.log(`   ❌ FAIL: Expected ${expectedStatus}, got ${status}`);
      if (error.response?.data) {
        console.log(`   Error details:`, error.response.data);
      }
      return { passed: false, expected: expectedStatus, actual: status, error: error.message };
    }
  }
}

/**
 * Run a test scenario
 */
async function runScenario(scenarioName) {
  const scenario = TEST_SCENARIOS[scenarioName];
  if (!scenario) {
    console.log(`❌ Unknown scenario: ${scenarioName}`);
    return;
  }

  console.log(`\n🚀 Running Scenario: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);
  console.log(`📊 Total tests: ${scenario.tests.length}`);

  const results = {
    scenario: scenarioName,
    name: scenario.name,
    total: scenario.tests.length,
    passed: 0,
    failed: 0,
    tests: []
  };

  for (const test of scenario.tests) {
    const result = await runTest(test, scenarioName);
    results.tests.push({ ...test, result });
    
    if (result.passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }

  // Print summary
  console.log(`\n📊 Scenario Summary: ${scenario.name}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  return results;
}

/**
 * Run all test scenarios
 */
async function runAllScenarios() {
  console.log('🔐 Running All Authentication Test Scenarios');
  console.log('=============================================');

  const allResults = [];
  
  for (const scenarioName of Object.keys(TEST_SCENARIOS)) {
    const result = await runScenario(scenarioName);
    allResults.push(result);
  }

  // Print overall summary
  console.log('\n🎯 Overall Test Summary');
  console.log('======================');
  
  const totalTests = allResults.reduce((sum, r) => sum + r.total, 0);
  const totalPassed = allResults.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
  
  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`✅ Total Passed: ${totalPassed}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log(`📈 Overall Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

  // Print failed tests
  if (totalFailed > 0) {
    console.log('\n❌ Failed Tests:');
    allResults.forEach(result => {
      result.tests.forEach(test => {
        if (!test.result.passed) {
          console.log(`   - ${result.name}: ${test.name}`);
        }
      });
    });
  }

  return allResults;
}

/**
 * Test server connectivity
 */
async function testServerConnectivity() {
  console.log('🔍 Testing server connectivity...');
  
  try {
    const response = await axios.get(`${TEST_CONFIG.baseURL}/shiftbook/ShiftBookService/ShiftBookCategory`, {
      timeout: 5000
    });
    console.log('✅ Server is running and accessible');
    return true;
  } catch (error) {
    console.log('❌ Server is not accessible');
    console.log('   Make sure the server is running on http://localhost:4004');
    console.log('   Run: npm run dev');
    return false;
  }
}

/**
 * List available scenarios
 */
function listScenarios() {
  console.log('📋 Available Test Scenarios:');
  console.log('============================');
  
  Object.keys(TEST_SCENARIOS).forEach(key => {
    const scenario = TEST_SCENARIOS[key];
    console.log(`\n🔹 ${key}: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log(`   Tests: ${scenario.tests.length}`);
  });
}

/**
 * Main CLI functionality
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'all':
      const isConnected = await testServerConnectivity();
      if (!isConnected) {
        process.exit(1);
      }
      await runAllScenarios();
      break;
      
    case 'scenario':
    case 's':
      const scenarioName = args[1];
      if (!scenarioName) {
        console.log('❌ Please specify a scenario name');
        console.log('Usage: node test-authentication-scenarios.js scenario <scenario-name>');
        listScenarios();
        process.exit(1);
      }
      
      const isConnected2 = await testServerConnectivity();
      if (!isConnected2) {
        process.exit(1);
      }
      
      await runScenario(scenarioName);
      break;
      
    case 'list':
    case 'l':
      listScenarios();
      break;
      
    case 'connectivity':
    case 'c':
      await testServerConnectivity();
      break;
      
    case 'help':
    default:
      console.log('🔐 Authentication Test Scenarios for Local Testing');
      console.log('');
      console.log('Usage:');
      console.log('  node test-authentication-scenarios.js all                    Run all test scenarios');
      console.log('  node test-authentication-scenarios.js scenario <name>       Run specific scenario');
      console.log('  node test-authentication-scenarios.js list                   List available scenarios');
      console.log('  node test-authentication-scenarios.js connectivity          Test server connectivity');
      console.log('  node test-authentication-scenarios.js help                   Show this help');
      console.log('');
      console.log('Examples:');
      console.log('  node test-authentication-scenarios.js all');
      console.log('  node test-authentication-scenarios.js scenario basic-auth');
      console.log('  node test-authentication-scenarios.js scenario rbac');
      console.log('  node test-authentication-scenarios.js scenario custom-actions');
      break;
  }
}

// Export functions for use in other modules
module.exports = {
  runTest,
  runScenario,
  runAllScenarios,
  testServerConnectivity,
  TEST_SCENARIOS
};

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
} 