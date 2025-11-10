import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import * as cds from '@sap/cds';
import { getCategoryUUID, PRODUCTION_ISSUES_1000, QUALITY_CONTROL_1000 } from '../../utils/category-id-mapping';

describe('ShiftBook Service - Integration Tests', () => {
  let db: any;
  let entities: any;

  beforeAll(async () => {
    // Initialize CAP test environment with actual database
    cds.env.requires.db = {
      kind: 'sqlite',
      credentials: { database: ':memory:' }
    };
    
    // Load the CDS model
    if (!cds.model) {
      const model = await cds.load(['db', 'srv']);
      if (model && !cds.model) {
        cds.model = model;
      }
    }
    
    // Connect to database
    db = await cds.connect.to('db');
    
    // Deploy the database schema
    await cds.deploy(cds.model).to(db);
    
    // Get entity definitions from the model
    entities = {
      ShiftBookLog: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookLog',
      ShiftBookCategory: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategory',
      ShiftBookCategoryMail: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryMail',
      ShiftBookCategoryLng: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryLng',
      ShiftBookCategoryWC: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryWC',
      ShiftBookLogWC: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookLogWC'
    };
  });

  afterAll(async () => {
    // Disconnect from database
    if (db) {
      await db.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test to ensure clean state
    try {
      await db.run(cds.ql.DELETE.from(entities.ShiftBookLogWC));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryWC));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookLog));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategory));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryMail));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryLng));
    } catch (error) {
      // Ignore cleanup errors - tables might be empty
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    try {
      await db.run(cds.ql.DELETE.from(entities.ShiftBookLog));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategory));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryMail));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryLng));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Database Integration', () => {
    it('should connect to real database', () => {
      expect(db).toBeDefined();
      expect(entities).toBeDefined();
      expect(entities.ShiftBookLog).toBeDefined();
      expect(entities.ShiftBookCategory).toBeDefined();
      expect(entities.ShiftBookCategoryMail).toBeDefined();
      expect(entities.ShiftBookCategoryLng).toBeDefined();
    });

    it('should have database methods', () => {
      expect(typeof db.run).toBe('function');
      expect(typeof db.read).toBe('function');
      expect(typeof db.create).toBe('function');
      expect(typeof db.update).toBe('function');
      expect(typeof db.delete).toBe('function');
    });
  });

  describe('ShiftBookLog Entity - Integration Tests', () => {
    it('should create a new log entry in real database', async () => {
      const logData = {
        werks: '1000',
        shoporder: 'SO001',
        stepid: '001',
        split: '001',
        workcenter: 'WC001',
        user_id: 'integration-test-user',
        log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
        category: getCategoryUUID(1),
        subject: 'Integration Test Log Entry',
        message: 'This is an integration test log entry'
      };
      
      const result = await db.run(
        cds.ql.INSERT.into(entities.ShiftBookLog).entries(logData)
      );
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
      
      // Read back the inserted data to verify
      const inserted = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({ shoporder: logData.shoporder })
      );
      expect(inserted.length).toBe(1);
      expect(inserted[0]).toMatchObject(logData);
      expect(inserted[0].ID).toBeDefined();
    });

    it('should read log entries from real database', async () => {
      // Insert test data
      const logData = {
        werks: '1000',
        shoporder: 'SO002',
        stepid: '002',
        split: '002',
        workcenter: 'WC002',
        user_id: 'integration-test-user',
        log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
        category: getCategoryUUID(2),
        subject: 'Integration Test Log Entry for Reading',
        message: 'This is an integration test log entry for reading'
      };
      
      await db.run(
        cds.ql.INSERT.into(entities.ShiftBookLog).entries(logData)
      );

      // Read the data
      const result = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({ shoporder: 'SO002' })
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject(logData);
    });

    it('should update a log entry in real database', async () => {
      // Insert test data
      const logData = {
        werks: '1000',
        shoporder: 'SO003',
        stepid: '003',
        split: '003',
        workcenter: 'WC003',
        user_id: 'integration-test-user',
        log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
        category: getCategoryUUID(3),
        subject: 'Original Subject',
        message: 'This is an integration test log entry for updating'
      };
      
      await db.run(
        cds.ql.INSERT.into(entities.ShiftBookLog).entries(logData)
      );
      
      // Get the inserted record to get its ID
      const insertedRecord = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({ shoporder: logData.shoporder })
      );
      const logId = insertedRecord[0].ID;
      const updateData = { subject: 'Updated Subject via Integration Test' };
      
      // Update the entry
      await db.run(
        cds.ql.UPDATE.entity(entities.ShiftBookLog)
          .where({ ID: logId })
          .with(updateData)
      );
      
      // Verify the update
      const result = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({ ID: logId })
      );
      
      expect(result[0].subject).toBe('Updated Subject via Integration Test');
    });

    it('should delete a log entry from real database', async () => {
      // Insert test data
      const logData = {
        werks: '1000',
        shoporder: 'SO004',
        stepid: '004',
        split: '004',
        workcenter: 'WC004',
        user_id: 'integration-test-user',
        log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
        category: getCategoryUUID(4),
        subject: 'Integration Test Log Entry for Deletion',
        message: 'This is an integration test log entry for deletion'
      };
      
      await db.run(
        cds.ql.INSERT.into(entities.ShiftBookLog).entries(logData)
      );
      
      // Get the inserted record to get its ID
      const insertedRecord = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({ shoporder: logData.shoporder })
      );
      const logId = insertedRecord[0].ID;
      
      // Delete the entry
      await db.run(
        cds.ql.DELETE.from(entities.ShiftBookLog).where({ ID: logId })
      );
      
      // Verify it's deleted
      const result = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({ ID: logId })
      );
      
      expect(result.length).toBe(0);
    });
  });

  describe('ShiftBookCategory Entity - Integration Tests', () => {
    it('should create a new category in real database', async () => {
      const categoryData = {
        ID: getCategoryUUID(999),
        werks: '1000',
        
        sendmail: 1
      };
      
      const result = await db.run(
        cds.ql.INSERT.into(entities.ShiftBookCategory).entries(categoryData)
      );
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
      
      // Read back the inserted data to verify
      const inserted = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategory).where({ ID: categoryData.ID })
      );
      expect(inserted.length).toBe(1);
      expect(inserted[0]).toMatchObject(categoryData);
      // ShiftBookCategory now uses cuid-generated ID
      expect(inserted[0].ID).toBeDefined();
      expect(inserted[0].werks).toBe(categoryData.werks);
    });

    it('should read categories with proper structure from real database', async () => {
      // Insert test data
      const categoryData = {
        ID: getCategoryUUID(888),
        werks: '1000',
        
        sendmail: 0
      };
      
      await db.run(
        cds.ql.INSERT.into(entities.ShiftBookCategory).entries(categoryData)
      );

      // Read the data
      const result = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategory).where({ ID: getCategoryUUID(888) })
      );
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Verify structure
      const category = result[0];
      // ShiftBookCategory now uses cuid-generated ID
      expect(category).toHaveProperty('ID');
      expect(category).toHaveProperty('werks');
      // Test updated for translation-only structure;
      expect(category).toHaveProperty('sendmail');
      expect(category).toHaveProperty('createdAt');
      expect(category).toHaveProperty('modifiedAt');
    });
  });

  describe('Cross-Entity Integration Tests', () => {
    it('should handle relationships between categories and logs', async () => {
      // Create a category first
      const categoryData = {
        ID: getCategoryUUID(777),
        werks: '1000',
        
        sendmail: 1
      };
      
      await db.run(
        cds.ql.INSERT.into(entities.ShiftBookCategory).entries(categoryData)
      );
      
      // Create a log entry with the category reference
      const logData = {
        werks: '1000',
        shoporder: 'SO777',
        stepid: '777',
        split: '777',
        workcenter: 'WC777',
        user_id: 'integration-test-user',
        log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
        category: categoryData.ID,
        subject: 'Integration Test Log with Category Relationship',
        message: 'This log entry references a category'
      };
      
      await db.run(
        cds.ql.INSERT.into(entities.ShiftBookLog).entries(logData)
      );
      
      // Verify the log was created with correct category
      const logResult = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({ shoporder: logData.shoporder })
      );
      expect(logResult).toBeDefined();
      expect(logResult.length).toBe(1);
      expect(logResult[0].category).toBe(categoryData.ID);
      
      // Verify the relationship by querying logs for this category
      const logsForCategory = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({ category: categoryData.ID })
      );
      
      expect(logsForCategory.length).toBeGreaterThan(0);
      expect(logsForCategory[0].category).toBe(categoryData.ID);
    });

    it('should handle batch operations', async () => {
      // Create multiple categories
      const categories = [
        { ID: getCategoryUUID(111), werks: '1000',  sendmail: 1 },
        { ID: getCategoryUUID(222), werks: '1000',  sendmail: 0 },
        { ID: getCategoryUUID(333), werks: '1000',  sendmail: 1 }
      ];
      
      const createdCategories = await db.run(
        cds.ql.INSERT.into(entities.ShiftBookCategory).entries(categories)
      );
      
      expect(createdCategories).toBeDefined();
      expect(createdCategories.affectedRows).toBe(3);
      
      // Verify categories were created
      const allCategories = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategory)
      );
      expect(allCategories.length).toBe(3);
      
      // Create multiple logs
      const logs = [
        { werks: '1000', shoporder: 'SO111', stepid: '111', split: '111', workcenter: 'WC111', user_id: 'integration-test-user', log_dt: new Date().toISOString(), category: getCategoryUUID(111), subject: 'Batch Log 1', message: 'First batch log' },
        { werks: '1000', shoporder: 'SO222', stepid: '222', split: '222', workcenter: 'WC222', user_id: 'integration-test-user', log_dt: new Date().toISOString(), category: getCategoryUUID(222), subject: 'Batch Log 2', message: 'Second batch log' },
        { werks: '1000', shoporder: 'SO333', stepid: '333', split: '333', workcenter: 'WC333', user_id: 'integration-test-user', log_dt: new Date().toISOString(), category: getCategoryUUID(333), subject: 'Batch Log 3', message: 'Third batch log' }
      ];
      
      const createdLogs = await db.run(
        cds.ql.INSERT.into(entities.ShiftBookLog).entries(logs)
      );
      
      expect(createdLogs).toBeDefined();
      expect(createdLogs.affectedRows).toBe(3);
      
      // Verify logs were created
      const allLogs = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog)
      );
      expect(allLogs.length).toBe(3);
    });
  });
});
