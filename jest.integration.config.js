module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Test file patterns - only integration tests
  testMatch: [
    '<rootDir>/test/integration/**/*.test.{js,ts}',
    '<rootDir>/test/integration/**/*.spec.{js,ts}'
  ],
  
  // Test setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/jest.setup.ts'
  ],
  
  // Coverage disabled for integration tests (per SAP CAP best practices)
  collectCoverage: false,
  
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
  
  // Test timeout - longer for integration tests with server startup
  testTimeout: 120000,
  
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
  
  // Module name mapper
  moduleNameMapper: {
    '^shiftbook-cap$': '<rootDir>/package.json'
  }
};