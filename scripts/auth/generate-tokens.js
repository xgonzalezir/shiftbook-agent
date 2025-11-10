#!/usr/bin/env node

/**
 * Bearer Token Generator for Shift Book Scopes
 * Generates valid bearer tokens for each scope defined in xs-security.json
 * 
 * Usage: node generate-tokens.js
 * Output: Valid JWT tokens for testing API endpoints
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Mock JWT secret for local development (never use in production)
const MOCK_JWT_SECRET = 'mock-jwt-secret-for-local-development-only';

// Read xs-security.json to get the actual scopes
const xsSecurityPath = path.join(__dirname, 'xs-security.json');
const xsSecurity = JSON.parse(fs.readFileSync(xsSecurityPath, 'utf8'));

// Extract the app name from xs-security.json
const xsAppName = xsSecurity.xsappname || 'shiftbook-cap-manu-dev-org-dev';

// Generate tokens for each scope defined in xs-security.json
function generateTokensForScopes() {
  const tokens = {};
  
  xsSecurity.scopes.forEach(scopeDefinition => {
    const scopeName = scopeDefinition.name.replace('$XSAPPNAME', xsAppName);
    const baseScope = scopeDefinition.name.replace('$XSAPPNAME.', '');
    
    // Create token for this specific scope
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      sub: `user-${baseScope}`,
      iss: 'https://mock-xsuaa.localhost',
      aud: [xsAppName],
      exp: now + (24 * 60 * 60), // 24 hours
      iat: now,
      jti: `mock-jwt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      client_id: `${xsAppName}-client`,
      cid: `${xsAppName}-client`,
      zid: 'mock-tenant',
      user_id: `user-${baseScope}`,
      user_name: `User with ${baseScope}`,
      email: `${baseScope}@example.com`,
      given_name: 'Mock',
      family_name: 'User',
      scope: [scopeName],
      xs_system_attributes: {
        "xs.rolecollections": [],
        "xs.system.attributes": {}
      }
    };
    
    const token = jwt.sign(claims, MOCK_JWT_SECRET, {
      algorithm: 'HS256'
    });
    
    tokens[baseScope] = {
      scope: scopeName,
      description: scopeDefinition.description,
      token: token,
      usage: `Authorization: Bearer ${token}`,
      claims: claims
    };
  });
  
  return tokens;
}

/**
 * Generate a combined token with all scopes
 */
function generateAllScopesToken() {
  const allScopes = xsSecurity.scopes.map(scope => 
    scope.name.replace('$XSAPPNAME', xsAppName)
  );
  
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    sub: 'admin-user',
    iss: 'https://mock-xsuaa.localhost',
    aud: [xsAppName],
    exp: now + (24 * 60 * 60), // 24 hours
    iat: now,
    jti: `mock-jwt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    client_id: `${xsAppName}-client`,
    cid: `${xsAppName}-client`,
    zid: 'mock-tenant',
    user_id: 'admin-user',
    user_name: 'Admin User with All Scopes',
    email: 'admin@example.com',
    given_name: 'Admin',
    family_name: 'User',
    scope: allScopes,
    xs_system_attributes: {
      "xs.rolecollections": [],
      "xs.system.attributes": {}
    }
  };
  
  const token = jwt.sign(claims, MOCK_JWT_SECRET, {
    algorithm: 'HS256'
  });
  
  return {
    scope: allScopes,
    description: 'Token with all available scopes',
    token: token,
    usage: `Authorization: Bearer ${token}`,
    claims: claims
  };
}

/**
 * Display token information
 */
function displayTokenInfo(name, tokenInfo) {
  console.log(`\n🔐 Token: ${name}`);
  console.log(`📋 Scope(s): ${Array.isArray(tokenInfo.scope) ? tokenInfo.scope.join(', ') : tokenInfo.scope}`);
  console.log(`📝 Description: ${tokenInfo.description}`);
  console.log(`⏰ Expires: ${new Date(tokenInfo.claims.exp * 1000).toISOString()}`);
  console.log(`\n📋 Usage:`);
  console.log(`curl -H "${tokenInfo.usage}" http://localhost:4004/`);
  console.log(`\n🔑 Bearer Token:`);
  console.log(tokenInfo.token);
  console.log('\n' + '='.repeat(80));
}

/**
 * Save tokens to file
 */
function saveTokensToFile(tokens, filename = 'bearer-tokens.json') {
  const outputPath = path.join(__dirname, filename);
  
  // Create a simplified version for easy use
  const simplifiedTokens = {};
  Object.keys(tokens).forEach(name => {
    simplifiedTokens[name] = {
      scope: tokens[name].scope,
      description: tokens[name].description,
      token: tokens[name].token,
      usage: tokens[name].usage
    };
  });
  
  fs.writeFileSync(outputPath, JSON.stringify(simplifiedTokens, null, 2));
  console.log(`✅ Tokens saved to: ${outputPath}`);
  
  return outputPath;
}

/**
 * Main CLI functionality
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log(`🔐 Bearer Token Generator for ${xsAppName}`);
  console.log(`📋 Found ${xsSecurity.scopes.length} scopes in xs-security.json`);
  
  switch (command) {
    case 'all':
    case 'generate':
    default:
      // Generate individual tokens for each scope
      const tokens = generateTokensForScopes();
      
      // Generate combined token with all scopes
      const allScopesToken = generateAllScopesToken();
      tokens['all-scopes'] = allScopesToken;
      
      // Display all tokens
      Object.keys(tokens).forEach(name => {
        displayTokenInfo(name, tokens[name]);
      });
      
      // Save to file
      const outputPath = saveTokensToFile(tokens);
      console.log(`\n📁 All ${Object.keys(tokens).length} tokens saved to: ${outputPath}`);
      
      console.log(`\n🎯 Quick Reference:`);
      Object.keys(tokens).forEach(name => {
        console.log(`  ${name}: ${tokens[name].token.substring(0, 50)}...`);
      });
      break;
      
    case 'help':
      console.log('');
      console.log('Usage:');
      console.log('  node generate-tokens.js [all]     Generate bearer tokens for all scopes');
      console.log('  node generate-tokens.js help      Show this help');
      console.log('');
      console.log('This script reads xs-security.json and generates valid bearer tokens for:');
      xsSecurity.scopes.forEach(scope => {
        console.log(`  - ${scope.name.replace('$XSAPPNAME.', '')}: ${scope.description}`);
      });
      console.log('  - all-scopes: Token with all available scopes');
      break;
  }
}

// Export functions for use in other modules
module.exports = {
  generateTokensForScopes,
  generateAllScopesToken,
  saveTokensToFile,
  MOCK_JWT_SECRET,
  xsAppName
};

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}