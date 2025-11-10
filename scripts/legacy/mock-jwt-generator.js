#!/usr/bin/env node

/**
 * Mock JWT Token Generator for Local Testing
 * Creates realistic JWT tokens for testing different user roles and scenarios
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Mock JWT secret for local development (never use in production)
const MOCK_JWT_SECRET = 'mock-jwt-secret-for-local-development-only';

// User profiles with realistic JWT claims
const USER_PROFILES = {
  // Development users
  'alice': {
    ID: 'alice',
    tenant: 't1',
    scopes: ['shiftbook.admin'],
    roles: ['admin'],
    description: 'Administrator user for development',
    claims: {
      sub: 'alice',
      iss: 'https://mock-xsuaa.example.com',
      aud: ['shiftbook'],
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      iat: Math.floor(Date.now() / 1000),
      jti: 'mock-jwt-' + Date.now(),
      client_id: 'shiftbook-client',
      cid: 'shiftbook-client',
      zid: 't1',
      user_id: 'alice',
      user_name: 'Alice Admin',
      email: 'alice@example.com',
      given_name: 'Alice',
      family_name: 'Admin',
      scope: ['shiftbook.admin']
    }
  },
  'bob': {
    ID: 'bob',
    tenant: 't1',
    scopes: ['shiftbook.read', 'shiftbook.write'],
    roles: ['user'],
    description: 'Standard user for development',
    claims: {
      sub: 'bob',
      iss: 'https://mock-xsuaa.example.com',
      aud: ['shiftbook'],
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iat: Math.floor(Date.now() / 1000),
      jti: 'mock-jwt-' + Date.now(),
      client_id: 'shiftbook-client',
      cid: 'shiftbook-client',
      zid: 't1',
      user_id: 'bob',
      user_name: 'Bob User',
      email: 'bob@example.com',
      given_name: 'Bob',
      family_name: 'User',
      scope: ['shiftbook.read', 'shiftbook.write']
    }
  },
  'operator': {
    ID: 'operator',
    tenant: 't1',
    scopes: ['shiftbook.read', 'shiftbook.write'],
    roles: ['operator'],
    description: 'Operator user for development',
    claims: {
      sub: 'operator',
      iss: 'https://mock-xsuaa.example.com',
      aud: ['shiftbook'],
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iat: Math.floor(Date.now() / 1000),
      jti: 'mock-jwt-' + Date.now(),
      client_id: 'shiftbook-client',
      cid: 'shiftbook-client',
      zid: 't1',
      user_id: 'operator',
      user_name: 'Operator User',
      email: 'operator@example.com',
      given_name: 'Operator',
      family_name: 'User',
      scope: ['shiftbook.read', 'shiftbook.write']
    }
  },
  'manager': {
    ID: 'manager',
    tenant: 't1',
    scopes: ['shiftbook.read', 'shiftbook.write', 'shiftbook.admin'],
    roles: ['manager'],
    description: 'Manager user for development',
    claims: {
      sub: 'manager',
      iss: 'https://mock-xsuaa.example.com',
      aud: ['shiftbook'],
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iat: Math.floor(Date.now() / 1000),
      jti: 'mock-jwt-' + Date.now(),
      client_id: 'shiftbook-client',
      cid: 'shiftbook-client',
      zid: 't1',
      user_id: 'manager',
      user_name: 'Manager User',
      email: 'manager@example.com',
      given_name: 'Manager',
      family_name: 'User',
      scope: ['shiftbook.read', 'shiftbook.write', 'shiftbook.admin']
    }
  },
  'admin': {
    ID: 'admin',
    tenant: 't1',
    scopes: ['shiftbook.read', 'shiftbook.write', 'shiftbook.admin', 'shiftbook.email'],
    roles: ['admin'],
    description: 'Full admin user for development',
    claims: {
      sub: 'admin',
      iss: 'https://mock-xsuaa.example.com',
      aud: ['shiftbook'],
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iat: Math.floor(Date.now() / 1000),
      jti: 'mock-jwt-' + Date.now(),
      client_id: 'shiftbook-client',
      cid: 'shiftbook-client',
      zid: 't1',
      user_id: 'admin',
      user_name: 'Admin User',
      email: 'admin@example.com',
      given_name: 'Admin',
      family_name: 'User',
      scope: ['shiftbook.read', 'shiftbook.write', 'shiftbook.admin', 'shiftbook.email']
    }
  },
  
  // Test users
  'test-readonly': {
    ID: 'test-readonly',
    tenant: 't1',
    scopes: ['shiftbook.read'],
    roles: ['reader'],
    description: 'Read-only test user',
    claims: {
      sub: 'test-readonly',
      iss: 'https://mock-xsuaa.example.com',
      aud: ['shiftbook'],
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iat: Math.floor(Date.now() / 1000),
      jti: 'mock-jwt-' + Date.now(),
      client_id: 'shiftbook-client',
      cid: 'shiftbook-client',
      zid: 't1',
      user_id: 'test-readonly',
      user_name: 'Test Readonly',
      email: 'test-readonly@example.com',
      given_name: 'Test',
      family_name: 'Readonly',
      scope: ['shiftbook.read']
    }
  },
  'test-user': {
    ID: 'test-user',
    tenant: 't1',
    scopes: ['shiftbook.read', 'shiftbook.user'],
    roles: ['user'],
    description: 'Standard test user',
    claims: {
      sub: 'test-user',
      iss: 'https://mock-xsuaa.example.com',
      aud: ['shiftbook'],
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iat: Math.floor(Date.now() / 1000),
      jti: 'mock-jwt-' + Date.now(),
      client_id: 'shiftbook-client',
      cid: 'shiftbook-client',
      zid: 't1',
      user_id: 'test-user',
      user_name: 'Test User',
      email: 'test-user@example.com',
      given_name: 'Test',
      family_name: 'User',
      scope: ['shiftbook.read', 'shiftbook.user']
    }
  },
  'test-admin': {
    ID: 'test-admin',
    tenant: 't1',
    scopes: ['shiftbook.read', 'shiftbook.user', 'shiftbook.admin'],
    roles: ['admin'],
    description: 'Admin test user',
    claims: {
      sub: 'test-admin',
      iss: 'https://mock-xsuaa.example.com',
      aud: ['shiftbook'],
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      iat: Math.floor(Date.now() / 1000),
      jti: 'mock-jwt-' + Date.now(),
      client_id: 'shiftbook-client',
      cid: 'shiftbook-client',
      zid: 't1',
      user_id: 'test-admin',
      user_name: 'Test Admin',
      email: 'test-admin@example.com',
      given_name: 'Test',
      family_name: 'Admin',
      scope: ['shiftbook.read', 'shiftbook.user', 'shiftbook.admin']
    }
  }
};

/**
 * Generate a JWT token for a specific user
 */
function generateJWTToken(userId, options = {}) {
  const userProfile = USER_PROFILES[userId];
  if (!userProfile) {
    throw new Error(`Unknown user: ${userId}`);
  }

  // Create a copy of the claims to avoid modifying the original
  const claims = { ...userProfile.claims };
  
  // Update timestamps
  const now = Math.floor(Date.now() / 1000);
  claims.iat = now;
  claims.exp = now + (options.expiresIn || 24 * 60 * 60); // Default 24 hours
  claims.jti = `mock-jwt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Override with custom options
  if (options.scope) {
    claims.scope = options.scope;
  }
  if (options.tenant) {
    claims.zid = options.tenant;
  }
  if (options.email) {
    claims.email = options.email;
  }

  // Generate the JWT token
  const token = jwt.sign(claims, MOCK_JWT_SECRET, {
    algorithm: 'HS256'
  });

  return {
    token,
    claims,
    userProfile: {
      ID: userProfile.ID,
      tenant: userProfile.tenant,
      scopes: userProfile.scopes,
      roles: userProfile.roles,
      description: userProfile.description
    }
  };
}

/**
 * Generate tokens for all users
 */
function generateAllTokens() {
  const tokens = {};
  
  Object.keys(USER_PROFILES).forEach(userId => {
    try {
      tokens[userId] = generateJWTToken(userId);
    } catch (error) {
      console.error(`Error generating token for ${userId}:`, error.message);
    }
  });
  
  return tokens;
}

/**
 * Save tokens to a file for easy access
 */
function saveTokensToFile(tokens, filename = 'mock-tokens.json') {
  const outputPath = path.join(__dirname, '..', filename);
  
  // Create a simplified version for easy use
  const simplifiedTokens = {};
  Object.keys(tokens).forEach(userId => {
    simplifiedTokens[userId] = {
      token: tokens[userId].token,
      user: tokens[userId].userProfile,
      usage: `Authorization: Bearer ${tokens[userId].token}`
    };
  });
  
  fs.writeFileSync(outputPath, JSON.stringify(simplifiedTokens, null, 2));
  console.log(`✅ Tokens saved to: ${outputPath}`);
  
  return outputPath;
}

/**
 * Display token information
 */
function displayTokenInfo(userId, tokenInfo) {
  console.log(`\n🔐 Token for user: ${userId}`);
  console.log(`📋 User: ${tokenInfo.userProfile.description}`);
  console.log(`🎭 Roles: ${tokenInfo.userProfile.roles.join(', ')}`);
  console.log(`🔑 Scopes: ${tokenInfo.userProfile.scopes.join(', ')}`);
  console.log(`⏰ Expires: ${new Date(tokenInfo.claims.exp * 1000).toISOString()}`);
  console.log(`\n📝 Usage:`);
  console.log(`curl -H "Authorization: Bearer ${tokenInfo.token}" http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory`);
  console.log(`\n🔑 Token:`);
  console.log(tokenInfo.token);
}

/**
 * Main CLI functionality
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'generate':
    case 'gen':
      const userId = args[1];
      if (!userId) {
        console.log('❌ Please specify a user ID');
        console.log('Usage: node mock-jwt-generator.js generate <userId>');
        console.log('Available users:', Object.keys(USER_PROFILES).join(', '));
        process.exit(1);
      }
      
      try {
        const tokenInfo = generateJWTToken(userId);
        displayTokenInfo(userId, tokenInfo);
      } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
      }
      break;
      
    case 'all':
      console.log('🔐 Generating tokens for all users...');
      const allTokens = generateAllTokens();
      const outputPath = saveTokensToFile(allTokens);
      
      console.log('\n📋 Generated tokens:');
      Object.keys(allTokens).forEach(userId => {
        console.log(`  ${userId}: ${allTokens[userId].token.substring(0, 50)}...`);
      });
      
      console.log(`\n📁 All tokens saved to: ${outputPath}`);
      break;
      
    case 'list':
    case 'users':
      console.log('👥 Available users:');
      Object.keys(USER_PROFILES).forEach(userId => {
        const profile = USER_PROFILES[userId];
        console.log(`  ${userId}: ${profile.description}`);
        console.log(`    Roles: ${profile.roles.join(', ')}`);
        console.log(`    Scopes: ${profile.scopes.join(', ')}`);
        console.log('');
      });
      break;
      
    case 'help':
    default:
      console.log('🔐 Mock JWT Token Generator for Local Testing');
      console.log('');
      console.log('Usage:');
      console.log('  node mock-jwt-generator.js generate <userId>  Generate token for specific user');
      console.log('  node mock-jwt-generator.js all                Generate tokens for all users');
      console.log('  node mock-jwt-generator.js list               List available users');
      console.log('  node mock-jwt-generator.js help               Show this help');
      console.log('');
      console.log('Examples:');
      console.log('  node mock-jwt-generator.js generate admin');
      console.log('  node mock-jwt-generator.js generate test-user');
      console.log('  node mock-jwt-generator.js all');
      break;
  }
}

// Export functions for use in other modules
module.exports = {
  generateJWTToken,
  generateAllTokens,
  saveTokensToFile,
  USER_PROFILES,
  MOCK_JWT_SECRET
};

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
} 