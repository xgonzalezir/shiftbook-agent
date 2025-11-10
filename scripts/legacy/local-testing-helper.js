#!/usr/bin/env node

/**
 * Local Testing Helper for ShiftBook Service
 * Easy utilities for testing different user scenarios locally
 */

const axios = require('axios');
const { generateJWTToken, USER_PROFILES } = require('./mock-jwt-generator');
const readline = require('readline');

// Configuration
const CONFIG = {
  baseURL: 'http://localhost:4004',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Current session state
let currentUser = null;
let currentToken = null;
let sessionHistory = [];

/**
 * Interactive CLI for testing
 */
class LocalTestingHelper {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Start interactive testing session
   */
  async start() {
    console.log('🔐 ShiftBook Local Testing Helper');
    console.log('==================================');
    console.log('Interactive testing environment for local development');
    console.log('');

    await this.showMainMenu();
  }

  /**
   * Show main menu
   */
  async showMainMenu() {
    console.log('\n📋 Main Menu:');
    console.log('1. Switch User');
    console.log('2. Test Current User');
    console.log('3. Quick Tests');
    console.log('4. Session History');
    console.log('5. Generate Tokens');
    console.log('6. Help');
    console.log('0. Exit');

    const choice = await this.askQuestion('\nSelect an option: ');

    switch (choice) {
      case '1':
        await this.switchUser();
        break;
      case '2':
        await this.testCurrentUser();
        break;
      case '3':
        await this.quickTests();
        break;
      case '4':
        this.showSessionHistory();
        break;
      case '5':
        await this.generateTokens();
        break;
      case '6':
        this.showHelp();
        break;
      case '0':
        console.log('👋 Goodbye!');
        this.rl.close();
        return;
      default:
        console.log('❌ Invalid option. Please try again.');
    }

    await this.showMainMenu();
  }

  /**
   * Switch to a different user
   */
  async switchUser() {
    console.log('\n👥 Available Users:');
    Object.keys(USER_PROFILES).forEach((userId, index) => {
      const profile = USER_PROFILES[userId];
      console.log(`${index + 1}. ${userId} - ${profile.description}`);
      console.log(`   Roles: ${profile.roles.join(', ')}`);
      console.log(`   Scopes: ${profile.scopes.join(', ')}`);
    });

    const choice = await this.askQuestion('\nSelect user (or enter user ID): ');
    
    let selectedUser;
    if (/^\d+$/.test(choice)) {
      const index = parseInt(choice) - 1;
      const userIds = Object.keys(USER_PROFILES);
      if (index >= 0 && index < userIds.length) {
        selectedUser = userIds[index];
      }
    } else {
      selectedUser = choice;
    }

    if (USER_PROFILES[selectedUser]) {
      await this.loginUser(selectedUser);
    } else {
      console.log('❌ Invalid user selection.');
    }
  }

  /**
   * Login as a specific user
   */
  async loginUser(userId) {
    try {
      const tokenInfo = generateJWTToken(userId);
      currentUser = userId;
      currentToken = tokenInfo.token;
      
      // Add to session history
      sessionHistory.push({
        timestamp: new Date().toISOString(),
        user: userId,
        action: 'login',
        token: currentToken.substring(0, 50) + '...'
      });

      console.log(`✅ Logged in as: ${userId}`);
      console.log(`📋 User: ${tokenInfo.userProfile.description}`);
      console.log(`🎭 Roles: ${tokenInfo.userProfile.roles.join(', ')}`);
      console.log(`🔑 Scopes: ${tokenInfo.userProfile.scopes.join(', ')}`);
      console.log(`⏰ Token expires: ${new Date(tokenInfo.claims.exp * 1000).toISOString()}`);
      
    } catch (error) {
      console.log(`❌ Error logging in as ${userId}: ${error.message}`);
    }
  }

  /**
   * Test current user with various endpoints
   */
  async testCurrentUser() {
    if (!currentUser) {
      console.log('❌ No user logged in. Please switch to a user first.');
      return;
    }

    console.log(`\n🧪 Testing user: ${currentUser}`);
    console.log('================================');

    const tests = [
      {
        name: 'Get Categories',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookCategory',
        method: 'GET'
      },
      {
        name: 'Get Logs',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookLog',
        method: 'GET'
      },
      {
        name: 'Create Test Log',
        endpoint: '/shiftbook/ShiftBookService/ShiftBookLog',
        method: 'POST',
        data: {
          werks: 'TEST',
          shoporder: 'SO_TEST',
          stepid: 'STEP_TEST',
          workcenter: 'WC_TEST',
          user_id: currentUser,
          category: 1,
          subject: 'Test from Local Helper',
          message: 'Created via local testing helper'
        }
      }
    ];

    // Add admin-specific tests
    if (USER_PROFILES[currentUser].scopes.includes('shiftbook.admin')) {
      tests.push({
        name: 'Send Email by Category (Admin)',
        endpoint: '/shiftbook/ShiftBookService/sendMailByCategory',
        method: 'POST',
        data: {
          category: 1,
          werks: 'TEST'
        }
      });
    }

    for (const test of tests) {
      await this.runTest(test);
    }
  }

  /**
   * Run a single test
   */
  async runTest(test) {
    console.log(`\n🧪 ${test.name}`);
    console.log(`   ${test.method} ${test.endpoint}`);

    try {
      const config = {
        ...CONFIG,
        method: test.method.toLowerCase(),
        url: test.endpoint,
        headers: {
          ...CONFIG.headers,
          Authorization: `Bearer ${currentToken}`
        }
      };

      if (test.data) {
        config.data = test.data;
      }

      const response = await axios(config);
      
      console.log(`   ✅ SUCCESS (${response.status})`);
      if (response.data) {
        if (Array.isArray(response.data.value)) {
          console.log(`   📊 Results: ${response.data.value.length} items`);
        } else {
          console.log(`   📊 Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
      }

      // Add to session history
      sessionHistory.push({
        timestamp: new Date().toISOString(),
        user: currentUser,
        action: test.name,
        endpoint: test.endpoint,
        status: response.status
      });

    } catch (error) {
      const status = error.response?.status || 'Network Error';
      console.log(`   ❌ FAILED (${status})`);
      
      if (error.response?.data) {
        console.log(`   Error: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
      }

      // Add to session history
      sessionHistory.push({
        timestamp: new Date().toISOString(),
        user: currentUser,
        action: test.name,
        endpoint: test.endpoint,
        status: status,
        error: error.message
      });
    }
  }

  /**
   * Quick tests for common scenarios
   */
  async quickTests() {
    console.log('\n⚡ Quick Tests:');
    console.log('1. Test Admin User');
    console.log('2. Test Operator User');
    console.log('3. Test Read-only User');
    console.log('4. Test Unauthorized Access');
    console.log('5. Back to Main Menu');

    const choice = await this.askQuestion('\nSelect test: ');

    switch (choice) {
      case '1':
        await this.quickTestAdmin();
        break;
      case '2':
        await this.quickTestOperator();
        break;
      case '3':
        await this.quickTestReadonly();
        break;
      case '4':
        await this.quickTestUnauthorized();
        break;
      case '5':
        return;
      default:
        console.log('❌ Invalid option.');
    }
  }

  /**
   * Quick test for admin user
   */
  async quickTestAdmin() {
    console.log('\n👑 Testing Admin User...');
    await this.loginUser('admin');
    await this.testCurrentUser();
  }

  /**
   * Quick test for operator user
   */
  async quickTestOperator() {
    console.log('\n🔧 Testing Operator User...');
    await this.loginUser('operator');
    await this.testCurrentUser();
  }

  /**
   * Quick test for read-only user
   */
  async quickTestReadonly() {
    console.log('\n👁️ Testing Read-only User...');
    await this.loginUser('test-readonly');
    await this.testCurrentUser();
  }

  /**
   * Quick test for unauthorized access
   */
  async quickTestUnauthorized() {
    console.log('\n🚫 Testing Unauthorized Access...');
    
    try {
      const response = await axios.get(`${CONFIG.baseURL}/shiftbook/ShiftBookService/ShiftBookCategory`, {
        timeout: 5000
      });
      console.log('❌ Unexpected success - should have been unauthorized');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected unauthorized access (401)');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status || error.message}`);
      }
    }
  }

  /**
   * Show session history
   */
  showSessionHistory() {
    console.log('\n📜 Session History:');
    console.log('==================');
    
    if (sessionHistory.length === 0) {
      console.log('No actions recorded yet.');
      return;
    }

    sessionHistory.forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      console.log(`${index + 1}. [${timestamp}] ${entry.user || 'None'}: ${entry.action}`);
      if (entry.endpoint) {
        console.log(`   ${entry.endpoint} (${entry.status})`);
      }
      if (entry.error) {
        console.log(`   Error: ${entry.error}`);
      }
    });
  }

  /**
   * Generate tokens for all users
   */
  async generateTokens() {
    console.log('\n🔐 Generating tokens for all users...');
    
    try {
      const { generateAllTokens, saveTokensToFile } = require('./mock-jwt-generator');
      const tokens = generateAllTokens();
      const outputPath = saveTokensToFile(tokens);
      
      console.log(`✅ Tokens generated and saved to: ${outputPath}`);
      console.log('\n📋 Generated tokens:');
      Object.keys(tokens).forEach(userId => {
        console.log(`  ${userId}: ${tokens[userId].token.substring(0, 50)}...`);
      });
    } catch (error) {
      console.log(`❌ Error generating tokens: ${error.message}`);
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log('\n📖 Help Information:');
    console.log('===================');
    console.log('');
    console.log('🔐 Authentication Testing:');
    console.log('  - Use "Switch User" to test different user roles');
    console.log('  - Each user has different permissions and scopes');
    console.log('  - Test Current User runs basic API tests');
    console.log('');
    console.log('👥 Available Users:');
    Object.keys(USER_PROFILES).forEach(userId => {
      const profile = USER_PROFILES[userId];
      console.log(`  ${userId}: ${profile.description}`);
    });
    console.log('');
    console.log('🧪 Quick Tests:');
    console.log('  - Test Admin User: Full access to all features');
    console.log('  - Test Operator User: Can read and write logs');
    console.log('  - Test Read-only User: Can only read data');
    console.log('  - Test Unauthorized Access: No authentication');
    console.log('');
    console.log('📊 Session History:');
    console.log('  - Tracks all actions performed during the session');
    console.log('  - Useful for debugging and understanding test results');
    console.log('');
    console.log('🔑 Token Generation:');
    console.log('  - Generate JWT tokens for all users');
    console.log('  - Tokens are saved to mock-tokens.json');
    console.log('  - Use tokens in external tools (Postman, curl, etc.)');
  }

  /**
   * Ask a question and return the answer
   */
  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

/**
 * Non-interactive testing functions
 */
class TestingAPI {
  /**
   * Test a specific endpoint with a user
   */
  static async testEndpoint(userId, endpoint, method = 'GET', data = null) {
    try {
      const tokenInfo = generateJWTToken(userId);
      
      const config = {
        ...CONFIG,
        method: method.toLowerCase(),
        url: endpoint,
        headers: {
          ...CONFIG.headers,
          Authorization: `Bearer ${tokenInfo.token}`
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        user: userId
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 'Network Error',
        error: error.message,
        user: userId
      };
    }
  }

  /**
   * Test multiple endpoints with a user
   */
  static async testUserEndpoints(userId, endpoints) {
    const results = [];
    
    for (const endpoint of endpoints) {
      const result = await this.testEndpoint(
        userId, 
        endpoint.url, 
        endpoint.method || 'GET', 
        endpoint.data
      );
      results.push({
        endpoint: endpoint.url,
        ...result
      });
    }
    
    return results;
  }

  /**
   * Compare user permissions across endpoints
   */
  static async compareUserPermissions(endpoints) {
    const users = Object.keys(USER_PROFILES);
    const results = {};
    
    for (const user of users) {
      results[user] = await this.testUserEndpoints(user, endpoints);
    }
    
    return results;
  }
}

/**
 * Main CLI functionality
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'interactive':
    case 'i':
      const helper = new LocalTestingHelper();
      await helper.start();
      break;
      
    case 'test':
      const userId = args[1];
      const endpoint = args[2];
      
      if (!userId || !endpoint) {
        console.log('Usage: node local-testing-helper.js test <userId> <endpoint>');
        console.log('Example: node local-testing-helper.js test admin /shiftbook/ShiftBookService/ShiftBookCategory');
        process.exit(1);
      }
      
      const result = await TestingAPI.testEndpoint(userId, endpoint);
      console.log(JSON.stringify(result, null, 2));
      break;
      
    case 'compare':
      const endpoints = [
        { url: '/shiftbook/ShiftBookService/ShiftBookCategory' },
        { url: '/shiftbook/ShiftBookService/ShiftBookLog' },
        { url: '/shiftbook/ShiftBookService/sendMailByCategory', method: 'POST', data: { category: 1, werks: 'TEST' } }
      ];
      
      const comparison = await TestingAPI.compareUserPermissions(endpoints);
      console.log(JSON.stringify(comparison, null, 2));
      break;
      
    case 'help':
    default:
      console.log('🔐 Local Testing Helper for ShiftBook Service');
      console.log('');
      console.log('Usage:');
      console.log('  node local-testing-helper.js interactive    Start interactive testing session');
      console.log('  node local-testing-helper.js test <user> <endpoint>  Test specific endpoint');
      console.log('  node local-testing-helper.js compare        Compare all users across endpoints');
      console.log('  node local-testing-helper.js help           Show this help');
      console.log('');
      console.log('Examples:');
      console.log('  node local-testing-helper.js interactive');
      console.log('  node local-testing-helper.js test admin /shiftbook/ShiftBookService/ShiftBookCategory');
      console.log('  node local-testing-helper.js compare');
      break;
  }
}

// Export classes and functions
module.exports = {
  LocalTestingHelper,
  TestingAPI,
  CONFIG
};

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
} 