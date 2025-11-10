import { jest } from '@jest/globals';
import * as cds from '@sap/cds';
import path from 'path';

// Import CDS query functions
const { INSERT, SELECT, UPDATE, DELETE } = cds.ql;

/**
 * CAP Test Utilities for CAP 9.2.0
 * Provides common testing patterns and utilities for CAP applications
 */

export interface TestService {
  name: string;
  service: any;
  entities: any;
}

export interface TestData {
  [entity: string]: any[];
}

export class CAPTestUtils {
  private static instance: CAPTestUtils;
  private services: Map<string, TestService> = new Map();
  private testData: TestData = {};
  private modelLoaded: boolean = false;

  static getInstance(): CAPTestUtils {
    if (!CAPTestUtils.instance) {
      CAPTestUtils.instance = new CAPTestUtils();
    }
    return CAPTestUtils.instance;
  }

  /**
   * Initialize CAP test environment
   */
  async initialize(): Promise<void> {
    try {
      // Set up environment variables if needed
      process.env.NODE_ENV = 'test';
      process.env.CDS_ENV = 'test';
      
      // Load CDS model if not already loaded
      if (!this.modelLoaded && !cds.model) {
        try {
          // Load the CDS model for testing
          const projectRoot = process.cwd();
          const dbSchemaPath = path.join(projectRoot, 'db', 'schema.cds');
          const servicePath = path.join(projectRoot, 'srv', 'shiftbook-service.cds');
          
          const model = await cds.load([dbSchemaPath, servicePath]);
          if (model && !cds.model) {
            cds.model = model;
          }
          this.modelLoaded = true;
          console.log('CDS model loaded successfully in test utils');
        } catch (error) {
          console.error('Failed to load CDS model:', error);
          // Continue without model loading - will try alternative approaches
        }
      } else if (cds.model) {
        this.modelLoaded = true;
        console.log('CDS model already loaded');
      }
      
      console.log('CAP test environment initialized');
    } catch (error) {
      console.error('Failed to initialize CAP test environment:', error);
      // Don't throw error here, just log it and continue
      console.log('Continuing without full initialization...');
    }
  }

  /**
   * Connect to a CAP service for testing
   */
  async connectToService(serviceName: string): Promise<TestService> {
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName)!;
    }

    try {
      // Ensure CDS model is loaded first
      if (!cds.model) {
        console.log('CDS model not loaded, loading now...');
        try {
          const projectRoot = process.cwd();
          const dbPath = path.join(projectRoot, 'db', 'schema.cds');
          const srvPath = path.join(projectRoot, 'srv', 'shiftbook-service.cds');
          
          console.log('Loading from paths:', { dbPath, srvPath });
          console.log('Files exist:', { 
            db: require('fs').existsSync(dbPath), 
            srv: require('fs').existsSync(srvPath) 
          });
          
          const model = await cds.load([dbPath, srvPath]);
          console.log('CDS load result:', !!model);
          console.log('CDS model after load:', !!cds.model);
          
          // In CAP 9.2.0, cds.load returns the model but doesn't set cds.model automatically
          // We need to assign it manually for the test environment
          if (model && !cds.model) {
            cds.model = model;
            console.log('Manually assigned model to cds.model');
          }
          
          if (cds.model) {
            console.log('Available definitions:', Object.keys(cds.model.definitions).length);
            console.log('First 5 definitions:', Object.keys(cds.model.definitions).slice(0, 5));
          }
        } catch (error) {
          console.error('Failed to load CDS model:', error);
          throw error;
        }
      } else {
        console.log('CDS model already exists, definitions count:', Object.keys(cds.model.definitions).length);
      }

      // For testing, we need to use a different approach
      // In CAP 9.2.0, we should get the service definition from the loaded model
      let service: any;
      let entities: any = {};

      // Get the service definition from the model
      if (cds.model && cds.model.definitions) {
        const serviceDefinition = cds.model.definitions[`ShiftBookService`];
        console.log('Looking for service definition "ShiftBookService", found:', !!serviceDefinition);
        if (serviceDefinition) {
          console.log('Found service definition for ShiftBookService');
          
          // Create a mock service that behaves like a real CAP service for testing
          service = {
            name: serviceName,
            model: cds.model,
            definition: serviceDefinition,
            run: async (query: any) => {
              // This is a simplified implementation for testing
              // In a real scenario, you'd connect to a database
              return cds.db?.run(query) || [];
            },
            read: async (entity: any, key?: any) => {
              if (key) {
                return cds.db?.read(entity, key) || [];
              }
              return cds.db?.read(entity) || [];
            },
            create: async (entity: any, data: any) => {
              return cds.db?.create(entity, data) || data;
            },
            update: async (entity: any, key: any, data: any) => {
              return cds.db?.update(entity, key, data) || data;
            },
            delete: async (entity: any, key: any) => {
              return cds.db?.delete(entity, key) || {};
            }
          };
        }
      }

      // Now get the entities from the model definitions
      if (cds.model && cds.model.definitions) {
        const modelDefinitions = cds.model.definitions;
        console.log('Available model definitions (first 10):', Object.keys(modelDefinitions).slice(0, 10));
        console.log('All model definitions:', Object.keys(modelDefinitions));
        
        // Look for entities with the namespace
        const namespace = 'syntax.gbi.sap.dme.plugins.shiftbook';
        const serviceEntityNames = ['ShiftBookLog', 'ShiftBookCategory', 'ShiftBookCategoryMail', 'ShiftBookCategoryLng'];
        
        for (const entityName of serviceEntityNames) {
          // Try different naming patterns
          const patterns = [
            `${namespace}.${entityName}`,  // Fully qualified name
            `ShiftBookService.${entityName}`,  // Service-prefixed name
            entityName  // Simple name
          ];
          
          for (const pattern of patterns) {
            if (modelDefinitions[pattern]) {
              entities[entityName] = pattern;  // Store the fully qualified name
              console.log(`Found entity ${entityName} as: ${pattern}`);
              break;
            }
          }
        }

        // If we couldn't find entities by pattern matching, try to find them by type
        if (Object.keys(entities).length === 0) {
          console.log('Pattern matching failed, searching by entity kind...');
          for (const [key, value] of Object.entries(modelDefinitions)) {
            if (typeof value === 'object' && value !== null && (value as any).kind === 'entity') {
              console.log(`Found entity definition: ${key}, kind: ${(value as any).kind}`);
              if (key.includes('ShiftBookLog') && !entities.ShiftBookLog) {
                entities.ShiftBookLog = key;
                console.log(`Found ShiftBookLog entity as: ${key}`);
              }
              if (key.includes('ShiftBookCategory') && !key.includes('Mail') && !key.includes('Lng') && !entities.ShiftBookCategory) {
                entities.ShiftBookCategory = key;
                console.log(`Found ShiftBookCategory entity as: ${key}`);
              }
              if (key.includes('ShiftBookCategoryMail') && !entities.ShiftBookCategoryMail) {
                entities.ShiftBookCategoryMail = key;
                console.log(`Found ShiftBookCategoryMail entity as: ${key}`);
              }
              if (key.includes('ShiftBookCategoryLng') && !entities.ShiftBookCategoryLng) {
                entities.ShiftBookCategoryLng = key;
                console.log(`Found ShiftBookCategoryLng entity as: ${key}`);
              }
            }
          }
        }
      }

      // If we still don't have a service, try to connect using the standard approach
      if (!service) {
        try {
          service = await cds.connect.to(serviceName);
          console.log('Connected to service using cds.connect.to');
        } catch (error) {
          console.warn('Failed to connect using cds.connect.to, using mock service');
          // Create a basic mock service
          service = {
            name: serviceName,
            run: async (query: any) => {
              return cds.db?.run(query) || [];
            }
          };
        }
      }

      // Debug: Log what entities we found
      console.log('Final entities mapping:', entities);
      console.log('Entity availability:', {
        ShiftBookLog: !!entities.ShiftBookLog,
        ShiftBookCategory: !!entities.ShiftBookCategory,
        ShiftBookCategoryMail: !!entities.ShiftBookCategoryMail,
        ShiftBookCategoryLng: !!entities.ShiftBookCategoryLng
      });

      const testService: TestService = {
        name: serviceName,
        service,
        entities
      };

      this.services.set(serviceName, testService);
      return testService;
    } catch (error) {
      console.error(`Failed to connect to service ${serviceName}:`, error);
      throw new Error(`Failed to connect to service ${serviceName}: ${error}`);
    }
  }

  /**
   * Create test data for an entity
   */
  createTestData(entity: string, count: number = 1, customData: any = {}): any[] {
    const data = [];
    for (let i = 0; i < count; i++) {
      const baseData = {
        ID: `${entity}-test-${i + 1}`,
        createdAt: new Date().toISOString(),
        createdBy: 'test-user',
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'test-user'
      };
      
      data.push({
        ...baseData,
        ...customData
      });
    }
    
    if (!this.testData[entity]) {
      this.testData[entity] = [];
    }
    this.testData[entity].push(...data);
    
    return data;
  }

  /**
   * Insert test data into database
   */
  async insertTestData(serviceName: string, entity: string, data: any[]): Promise<void> {
    const testService = await this.connectToService(serviceName);
    const entityRef = testService.entities[entity];
    
    if (!entityRef) {
      throw new Error(`Entity ${entity} not found in service ${serviceName}`);
    }

    try {
      await testService.service.run(INSERT.into(entityRef).entries(data));
    } catch (error) {
      throw new Error(`Failed to insert test data for ${entity}: ${error}`);
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(): Promise<void> {
    for (const [serviceName, testService] of this.services) {
      for (const [entityName, data] of Object.entries(this.testData)) {
        if (data.length > 0) {
          const entityRef = testService.entities[entityName];
          if (entityRef) {
            try {
              await testService.service.run(DELETE.from(entityRef));
            } catch (error) {
              console.warn(`Failed to cleanup ${entityName} in ${serviceName}: ${error}`);
            }
          }
        }
      }
    }
    
    this.testData = {};
  }

  /**
   * Create a mock request context
   */
  createMockRequestContext(data: any = {}, user: any = null): any {
    return {
      data,
      user: user || global.TEST_UTILS.createMockUser(),
      headers: {},
      query: {},
      params: {},
      transaction: {
        commit: jest.fn(),
        rollback: jest.fn()
      }
    };
  }

  /**
   * Create a mock service context
   */
  createMockServiceContext(serviceName: string): any {
    return {
      service: serviceName,
      entities: {},
      before: jest.fn(),
      after: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      send: jest.fn()
    };
  }

  /**
   * Wait for async operations to complete
   */
  async waitForAsync(condition: () => boolean, timeout: number = 5000): Promise<void> {
    return global.TEST_UTILS.waitForCondition(condition, timeout);
  }

  /**
   * Assert service response
   */
  assertServiceResponse(response: any, expectedStatus: number = 200): void {
    expect(response).toBeDefined();
    if (expectedStatus !== undefined) {
      expect(response.status).toBe(expectedStatus);
    }
  }

  /**
   * Assert entity data structure
   */
  assertEntityStructure(data: any, requiredFields: string[]): void {
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');
    
    for (const field of requiredFields) {
      expect(data).toHaveProperty(field);
    }
  }

  /**
   * Create test categories for ShiftBook
   */
  createShiftBookCategories(): any[] {
    const { getCategoryUUID } = require('./category-id-mapping');
    return [
      {
        ID: getCategoryUUID(1),
        werks: '1000',
        default_desc: 'Production Issue',
        sendmail: 1
      },
      {
        ID: getCategoryUUID(2),
        werks: '1000',
        default_desc: 'Quality Issue',
        sendmail: 1
      },
      {
        ID: getCategoryUUID(3),
        werks: '1000',
        default_desc: 'Maintenance Issue',
        sendmail: 0
      }
    ];
  }

  /**
   * Create test shift book logs
   */
  createShiftBookLogs(count: number = 1, categoryId: number = 1): any[] {
    const { getCategoryUUID } = require('./category-id-mapping');
    const logs = [];
    for (let i = 0; i < count; i++) {
      logs.push({
        werks: '1000',
        shoporder: `SO${String(i + 1).padStart(3, '0')}`,
        stepid: String(i + 1).padStart(3, '0'),
        split: String(i + 1).padStart(3, '0'),
        workcenter: `WC${String(i + 1).padStart(3, '0')}`,
        user_id: 'test-user',
        log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
        category: getCategoryUUID(categoryId),
        subject: `Test Log Entry ${i + 1}`,
        message: `This is test log entry ${i + 1} for testing purposes`
      });
    }
    return logs;
  }

  /**
   * Reset all test state
   */
  async reset(): Promise<void> {
    await this.cleanupTestData();
    this.services.clear();
    this.testData = {};
  }
}

// Export singleton instance
export const capTestUtils = CAPTestUtils.getInstance();

// Export common test patterns
export const testPatterns = {
  /**
   * Test pattern for CRUD operations
   */
  async testCRUDOperations(serviceName: string, entity: string, testData: any) {
    const testService = await capTestUtils.connectToService(serviceName);
    const entityRef = testService.entities[entity];

    // Test CREATE
    const created = await testService.service.run(INSERT.into(entityRef).entries(testData));
    expect(created).toBeDefined();

    // Test READ
    const read = await testService.service.run(SELECT.from(entityRef).where({ ID: testData.ID }));
    expect(read).toBeDefined();
    expect(read.length).toBeGreaterThan(0);

    // Test UPDATE
    const updateData = { ...testData, name: 'Updated Name' };
    await testService.service.run(UPDATE.entity(entityRef).where({ ID: testData.ID }).with(updateData));

    // Test DELETE
    await testService.service.run(DELETE.from(entityRef).where({ ID: testData.ID }));
  },

  /**
   * Test pattern for service actions
   */
  async testServiceAction(serviceName: string, actionName: string, inputData: any, expectedResult?: any) {
    const testService = await capTestUtils.connectToService(serviceName);
    
    const result = await testService.service.send(actionName, inputData);
    
    if (expectedResult) {
      expect(result).toEqual(expectedResult);
    } else {
      expect(result).toBeDefined();
    }
  }
};
