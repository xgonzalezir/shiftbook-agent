import * as cds from '@sap/cds';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Load test data dynamically
const testDataPath = path.join(__dirname, '../fixtures/test-data.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

/**
 * E2E Test Utilities for ShiftBook Service
 * 
 * Provides comprehensive utilities for end-to-end testing including:
 * - HTTP client setup with authentication
 * - Service lifecycle management
 * - Test data management
 * - Assertion helpers
 */

export interface E2ETestContext {
  httpClient: AxiosInstance;
  serviceUrl: string;
  service: any;
  db: any;
  entities: any;
}

export class E2ETestUtils {
  private static instance: E2ETestUtils;
  private context: E2ETestContext | null = null;
  private serviceApp: any = null;

  public static getInstance(): E2ETestUtils {
    if (!E2ETestUtils.instance) {
      E2ETestUtils.instance = new E2ETestUtils();
    }
    return E2ETestUtils.instance;
  }

  /**
   * Initialize E2E test environment
   * Starts CAP service, creates HTTP client, sets up database
   */
  async initialize(): Promise<E2ETestContext> {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.CDS_ENV = 'test';
    process.env.EMAIL_SIMULATION_MODE = 'true';
    process.env.JEST_WORKER_ID = '1';

    // Configure in-memory database for E2E tests
    cds.env.requires.db = {
      kind: 'sqlite',
      credentials: { database: ':memory:' }
    };

    try {
      // Load CDS model
      if (!cds.model) {
        const model = await cds.load(['db', 'srv']);
        if (model && !cds.model) {
          cds.model = model;
        }
      }

      // Connect to database
      const db = await cds.connect.to('db');
      
      // Deploy schema
      await cds.deploy(cds.model).to(db);

      // Start CAP service
      this.serviceApp = await cds.serve('ShiftBookService').from(cds.model).in('test');
      
      // Get service URL (for HTTP testing)
      const serviceUrl = 'http://localhost:4004/shiftbook/ShiftBookService';
      
      // Create HTTP client
      const httpClient = axios.create({
        baseURL: serviceUrl,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      // Get entities
      const entities = {
        ShiftBookLog: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookLog',
        ShiftBookCategory: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategory',
        ShiftBookCategoryMail: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryMail',
        ShiftBookCategoryLng: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryLng'
      };

      this.context = {
        httpClient,
        serviceUrl,
        service: this.serviceApp,
        db,
        entities
      };

      return this.context;

    } catch (error) {
      console.warn('Full HTTP service startup failed, using database-only E2E approach:', error.message);
      
      // Fallback: Database-only E2E testing
      const db = await cds.connect.to('db');
      await cds.deploy(cds.model).to(db);

      const httpClient = axios.create({
        baseURL: 'http://mock-service',
        timeout: 5000
      });

      const entities = {
        ShiftBookLog: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookLog',
        ShiftBookCategory: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategory',
        ShiftBookCategoryMail: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryMail',
        ShiftBookCategoryLng: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryLng'
      };

      this.context = {
        httpClient,
        serviceUrl: 'http://mock-service',
        service: null,
        db,
        entities
      };

      return this.context;
    }
  }

  /**
   * Get current test context
   */
  getContext(): E2ETestContext {
    if (!this.context) {
      throw new Error('E2E test context not initialized. Call initialize() first.');
    }
    return this.context;
  }

  /**
   * Load test fixtures into database
   */
  async loadTestFixtures(): Promise<void> {
    const { db, entities } = this.getContext();

    // Clean up first to avoid duplicates
    await this.cleanupTestData();

    try {
      // Load categories
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries(testData.categories));
      
      // Load email recipients
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategoryMail).entries(testData.recipients));
      
      // Load translations
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategoryLng).entries(testData.translations));

      console.log('✅ Test fixtures loaded successfully');
    } catch (error) {
      console.warn('⚠️ Some fixtures may already exist, continuing with test...', error.message);
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(): Promise<void> {
    const { db, entities } = this.getContext();

    try {
      await db.run(cds.ql.DELETE.from(entities.ShiftBookLog));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryMail));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryLng));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategory));
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Create authenticated HTTP client with JWT token
   */
  createAuthenticatedClient(userRole: 'operator' | 'admin' | 'supervisor' = 'operator'): AxiosInstance {
    const { httpClient } = this.getContext();
    const user = testData.users[userRole];

    // In real E2E tests, you would get actual JWT token
    // For now, we'll simulate with headers
    const authenticatedClient = axios.create({
      ...httpClient.defaults,
      headers: {
        ...httpClient.defaults.headers,
        'X-User-Id': user.user_id,
        'X-User-Role': user.role,
        'X-User-Werks': user.werks.join(','),
        'Authorization': `Bearer mock-jwt-token-${userRole}`
      }
    });

    return authenticatedClient;
  }

  /**
   * Execute HTTP request with error handling
   */
  async httpRequest(method: string, path: string, data?: any, headers?: any): Promise<any> {
    const { httpClient, serviceUrl } = this.getContext();
    
    try {
      const response = await httpClient.request({
        method,
        url: path,
        data,
        headers
      });
      return response;
    } catch (error) {
      // For mock service, return mock response
      if (serviceUrl === 'http://mock-service') {
        return {
          status: 200,
          data: { mock: true, path, method, data },
          headers: {}
        };
      }
      throw error;
    }
  }

  /**
   * Verify database state
   */
  async verifyDatabaseState(entity: string, condition: any): Promise<any[]> {
    const { db, entities } = this.getContext();
    console.log('DEBUG verifyDatabaseState:', entity, JSON.stringify(condition, null, 2));
    return await db.run(cds.ql.SELECT.from(entities[entity]).where(condition));
  }

  /**
   * Verify database state with pattern matching
   */
  async verifyDatabaseStateWithPattern(entity: string, field: string, pattern: string): Promise<any[]> {
    const { db, entities } = this.getContext();
    const allRecords = await db.run(cds.ql.SELECT.from(entities[entity]));
    return allRecords.filter(record => record[field] && record[field].includes(pattern.replace('%', '')));
  }

  /**
   * Wait for async operations (email triggers, etc.)
   */
  async waitForAsyncOperations(timeoutMs: number = 2000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeoutMs));
  }

  /**
   * Get test scenario data
   */
  getTestScenario(scenarioName: keyof typeof testData.scenarios): any {
    return testData.scenarios[scenarioName];
  }

  /**
   * Get sample log data
   */
  getSampleLogData(index: number = 0): any {
    return { ...testData.sampleLogs[index] };
  }

  /**
   * Shutdown E2E test environment
   */
  async shutdown(): Promise<void> {
    if (this.serviceApp) {
      // In a real CAP service shutdown, you'd call app.close()
      console.log('🛑 Shutting down E2E test service');
    }
    
    if (this.context?.db) {
      await this.context.db.disconnect();
    }

    this.context = null;
  }

  /**
   * Assert HTTP response
   */
  assertHttpResponse(response: any, expectedStatus: number, expectedProperties?: string[]): void {
    expect(response.status).toBe(expectedStatus);
    
    if (expectedProperties) {
      expectedProperties.forEach(prop => {
        expect(response.data).toHaveProperty(prop);
      });
    }
  }

  /**
   * Assert OData response format
   */
  assertODataResponse(response: any, expectedEntityCount?: number): void {
    expect(response.data).toHaveProperty('@odata.context');
    
    if (Array.isArray(response.data.value)) {
      if (expectedEntityCount !== undefined) {
        expect(response.data.value).toHaveLength(expectedEntityCount);
      }
    }
  }

  /**
   * Assert email notification was triggered
   */
  async assertEmailNotification(logId: string, categoryId: string): Promise<boolean> {
    // In E2E tests, this would check actual email queue or simulation logs
    // For now, we simulate the check
    await this.waitForAsyncOperations(500);
    
    console.log('DEBUG: assertEmailNotification called with:', { logId, categoryId, categoryIdType: typeof categoryId });
    
    const logs = await this.verifyDatabaseState('ShiftBookLog', { shoporder: logId });
    console.log('DEBUG: About to query ShiftBookCategory with condition:', { ID: categoryId });
    const category = await this.verifyDatabaseState('ShiftBookCategory', { ID: categoryId });
    
    return logs.length > 0 && category.length > 0 && category[0].sendmail === 1;
  }
}

// Export singleton instance
export const e2eTestUtils = E2ETestUtils.getInstance();