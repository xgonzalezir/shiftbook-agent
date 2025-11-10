module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Test file patterns - only E2E tests
  testMatch: [
    '<rootDir>/test/e2e/**/*.test.{js,ts}',
    '<rootDir>/test/e2e/**/*.spec.{js,ts}',
    '<rootDir>/test/e2e/**/*.e2e.test.{js,ts}'
  ],
  
  // Test setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/setup/jest.setup.ts'
  ],
  
  // Coverage disabled for E2E tests (per SAP CAP best practices)
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
  
  // Test timeout - longest for E2E tests
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