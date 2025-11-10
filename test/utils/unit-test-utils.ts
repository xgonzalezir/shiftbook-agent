import { jest } from '@jest/globals';
import * as cds from '@sap/cds';

/**
 * Unit Test Utilities for CAP 9.2.0
 * Provides mocked services and entities for pure unit testing
 * All external dependencies are mocked - no real database connections
 */

export interface MockService {
  name: string;
  entities: { [key: string]: any };
  run: jest.MockedFunction<any>;
  read: jest.MockedFunction<any>;
  create: jest.MockedFunction<any>;
  update: jest.MockedFunction<any>;
  delete: jest.MockedFunction<any>;
  send: jest.MockedFunction<any>;
}

export interface MockEntity {
  name: string;
  definition: any;
  mockData?: any[];
}

export class UnitTestUtils {
  private static instance: UnitTestUtils;
  private mockServices: Map<string, MockService> = new Map();
  private mockData: { [key: string]: any[] } = {};

  static getInstance(): UnitTestUtils {
    if (!UnitTestUtils.instance) {
      UnitTestUtils.instance = new UnitTestUtils();
    }
    return UnitTestUtils.instance;
  }

  /**
   * Initialize unit test environment with mocked services
   */
  async initialize(): Promise<void> {
    try {
      // Set up environment variables for testing
      process.env.NODE_ENV = 'test';
      process.env.CDS_ENV = 'test';

      // Create mock entities
      const mockEntities = {
        ShiftBookLog: {
          name: 'ShiftBookLog',
          definition: {
            kind: 'entity',
            name: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookLog',
            elements: {
              ID: { type: 'cds.UUID' },
              werks: { type: 'cds.String' },
              shoporder: { type: 'cds.String' },
              stepid: { type: 'cds.String' },
              split: { type: 'cds.String' },
              workcenter: { type: 'cds.String' },
              user_id: { type: 'cds.String' },
              log_dt: { type: 'cds.Timestamp' },
              category: { type: 'cds.UUID' },
              subject: { type: 'cds.String' },
              message: { type: 'cds.String' }
            }
          }
        },
        ShiftBookCategory: {
          name: 'ShiftBookCategory',
          definition: {
            kind: 'entity',
            name: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategory',
            elements: {
              ID: { type: 'cds.UUID' },
              werks: { type: 'cds.String' },
              sendmail: { type: 'cds.Integer' }
            }
          }
        },
        ShiftBookCategoryMail: {
          name: 'ShiftBookCategoryMail',
          definition: {
            kind: 'entity',
            name: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryMail',
            elements: {
              category: { type: 'cds.UUID' },
              werks: { type: 'cds.String' },
              mail_address: { type: 'cds.String' }
            }
          }
        },
        ShiftBookCategoryLng: {
          name: 'ShiftBookCategoryLng',
          definition: {
            kind: 'entity',
            name: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryLng',
            elements: {
              category: { type: 'cds.UUID' },
              lng: { type: 'cds.String' },
              werks: { type: 'cds.String' },
              desc: { type: 'cds.String' }
            }
          }
        }
      };

      // Create mock service
      const mockService: MockService = {
        name: 'ShiftBookService',
        entities: mockEntities,
        run: jest.fn(),
        read: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        send: jest.fn()
      };

      // Set up default mock implementations
      this.setupMockImplementations(mockService);

      this.mockServices.set('ShiftBookService', mockService);
      console.log('Unit test environment initialized with mocked services');
    } catch (error) {
      console.error('Failed to initialize unit test environment:', error);
      throw error;
    }
  }

  /**
   * Set up mock implementations for service methods
   */
  private setupMockImplementations(mockService: MockService): void {
    // Mock run method - handles INSERT, SELECT, UPDATE, DELETE operations
    mockService.run.mockImplementation((query) => {
      if (query && typeof query === 'object') {
        // Handle INSERT operations
        if (query.INSERT) {
          const entityName = this.getEntityNameFromQuery(query);
          const data = query.entries || query.values || [];
          
          if (Array.isArray(data)) {
            const insertedData = data.map((item, index) => ({
              ...item,
              ID: item.ID || `mock-id-${Date.now()}-${index}`
            }));
            
            // Store in mock data
            if (!this.mockData[entityName]) {
              this.mockData[entityName] = [];
            }
            this.mockData[entityName].push(...insertedData);
            
            return insertedData;
          }
        }
        
        // Handle SELECT operations
        if (query.SELECT) {
          const entityName = this.getEntityNameFromQuery(query);
          const whereClause = query.where || {};
          
          let result = this.mockData[entityName] || [];
          
          // Apply where clause if provided
          if (Object.keys(whereClause).length > 0) {
            result = result.filter(item => 
              Object.keys(whereClause).every(key => item[key] === whereClause[key])
            );
          }
          
          return result;
        }
        
        // Handle UPDATE operations
        if (query.UPDATE) {
          const entityName = this.getEntityNameFromQuery(query);
          const whereClause = query.where || {};
          const updateData = query.with || {};
          
          if (this.mockData[entityName]) {
            const itemIndex = this.mockData[entityName].findIndex(item => 
              Object.keys(whereClause).every(key => item[key] === whereClause[key])
            );
            
            if (itemIndex !== -1) {
              Object.assign(this.mockData[entityName][itemIndex], updateData);
              return [this.mockData[entityName][itemIndex]];
            }
          }
          return [];
        }
        
        // Handle DELETE operations
        if (query.DELETE) {
          const entityName = this.getEntityNameFromQuery(query);
          const whereClause = query.where || {};
          
          if (this.mockData[entityName]) {
            const itemIndex = this.mockData[entityName].findIndex(item => 
              Object.keys(whereClause).every(key => item[key] === whereClause[key])
            );
            
            if (itemIndex !== -1) {
              const deleted = this.mockData[entityName].splice(itemIndex, 1);
              return deleted;
            }
          }
          return [];
        }
      }
      
      return [];
    });

    // Mock read method
    mockService.read.mockImplementation((entity, key) => {
      const entityName = typeof entity === 'string' ? entity : entity.name || entity;
      if (key) {
        return this.mockData[entityName]?.find(item => 
          Object.keys(key).every(k => item[k] === key[k])
        );
      }
      return this.mockData[entityName] || [];
    });

    // Mock create method
    mockService.create.mockImplementation((entity, data) => {
      const entityName = typeof entity === 'string' ? entity : entity.name || entity;
      const newData = {
        ...data,
        ID: data.ID || `mock-id-${Date.now()}`
      };
      
      if (!this.mockData[entityName]) {
        this.mockData[entityName] = [];
      }
      this.mockData[entityName].push(newData);
      
      return newData;
    });

    // Mock update method
    mockService.update.mockImplementation((entity, key, data) => {
      const entityName = typeof entity === 'string' ? entity : entity.name || entity;
      const itemIndex = this.mockData[entityName]?.findIndex(item => 
        Object.keys(key).every(k => item[k] === key[k])
      );
      
      if (itemIndex !== -1 && this.mockData[entityName]) {
        Object.assign(this.mockData[entityName][itemIndex], data);
        return this.mockData[entityName][itemIndex];
      }
      return null;
    });

    // Mock delete method
    mockService.delete.mockImplementation((entity, key) => {
      const entityName = typeof entity === 'string' ? entity : entity.name || entity;
      const itemIndex = this.mockData[entityName]?.findIndex(item => 
        Object.keys(key).every(k => item[k] === key[k])
      );
      
      if (itemIndex !== -1 && this.mockData[entityName]) {
        const deleted = this.mockData[entityName].splice(itemIndex, 1);
        return deleted[0];
      }
      return null;
    });

    // Mock send method
    mockService.send.mockImplementation((action, data) => {
      return { success: true, data };
    });
  }

  /**
   * Extract entity name from CDS query
   */
  private getEntityNameFromQuery(query: any): string {
    if (query.INSERT?.into) {
      const entityRef = query.INSERT.into;
      if (typeof entityRef === 'string') {
        return entityRef;
      }
      if (entityRef.ref && Array.isArray(entityRef.ref)) {
        return entityRef.ref[entityRef.ref.length - 1];
      }
      return entityRef;
    }
    
    if (query.SELECT?.from) {
      const entityRef = query.SELECT.from;
      if (typeof entityRef === 'string') {
        return entityRef;
      }
      if (entityRef.ref && Array.isArray(entityRef.ref)) {
        return entityRef.ref[entityRef.ref.length - 1];
      }
      return entityRef;
    }
    
    if (query.UPDATE?.entity) {
      const entityRef = query.UPDATE.entity;
      if (typeof entityRef === 'string') {
        return entityRef;
      }
      if (entityRef.ref && Array.isArray(entityRef.ref)) {
        return entityRef.ref[entityRef.ref.length - 1];
      }
      return entityRef;
    }
    
    if (query.DELETE?.from) {
      const entityRef = query.DELETE.from;
      if (typeof entityRef === 'string') {
        return entityRef;
      }
      if (entityRef.ref && Array.isArray(entityRef.ref)) {
        return entityRef.ref[entityRef.ref.length - 1];
      }
      return entityRef;
    }
    
    return 'unknown';
  }

  /**
   * Get mock service for unit testing
   */
  async getMockService(serviceName: string): Promise<MockService> {
    const mockService = this.mockServices.get(serviceName);
    if (!mockService) {
      throw new Error(`Mock service ${serviceName} not found`);
    }
    return mockService;
  }

  /**
   * Get mock entities for a service
   */
  getMockEntities(serviceName: string): { [key: string]: any } {
    const mockService = this.mockServices.get(serviceName);
    if (!mockService) {
      throw new Error(`Mock service ${serviceName} not found`);
    }
    return mockService.entities;
  }

  /**
   * Create test data for unit tests
   */
  createTestData(entity: string, count: number = 1, customData: any = {}): any[] {
    const data = [];
    for (let i = 0; i < count; i++) {
      const baseData = {
        ID: `${entity}-unit-test-${i + 1}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        createdBy: 'unit-test-user',
        modifiedAt: new Date().toISOString(),
        modifiedBy: 'unit-test-user'
      };
      
      data.push({
        ...baseData,
        ...customData
      });
    }
    
    // Store in mock data
    if (!this.mockData[entity]) {
      this.mockData[entity] = [];
    }
    this.mockData[entity].push(...data);
    
    return data;
  }

  /**
   * Clear all mock data
   */
  clearMockData(): void {
    this.mockData = {};
    // Reset all mock implementations
    for (const [, service] of this.mockServices) {
      service.run.mockClear();
      service.read.mockClear();
      service.create.mockClear();
      service.update.mockClear();
      service.delete.mockClear();
      service.send.mockClear();
    }
  }

  /**
   * Get mock data for an entity
   */
  getMockData(entity: string): any[] {
    return this.mockData[entity] || [];
  }

  /**
   * Create mock CDS query objects for testing
   */
  createMockQuery(): any {
    return {
      INSERT: { into: jest.fn() },
      SELECT: { from: jest.fn() },
      UPDATE: { entity: jest.fn(), where: jest.fn(), with: jest.fn() },
      DELETE: { from: jest.fn(), where: jest.fn() }
    };
  }

  /**
   * Create mock request context
   */
  createMockRequestContext(data: any = {}, user: any = null): any {
    return {
      data,
      user: user || {
        id: 'unit-test-user',
        tenant: 'test-tenant',
        roles: ['shiftbook.operator']
      },
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
   * Create mock service context
   */
  createMockServiceContext(serviceName: string): any {
    return {
      service: serviceName,
      entities: this.getMockEntities(serviceName),
      before: jest.fn(),
      after: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      send: jest.fn()
    };
  }

  /**
   * Assert service method was called
   */
  expectServiceMethodCalled(serviceName: string, method: keyof MockService, times: number = 1): void {
    const mockService = this.mockServices.get(serviceName);
    if (!mockService) {
      throw new Error(`Mock service ${serviceName} not found`);
    }
    expect(mockService[method]).toHaveBeenCalledTimes(times);
  }

  /**
   * Assert service method was called with specific arguments
   */
  expectServiceMethodCalledWith(serviceName: string, method: keyof MockService, expectedArgs: any[]): void {
    const mockService = this.mockServices.get(serviceName);
    if (!mockService) {
      throw new Error(`Mock service ${serviceName} not found`);
    }
    expect(mockService[method]).toHaveBeenCalledWith(...expectedArgs);
  }
}

// Export singleton instance
export const unitTestUtils = UnitTestUtils.getInstance();
