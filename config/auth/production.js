/**
 * Production Environment Authentication Configuration
 * XSUAA authentication for production deployment
 */

module.exports = {
  environment: 'production',
  authentication: {
    kind: 'xsuaa',
    description: 'XSUAA authentication for production deployment',
    
    // XSUAA configuration
    xsuaa: {
      enableJWTValidation: true,
      enableScopeValidation: true,
      enableTokenRefresh: true,
      tokenExpirationHandling: true,
      audienceValidation: true
    },
    
    // Production security settings
    security: {
      requireAuthentication: true,
      requireValidTokens: true,
      enableRateLimiting: true,
      enableAuditLogging: true,
      secureHeaders: true
    },
    
    // Production-specific settings
    settings: {
      enableLogging: true,
      logLevel: 'info',
      tokenValidation: true,
      autoLogin: false,
      defaultUser: null
    },
    
    // Error handling for production
    errorHandling: {
      showStackTraces: false,
      showErrorDetails: false,
      logAuthenticationFailures: true,
      logSecurityEvents: true,
      rateLimitExceeded: true
    }
  },
  
  // Production-specific features
  features: {
    realEmailSending: true,
    realDMCIntegration: true,
    tokenValidation: true,
    productionLogging: true,
    securityMonitoring: true,
    performanceMonitoring: true
  },
  
  // Monitoring and logging
  monitoring: {
    authenticationEvents: true,
    securityViolations: true,
    performanceMetrics: true,
    errorTracking: true,
    auditTrail: true
  }
}; 