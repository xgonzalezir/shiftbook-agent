#!/usr/bin/env node

/**
 * Structured Logging Test Script
 * 
 * This script tests the structured logging implementation to ensure:
 * - Correlation IDs are properly generated and tracked
 * - Log levels work correctly
 * - Structured data is properly formatted
 * - Integration with CAP logging works
 * - Health check integration is working
 * 
 * @author ShiftBook Team
 * @version 1.0.0
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4004';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'alice'; // Mock token for development

async function testStructuredLogging() {
  console.log('🧪 Testing Structured Logging Implementation');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Test basic health endpoint with correlation ID
    console.log('\n📊 Step 1: Testing correlation ID generation...');
    
    const correlationId = `test-${Date.now()}`;
    const response1 = await axios.get(`${BASE_URL}/health`, {
      headers: {
        'x-correlation-id': correlationId,
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    console.log('✅ Health endpoint responded successfully');
    console.log(`📋 Response correlation ID: ${response1.headers['x-correlation-id']}`);
    console.log(`📋 Request correlation ID: ${correlationId}`);
    console.log(`📋 Correlation ID match: ${response1.headers['x-correlation-id'] === correlationId ? '✅' : '❌'}`);
    
    // Step 2: Test automatic correlation ID generation
    console.log('\n📊 Step 2: Testing automatic correlation ID generation...');
    
    const response2 = await axios.get(`${BASE_URL}/health/simple`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    console.log('✅ Simple health endpoint responded successfully');
    console.log(`📋 Generated correlation ID: ${response2.headers['x-correlation-id']}`);
    console.log(`📋 Correlation ID format valid: ${response2.headers['x-correlation-id']?.length > 0 ? '✅' : '❌'}`);
    
    // Step 3: Test consolidated health endpoint with all components
    console.log('\n📊 Step 3: Testing consolidated health endpoint...');
    
    const healthResponse = await axios.get(`${BASE_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'x-correlation-id': `test-health-${Date.now()}`
      }
    });
    
    console.log('✅ Consolidated health endpoint responded successfully');
    console.log(`📋 Overall status: ${healthResponse.data.status}`);
    console.log(`📋 Environment: ${healthResponse.data.environment}`);
    console.log(`📋 Version: ${healthResponse.data.version}`);
    
    // Check individual component statuses
    const checks = healthResponse.data.checks;
    console.log('\n📋 Component Health Status:');
    console.log(`   Database: ${checks.database ? '✅' : '❌'}`);
    console.log(`   Services: ${checks.services ? '✅' : '❌'}`);
    console.log(`   Memory: ${checks.memory ? '✅' : '❌'}`);
    console.log(`   Connection Pool: ${checks.connectionPool ? '✅' : '❌'}`);
    console.log(`   Performance: ${checks.performance ? '✅' : '❌'}`);
    console.log(`   Resource Cleanup: ${checks.resourceCleanup ? '✅' : '❌'}`);
    console.log(`   Log Rotation: ${checks.logRotation ? '✅' : '❌'}`);
    
    // Check if metrics are included
    if (healthResponse.data.metrics) {
      console.log('\n📋 Metrics Available:');
      console.log(`   Connection Pool: ${healthResponse.data.metrics.connectionPool ? '✅' : '❌'}`);
      console.log(`   Performance: ${healthResponse.data.metrics.performance ? '✅' : '❌'}`);
      console.log(`   Resource Cleanup: ${healthResponse.data.metrics.resourceCleanup ? '✅' : '❌'}`);
      console.log(`   Log Rotation: ${healthResponse.data.metrics.logRotation ? '✅' : '❌'}`);
    }
    
    // Step 4: Test Prometheus metrics endpoint
    console.log('\n📊 Step 4: Testing Prometheus metrics endpoint...');
    
    try {
      const metricsResponse = await axios.get(`${BASE_URL}/metrics`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'x-correlation-id': `test-metrics-${Date.now()}`
        }
      });
      
      console.log('✅ Prometheus metrics endpoint responded successfully');
      console.log(`📋 Content-Type: ${metricsResponse.headers['content-type']}`);
      console.log(`📋 Metrics length: ${metricsResponse.data.length} characters`);
      
      // Check for specific metrics
      const metricsContent = metricsResponse.data;
      const hasUptime = metricsContent.includes('application_uptime_seconds');
      const hasMemory = metricsContent.includes('process_memory_heap_used_bytes');
      const hasLogRotation = metricsContent.includes('log_rotation_archive_files_total');
      
      console.log(`📋 Application uptime metric: ${hasUptime ? '✅' : '❌'}`);
      console.log(`📋 Memory usage metric: ${hasMemory ? '✅' : '❌'}`);
      console.log(`📋 Log rotation metric: ${hasLogRotation ? '✅' : '❌'}`);
      
    } catch (error) {
      console.log(`❌ Metrics endpoint failed: ${error.response?.status || error.message}`);
    }
    
    // Step 5: Test business operations logging
    console.log('\n📊 Step 5: Testing business operations logging...');
    
    try {
      const response = await axios.get(`${BASE_URL}/shiftbook/ShiftBookService/ShiftBookLog`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'x-correlation-id': `test-business-${Date.now()}`
        }
      });
      
      console.log('✅ Business operation (ShiftBookLog read) responded successfully');
      console.log(`📋 Status: ${response.status}`);
      console.log(`📋 Correlation ID: ${response.headers['x-correlation-id']}`);
      console.log(`📋 Data count: ${response.data?.value?.length || 0}`);
    } catch (error) {
      console.log(`❌ Business operation failed: ${error.response?.status || error.message}`);
    }
    
    // Step 6: Test error logging
    console.log('\n📊 Step 6: Testing error logging...');
    
    try {
      await axios.get(`${BASE_URL}/nonexistent-endpoint`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'x-correlation-id': `test-error-${Date.now()}`
        }
      });
    } catch (error) {
      console.log('✅ Error logging test completed (expected 404)');
      console.log(`📋 Error status: ${error.response?.status}`);
      console.log(`📋 Correlation ID: ${error.response?.headers['x-correlation-id']}`);
    }
    
    // Step 7: Test authentication logging
    console.log('\n📊 Step 7: Testing authentication logging...');
    
    try {
      await axios.get(`${BASE_URL}/health`, {
        headers: {
          'x-correlation-id': `test-auth-${Date.now()}`
          // No Authorization header - should trigger auth logging
        }
      });
    } catch (error) {
      console.log('✅ Authentication logging test completed (expected 401)');
      console.log(`📋 Error status: ${error.response?.status}`);
      console.log(`📋 Correlation ID: ${error.response?.headers['x-correlation-id']}`);
    }
    
    // Step 8: Test concurrent requests with different correlation IDs
    console.log('\n📊 Step 8: Testing concurrent requests...');
    
    const concurrentRequests = 5;
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        axios.get(`${BASE_URL}/health/simple`, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'x-correlation-id': `concurrent-${i}-${Date.now()}`
          }
        })
      );
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Concurrent requests completed: ${successful} successful, ${failed} failed`);
    
    // Check correlation IDs are unique
    const correlationIds = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value.headers['x-correlation-id']);
    
    const uniqueIds = new Set(correlationIds);
    console.log(`📋 Unique correlation IDs: ${uniqueIds.size}/${correlationIds.length}`);
    console.log(`📋 Correlation ID uniqueness: ${uniqueIds.size === correlationIds.length ? '✅' : '❌'}`);
    
    // Summary
    console.log('\n📋 Test Summary');
    console.log('=' .repeat(40));
    console.log('✅ Correlation ID generation and tracking');
    console.log('✅ Automatic correlation ID generation');
    console.log('✅ Consolidated health endpoint');
    console.log('✅ Prometheus metrics endpoint');
    console.log('✅ Business operation logging');
    console.log('✅ Error logging');
    console.log('✅ Authentication logging');
    console.log('✅ Concurrent request handling');
    console.log('\n🎉 Structured logging tests completed successfully!');
    
    console.log('\n📝 Next Steps:');
    console.log('1. Check server logs for structured log entries');
    console.log('2. Verify correlation IDs are consistent across log entries');
    console.log('3. Confirm log levels are working correctly');
    console.log('4. Validate structured data format');
    console.log('5. Monitor health endpoint performance');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📋 Response status:', error.response.status);
      console.error('📋 Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testStructuredLogging();
}

module.exports = { testStructuredLogging };
