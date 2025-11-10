/**
 * Test Environment Authentication Configuration
 * Dummy authentication for automated testing
 */

module.exports = {
  environment: 'test',
  authentication: {
    kind: 'dummy',
    description: 'Dummy authentication with predefined test users',
    
    // Test users for automated testing
    users: {
      'test-readonly': {
        ID: 'test-readonly',
        tenant: 't1',
        scopes: ['shiftbook.read'],
        roles: ['reader'],
        description: 'Read-only test user'
      },
      'test-user': {
        ID: 'test-user',
        tenant: 't1',
        scopes: ['shiftbook.read', 'shiftbook.user'],
        roles: ['user'],
        description: 'Standard test user'
      },
      'test-admin': {
        ID: 'test-admin',
        tenant: 't1',
        scopes: ['shiftbook.read', 'shiftbook.user', 'shiftbook.admin'],
        roles: ['admin'],
        description: 'Admin test user'
      },
      'test-operator': {
        ID: 'test-operator',
        tenant: 't1',
        scopes: ['shiftbook.read', 'shiftbook.write'],
        roles: ['operator'],
        description: 'Operator test user'
      },
      'test-manager': {
        ID: 'test-manager',
        tenant: 't1',
        scopes: ['shiftbook.read', 'shiftbook.write', 'shiftbook.admin'],
        roles: ['manager'],
        description: 'Manager test user'
      }
    },
    
    // Test-specific settings
    settings: {
      enableLogging: false,
      logLevel: 'error',
      tokenValidation: false,
      autoLogin: false,
      defaultUser: null
    },
    
    // Error handling for testing
    errorHandling: {
      showStackTraces: false,
      showErrorDetails: false,
      logAuthenticationFailures: false
    }
  },
  
  // Test-specific features
  features: {
    mockEmailSending: true,
    mockDMCIntegration: true,
    skipTokenValidation: true,
    testMode: true,
    isolatedTests: true
  }
}; 