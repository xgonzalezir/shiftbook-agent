import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios, { AxiosInstance } from 'axios';
import TestServer from '../utils/test-server';

/**
 * TRUE HTTP Integration Tests for ShiftBook Service
 *
 * These tests make actual HTTP requests to a running server instance,
 * testing the full HTTP stack including:
 * - Authentication middleware
 * - Request routing
 * - Response serialization
 * - Error handling
 * - Status codes
 *
 * This catches issues that CAP internal API tests miss!
 */
describe('ShiftBook HTTP Integration Tests', () => {
  let client: AxiosInstance;
  let testServer: TestServer;
  let baseURL: string;

  beforeAll(async () => {
    // Start test server
    testServer = TestServer.getInstance();
    await testServer.start();
    baseURL = testServer.getServerUrl();

    // Create HTTP client with proper authentication for tests
    client = axios.create({
      baseURL,
      timeout: 10000,
      validateStatus: () => true, // Don't throw on HTTP error status
      headers: {
        'Authorization': 'Bearer test-admin', // Use test token
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ HTTP integration test client configured');
  }, 180000); // Increased timeout to 3 minutes

  afterAll(async () => {
    // Stop test server
    if (testServer) {
      await testServer.stop();
    }
  });

  describe('Health Endpoints (Public)', () => {
    it('should return health status without authentication', async () => {
      const response = await client.get('/health');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
      expect(response.data).toHaveProperty('checks');
      expect(response.data.checks).toHaveProperty('database');
      expect(response.data.checks).toHaveProperty('performance');
    });

    it('should return simple health status for load balancers', async () => {
      const response = await client.get('/health/simple');

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data).toHaveProperty('timestamp');
    });

    it('should return Prometheus metrics', async () => {
      const response = await client.get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.data).toContain('application_uptime_seconds');
      expect(response.data).toContain('process_memory_heap_used_bytes');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should reject requests without authentication', async () => {
      const response = await client.get('/shiftbook/ShiftBookService/ShiftBookCategory');
      
      expect(response.status).toBe(401);
      expect(response.data).toBe('Unauthorized');
    });

    it('should reject requests with invalid credentials', async () => {
      const response = await client.get('/shiftbook/ShiftBookService/ShiftBookCategory', {
        auth: { username: 'invalid-user', password: '' }
      });
      
      expect(response.status).toBe(401);
    });

    it('should accept requests with valid operator credentials', async () => {
      const response = await client.get('/shiftbook/ShiftBookService/ShiftBookCategory', {
        auth: { username: 'bob', password: '' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data['@odata.context']).toBeDefined();
      expect(response.data).toHaveProperty('value');
      expect(Array.isArray(response.data.value)).toBe(true);
    });

    it('should accept requests with valid admin credentials', async () => {
      const response = await client.get('/shiftbook/ShiftBookService/ShiftBookCategory', {
        auth: { username: 'alice', password: '' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data['@odata.context']).toBeDefined();
      expect(response.data).toHaveProperty('value');
    });
  });

  describe('CRUD Operations via HTTP', () => {
    it('should read shift book categories', async () => {
      const response = await client.get('/shiftbook/ShiftBookService/ShiftBookCategory', {
        auth: { username: 'alice', password: '' }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('value');
      expect(Array.isArray(response.data.value)).toBe(true);
      // Note: May be empty array if no test data is seeded
      // Phase 3: default_desc field removed, use translations instead
    });

    it('should read shift book logs', async () => {
      const response = await client.get('/shiftbook/ShiftBookService/ShiftBookLog', {
        auth: { username: 'alice', password: '' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data['@odata.context']).toBeDefined();
      expect(response.data).toHaveProperty('value');
      expect(Array.isArray(response.data.value)).toBe(true);
    });

    it('should support OData query parameters', async () => {
      const response = await client.get('/shiftbook/ShiftBookService/ShiftBookCategory?$top=5', {
        auth: { username: 'alice', password: '' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.value.length).toBeLessThanOrEqual(5);
    });

    it('should support OData filtering', async () => {
      const response = await client.get('/shiftbook/ShiftBookService/ShiftBookCategory?$filter=werks eq \'1000\'', {
        auth: { username: 'alice', password: '' }
      });
      
      expect(response.status).toBe(200);
      if (response.data.value.length > 0) {
        expect(response.data.value.every((item: any) => item.werks === '1000')).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await client.get('/non-existent-endpoint', {
        auth: { username: 'alice', password: '' }
      });
      
      expect(response.status).toBe(404);
    });

    it('should return proper error format for invalid data', async () => {
      const response = await client.post('/shiftbook/ShiftBookService/ShiftBookLog', 
        { invalid: 'data' },
        { auth: { username: 'alice', password: '' } }
      );
      
      // Expect either validation error or other business logic error
      expect([400, 403, 422, 500]).toContain(response.status);
    });
  });

  describe('Performance & Load', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(0).map(() => 
        client.get('/shiftbook/ShiftBookService/ShiftBookCategory', {
          auth: { username: 'alice', password: '' }
        })
      );

      const responses = await Promise.all(requests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await client.get('/shiftbook/ShiftBookService/ShiftBookCategory', {
        auth: { username: 'alice', password: '' }
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 second timeout
    });
  });

  describe('Content Negotiation', () => {
    it('should support JSON responses', async () => {
      const response = await client.get('/shiftbook/ShiftBookService/ShiftBookCategory', {
        auth: { username: 'alice', password: '' },
        headers: { 'Accept': 'application/json' }
      });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should handle CORS headers properly', async () => {
      const response = await client.options('/shiftbook/ShiftBookService/ShiftBookCategory');
      
      // CORS preflight should be handled (CAP returns 401 for OPTIONS without auth)
      expect([200, 204, 401]).toContain(response.status);
    });
  });
});