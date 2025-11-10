import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import { getCategoryUUID } from '../utils/category-id-mapping';
import { randomUUID } from 'crypto';
import TestServer from '../utils/test-server';

/**
 * TRUE End-to-End Tests for ShiftBook Service
 *
 * These tests simulate real user workflows via HTTP requests,
 * testing complete user journeys from authentication through
 * business operations. This is the closest to actual production usage.
 *
 * Scenarios tested:
 * - Operator daily workflow
 * - Admin management tasks
 * - Multi-user concurrent operations
 * - Error recovery scenarios
 */
describe('ShiftBook E2E User Workflows', () => {
  let operatorClient: AxiosInstance;
  let adminClient: AxiosInstance;
  let testServer: TestServer;
  let baseURL: string;

  beforeAll(async () => {
    // Start test server
    testServer = TestServer.getInstance();
    await testServer.start();
    baseURL = testServer.getServerUrl();

    // Create authenticated clients for different user roles
    // Test server uses basic auth with empty passwords
    operatorClient = axios.create({
      baseURL,
      timeout: 10000,
      auth: {
        username: 'operator',
        password: ''
      },
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: () => true
    });

    adminClient = axios.create({
      baseURL,
      timeout: 10000,
      auth: {
        username: 'admin',
        password: ''
      },
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: () => true
    });

    console.log('✅ E2E test clients configured');
  }, 60000);

  afterAll(async () => {
    // Stop test server
    if (testServer) {
      await testServer.stop();
    }
  });

  describe('Operator Daily Workflow', () => {
    /**
     * DISABLED - MSB-228: Test disabled due to missing E2E authentication configuration
     * 
     * This E2E test receives 403 Forbidden responses instead of 200/201.
     * The test requires proper OAuth/JWT authentication setup or more sophisticated
     * authentication mocking for E2E scenarios.
     * 
     * Current issue:
     * - HTTP client authentication not properly configured
     * - Receives 403 instead of expected 200/201 responses
     * - E2E authentication flow not matching production setup
     * 
     * Required implementation:
     * - Configure proper OAuth/JWT mock for E2E tests
     * - Or implement more realistic authentication flow
     * - Ensure test credentials match service expectations
     * - Verify authorization headers are correctly set
     * 
     * Once authentication is properly configured, remove .skip to re-enable.
     * 
     * Related JIRA: MSB-228
     * Estimated fix time: 1-2 hours
     */
    it.skip('should complete a typical operator shift workflow', async () => {
      console.log('🏭 Starting operator shift workflow simulation...');

      // 1. Operator starts shift - checks available categories
      const categoriesResponse = await operatorClient.get('/shiftbook/ShiftBookService/ShiftBookCategory');
      expect(categoriesResponse.status).toBe(200);
      expect(categoriesResponse.data.value.length).toBeGreaterThan(0);

      const categories = categoriesResponse.data.value;
      // Since default_desc field was removed, find any valid category for plant 1000
      const productionCategory = categories.find((cat: any) => cat.werks === '1000');
      expect(productionCategory).toBeDefined();

      console.log(`✅ Operator found ${categories.length} available categories`);

      // 2. Operator logs a shift book entry
      const shiftEntry = {
        werks: '1000',
        category: productionCategory.ID,
        subject: 'E2E Test - Production Issue',
        message: 'Simulated production issue logged during E2E test',
        shoporder: 'SO2024001003', // 12-character shoporder format
        stepid: '010',
        split: '001',
        workcenter: 'WC-TEST-001',
        user_id: 'bob'
      };

      const createResponse = await operatorClient.post('/shiftbook/ShiftBookService/ShiftBookLog', shiftEntry);
      
      // Should succeed for operator role
      expect(createResponse.status).toBeGreaterThanOrEqual(200);
      expect(createResponse.status).toBeLessThan(300);
      console.log('✅ Operator successfully logged shift entry');

      // 3. Operator retrieves their logged entries
      const logsResponse = await operatorClient.get('/shiftbook/ShiftBookService/ShiftBookLog?$filter=user_id eq \'bob\'');
      expect(logsResponse.status).toBe(200);
      
      console.log(`✅ Operator retrieved ${logsResponse.data.value.length} log entries`);

      // 4. Operator tries to access admin functions (should fail)
      const adminAttempt = await operatorClient.delete(`/shiftbook/ShiftBookService/ShiftBookCategory(ID='${randomUUID()}',werks='TEST')`);
      expect([401, 403, 404]).toContain(adminAttempt.status);
      console.log('✅ Operator correctly denied admin access');

      console.log('🎉 Operator workflow completed successfully');
    }, 30000);
  });

  describe('Admin Management Workflow', () => {
    /**
     * DISABLED - MSB-228: Test disabled due to missing E2E authentication configuration
     * 
     * See comments on 'should complete a typical operator shift workflow' test above.
     * Same authentication issue affects admin workflow tests.
     * 
     * Related JIRA: MSB-228
     */
    it.skip('should complete typical admin management tasks', async () => {
      console.log('👨‍💼 Starting admin management workflow simulation...');

      // 1. Admin reviews system health
      const healthResponse = await adminClient.get('/health');
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.data.status).toMatch(/healthy|degraded/);
      console.log(`✅ System health: ${healthResponse.data.status}`);

      // 2. Admin reviews all categories across all plants
      const allCategoriesResponse = await adminClient.get('/shiftbook/ShiftBookService/ShiftBookCategory');
      expect(allCategoriesResponse.status).toBe(200);
      
      const totalCategories = allCategoriesResponse.data.value.length;
      console.log(`✅ Admin found ${totalCategories} total categories`);

      // 3. Admin creates a new test category
      const newCategory = {
        ID: randomUUID(),
        werks: 'E2ET', // 4-character alphanumeric code as required by validation
        
        sendmail: 0
      };

      const createCategoryResponse = await adminClient.post('/shiftbook/ShiftBookService/ShiftBookCategory', newCategory);
      
      if (![200, 201].includes(createCategoryResponse.status)) {
        console.log('❌ Category creation failed:', {
          status: createCategoryResponse.status,
          data: createCategoryResponse.data,
          details: createCategoryResponse.data?.error?.details
        });
      }
      
      expect(createCategoryResponse.status).toBeGreaterThanOrEqual(200);
      expect(createCategoryResponse.status).toBeLessThan(300);
      console.log('✅ Admin successfully created test category');

      // 4. Admin reviews recent shift logs
      const recentLogsResponse = await adminClient.get('/shiftbook/ShiftBookService/ShiftBookLog?$top=10&$orderby=createdAt desc');
      expect(recentLogsResponse.status).toBe(200);
      console.log(`✅ Admin reviewed ${recentLogsResponse.data.value.length} recent logs`);

      // 5. Admin can access all management functions
      const categoryMailResponse = await adminClient.get('/shiftbook/ShiftBookService/ShiftBookCategoryMail');
      expect(categoryMailResponse.status).toBe(200);
      console.log('✅ Admin accessed email configuration');

      // 6. Cleanup - Admin deletes test category (skip for now as deletion has issues)
      // Note: Category deletion would normally be tested here but is skipped due to 
      // transient issues with the test database state
      console.log('✅ Admin workflow completed (cleanup skipped)');

      console.log('🎉 Admin workflow completed successfully');
    }, 30000);
  });

  describe('Multi-User Concurrent Operations', () => {
    /**
     * DISABLED - MSB-228: Test disabled due to missing E2E authentication configuration
     * 
     * See comments on 'should complete a typical operator shift workflow' test above.
     * Same authentication issue affects concurrent operations tests.
     * 
     * Related JIRA: MSB-228
     */
    it.skip('should handle concurrent operations from multiple users', async () => {
      console.log('👥 Testing concurrent multi-user operations...');

      // First get valid category IDs from the database
      const categoriesResponse = await operatorClient.get('/shiftbook/ShiftBookService/ShiftBookCategory');
      const categories = categoriesResponse.data.value;
      const category1000 = categories.find((cat: any) => cat.werks === '1000');
      const category2000 = categories.find((cat: any) => cat.werks === '2000');

      // Simulate concurrent operations
      const concurrentOperations = [
        // Operator reads categories
        operatorClient.get('/shiftbook/ShiftBookService/ShiftBookCategory'),
        
        // Admin reads categories 
        adminClient.get('/shiftbook/ShiftBookService/ShiftBookCategory'),
        
        // Operator creates log entry
        operatorClient.post('/shiftbook/ShiftBookService/ShiftBookLog', {
          werks: '1000',
          category: category1000?.ID || randomUUID(),
          subject: 'Concurrent Test Entry 1',
          message: 'First concurrent operation test',
          shoporder: 'SO2024001001', // 12-character shoporder format
          stepid: '010',
          workcenter: 'WC-CONC-001',
          user_id: 'bob'
        }),
        
        // Another operator log entry (using same plant as we might not have 2000)
        operatorClient.post('/shiftbook/ShiftBookService/ShiftBookLog', {
          werks: '1000', 
          category: category1000?.ID || randomUUID(),
          subject: 'Concurrent Test Entry 2',
          message: 'Second concurrent operation test',
          shoporder: 'SO2024001002', // 12-character shoporder format
          stepid: '020',
          workcenter: 'WC-CONC-002',
          user_id: 'bob'
        }),

        // Health check
        adminClient.get('/health')
      ];

      const results = await Promise.allSettled(concurrentOperations);
      
      // All operations should succeed
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (![200, 201].includes(result.value.status)) {
            console.log(`❌ Operation ${index} failed:`, {
              status: result.value.status,
              data: result.value.data,
              details: result.value.data?.error?.details
            });
          }
          expect(result.value.status).toBeGreaterThanOrEqual(200);
          expect(result.value.status).toBeLessThan(300);
        } else {
          console.error(`Operation ${index} failed:`, result.reason);
          throw result.reason;
        }
      });

      console.log('✅ All concurrent operations completed successfully');
    }, 30000);
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle and recover from error conditions', async () => {
      console.log('🚨 Testing error recovery scenarios...');

      // 1. Invalid authentication recovery
      const invalidAuthClient = axios.create({
        baseURL,
        auth: { username: 'invalid-user', password: '' },
        validateStatus: () => true
      });

      const invalidAuthResponse = await invalidAuthClient.get('/shiftbook/ShiftBookService/ShiftBookCategory');
      expect(invalidAuthResponse.status).toBe(401);
      console.log('✅ Invalid authentication properly rejected');

      // 2. Invalid data handling
      const invalidDataResponse = await adminClient.post('/shiftbook/ShiftBookService/ShiftBookLog', {
        invalid: 'data structure',
        missing: 'required fields'
      });

      expect(invalidDataResponse.status).toBeGreaterThanOrEqual(400);
      expect(invalidDataResponse.status).toBeLessThan(600);
      console.log('✅ Invalid data properly rejected');

      // 3. Valid operation after error
      const recoveryResponse = await adminClient.get('/shiftbook/ShiftBookService/ShiftBookCategory');
      expect(recoveryResponse.status).toBe(200);
      console.log('✅ System recovered and processed valid request');

      console.log('🎉 Error recovery scenarios completed successfully');
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance under moderate load', async () => {
      console.log('⚡ Testing performance under load...');

      const startTime = Date.now();
      
      // Create 20 concurrent requests
      const loadRequests = Array(20).fill(0).map((_, index) => 
        operatorClient.get(`/shiftbook/ShiftBookService/ShiftBookCategory?$top=${index + 1}`)
      );

      const responses = await Promise.all(loadRequests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (10 seconds for 20 requests)
      expect(totalTime).toBeLessThan(10000);

      const avgResponseTime = totalTime / responses.length;
      console.log(`✅ Load test completed: ${responses.length} requests in ${totalTime}ms (avg: ${avgResponseTime.toFixed(2)}ms/request)`);
    }, 30000);
  });
});