import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import * as cds from '@sap/cds';
import { getCategoryUUID } from '../../utils/category-id-mapping';
import { randomUUID } from 'crypto';

/**
 * Business Workflow Integration Tests for ShiftBook Application
 * 
 * Following SAP CAP testing guidelines, these tests focus on business workflows
 * that involve multiple entities and complex business logic validation.
 * 
 * These tests complement the basic CRUD tests by covering:
 * - Multi-entity business transactions
 * - Complex data relationships and integrity
 * - Business rule validation across entities
 * - Workflow scenarios that mirror real production use cases
 */
describe('ShiftBook Business Workflows - Integration Tests', () => {
  let db: any;
  let entities: any;

  beforeAll(async () => {
    // Initialize CAP test environment following SAP CAP testing guidelines
    cds.env.requires.db = {
      kind: 'sqlite',
      credentials: { database: ':memory:' }
    };
    
    // Load the CDS model
    if (!cds.model) {
      const model = await cds.load(['db', 'srv']); if (model && !cds.model) { cds.model = model; }
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
      ShiftBookCategoryLng: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryLng'
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

  describe('Category Management with Details Workflow', () => {
    it('should create category with translations and email recipients (complete workflow)', async () => {
      // This test simulates the createCategoryWithDetails business action
      const categoryId = randomUUID();
      const categoryData = {
        ID: categoryId,
        werks: '1000',
        
        sendmail: 1
      };

      const translations = [
        { language: 'en', description: 'Critical Production Issues' },
        { language: 'de', description: 'Kritische Produktionsprobleme' },
        { language: 'es', description: 'Problemas Críticos de Producción' }
      ];

      const emailRecipients = [
        { email: 'production.manager@company.com' },
        { email: 'shift.supervisor@company.com' },
        { email: 'maintenance.team@company.com' }
      ];

      // Execute the complete business workflow
      await db.tx(async (tx) => {
        // Step 1: Create the main category
        await tx.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries(categoryData));
        
        // Step 2: Add multilingual translations
        const translationEntries = translations.map(t => ({
          category: categoryId,
          werks: categoryData.werks,
          lng: t.language,
          desc: t.description
        }));
        await tx.run(cds.ql.INSERT.into(entities.ShiftBookCategoryLng).entries(translationEntries));
        
        // Step 3: Add email notification recipients
        const emailEntries = emailRecipients.map(e => ({
          category: categoryId,
          werks: categoryData.werks,
          mail_address: e.email
        }));
        await tx.run(cds.ql.INSERT.into(entities.ShiftBookCategoryMail).entries(emailEntries));
      });

      // Verify the complete workflow executed successfully
      const createdCategory = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategory).where({
          ID: categoryId,
          werks: categoryData.werks
        })
      );
      expect(createdCategory.length).toBe(1);
      expect(createdCategory[0]).toMatchObject(categoryData);

      const createdTranslations = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryLng).where({
          category: categoryId,
          werks: categoryData.werks
        })
      );
      expect(createdTranslations.length).toBe(3);
      expect(createdTranslations.map(t => t.lng)).toEqual(
        expect.arrayContaining(['en', 'de', 'es'])
      );

      const createdEmails = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryMail).where({
          category: categoryId,
          werks: categoryData.werks
        })
      );
      expect(createdEmails.length).toBe(3);
      expect(createdEmails.map(e => e.mail_address)).toEqual(
        expect.arrayContaining([
          'production.manager@company.com', 
          'shift.supervisor@company.com', 
          'maintenance.team@company.com'
        ])
      );
    });

    it('should update category with details while maintaining referential integrity', async () => {
      // First, create a category with initial details
      const categoryId = randomUUID();
      const initialCategory = {
        ID: categoryId,
        werks: '1000', 
        
        sendmail: 0
      };

      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries(initialCategory));
      
      const initialTranslation = {
        category: categoryId,
        werks: '1000',
        lng: 'en',
        desc: 'Initial English Description'
      };
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategoryLng).entries(initialTranslation));

      // Now execute the update workflow (simulating updateCategoryWithDetails action)
      const updatedData = {
        
        sendmail: 1
      };

      const newTranslations = [
        { language: 'en', description: 'Updated Quality Control Issues' },
        { language: 'de', description: 'Aktualisierte Qualitätskontrollprobleme' },
        { language: 'fr', description: 'Problèmes de Contrôle Qualité Mis à Jour' }
      ];

      // Execute update workflow with referential integrity
      await db.tx(async (tx) => {
        // Update the main category
        await tx.run(
          cds.ql.UPDATE.entity(entities.ShiftBookCategory)
            .where({ ID: categoryId, werks: '1000' })
            .with(updatedData)
        );

        // Replace translations (business rule: complete replacement for consistency)
        await tx.run(cds.ql.DELETE.from(entities.ShiftBookCategoryLng).where({
          category: categoryId, werks: '1000'
        }));

        const newTranslationEntries = newTranslations.map(t => ({
          category: categoryId,
          werks: '1000',
          lng: t.language,
          desc: t.description
        }));
        await tx.run(cds.ql.INSERT.into(entities.ShiftBookCategoryLng).entries(newTranslationEntries));
      });

      // Verify updates were applied correctly
      const updatedCategory = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategory).where({ ID: categoryId, werks: '1000' })
      );
      // Test updated for translation-only structure;
      expect(updatedCategory[0].sendmail).toBe(1);

      const updatedTranslations = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryLng).where({ category: categoryId, werks: '1000' })
      );
      expect(updatedTranslations.length).toBe(3);
      expect(updatedTranslations.map(t => t.lng)).toEqual(
        expect.arrayContaining(['en', 'de', 'fr'])
      );
    });

    it('should cascade delete category and all related data', async () => {
      // Create a category with comprehensive related data
      const categoryId = randomUUID();
      const categoryData = {
        ID: categoryId,
        werks: '1000',
        
        sendmail: 1
      };

      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries(categoryData));

      // Add translations
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategoryLng).entries([
        { category: categoryId, werks: '1000', lng: 'en', desc: 'Equipment Maintenance' },
        { category: categoryId, werks: '1000', lng: 'de', desc: 'Anlagenwartung' }
      ]));

      // Add email recipients
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategoryMail).entries([
        { category: categoryId, werks: '1000', mail_address: 'maintenance@company.com' },
        { category: categoryId, werks: '1000', mail_address: 'supervisor@company.com' }
      ]));

      // Add log entries that reference this category
      await db.run(cds.ql.INSERT.into(entities.ShiftBookLog).entries([
        {
          werks: '1000', shoporder: 'SO001', stepid: '001', split: '001',
          workcenter: 'WC001', user_id: 'test-user',
          log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
          category: categoryId, subject: 'Equipment Check', message: 'Routine maintenance check'
        },
        {
          werks: '1000', shoporder: 'SO002', stepid: '002', split: '001',
          workcenter: 'WC002', user_id: 'test-user',
          log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
          category: categoryId, subject: 'Repair Completed', message: 'Equipment repair finished'
        }
      ]));

      // Execute cascade deletion workflow (simulating deleteCategoryCascade action)
      await db.tx(async (tx) => {
        // Business rule: Delete in proper order to maintain referential integrity
        await tx.run(cds.ql.DELETE.from(entities.ShiftBookLog).where({ category: categoryId }));
        await tx.run(cds.ql.DELETE.from(entities.ShiftBookCategoryMail).where({ 
          category: categoryId, werks: '1000' 
        }));
        await tx.run(cds.ql.DELETE.from(entities.ShiftBookCategoryLng).where({ 
          category: categoryId, werks: '1000' 
        }));
        await tx.run(cds.ql.DELETE.from(entities.ShiftBookCategory).where({ 
          ID: categoryId, werks: '1000' 
        }));
      });

      // Verify complete cascade deletion
      const remainingCategory = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategory).where({ ID: categoryId, werks: '1000' })
      );
      const remainingTranslations = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryLng).where({ category: categoryId, werks: '1000' })
      );
      const remainingMails = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryMail).where({ category: categoryId, werks: '1000' })
      );
      const remainingLogs = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({ category: categoryId })
      );

      expect(remainingCategory.length).toBe(0);
      expect(remainingTranslations.length).toBe(0);
      expect(remainingMails.length).toBe(0);
      expect(remainingLogs.length).toBe(0);
    });
  });

  describe('ShiftBook Entry Business Logic Workflows', () => {
    it('should handle complete shift book entry creation with business validation', async () => {
      // First create a category that the log will reference (business dependency)
      const categoryId = randomUUID();
      const categoryData = {
        ID: categoryId,
        werks: '1000',
        
        sendmail: 1
      };
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries(categoryData));

      const logEntry = {
        werks: '1000',
        shoporder: 'SO001',
        stepid: '001',
        split: '001',
        workcenter: 'WC001',
        user_id: 'john.smith',
        category: categoryId,
        subject: 'Production Line Stoppage',
        message: 'Main production line stopped due to conveyor belt malfunction. Estimated repair time: 2 hours.'
      };

      // Execute business workflow for log entry creation (simulating addShiftBookEntry action)
      await db.tx(async (tx) => {
        // Add timestamp (business rule: server-side timestamp)
        const logWithTimestamp = {
          ...logEntry,
          log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z')
        };
        
        // Validate business rules before insertion
        // Rule 1: Category must exist and be active
        const categoryExists = await tx.run(
          cds.ql.SELECT.from(entities.ShiftBookCategory).where({
            ID: logEntry.category,
            werks: logEntry.werks
          })
        );
        
        if (categoryExists.length === 0) {
          throw new Error('Invalid category: Category does not exist');
        }
        
        // Rule 2: Shop order format validation (business rule example)
        if (!/^SO\d{3}$/.test(logEntry.shoporder)) {
          throw new Error('Invalid shop order format: Must be SO followed by 3 digits');
        }
        
        // Create the log entry
        await tx.run(cds.ql.INSERT.into(entities.ShiftBookLog).entries(logWithTimestamp));
      });

      // Verify business workflow completed successfully
      const createdLog = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({
          shoporder: logEntry.shoporder
        })
      );
      
      expect(createdLog.length).toBe(1);
      expect(createdLog[0]).toMatchObject({
        werks: logEntry.werks,
        shoporder: logEntry.shoporder,
        category: logEntry.category,
        subject: logEntry.subject
      });
      expect(createdLog[0].log_dt).toBeDefined();
      expect(createdLog[0].ID).toBeDefined();
    });

    it('should handle batch operations with transaction integrity', async () => {
      // Create categories for the batch operation
      const categoryId1 = randomUUID();
      const categoryId2 = randomUUID();
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries([
        { ID: categoryId1, werks: '1000',  sendmail: 1 },
        { ID: categoryId2, werks: '1000',  sendmail: 0 }
      ]));

      const validBatchLogs = [
        {
          werks: '1000', shoporder: 'SO001', stepid: '001', split: '001',
          workcenter: 'WC001', user_id: 'batch-user', category: categoryId1,
          subject: 'Batch Entry 1', message: 'First batch log entry'
        },
        {
          werks: '1000', shoporder: 'SO002', stepid: '002', split: '002',
          workcenter: 'WC002', user_id: 'batch-user', category: categoryId2,
          subject: 'Batch Entry 2', message: 'Second batch log entry'
        },
        {
          werks: '1000', shoporder: 'SO003', stepid: '003', split: '003',
          workcenter: 'WC003', user_id: 'batch-user', category: categoryId1,
          subject: 'Batch Entry 3', message: 'Third batch log entry'
        }
      ];

      // Execute successful batch workflow (simulating batchAddShiftBookEntries action)
      await db.tx(async (tx) => {
        const timestamp = new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z');
        
        // Validate all entries first (business rule: fail-fast validation)
        for (const log of validBatchLogs) {
          const categoryExists = await tx.run(
            cds.ql.SELECT.from(entities.ShiftBookCategory).where({
              ID: log.category,
              werks: log.werks
            })
          );
          
          if (categoryExists.length === 0) {
            throw new Error(`Invalid category ${log.category} for shop order ${log.shoporder}`);
          }
        }
        
        // If all validations pass, insert all entries
        const logsWithTimestamp = validBatchLogs.map(log => ({
          ...log,
          log_dt: timestamp
        }));
        
        await tx.run(cds.ql.INSERT.into(entities.ShiftBookLog).entries(logsWithTimestamp));
      });

      // Verify batch operation success
      const createdLogs = await db.run(cds.ql.SELECT.from(entities.ShiftBookLog));
      expect(createdLogs.length).toBe(3);
      expect(createdLogs.map(l => l.shoporder)).toEqual(
        expect.arrayContaining(['SO001', 'SO002', 'SO003'])
      );

      // Test transaction rollback scenario
      const invalidCategoryId = randomUUID();
      const invalidBatchLogs = [
        {
          werks: '1000', shoporder: 'SO004', stepid: '004', split: '001',
          workcenter: 'WC004', user_id: 'batch-user', category: categoryId1,
          subject: 'Valid Entry', message: 'This should not be inserted'
        },
        {
          werks: '1000', shoporder: 'SO005', stepid: '005', split: '001',
          workcenter: 'WC005', user_id: 'batch-user', category: invalidCategoryId, // Invalid category
          subject: 'Invalid Entry', message: 'This has invalid category'
        }
      ];

      // Attempt batch operation with invalid data (should rollback)
      try {
        await db.tx(async (tx) => {
          for (const log of invalidBatchLogs) {
            const categoryExists = await tx.run(
              cds.ql.SELECT.from(entities.ShiftBookCategory).where({
                ID: log.category,
                werks: log.werks
              })
            );
            
            if (categoryExists.length === 0) {
              throw new Error(`Invalid category ${log.category}`);
            }
          }
          
          // This should not be reached due to validation failure
          const logsWithTimestamp = invalidBatchLogs.map(log => ({
            ...log,
            log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z')
          }));
          await tx.run(cds.ql.INSERT.into(entities.ShiftBookLog).entries(logsWithTimestamp));
        });
      } catch (error) {
        // Transaction should have rolled back
        expect(error.message).toContain('Invalid category');
      }

      // Verify rollback - should still have only the original 3 entries
      const finalLogs = await db.run(cds.ql.SELECT.from(entities.ShiftBookLog));
      expect(finalLogs.length).toBe(3);
    });
  });

  describe('Advanced Search and Filtering Workflows', () => {
    it('should perform advanced multilingual category search', async () => {
      // Set up multilingual categories for comprehensive search testing
      const categoryId1 = randomUUID();
      const categoryId2 = randomUUID();
      const categoryId3 = randomUUID();
      const categoryId4 = randomUUID();
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries([
        { ID: categoryId1, werks: '1000',  sendmail: 1 },
        { ID: categoryId2, werks: '1000',  sendmail: 0 },
        { ID: categoryId3, werks: '1000',  sendmail: 1 },
        { ID: categoryId4, werks: '1000',  sendmail: 1 }
      ]));

      // Add multilingual translations
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategoryLng).entries([
        { category: categoryId1, werks: '1000', lng: 'en', desc: 'Production Line Issues' },
        { category: categoryId1, werks: '1000', lng: 'de', desc: 'Produktionslinie Probleme' },
        { category: categoryId2, werks: '1000', lng: 'en', desc: 'Quality Control Systems' },
        { category: categoryId2, werks: '1000', lng: 'de', desc: 'Qualitätskontrollsysteme' },
        { category: categoryId3, werks: '1000', lng: 'en', desc: 'Equipment Maintenance Tasks' },
        { category: categoryId3, werks: '1000', lng: 'de', desc: 'Anlagenwartungsaufgaben' },
        { category: categoryId4, werks: '1000', lng: 'en', desc: 'Safety Incident Reports' },
        { category: categoryId4, werks: '1000', lng: 'de', desc: 'Sicherheitsvorfallberichte' }
      ]));

      // Test English search (simulating advancedCategorySearch action)
      const englishSearchResults = await db.run(
        cds.ql.SELECT
          .from(entities.ShiftBookCategoryLng)
          .where({ lng: 'en' })
          .and(`desc like '%Production%' OR desc like '%Equipment%'`)
      );

      expect(englishSearchResults.length).toBe(2);
      expect(englishSearchResults.map(r => r.category)).toEqual(
        expect.arrayContaining([categoryId1, categoryId3])
      );

      // Test German search
      const germanSearchResults = await db.run(
        cds.ql.SELECT
          .from(entities.ShiftBookCategoryLng)
          .where({ lng: 'de' })
          .and(`desc like '%Qualität%' OR desc like '%Sicherheit%'`)
      );

      expect(germanSearchResults.length).toBe(2);
      expect(germanSearchResults.map(r => r.category)).toEqual(
        expect.arrayContaining([categoryId2, categoryId4])
      );

      // Test cross-language search with category join
      const categoriesWithTranslations = await db.run(
        cds.ql.SELECT
          .from(entities.ShiftBookCategory)
          .columns('ID', 'werks', 'sendmail')
          .where({ werks: '1000', sendmail: 1 })
      );

      expect(categoriesWithTranslations.length).toBe(3); // Categories 1, 3, 4 have sendmail: 1
      expect(categoriesWithTranslations.map(c => c.ID)).toEqual(
        expect.arrayContaining([categoryId1, categoryId3, categoryId4])
      );
    });

    it('should perform advanced log search with content filtering', async () => {
      // Set up category and comprehensive log data for search testing
      const categoryId = randomUUID();
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries({
        ID: categoryId, werks: '1000',  sendmail: 1
      }));

      const searchableLogs = [
        {
          werks: '1000', shoporder: 'SO001', stepid: '001', split: '001',
          workcenter: 'WC001', user_id: 'operator1',
          log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
          category: categoryId, subject: 'Machine Breakdown Critical',
          message: 'Critical failure in main production line motor. Immediate maintenance required.'
        },
        {
          werks: '1000', shoporder: 'SO002', stepid: '002', split: '001',
          workcenter: 'WC002', user_id: 'inspector1',
          log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
          category: categoryId, subject: 'Quality Inspection Failed',
          message: 'Product quality below standards. Batch rejected for rework.'
        },
        {
          werks: '1000', shoporder: 'SO003', stepid: '003', split: '001',
          workcenter: 'WC003', user_id: 'technician1',
          log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
          category: categoryId, subject: 'Routine Maintenance Complete',
          message: 'Scheduled maintenance completed successfully. All systems operational.'
        },
        {
          werks: '1000', shoporder: 'SO004', stepid: '004', split: '001',
          workcenter: 'WC001', user_id: 'operator2',
          log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z'),
          category: categoryId, subject: 'Machine Performance Alert',
          message: 'Machine running below optimal performance. Preventive maintenance recommended.'
        }
      ];

      await db.run(cds.ql.INSERT.into(entities.ShiftBookLog).entries(searchableLogs));

      // Test full-text search across subject and message (simulating advancedLogSearch action)
      const maintenanceSearchResults = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog)
          .where(`subject like '%maintenance%' OR message like '%maintenance%'`)
      );

      expect(maintenanceSearchResults.length).toBe(3); // SO001, SO003, SO004 contain "maintenance"
      expect(maintenanceSearchResults.map(l => l.shoporder)).toEqual(
        expect.arrayContaining(['SO001', 'SO003', 'SO004'])
      );

      // Test search by user and workcenter
      const operatorWC001Results = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog)
          .where(`workcenter = 'WC001' AND user_id like 'operator%'`)
      );

      expect(operatorWC001Results.length).toBe(2); // SO001, SO004
      expect(operatorWC001Results.map(l => l.shoporder)).toEqual(
        expect.arrayContaining(['SO001', 'SO004'])
      );

      // Test severity search (critical issues)
      const criticalIssuesResults = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog)
          .where(`subject like '%Critical%' OR message like '%Critical%'`)
      );

      expect(criticalIssuesResults.length).toBe(1); // SO001
      expect(criticalIssuesResults[0].shoporder).toBe('SO001');
      expect(criticalIssuesResults[0].subject).toContain('Critical');
    });

    it('should retrieve paginated and filtered results with sorting', async () => {
      // Create test data for pagination testing
      const categoryId = randomUUID();
      const categoryData = { ID: categoryId, werks: '1000',  sendmail: 1 };
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries(categoryData));

      // Create 25 log entries for comprehensive pagination testing
      const paginationLogs = [];
      for (let i = 1; i <= 25; i++) {
        paginationLogs.push({
          werks: '1000',
          shoporder: `SO${String(i).padStart(3, '0')}`,
          stepid: String(i).padStart(3, '0'),
          split: '001',
          workcenter: i <= 10 ? 'WC001' : i <= 20 ? 'WC002' : 'WC003',
          user_id: `user${Math.ceil(i / 5)}`, // user1, user2, user3, user4, user5
          log_dt: new Date(Date.now() - (25 - i) * 60000).toISOString().replace(/\.[0-9]{3}Z$/, 'Z'), // Staggered times
          category: categoryId,
          subject: `Log Entry ${i}`,
          message: `This is test log entry number ${i} with varying content`
        });
      }
      await db.run(cds.ql.INSERT.into(entities.ShiftBookLog).entries(paginationLogs));

      // Test pagination - First page (simulating getShiftBookLogsPaginated action)
      const firstPage = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog)
          .where({ werks: '1000' })
          .limit(10, 0)
          .orderBy('log_dt desc')
      );

      expect(firstPage.length).toBe(10);
      expect(firstPage[0].shoporder).toBe('SO025'); // Most recent first
      expect(firstPage[9].shoporder).toBe('SO016'); // 10th most recent

      // Test pagination - Second page
      const secondPage = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog)
          .where({ werks: '1000' })
          .limit(10, 10)
          .orderBy('log_dt desc')
      );

      expect(secondPage.length).toBe(10);
      expect(secondPage[0].shoporder).toBe('SO015');
      expect(secondPage[9].shoporder).toBe('SO006');

      // Test filtered pagination - Only WC001 logs
      const wc001Filtered = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog)
          .where({ werks: '1000', workcenter: 'WC001' })
          .limit(5, 0)
          .orderBy('log_dt desc')
      );

      expect(wc001Filtered.length).toBe(5);
      expect(wc001Filtered.every(log => log.workcenter === 'WC001')).toBe(true);

      // Test total count for pagination metadata
      const totalCount = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({ werks: '1000' })
      );
      const wc001Count = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookLog).where({ werks: '1000', workcenter: 'WC001' })
      );

      expect(totalCount.length).toBe(25);
      expect(wc001Count.length).toBe(10); // Entries 1-10 are in WC001
    });
  });

  describe('Email Integration Business Workflows', () => {
    it('should manage email recipients with batch operations', async () => {
      // Create category for email notifications
      const categoryId = randomUUID();
      const categoryData = { ID: categoryId, werks: '1000',  sendmail: 1 };
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries(categoryData));

      const emailBatch1 = [
        { email: 'production.manager@company.com' },
        { email: 'shift.supervisor@company.com' },
        { email: 'quality.inspector@company.com' }
      ];

      // Execute batch email insertion workflow (simulating batchInsertMails action)
      await db.tx(async (tx) => {
        // Validate category exists and supports email notifications
        const category = await tx.run(
          cds.ql.SELECT.from(entities.ShiftBookCategory).where({
            ID: categoryId, werks: '1000'
          })
        );
        
        if (category.length === 0 || category[0].sendmail !== 1) {
          throw new Error('Category does not support email notifications');
        }

        // Business rule: Validate email format before insertion
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const recipient of emailBatch1) {
          if (!emailRegex.test(recipient.email)) {
            throw new Error(`Invalid email format: ${recipient.email}`);
          }
        }

        const emailEntries = emailBatch1.map(recipient => ({
          category: categoryId,
          werks: '1000',
          mail_address: recipient.email
        }));
        
        await tx.run(cds.ql.INSERT.into(entities.ShiftBookCategoryMail).entries(emailEntries));
      });

      const insertedEmails = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryMail).where({
          category: categoryId, werks: '1000'
        })
      );
      
      expect(insertedEmails.length).toBe(3);
      expect(insertedEmails.map(e => e.mail_address)).toEqual(
        expect.arrayContaining([
          'production.manager@company.com', 
          'shift.supervisor@company.com', 
          'quality.inspector@company.com'
        ])
      );

      // Test duplicate prevention (business rule)
      const duplicateEmail = [{ email: 'production.manager@company.com' }]; // Already exists

      try {
        await db.tx(async (tx) => {
          // Check for existing email before insertion
          const existing = await tx.run(
            cds.ql.SELECT.from(entities.ShiftBookCategoryMail).where({
              category: categoryId, werks: '1000', mail_address: duplicateEmail[0].email
            })
          );
          
          if (existing.length > 0) {
            throw new Error(`Email already exists: ${duplicateEmail[0].email}`);
          }
          
          await tx.run(cds.ql.INSERT.into(entities.ShiftBookCategoryMail).entries({
            category: categoryId, werks: '1000', mail_address: duplicateEmail[0].email
          }));
        });
      } catch (error) {
        expect(error.message).toContain('Email already exists');
      }

      // Verify no duplicates were inserted
      const finalEmails = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryMail).where({
          category: categoryId, werks: '1000'
        })
      );
      expect(finalEmails.length).toBe(3); // Still only 3 emails
    });

    it('should retrieve mail recipients for notification workflows', async () => {
      // Set up notification scenario with multiple categories
      const emergencyCategoryId = randomUUID();
      const routineCategoryId = randomUUID();
      const noEmailCategoryId = randomUUID();
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries([
        { ID: emergencyCategoryId, werks: '1000',  sendmail: 1 },
        { ID: routineCategoryId, werks: '1000',  sendmail: 1 },
        { ID: noEmailCategoryId, werks: '1000',  sendmail: 0 }
      ]));

      const emergencyRecipients = [
        { category: emergencyCategoryId, werks: '1000', mail_address: 'emergency@company.com' },
        { category: emergencyCategoryId, werks: '1000', mail_address: 'oncall.manager@company.com' },
        { category: emergencyCategoryId, werks: '1000', mail_address: 'safety.officer@company.com' }
      ];

      const routineRecipients = [
        { category: routineCategoryId, werks: '1000', mail_address: 'operations@company.com' },
        { category: routineCategoryId, werks: '1000', mail_address: 'reporting@company.com' }
      ];

      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategoryMail).entries([
        ...emergencyRecipients,
        ...routineRecipients
      ]));

      // Test retrieval for emergency category (simulating getMailRecipients action)
      const emergencyMailList = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryMail)
          .where({ category: emergencyCategoryId, werks: '1000' })
          .orderBy('mail_address')
      );

      expect(emergencyMailList.length).toBe(3);
      expect(emergencyMailList.map(r => r.mail_address)).toEqual([
        'emergency@company.com',
        'oncall.manager@company.com', 
        'safety.officer@company.com'
      ]);

      // Test retrieval for routine category
      const routineMailList = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryMail)
          .where({ category: routineCategoryId, werks: '1000' })
      );

      expect(routineMailList.length).toBe(2);
      expect(routineMailList.map(r => r.mail_address)).toEqual(
        expect.arrayContaining(['operations@company.com', 'reporting@company.com'])
      );

      // Test no recipients for non-email category
      const noEmailRecipients = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryMail)
          .where({ category: noEmailCategoryId, werks: '1000' })
      );

      expect(noEmailRecipients.length).toBe(0);

      // Test business logic: Get all recipients for categories with sendmail enabled
      const allEnabledRecipients = await db.run(
        cds.ql.SELECT
          .from(entities.ShiftBookCategoryMail)
          .columns('category', 'werks', 'mail_address')
          .where(`category IN (
            SELECT ID FROM ${entities.ShiftBookCategory} 
            WHERE werks = '1000' AND sendmail = 1
          )`)
      );

      expect(allEnabledRecipients.length).toBe(5); // 3 emergency + 2 routine
    });
  });

  describe('Multilingual Translation Management Workflows', () => {
    it('should handle comprehensive translation management', async () => {
      // Create categories for translation management
      const categoryId1 = randomUUID();
      const categoryId2 = randomUUID();
      await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries([
        { ID: categoryId1, werks: '1000',  sendmail: 1 },
        { ID: categoryId2, werks: '1000',  sendmail: 0 }
      ]));

      const multilingualTranslations = [
        // Category 1 translations
        { category: categoryId1, werks: '1000', lng: 'en', desc: 'Safety Incident Reports' },
        { category: categoryId1, werks: '1000', lng: 'de', desc: 'Sicherheitsvorfallberichte' },
        { category: categoryId1, werks: '1000', lng: 'es', desc: 'Informes de Incidentes de Seguridad' },
        { category: categoryId1, werks: '1000', lng: 'fr', desc: 'Rapports d\'Incidents de Sécurité' },
        { category: categoryId1, werks: '1000', lng: 'it', desc: 'Rapporti di Incidenti di Sicurezza' },
        
        // Category 2 translations
        { category: categoryId2, werks: '1000', lng: 'en', desc: 'Quality Control Issues' },
        { category: categoryId2, werks: '1000', lng: 'de', desc: 'Qualitätskontrollprobleme' },
        { category: categoryId2, werks: '1000', lng: 'es', desc: 'Problemas de Control de Calidad' }
      ];

      // Execute batch translation insertion (simulating batchInsertTranslations action)
      await db.tx(async (tx) => {
        // Business rule: Validate all categories exist before inserting translations
        const uniqueCategories = [...new Set(multilingualTranslations.map(t => t.category))];
        for (const categoryNum of uniqueCategories) {
          const categoryExists = await tx.run(
            cds.ql.SELECT.from(entities.ShiftBookCategory).where({
              ID: categoryNum, werks: '1000'
            })
          );
          
          if (categoryExists.length === 0) {
            throw new Error(`Category ${categoryNum} does not exist`);
          }
        }

        // Business rule: Validate language codes (ISO 639-1)
        const validLanguages = ['en', 'de', 'es', 'fr', 'it', 'pt'];
        for (const translation of multilingualTranslations) {
          if (!validLanguages.includes(translation.lng)) {
            throw new Error(`Invalid language code: ${translation.lng}`);
          }
        }

        await tx.run(cds.ql.INSERT.into(entities.ShiftBookCategoryLng).entries(multilingualTranslations));
      });

      // Verify translation insertion
      const allTranslations = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryLng).where({ werks: '1000' })
      );
      
      expect(allTranslations.length).toBe(8);

      // Test language-specific retrieval
      const germanTranslations = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryLng)
          .where({ werks: '1000', lng: 'de' })
          .orderBy('category')
      );

      expect(germanTranslations.length).toBe(2);
      expect(germanTranslations.map(t => t.desc)).toEqual(
        expect.arrayContaining(['Sicherheitsvorfallberichte', 'Qualitätskontrollprobleme'])
      );

      // Test category-specific multilingual retrieval
      const category1Translations = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryLng)
          .where({ category: categoryId1, werks: '1000' })
          .orderBy('lng')
      );

      expect(category1Translations.length).toBe(5);
      expect(category1Translations.map(t => t.lng)).toEqual(['de', 'en', 'es', 'fr', 'it']);

      // Test localized category retrieval workflow (simulating getShiftbookCategoriesByLanguage action)
      const localizedCategories = await db.run(
        cds.ql.SELECT
          .from(`${entities.ShiftBookCategory} as c`)
          .leftJoin(`${entities.ShiftBookCategoryLng} as t`)
          .on(`c.ID = t.category AND c.werks = t.werks AND t.lng = 'es'`)
          .columns(
            'c.ID',
            'c.werks',
            'c.sendmail',
            'c.sendworkcenters',
            't.desc as localized_desc'
          )
          .where({ 'c.werks': '1000' })
      );

      expect(localizedCategories.length).toBe(2);
      expect(localizedCategories.find(c => c.ID === categoryId1)?.localized_desc).toBe('Informes de Incidentes de Seguridad');
      expect(localizedCategories.find(c => c.ID === categoryId2)?.localized_desc).toBe('Problemas de Control de Calidad');
    });
  });
});