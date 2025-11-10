#!/usr/bin/env node

/**
 * Temporary Script to Disable Custom Authentication Middleware
 * 
 * This script helps identify if custom authentication middleware is causing conflicts
 * with CAP's built-in mock authentication.
 */

const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'srv', 'server.js');
const backupFile = path.join(__dirname, '..', 'srv', 'server.js.backup');

function log(message, color = '\x1b[0m') {
  console.log(`${color}${message}\x1b[0m`);
}

function logSuccess(message) {
  log(`✅ ${message}`, '\x1b[32m');
}

function logError(message) {
  log(`❌ ${message}`, '\x1b[31m');
}

function logWarning(message) {
  log(`⚠️  ${message}`, '\x1b[33m');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, '\x1b[34m');
}

async function disableCustomAuth() {
  try {
    logInfo('Checking server configuration...');
    
    if (!fs.existsSync(serverFile)) {
      logError(`Server file not found: ${serverFile}`);
      return;
    }
    
    let content = fs.readFileSync(serverFile, 'utf8');
    
    // Check if custom auth is already disabled
    if (content.includes('// CUSTOM_AUTH_DISABLED')) {
      logWarning('Custom authentication is already disabled');
      return;
    }
    
    // Create backup
    fs.writeFileSync(backupFile, content);
    logSuccess(`Backup created: ${backupFile}`);
    
    // Disable custom authentication middleware
    const disabledContent = content.replace(
      /if \(environment\.isCloud\) \{[\s\S]*?setupAuthentication\(app, environment, authConfig\);[\s\S]*?\} else \{[\s\S]*?console\.log\('🔧 Using CAP built-in mocked authentication for non-cloud environment'\);[\s\S]*?\}/,
      `// CUSTOM_AUTH_DISABLED - Temporarily disabled for testing
  console.log('🔧 Using CAP built-in mocked authentication for all environments (custom auth disabled)');`
    );
    
    fs.writeFileSync(serverFile, disabledContent);
    logSuccess('Custom authentication middleware disabled');
    logInfo('Restart your server for changes to take effect');
    logInfo('Run: npm start');
    
  } catch (error) {
    logError(`Failed to disable custom auth: ${error.message}`);
  }
}

async function restoreCustomAuth() {
  try {
    logInfo('Restoring custom authentication...');
    
    if (!fs.existsSync(backupFile)) {
      logError(`Backup file not found: ${backupFile}`);
      return;
    }
    
    const backupContent = fs.readFileSync(backupFile, 'utf8');
    fs.writeFileSync(serverFile, backupContent);
    
    logSuccess('Custom authentication restored');
    logInfo('Restart your server for changes to take effect');
    
  } catch (error) {
    logError(`Failed to restore custom auth: ${error.message}`);
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'disable') {
  disableCustomAuth();
} else if (command === 'restore') {
  restoreCustomAuth();
} else {
  logInfo('Usage:');
  logInfo('  node scripts/disable-custom-auth.js disable  # Disable custom auth');
  logInfo('  node scripts/disable-custom-auth.js restore  # Restore custom auth');
}
