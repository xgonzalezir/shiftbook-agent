#!/usr/bin/env node

/**
 * Test script to verify connection pool monitoring integration
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4004';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'alice'; // Mock token for development

async function testPoolMonitoring() {
  console.log('🧪 Testing Connection Pool Monitoring Integration');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Check health endpoint to see initial pool state
    console.log('\n📊 Step 1: Checking initial pool health...');
    const initialHealth = await axios.get(`${BASE_URL}/health/connection-pool`);
    console.log('Initial pool metrics:', JSON.stringify(initialHealth.data.metrics, null, 2));
    
    // Step 2: Generate some database activity
    console.log('\n🔄 Step 2: Generating database activity...');
    const requests = [];
    
    // Create 10 concurrent requests to generate pool activity
    // Try different endpoints to ensure we hit the database
    const endpoints = [
      '/health', // This should trigger some DB checks
      '/health/simple',
      '/health', 
      '/health/simple',
      '/health',
    ];
    
    for (let i = 0; i < 5; i++) {
      requests.push(
        axios.get(`${BASE_URL}${endpoints[i]}`, {
          headers: {
            'Accept': 'application/json'
          }
        }).catch(err => {
          console.log(`Request ${i + 1} failed:`, err.response?.status || err.message);
          return null;
        })
      );
    }
    
    // Also try to trigger actual database queries with auth
    for (let i = 0; i < 5; i++) {
      requests.push(
        axios.get(`${BASE_URL}/odata/v4/catalog/Books`, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Accept': 'application/json'
          }
        }).catch(err => {
          console.log(`Request ${i + 6} to /catalog/Books failed:`, err.response?.status || err.message);
          return null;
        })
      );
    }
    
    // Wait for all requests to complete
    const results = await Promise.all(requests);
    const successful = results.filter(r => r !== null).length;
    console.log(`✅ Completed ${successful}/10 requests successfully`);
    
    // Step 3: Check pool metrics after activity
    console.log('\n📊 Step 3: Checking pool metrics after activity...');
    const afterHealth = await axios.get(`${BASE_URL}/health/connection-pool`);
    console.log('Pool metrics after activity:', JSON.stringify(afterHealth.data.metrics, null, 2));
    
    // Step 4: Check recent events
    console.log('\n📝 Step 4: Recent pool events:');
    const recentEvents = afterHealth.data.recentEvents || [];
    console.log(`Found ${recentEvents.length} recent events`);
    
    if (recentEvents.length > 0) {
      // Show last 5 events
      recentEvents.slice(-5).forEach(event => {
        console.log(`  - ${event.type} at ${event.timestamp}${event.duration ? ` (${event.duration}ms)` : ''}`);
      });
    }
    
    // Step 5: Check pool health status
    console.log('\n🏥 Step 5: Pool health assessment:');
    const poolHealth = afterHealth.data.health;
    console.log(`Status: ${poolHealth.status}`);
    if (poolHealth.issues && poolHealth.issues.length > 0) {
      console.log('Issues:', poolHealth.issues);
    }
    if (poolHealth.recommendations && poolHealth.recommendations.length > 0) {
      console.log('Recommendations:', poolHealth.recommendations);
    }
    
    // Step 6: Compare metrics
    console.log('\n📈 Step 6: Metrics comparison:');
    const initial = initialHealth.data.metrics;
    const after = afterHealth.data.metrics;
    
    console.log('Changes detected:');
    console.log(`  - Acquired connections: ${initial.acquiredConnections} → ${after.acquiredConnections} (+${after.acquiredConnections - initial.acquiredConnections})`);
    console.log(`  - Released connections: ${initial.releasedConnections} → ${after.releasedConnections} (+${after.releasedConnections - initial.releasedConnections})`);
    console.log(`  - Failed connections: ${initial.failedConnections} → ${after.failedConnections} (+${after.failedConnections - initial.failedConnections})`);
    console.log(`  - Avg query time: ${initial.avgQueryTime?.toFixed(2) || 0}ms → ${after.avgQueryTime?.toFixed(2) || 0}ms`);
    
    console.log('\n✅ Connection pool monitoring integration test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testPoolMonitoring().catch(console.error);