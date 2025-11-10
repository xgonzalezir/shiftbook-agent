#!/usr/bin/env node

/**
 * Connection Pool Load Test Script
 * Tests connection pooling with concurrent database operations
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:4004';
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS) || 20;
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS) || 100;
const DELAY_BETWEEN_BATCHES = parseInt(process.env.DELAY_BETWEEN_BATCHES) || 1000;
// Determine the correct auth token based on environment
const getAuthToken = () => {
  if (process.env.AUTH_TOKEN) return process.env.AUTH_TOKEN;
  
  const env = process.env.CDS_ENV || process.env.NODE_ENV || 'development';
  
  // Use different tokens based on detected environment
  if (env === 'test') {
    return 'operator';  // From testUsers in srv/server.js test environment
  } else {
    return 'alice';     // From mockUsers in srv/server.js development environment  
  }
};

const AUTH_TOKEN = getAuthToken();

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Shift Book Logs Query',
    endpoint: '/shiftbook/ShiftBookService/ShiftBookLog',
    method: 'GET',
    description: 'Simple read operation - should benefit from connection pooling'
  },
  {
    name: 'Categories Query',
    endpoint: '/shiftbook/ShiftBookService/ShiftBookCategory',
    method: 'GET',
    description: 'Category lookup - should use connection pool efficiently'
  },
  {
    name: 'Health Check',
    endpoint: '/health',
    method: 'GET',
    description: 'Monitor endpoint - shows pool metrics during load',
    public: true  // Health endpoint is public
  }
];

class ConnectionPoolLoadTester {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTime: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      connectionPoolMetrics: [],
      errors: []
    };
  }

  /**
   * Make a single request and measure performance
   */
  async makeRequest(scenario, requestId) {
    const startTime = performance.now();
    
    try {
      // Build headers - skip auth for public endpoints
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Only add auth header for non-public endpoints
      if (!scenario.public) {
        const env = process.env.CDS_ENV || process.env.NODE_ENV || 'development';
        
        if (env === 'development') {
          // CAP mocked authentication expects Basic auth with username only
          headers['Authorization'] = `Basic ${Buffer.from(AUTH_TOKEN + ':').toString('base64')}`;
        } else {
          // Other environments use Bearer tokens
          headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
        }
      }

      const response = await axios({
        method: scenario.method,
        url: `${BASE_URL}${scenario.endpoint}`,
        timeout: 30000,
        headers
      });

      const responseTime = performance.now() - startTime;
      
      return {
        success: true,
        requestId,
        scenario: scenario.name,
        responseTime,
        statusCode: response.status,
        data: response.data
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      // Log detailed error for debugging
      console.log(`❌ Request ${requestId} failed:`, {
        error: error.message,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      return {
        success: false,
        requestId,
        scenario: scenario.name,
        responseTime,
        error: error.message,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data
      };
    }
  }

  /**
   * Execute concurrent requests for a scenario
   */
  async executeConcurrentRequests(scenario, count) {
    console.log(`\n🚀 Testing: ${scenario.name}`);
    console.log(`📊 Making ${count} concurrent requests...`);
    
    const promises = [];
    const startTime = performance.now();
    
    // Create concurrent requests
    for (let i = 0; i < count; i++) {
      const requestId = `${scenario.name}-${i + 1}`;
      promises.push(this.makeRequest(scenario, requestId));
    }
    
    // Execute all requests concurrently
    const results = await Promise.allSettled(promises);
    const totalTime = performance.now() - startTime;
    
    // Process results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success);
    const rejected = results.filter(r => r.status === 'rejected');
    
    // Calculate metrics
    const responseTimes = successful.map(r => r.value.responseTime);
    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    
    // Update overall results
    this.results.totalRequests += count;
    this.results.successfulRequests += successful.length;
    this.results.failedRequests += failed.length + rejected.length;
    this.results.totalTime += totalTime;
    
    // Update response time metrics
    if (responseTimes.length > 0) {
      this.results.minResponseTime = Math.min(this.results.minResponseTime, minResponseTime);
      this.results.maxResponseTime = Math.max(this.results.maxResponseTime, maxResponseTime);
    }
    
    // Log scenario results
    console.log(`✅ Successful: ${successful.length}/${count}`);
    console.log(`❌ Failed: ${failed.length + rejected.length}/${count}`);
    console.log(`⏱️  Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`📈 Avg Response: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`⚡ Min Response: ${minResponseTime.toFixed(2)}ms`);
    console.log(`🐌 Max Response: ${maxResponseTime.toFixed(2)}ms`);
    
          // Collect errors
      [...failed, ...rejected].forEach(result => {
        let error, errorMessage, statusCode;
        
        if (result.status === 'fulfilled') {
          error = result.value;
          errorMessage = error.error || error.message || 'Unknown error';
          statusCode = error.statusCode || 'N/A';
        } else {
          error = result.reason;
          errorMessage = error.message || error.toString() || 'Unknown error';
          statusCode = 'N/A';
        }
        
        this.results.errors.push({
          scenario: scenario.name,
          error: errorMessage,
          statusCode: statusCode,
          fullError: JSON.stringify(error, null, 2)
        });
      });
    
    return {
      scenario: scenario.name,
      total: count,
      successful: successful.length,
      failed: failed.length + rejected.length,
      totalTime,
      avgResponseTime,
      minResponseTime,
      maxResponseTime
    };
  }

  /**
   * Get connection pool metrics during testing
   */
  async getConnectionPoolMetrics() {
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      // Extract connection pool metrics from health response
      return response.data.metrics?.connectionPool || null;
    } catch (error) {
      console.warn('⚠️  Could not fetch connection pool metrics:', error.message);
      return null;
    }
  }

  /**
   * Run the complete load test
   */
  async runLoadTest() {
    console.log('🔥 Connection Pool Load Test Starting...');
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`👥 Concurrent Requests: ${CONCURRENT_REQUESTS}`);
    console.log(`📊 Total Requests: ${TOTAL_REQUESTS}`);
    console.log(`⏳ Delay Between Batches: ${DELAY_BETWEEN_BATCHES}ms`);
    console.log(`🔐 Environment: ${process.env.CDS_ENV || process.env.NODE_ENV || 'development'}`);
    console.log(`🎟️ Auth Token: ${AUTH_TOKEN}`);
    
    const startTime = performance.now();
    
    // Test each scenario
    for (const scenario of TEST_SCENARIOS) {
      console.log(`\n📋 Scenario: ${scenario.description}`);
      
      // Get initial pool metrics
      const initialMetrics = await this.getConnectionPoolMetrics();
      if (initialMetrics) {
        console.log('📊 Initial Pool Metrics:', {
          totalConnections: initialMetrics.metrics.totalConnections,
          activeConnections: initialMetrics.metrics.activeConnections,
          health: initialMetrics.health.status
        });
      }
      
      // Execute concurrent requests
      const scenarioResults = await this.executeConcurrentRequests(scenario, CONCURRENT_REQUESTS);
      
      // Get final pool metrics
      const finalMetrics = await this.getConnectionPoolMetrics();
      if (finalMetrics) {
        console.log('📊 Final Pool Metrics:', {
          totalConnections: finalMetrics.metrics.totalConnections,
          activeConnections: finalMetrics.metrics.activeConnections,
          acquiredConnections: finalMetrics.metrics.acquiredConnections,
          releasedConnections: finalMetrics.metrics.releasedConnections,
          health: finalMetrics.health.status
        });
        
        // Store metrics for analysis
        this.results.connectionPoolMetrics.push({
          scenario: scenario.name,
          initial: initialMetrics?.metrics || {},
          final: finalMetrics.metrics,
          health: finalMetrics.health
        });
      }
      
      // Wait between scenarios
      if (scenario !== TEST_SCENARIOS[TEST_SCENARIOS.length - 1]) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next scenario...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    // Calculate overall metrics
    this.results.averageResponseTime = this.results.successfulRequests > 0 ? 
      this.results.totalTime / this.results.successfulRequests : 0;
    
    // Print final results
    this.printFinalResults();
    
    // Save results to file
    this.saveResults();
  }

  /**
   * Print final test results
   */
  printFinalResults() {
    console.log('\n🎯 LOAD TEST COMPLETED');
    console.log('='.repeat(50));
    console.log(`📊 Total Requests: ${this.results.totalRequests}`);
    console.log(`✅ Successful: ${this.results.successfulRequests}`);
    console.log(`❌ Failed: ${this.results.failedRequests}`);
    console.log(`📈 Success Rate: ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%`);
    console.log(`⏱️  Total Test Time: ${this.results.totalTime.toFixed(2)}ms`);
    console.log(`📊 Avg Response Time: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`⚡ Best Response: ${this.results.minResponseTime.toFixed(2)}ms`);
    console.log(`🐌 Worst Response: ${this.results.maxResponseTime.toFixed(2)}ms`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors Encountered:');
      this.results.errors.slice(0, 5).forEach(error => {
        console.log(`  - ${error.scenario}: ${error.error}`);
      });
      if (this.results.errors.length > 5) {
        console.log(`  ... and ${this.results.errors.length - 5} more errors`);
      }
    }
    
    // Connection pool analysis
    console.log('\n🔌 Connection Pool Analysis:');
    this.results.connectionPoolMetrics.forEach(metric => {
      console.log(`\n📋 ${metric.scenario}:`);
      console.log(`  Initial: ${metric.initial.totalConnections || 0} total, ${metric.initial.activeConnections || 0} active`);
      console.log(`  Final: ${metric.final.totalConnections} total, ${metric.final.activeConnections} active`);
      console.log(`  Acquired: ${metric.final.acquiredConnections} connections`);
      console.log(`  Released: ${metric.final.releasedConnections} connections`);
      console.log(`  Health: ${metric.health.status}`);
      
      if (metric.health.issues.length > 0) {
        console.log(`  Issues: ${metric.health.issues.join(', ')}`);
      }
    });
  }

  /**
   * Save test results to file
   */
  saveResults() {
    const fs = require('fs');
    const path = require('path');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `connection-pool-test-${timestamp}.json`;
    const filepath = path.join(__dirname, 'results', filename);
    
    // Ensure results directory exists
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Save results
    const resultsData = {
      timestamp: new Date().toISOString(),
      testConfiguration: {
        baseUrl: BASE_URL,
        concurrentRequests: CONCURRENT_REQUESTS,
        totalRequests: TOTAL_REQUESTS,
        delayBetweenBatches: DELAY_BETWEEN_BATCHES
      },
      results: this.results
    };
    
    fs.writeFileSync(filepath, JSON.stringify(resultsData, null, 2));
    console.log(`\n💾 Results saved to: ${filepath}`);
  }
}

// Run the load test
async function main() {
  try {
    const tester = new ConnectionPoolLoadTester();
    await tester.runLoadTest();
  } catch (error) {
    console.error('💥 Load test failed:', error);
    process.exit(1);
  }
}

// Handle command line arguments
if (require.main === module) {
  main();
}

module.exports = ConnectionPoolLoadTester;
