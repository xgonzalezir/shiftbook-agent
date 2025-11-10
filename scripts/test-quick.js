#!/usr/bin/env node

/**
 * Quick Test Runner
 * 
 * Runs tests but skips the most problematic/long-running test files
 * to provide fast feedback during development.
 */

const { execSync } = require('child_process');

const config = {
  // Skip tests that are known to be slow or problematic
  skipFiles: [
    'test/unit/lib/resource-cleanup.test.ts'    // Long cleanup delays
  ],
  
  // Run only unit tests that are fast
  includePattern: 'test/unit/**/*.test.ts',
  
  // Jest options for faster execution
  jestOptions: [
    '--verbose',
    '--no-coverage',           // Skip coverage for speed
    '--maxWorkers=4',          // Use multiple workers
    '--testTimeout=10000',     // Reduce timeout from 30s to 10s
    '--forceExit',            // Force exit after tests
    '--detectOpenHandles',    // Help with cleanup
  ]
};

function runQuickTests() {
  console.log('🚀 Running Quick Test Suite (Unit Tests Only)');
  console.log(`⏭️  Skipping: ${config.skipFiles.join(', ')}`);
  console.log(`✅ Running: ${config.includePattern}`);
  
  try {
    const skipPattern = config.skipFiles.map(file => `--testPathIgnorePatterns="${file}"`).join(' ');
    const jestOptions = config.jestOptions.join(' ');
    
    const command = `npx jest ${config.includePattern} ${skipPattern} ${jestOptions}`;
    
    console.log(`\n📋 Command: ${command}\n`);
    
    execSync(command, { 
      stdio: 'inherit',
      timeout: 120000 // 2 minute max
    });
    
    console.log('\n✅ Quick tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Quick tests failed:', error.message);
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Quick Test Runner - Fast unit test execution

Usage:
  node scripts/test-quick.js

Features:
  ✅ Runs unit tests only
  ❌ Skips integration/e2e tests  
  ❌ Skips resource-cleanup tests (long delays)
  ⚡ Reduced timeouts for faster feedback
  🚀 Multiple workers for parallel execution

For full test suite:
  npm run test:all
`);
  process.exit(0);
}

// Run the quick tests
runQuickTests();