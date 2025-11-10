// Environment setup for CAP 9.2.0 tests
module.exports = async () => {
  // Enable TypeScript support for CAP
  process.env.CDS_TYPESCRIPT = 'true';
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Configure CAP for testing
  process.env.CDS_ENV = 'test';
  
  // Disable logging for cleaner test output
  process.env.CDS_LOG_LEVEL = 'error';
  
  // Configure test database
  process.env.CDS_DB_KIND = 'sqlite';
  process.env.CDS_DB_CREDENTIALS_DATABASE = ':memory:';
  
  // Disable audit logging for tests
  process.env.CDS_AUDIT_LOG_ENABLED = 'false';
  
  // Configure test messaging
  process.env.CDS_MESSAGING_KIND = 'local-messaging';
  
  // Set test timeout
  process.env.CDS_TEST_TIMEOUT = '30000';
};
