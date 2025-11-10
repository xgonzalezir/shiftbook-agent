/**
 * Authentication Configuration Loader
 * Dynamically loads environment-specific authentication configurations
 */

const path = require('path');
const fs = require('fs');

/**
 * Get the current environment
 */
const getCurrentEnvironment = () => {
  const env = process.env.NODE_ENV || 'development';
  const cdsEnv = process.env.CDS_ENV;
  
  // Determine the actual environment
  if (process.env.VCAP_APPLICATION) {
    return 'production';
  } else if (cdsEnv === 'hybrid') {
    return 'hybrid';
  } else if (env === 'test') {
    return 'test';
  } else {
    return 'development';
  }
};

/**
 * Load authentication configuration for the current environment
 */
const loadAuthConfig = (environment = null) => {
  const env = environment || getCurrentEnvironment();
  const configPath = path.join(__dirname, `${env}.js`);
  
  try {
    if (fs.existsSync(configPath)) {
      const config = require(configPath);
      console.log(`📋 Loaded authentication config for environment: ${env}`);
      return config;
    } else {
      console.warn(`⚠️ No authentication config found for environment: ${env}, using development config`);
      return require('./development.js');
    }
  } catch (error) {
    console.error(`❌ Error loading authentication config for ${env}:`, error.message);
    console.log(`🔄 Falling back to development config`);
    return require('./development.js');
  }
};

/**
 * Get authentication configuration with environment detection
 */
const getAuthConfig = () => {
  const environment = getCurrentEnvironment();
  const config = loadAuthConfig(environment);
  
  return {
    environment,
    config,
    isDevelopment: environment === 'development',
    isTest: environment === 'test',
    isProduction: environment === 'production',
    isHybrid: environment === 'hybrid',
    isCloud: environment === 'production' || environment === 'hybrid'
  };
};

/**
 * Validate authentication configuration
 */
const validateAuthConfig = (config) => {
  const errors = [];
  
  if (!config.authentication) {
    errors.push('Missing authentication configuration');
  }
  
  if (!config.authentication.kind) {
    errors.push('Missing authentication kind');
  }
  
  if (config.authentication.kind === 'mocked' || config.authentication.kind === 'dummy') {
    if (!config.authentication.users) {
      errors.push('Missing users configuration for mock/dummy authentication');
    }
  }
  
  if (config.authentication.kind === 'xsuaa') {
    if (!config.authentication.xsuaa) {
      errors.push('Missing XSUAA configuration');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Authentication configuration validation failed: ${errors.join(', ')}`);
  }
  
  return true;
};

/**
 * Get users for the current environment
 */
const getUsers = () => {
  const { config } = getAuthConfig();
  return config.authentication.users || {};
};

/**
 * Get user by ID
 */
const getUser = (userId) => {
  const users = getUsers();
  return users[userId] || null;
};

/**
 * Check if user has scope
 */
const hasScope = (userId, scope) => {
  const user = getUser(userId);
  if (!user || !user.scopes) {
    return false;
  }
  return user.scopes.includes(scope);
};

/**
 * Check if user has role
 */
const hasRole = (userId, role) => {
  const user = getUser(userId);
  if (!user || !user.roles) {
    return false;
  }
  return user.roles.includes(role);
};

module.exports = {
  getCurrentEnvironment,
  loadAuthConfig,
  getAuthConfig,
  validateAuthConfig,
  getUsers,
  getUser,
  hasScope,
  hasRole
}; 