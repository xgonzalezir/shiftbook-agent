module.exports = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  testMatch: ['<rootDir>/debug-coverage.test.ts'],
  collectCoverageFrom: ['srv/lib/rate-limiter.ts'],
  coverageReporters: ['text'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true
};