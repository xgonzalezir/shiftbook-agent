/**
 * Development Environment Authentication Configuration
 * Mock authentication for local development
 */

module.exports = {
  environment: 'development',
  authentication: {
    kind: 'mocked',
    description: 'Mock authentication for local development',
    
    // Mock users for development
    users: {
      'alice': {
        ID: 'alice',
        tenant: 't1',
        scopes: ['shiftbook.admin'],
        roles: ['admin'],
        description: 'Administrator user for development'
      },
      'bob': {
        ID: 'bob',
        tenant: 't1',
        scopes: ['shiftbook.read', 'shiftbook.write'],
        roles: ['user'],
        description: 'Standard user for development'
      },
      'operator': {
        ID: 'operator',
        tenant: 't1',
        scopes: ['shiftbook.read', 'shiftbook.write'],
        roles: ['operator'],
        description: 'Operator user for development'
      },
      'manager': {
        ID: 'manager',
        tenant: 't1',
        scopes: ['shiftbook.read', 'shiftbook.write', 'shiftbook.admin'],
        roles: ['manager'],
        description: 'Manager user for development'
      },
      'admin': {
        ID: 'admin',
        tenant: 't1',
        scopes: ['shiftbook.read', 'shiftbook.write', 'shiftbook.admin', 'shiftbook.email'],
        roles: ['admin'],
        description: 'Full admin user for development'
      }
    },
    
    // Development-specific settings
    settings: {
      enableLogging: true,
      logLevel: 'debug',
      tokenValidation: false,
      autoLogin: true,
      defaultUser: 'admin'
    },
    
    // Error handling for development
    errorHandling: {
      showStackTraces: true,
      showErrorDetails: true,
      logAuthenticationFailures: true
    }
  },
  
  // Development-specific features
  features: {
    mockEmailSending: true,
    mockDMCIntegration: true,
    skipTokenValidation: true,
    developmentLogging: true
  }
}; 