import { jest } from '@jest/globals';
import * as cds from '@sap/cds';

// Global test setup for CAP 9.2.0
beforeAll(async () => {
  // Configure global test timeout
  jest.setTimeout(30000);
  
  // Keep console output during tests for debugging CDS model loading
  // Comment out to see debug information during test development
  // jest.spyOn(console, 'log').mockImplementation(() => {});
  // jest.spyOn(console, 'warn').mockImplementation(() => {});
  // jest.spyOn(console, 'error').mockImplementation(() => {});

  // Set up CAP test environment
  // Load CDS model for all tests - let individual tests handle their own setup
  console.log('Setting up CDS test environment');
  
  try {
    // Only initialize CDS configuration, don't force model loading
    // Individual tests will load models as needed
    if (process.env.CDS_ENV === 'test') {
      console.log('CDS test environment configured');
    }
  } catch (error) {
    console.warn('CDS setup warning:', error.message);
  }
});

afterAll(async () => {
  // Clean up CAP services
  if (cds.services) {
    for (const service of Object.values(cds.services)) {
      if (service && typeof (service as any).disconnect === 'function') {
        try {
          await (service as any).disconnect();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }
  
  // Restore console output
  jest.restoreAllMocks();
});

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      TEST_UTILS: {
        createMockUser: (roles?: string[]) => any;
        createMockRequest: (data?: any) => any;
        createMockResponse: () => any;
        generateTestData: (entity: string, count?: number) => any[];
        waitForCondition: (condition: () => boolean, timeout?: number) => Promise<void>;
      };
    }
  }
}

// Initialize global test utilities
global.TEST_UTILS = {
  createMockUser: (roles: string[] = ['authenticated-user']) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    roles,
    tenant: 'test-tenant'
  }),
  
  createMockRequest: (data: any = {}) => ({
    data,
    user: global.TEST_UTILS.createMockUser(),
    headers: {},
    query: {},
    params: {}
  }),
  
  createMockResponse: () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  }),
  
  generateTestData: (entity: string, count: number = 1) => {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        ID: `test-${entity}-${i + 1}`,
        name: `Test ${entity} ${i + 1}`,
        description: `Test description for ${entity} ${i + 1}`,
        createdAt: new Date().toISOString(),
        createdBy: 'test-user'
      });
    }
    return data;
  },
  
  waitForCondition: async (condition: () => boolean, timeout: number = 5000) => {
    const startTime = Date.now();
    while (!condition() && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  }
};
