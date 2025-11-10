#!/usr/bin/env node

/**
 * Work Center Performance Test Runner
 *
 * This script runs the performance tests for work center operations
 * and generates detailed performance reports.
 *
 * Usage:
 *   node scripts/run-workcenter-performance-tests.js              # Fast tests
 *   PERFORMANCE_TEST_SCALE=comprehensive node scripts/...        # Comprehensive tests
 *   PERFORMANCE_TEST_SCALE=stress node scripts/...               # Stress tests
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get test scale from environment
const testScale = (process.env.PERFORMANCE_TEST_SCALE || 'fast').toLowerCase();

// Configuration based on test scale
const SCALE_CONFIGS = {
  fast: {
    testTimeout: 300000, // 5 minutes
    description: 'Fast CI/CD tests'
  },
  comprehensive: {
    testTimeout: 900000, // 15 minutes
    description: 'Comprehensive performance validation'
  },
  stress: {
    testTimeout: 1800000, // 30 minutes
    description: 'Production-scale stress tests'
  }
};

const scaleConfig = SCALE_CONFIGS[testScale] || SCALE_CONFIGS.fast;

const CONFIG = {
  testFiles: [
    'test/service/performance/shiftbook-workcenters-performance.integration.test.ts',
    'test/service/performance/shiftbook-log-filtering-performance.integration.test.ts'
  ],
  outputDir: './performance-reports',
  reportFile: `workcenter-performance-report-${testScale}.json`,
  summaryFile: `workcenter-performance-summary-${testScale}.md`,
  testTimeout: scaleConfig.testTimeout,
  maxConcurrency: 1,    // Run tests sequentially for accurate performance measurement
  testScale: testScale,
  scaleDescription: scaleConfig.description
};

// Performance thresholds for validation
const PERFORMANCE_THRESHOLDS = {
  BULK_INSERT_100_WC: 1000,
  BULK_INSERT_1000_WC: 5000,
  BULK_INSERT_10000_WC: 15000,
  LOG_FILTER_SIMPLE: 500,
  LOG_FILTER_COMPLEX: 2000,
  ORIGIN_FILTER_LARGE: 1000,
  DESTINATION_FILTER_LARGE: 2000,
  COMBINED_FILTER_LARGE: 3000
};

class PerformanceTestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory_limit: process.env.NODE_OPTIONS || 'default'
      },
      tests: [],
      summary: {
        total_tests: 0,
        passed_tests: 0,
        failed_tests: 0,
        total_duration: 0,
        performance_issues: []
      }
    };
  }

  async run() {
    console.log('🚀 Starting Work Center Performance Tests');
    console.log(`📊 Test Scale: ${CONFIG.testScale.toUpperCase()} (${CONFIG.scaleDescription})`);
    console.log(`⏱️  Timeout per test file: ${CONFIG.testTimeout / 1000}s`);
    console.log('='.repeat(70));

    // Ensure output directory exists
    this.ensureOutputDirectory();

    const startTime = Date.now();

    for (const testFile of CONFIG.testFiles) {
      console.log(`\n📋 Running: ${testFile}`);
      console.log('-'.repeat(60));

      try {
        const testResult = await this.runTestFile(testFile);
        this.results.tests.push(testResult);

        if (testResult.success) {
          this.results.summary.passed_tests++;
          console.log(`✅ ${testFile} - PASSED`);
        } else {
          this.results.summary.failed_tests++;
          console.log(`❌ ${testFile} - FAILED`);
        }
      } catch (error) {
        console.error(`💥 Error running ${testFile}:`, error.message);
        this.results.tests.push({
          file: testFile,
          success: false,
          error: error.message,
          duration: 0
        });
        this.results.summary.failed_tests++;
      }
    }

    const totalDuration = Date.now() - startTime;
    this.results.summary.total_tests = CONFIG.testFiles.length;
    this.results.summary.total_duration = totalDuration;

    // Generate reports
    await this.generateReports();

    // Print summary
    this.printSummary();

    return this.results.summary.failed_tests === 0;
  }

  async runTestFile(testFile) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const testOutput = [];
      const testErrors = [];

      // Run Jest with specific test file
      const jestArgs = [
        '--testPathPatterns', testFile,
        '--verbose',
        '--runInBand',
        '--detectOpenHandles',
        '--forceExit',
        `--testTimeout=${CONFIG.testTimeout}`
      ];

      const jestProcess = spawn('npx', ['jest', ...jestArgs], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'test',
          CDS_ENV: 'test',
          PERFORMANCE_TEST_SCALE: CONFIG.testScale
        }
      });

      jestProcess.stdout.on('data', (data) => {
        const output = data.toString();
        testOutput.push(output);
        process.stdout.write(output);
      });

      jestProcess.stderr.on('data', (data) => {
        const error = data.toString();
        testErrors.push(error);
        process.stderr.write(error);
      });

      jestProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        const output = testOutput.join('');
        const errors = testErrors.join('');

        // Parse performance metrics from output
        const performanceMetrics = this.parsePerformanceMetrics(output);

        const result = {
          file: testFile,
          success: code === 0,
          duration,
          exitCode: code,
          output: output.substring(0, 5000), // Limit output size
          errors: errors.substring(0, 2000),  // Limit error size
          performanceMetrics
        };

        resolve(result);
      });

      jestProcess.on('error', (error) => {
        reject(error);
      });

      // Set timeout
      setTimeout(() => {
        jestProcess.kill('SIGTERM');
        reject(new Error(`Test timeout after ${CONFIG.testTimeout}ms`));
      }, CONFIG.testTimeout);
    });
  }

  parsePerformanceMetrics(output) {
    const metrics = {};
    const lines = output.split('\n');

    for (const line of lines) {
      // Look for performance measurement lines
      if (line.includes('Duration:') && line.includes('ms')) {
        const match = line.match(/Duration:\s*([\d.]+)ms/);
        if (match) {
          const testNameMatch = line.match(/📊\s*([^:]+):/);
          if (testNameMatch) {
            metrics[testNameMatch[1].trim()] = parseFloat(match[1]);
          }
        }
      }

      // Look for memory usage lines
      if (line.includes('Memory Delta')) {
        const match = line.match(/Memory Delta[^:]*:\s*([\d.-]+)MB/);
        const testNameMatch = line.match(/📊\s*([^:]+):/);
        if (match && testNameMatch) {
          const testName = testNameMatch[1].trim();
          if (!metrics[testName]) metrics[testName] = {};
          metrics[testName].memoryDelta = parseFloat(match[1]);
        }
      }
    }

    return metrics;
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
  }

  async generateReports() {
    console.log('\n📄 Generating performance reports...');

    // Generate JSON report
    const reportPath = path.join(CONFIG.outputDir, CONFIG.reportFile);
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`   JSON Report: ${reportPath}`);

    // Generate Markdown summary
    const summaryPath = path.join(CONFIG.outputDir, CONFIG.summaryFile);
    const markdownSummary = this.generateMarkdownSummary();
    fs.writeFileSync(summaryPath, markdownSummary);
    console.log(`   Summary Report: ${summaryPath}`);
  }

  generateMarkdownSummary() {
    const { summary, tests, timestamp, environment } = this.results;

    let markdown = `# Work Center Performance Test Report\n\n`;
    markdown += `**Generated:** ${timestamp}\n`;
    markdown += `**Test Scale:** ${CONFIG.testScale.toUpperCase()} (${CONFIG.scaleDescription})\n`;
    markdown += `**Environment:** Node.js ${environment.node_version} on ${environment.platform}\n`;
    markdown += `**Timeout:** ${CONFIG.testTimeout / 1000}s per test file\n\n`;

    // Summary section
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${summary.total_tests}\n`;
    markdown += `- **Passed:** ${summary.passed_tests} ✅\n`;
    markdown += `- **Failed:** ${summary.failed_tests} ${summary.failed_tests > 0 ? '❌' : '✅'}\n`;
    markdown += `- **Total Duration:** ${(summary.total_duration / 1000).toFixed(2)}s\n\n`;

    // Test results section
    markdown += `## Test Results\n\n`;
    for (const test of tests) {
      const status = test.success ? '✅ PASS' : '❌ FAIL';
      const duration = (test.duration / 1000).toFixed(2);

      markdown += `### ${test.file} ${status}\n`;
      markdown += `- **Duration:** ${duration}s\n`;

      if (test.performanceMetrics && Object.keys(test.performanceMetrics).length > 0) {
        markdown += `- **Performance Metrics:**\n`;
        for (const [metricName, value] of Object.entries(test.performanceMetrics)) {
          if (typeof value === 'number') {
            markdown += `  - ${metricName}: ${value.toFixed(2)}ms\n`;
          } else if (typeof value === 'object') {
            markdown += `  - ${metricName}:\n`;
            for (const [subKey, subValue] of Object.entries(value)) {
              markdown += `    - ${subKey}: ${subValue}\n`;
            }
          }
        }
      }

      if (!test.success && test.errors) {
        markdown += `- **Errors:**\n\`\`\`\n${test.errors.substring(0, 500)}\n\`\`\`\n`;
      }

      markdown += `\n`;
    }

    // Performance analysis
    markdown += `## Performance Analysis\n\n`;
    markdown += this.generatePerformanceAnalysis();

    // Recommendations
    markdown += `## Recommendations\n\n`;
    markdown += this.generateRecommendations();

    return markdown;
  }

  generatePerformanceAnalysis() {
    let analysis = '';
    const issues = [];

    for (const test of this.results.tests) {
      if (test.performanceMetrics) {
        for (const [metricName, value] of Object.entries(test.performanceMetrics)) {
          if (typeof value === 'number') {
            // Check against thresholds
            const threshold = this.getThresholdForMetric(metricName);
            if (threshold && value > threshold) {
              issues.push(`⚠️ **${metricName}** exceeded threshold: ${value.toFixed(2)}ms > ${threshold}ms`);
            }
          }
        }
      }
    }

    if (issues.length > 0) {
      analysis += '### Performance Issues Found\n\n';
      for (const issue of issues) {
        analysis += `${issue}\n`;
      }
      analysis += '\n';
    } else {
      analysis += '### ✅ No Performance Issues Detected\n\nAll performance metrics are within acceptable thresholds.\n\n';
    }

    return analysis;
  }

  generateRecommendations() {
    let recommendations = '';
    const { passed_tests, failed_tests, total_tests } = this.results.summary;

    if (failed_tests === 0) {
      recommendations += '✅ **All tests passed!** The work center performance is within acceptable limits.\n\n';
      recommendations += '**Ongoing Monitoring:**\n';
      recommendations += '- Run these tests regularly as part of CI/CD pipeline\n';
      recommendations += '- Monitor production performance metrics\n';
      recommendations += '- Set up alerts for performance degradation\n\n';
    } else {
      recommendations += '❌ **Performance issues detected.** Consider the following improvements:\n\n';
      recommendations += '**Database Optimization:**\n';
      recommendations += '- Review and optimize database indexes\n';
      recommendations += '- Consider query optimization for complex joins\n';
      recommendations += '- Evaluate connection pool configuration\n\n';

      recommendations += '**Application Optimization:**\n';
      recommendations += '- Implement result caching for frequent queries\n';
      recommendations += '- Consider batch processing for bulk operations\n';
      recommendations += '- Review memory usage patterns\n\n';
    }

    recommendations += '**Performance Testing Best Practices:**\n';
    recommendations += '- Run tests in production-like environments\n';
    recommendations += '- Include performance tests in regression testing\n';
    recommendations += '- Monitor real user performance metrics\n';

    return recommendations;
  }

  getThresholdForMetric(metricName) {
    // Map metric names to thresholds
    const thresholdMap = {
      'Bulk Insert 100 Work Centers': PERFORMANCE_THRESHOLDS.BULK_INSERT_100_WC,
      'Bulk Insert 1000 Work Centers': PERFORMANCE_THRESHOLDS.BULK_INSERT_1000_WC,
      'Bulk Insert 10000 Work Centers': PERFORMANCE_THRESHOLDS.BULK_INSERT_10000_WC,
      'Filter Logs by Origin Work Center': PERFORMANCE_THRESHOLDS.LOG_FILTER_SIMPLE,
      'Filter Logs by Destination Work Center': PERFORMANCE_THRESHOLDS.LOG_FILTER_COMPLEX,
      'Origin Workcenter Filter - Large Dataset': PERFORMANCE_THRESHOLDS.ORIGIN_FILTER_LARGE,
      'Destination Workcenter Filter - Large Dataset': PERFORMANCE_THRESHOLDS.DESTINATION_FILTER_LARGE,
      'Combined Workcenter Filter - Large Dataset': PERFORMANCE_THRESHOLDS.COMBINED_FILTER_LARGE
    };

    return thresholdMap[metricName];
  }

  printSummary() {
    const { summary } = this.results;

    console.log('\n' + '='.repeat(60));
    console.log('🎯 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${summary.total_tests}`);
    console.log(`✅ Passed: ${summary.passed_tests}`);
    console.log(`❌ Failed: ${summary.failed_tests}`);
    console.log(`⏱️  Total Duration: ${(summary.total_duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(60));

    if (summary.failed_tests === 0) {
      console.log('🎉 All performance tests passed!');
    } else {
      console.log('⚠️  Some performance tests failed. Check the detailed report.');
    }

    console.log(`📁 Reports generated in: ${CONFIG.outputDir}/`);
  }
}

// Main execution
async function main() {
  const runner = new PerformanceTestRunner();

  try {
    const success = await runner.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Performance test runner failed:', error);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTestRunner;