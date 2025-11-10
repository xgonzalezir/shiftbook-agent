/**
 * Health Check Configuration for ShiftBook CAP Application
 * Provides environment-specific health check URLs and settings
 */

const config = {
  // Development environment
  development: {
    baseUrl: 'http://localhost:4004',
    healthEndpoint: '/health',
    simpleHealthEndpoint: '/health/simple',
    timeout: 30,
    retries: 3,
    retryDelay: 5
  },
  
  // Testing environment
  testing: {
    baseUrl: process.env.TEST_HEALTH_URL || 'https://shiftbook-cap-test.cfapps.eu10.hana.ondemand.com',
    healthEndpoint: '/health',
    simpleHealthEndpoint: '/health/simple',
    timeout: 60,
    retries: 5,
    retryDelay: 10
  },
  
  // Production environment
  production: {
    baseUrl: process.env.PROD_HEALTH_URL || 'https://shiftbook-cap.cfapps.eu10.hana.ondemand.com',
    healthEndpoint: '/health',
    simpleHealthEndpoint: '/health/simple',
    timeout: 120,
    retries: 3,
    retryDelay: 15
  },
  
  // CI/CD Pipeline environment
  pipeline: {
    baseUrl: process.env.HEALTH_CHECK_URL || process.env.CF_APP_URL,
    healthEndpoint: '/health',
    simpleHealthEndpoint: '/health/simple',
    timeout: 300,
    retries: 10,
    retryDelay: 10
  }
};

/**
 * Get health check configuration for a specific environment
 * @param {string} env - Environment name (development, testing, production, pipeline)
 * @returns {Object} Health check configuration
 */
function getHealthCheckConfig(env = 'development') {
  const envConfig = config[env] || config.development;
  
  return {
    ...envConfig,
    fullHealthUrl: `${envConfig.baseUrl}${envConfig.healthEndpoint}`,
    simpleHealthUrl: `${envConfig.baseUrl}${envConfig.simpleHealthEndpoint}`
  };
}

/**
 * Get health check configuration based on current environment
 * @returns {Object} Health check configuration
 */
function getCurrentHealthCheckConfig() {
  const env = process.env.CDS_ENV || process.env.NODE_ENV || 'development';
  
  // Map environment names to config keys
  const envMap = {
    'development': 'development',
    'dev': 'development',
    'test': 'testing',
    'testing': 'testing',
    'production': 'production',
    'prod': 'production',
    'pipeline': 'pipeline'
  };
  
  const configKey = envMap[env] || 'development';
  return getHealthCheckConfig(configKey);
}

/**
 * Generate health check commands for different environments
 * @returns {Object} Health check commands
 */
function getHealthCheckCommands() {
  const currentConfig = getCurrentHealthCheckConfig();
  
  return {
    development: `curl -f ${currentConfig.fullHealthUrl} || echo 'Dev health check failed'`,
    testing: `curl -f ${currentConfig.fullHealthUrl} || echo 'Test health check failed'`,
    production: `curl -f ${currentConfig.fullHealthUrl} || echo 'Prod health check failed'`,
    pipeline: `curl -f ${currentConfig.fullHealthUrl} || echo 'Pipeline health check failed'`,
    simple: {
      development: `curl -f ${currentConfig.simpleHealthUrl} || echo 'Dev simple health check failed'`,
      testing: `curl -f ${currentConfig.simpleHealthUrl} || echo 'Test simple health check failed'`,
      production: `curl -f ${currentConfig.simpleHealthUrl} || echo 'Prod simple health check failed'`,
      pipeline: `curl -f ${currentConfig.simpleHealthUrl} || echo 'Pipeline simple health check failed'`
    }
  };
}

/**
 * Validate health check configuration
 * @param {Object} config - Health check configuration to validate
 * @returns {boolean} True if configuration is valid
 */
function validateHealthCheckConfig(config) {
  if (!config.baseUrl) {
    console.error('❌ Health check configuration missing baseUrl');
    return false;
  }
  
  if (!config.healthEndpoint) {
    console.error('❌ Health check configuration missing healthEndpoint');
    return false;
  }
  
  if (config.timeout < 0) {
    console.error('❌ Health check configuration has invalid timeout');
    return false;
  }
  
  if (config.retries < 0) {
    console.error('❌ Health check configuration has invalid retries');
    return false;
  }
  
  return true;
}

// Export functions and configuration
module.exports = {
  config,
  getHealthCheckConfig,
  getCurrentHealthCheckConfig,
  getHealthCheckCommands,
  validateHealthCheckConfig
};

// If running directly, show current configuration
if (require.main === module) {
  const currentConfig = getCurrentHealthCheckConfig();
  const commands = getHealthCheckCommands();
  
  console.log('🏥 Health Check Configuration');
  console.log('============================');
  console.log(`Environment: ${process.env.CDS_ENV || process.env.NODE_ENV || 'development'}`);
  console.log(`Base URL: ${currentConfig.baseUrl}`);
  console.log(`Health Endpoint: ${currentConfig.fullHealthUrl}`);
  console.log(`Simple Health Endpoint: ${currentConfig.simpleHealthUrl}`);
  console.log(`Timeout: ${currentConfig.timeout}s`);
  console.log(`Retries: ${currentConfig.retries}`);
  console.log(`Retry Delay: ${currentConfig.retryDelay}s`);
  console.log('');
  console.log('Available Commands:');
  console.log('==================');
  Object.entries(commands).forEach(([env, cmd]) => {
    if (typeof cmd === 'string') {
      console.log(`${env}: ${cmd}`);
    } else {
      Object.entries(cmd).forEach(([type, typeCmd]) => {
        console.log(`${env}.${type}: ${typeCmd}`);
      });
    }
  });
}
