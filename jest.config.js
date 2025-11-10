module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Test file patterns - only TypeScript tests (exclude compiled JS)
  testMatch: [
    '<rootDir>/test/**/*.test.ts',
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/test/**/*.integration.test.ts'
  ],
  
  // Test setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/jest.setup.ts'
  ],
  
  // Coverage configuration - focus on business logic only
  collectCoverageFrom: [
    'srv/lib/**/*.ts',           // Business logic in library modules
    // srv/health-check.ts excluded - infrastructure code, tested via integration
    '!srv/server.js',            // Exclude server bootstrap (integration-heavy)
    '!srv/shiftbook-service.js', // Exclude service implementation (integration-heavy)
    '!srv/lib/**/*.js',          // Exclude compiled JavaScript files
    '!srv/lib/**/*.js.map',      // Exclude source maps
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/gen/**',
    '!**/coverage/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'ts',
    'json'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Coverage configuration for TypeScript
  coverageProvider: 'v8',
  collectCoverage: false, // Only when explicitly requested
  
  // Coverage path mapping
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/test/',
    '\\.d\\.ts$'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Environment variables for tests
  setupFiles: [
    '<rootDir>/test/setup/env.setup.js'
  ],
  
  // Module name mapper to avoid conflicts
  moduleNameMapper: {
    '^shiftbook-cap$': '<rootDir>/package.json'
  }
};
