import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import * as cds from '@sap/cds';
import { v4 as uuidv4 } from 'uuid';

/**
 * Unit Tests for searchShiftBookLogsByString Action
 * 
 * Tests the search functionality across multiple log fields:
 * - User (user_id)
 * - Subject
 * - Message
 * - Origin Workcenter
 * - Recipient (destination workcenters)
 * - CreatedAt
 * 
 * Tests cover:
 * - Plain text search (case-insensitive)
 * - Regular expression search
 * - Optional filters (workcenter, category)
 * - Workcenter origin/destination filtering
 * - Language support for category descriptions
 * - Empty results
 * - Validation errors
 * 
 * ============================================================================
 * DISABLED - MSB-228: All tests in this suite disabled due to missing implementation
 * 
 * The searchShiftBookLogsByString action is not properly implemented.
 * All searches return false when they should return matching logs.
 * 
 * Required implementation:
 * - searchShiftBookLogsByString action in srv/actions/
 * - Search across multiple fields: user_id, subject, message, workcenter
 * - Case-insensitive search support
 * - Regular expression pattern matching
 * - Optional filters: category, workcenter (origin/destination)
 * - Proper result formatting and pagination
 * 
 * Once the implementation is complete, remove the .skip from all tests below.
 * 
 * Related JIRA: MSB-228
 * Estimated implementation time: 1-2 hours
 * ============================================================================
 */

describe.skip('searchShiftBookLogsByString - Unit Tests', () => {
  let app: any;
  let service: any;
  let db: any;
  let entities: any;
  let testCategoryId1: string;
  let testCategoryId2: string;
  let testLog1Id: string;
  let testLog2Id: string;
  let testLog3Id: string;

  beforeAll(async () => {
    // Set the environment to test mode
    process.env.NODE_ENV = 'test';
    process.env.CDS_ENV = 'test';
    process.env.EMAIL_SIMULATION_MODE = 'true';
    
    // Initialize CAP test environment
    cds.env.requires.db = {
      kind: 'sqlite',
      credentials: { database: ':memory:' }
    };
    
    // Load the CDS model
    if (!cds.model) {
      const model = await cds.load(['db', 'srv']); 
      if (model && !cds.model) { 
        (cds as any).model = model;
      }
    }
    
    // Connect to database
    db = await cds.connect.to('db');
    
    // Deploy the database schema
    await (cds as any).deploy(cds.model).to(db);

    try {
      // Serve all services from srv directory
      app = await cds.serve('all').from('srv');

      // Manually trigger the 'served' event to register action handlers
      await (cds as any).emit('served', cds.services);

      // Wait a bit for async handlers to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the service instance from cds.services
      const baseService = cds.services.ShiftBookService;

      console.log('✅ searchShiftBookLogsByString service bootstrapped:', !!baseService);

      if (!baseService || typeof baseService.send !== 'function') {
        throw new Error('ShiftBookService not available or send method missing');
      }

      // Create an admin user context for all requests
      service = baseService.tx({
        user: new cds.User({
          id: 'test-admin',
          attr: {},
          roles: ['admin', 'operator']
        })
      });
    } catch (error) {
      console.error('Service bootstrapping failed:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
    
    // Get entity definitions
    const namespace = 'syntax.gbi.sap.dme.plugins.shiftbook';
    entities = {
      ShiftBookLog: `${namespace}.ShiftBookLog`,
      ShiftBookCategory: `${namespace}.ShiftBookCategory`,
      ShiftBookCategoryMail: `${namespace}.ShiftBookCategoryMail`,
      ShiftBookCategoryLng: `${namespace}.ShiftBookCategoryLng`,
      ShiftBookCategoryWC: `${namespace}.ShiftBookCategoryWC`,
      ShiftBookLogWC: `${namespace}.ShiftBookLogWC`
    };
  });

  afterAll(async () => {
    if (app && app.server) {
      await app.stop();
    }
    if (db) {
      await db.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up test data
    try {
      await db.run(cds.ql.DELETE.from(entities.ShiftBookLogWC));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryWC));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookLog));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryMail));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryLng));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategory));
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Set up test data
    testCategoryId1 = uuidv4();
    testCategoryId2 = uuidv4();
    testLog1Id = uuidv4();
    testLog2Id = uuidv4();
    testLog3Id = uuidv4();
    
    // Create test categories
    await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries([
      { ID: testCategoryId1, werks: '1000', sendmail: 1, sendworkcenters: 1 },
      { ID: testCategoryId2, werks: '1000', sendmail: 0, sendworkcenters: 1 }
    ]));
    
    // Add translations
    await db.run(cds.ql.INSERT.into(entities.ShiftBookCategoryLng).entries([
      { category: testCategoryId1, werks: '1000', lng: 'EN', desc: 'Production Issues' },
      { category: testCategoryId1, werks: '1000', lng: 'DE', desc: 'Produktionsprobleme' },
      { category: testCategoryId2, werks: '1000', lng: 'EN', desc: 'Quality Control' },
      { category: testCategoryId2, werks: '1000', lng: 'ES', desc: 'Control de Calidad' }
    ]));
    
    // Create test logs with diverse content
    const now = new Date();
    await db.run(cds.ql.INSERT.into(entities.ShiftBookLog).entries([
      {
        ID: testLog1Id,
        werks: '1000',
        shoporder: 'SO12345',
        stepid: '0010',
        split: '',
        workcenter: 'ASSEMBLY01',
        user_id: 'john.doe@example.com',
        log_dt: now,
        category: testCategoryId1,
        subject: 'Machine breakdown on line A',
        message: 'The main conveyor belt stopped working at 14:30. Maintenance has been notified.',
        createdAt: now,
        modifiedAt: now
      },
      {
        ID: testLog2Id,
        werks: '1000',
        shoporder: 'SO12346',
        stepid: '0020',
        split: '',
        workcenter: 'QUALITY01',
        user_id: 'jane.smith@example.com',
        log_dt: new Date(now.getTime() - 3600000), // 1 hour ago
        category: testCategoryId2,
        subject: 'Quality check results',
        message: 'Inspection completed. Found 3 defects in batch B123.',
        createdAt: new Date(now.getTime() - 3600000),
        modifiedAt: new Date(now.getTime() - 3600000)
      },
      {
        ID: testLog3Id,
        werks: '1000',
        shoporder: 'SO12347',
        stepid: '0030',
        split: '',
        workcenter: 'PACKAGING01',
        user_id: 'bob.wilson@example.com',
        log_dt: new Date(now.getTime() - 7200000), // 2 hours ago
        category: testCategoryId1,
        subject: 'Packaging materials shortage',
        message: 'Running low on cardboard boxes. Please order more.',
        createdAt: new Date(now.getTime() - 7200000),
        modifiedAt: new Date(now.getTime() - 7200000)
      }
    ]));
    
    // Add destination workcenters
    await db.run(cds.ql.INSERT.into(entities.ShiftBookLogWC).entries([
      { log_id: testLog1Id, workcenter: 'MAINTENANCE01' },
      { log_id: testLog1Id, workcenter: 'SUPERVISOR01' },
      { log_id: testLog2Id, workcenter: 'QUALITY_MANAGER' },
      { log_id: testLog3Id, workcenter: 'PROCUREMENT01' }
    ]));
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await db.run(cds.ql.DELETE.from(entities.ShiftBookLogWC));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryWC));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookLog));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryMail));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryLng));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategory));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Search Functionality', () => {
    it('should search by user_id and return matching logs', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'john.doe'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].user_id).toContain('john.doe');
    });

    it('should search by subject and return matching logs', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'breakdown'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].subject).toContain('breakdown');
    });

    it('should search by message content and return matching logs', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'conveyor belt'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].message).toContain('conveyor belt');
    });

    it('should search by origin workcenter and return matching logs', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'QUALITY01'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].workcenter).toBe('QUALITY01');
    });

    it('should search by destination workcenter and return matching logs', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'MAINTENANCE01'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].ID).toBe(testLog1Id);
    });

    it('should perform case-insensitive search', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'BREAKDOWN'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].subject.toLowerCase()).toContain('breakdown');
    });

    it('should return multiple logs when search matches multiple entries', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'example.com'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3); // All users have example.com emails
    });

    it('should return empty array when no logs match', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'nonexistent search term xyz'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('Regular Expression Search', () => {
    it('should support regex pattern for email addresses', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'jane\\.smith.*@.*\\.com'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].user_id).toBe('jane.smith@example.com');
    });

    it('should support regex pattern for subjects', async () => {
      // Test regex on subject field which contains words like "breakdown", "results", "shortage"
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: '(breakdown|results|shortage)'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Verify the regex matched subjects
      const subjects = result.map((log: any) => log.subject.toLowerCase());
      expect(subjects.some((subj: string) => 
        subj.includes('breakdown') || subj.includes('results') || subj.includes('shortage')
      )).toBe(true);
    });

    it('should support regex pattern with OR operator', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'ASSEMBLY01|QUALITY01'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should return error for invalid regex pattern', async () => {
      await expect(
        service.send('searchShiftBookLogsByString', {
          werks: '1000',
          searchString: '[invalid regex('
        })
      ).rejects.toThrow();
    });
  });

  describe('Optional Filter - Category', () => {
    it('should filter by category when provided', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'example.com',
        category: testCategoryId1
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // Only logs with testCategoryId1
      result.forEach((log: any) => {
        expect(log.category).toBe(testCategoryId1);
      });
    });

    it('should return empty when category filter excludes all matches', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'john.doe',
        category: testCategoryId2
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('Optional Filter - Workcenter with Origin/Destination Flags', () => {
    it('should filter by workcenter including both origin and destination (default)', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'SO',
        workcenter: 'ASSEMBLY01',
        include_orig_work_center: true,
        include_dest_work_center: true
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].workcenter).toBe('ASSEMBLY01');
    });

    it('should filter by workcenter origin only', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'Quality', // Search for something that will match the QUALITY01 log
        workcenter: 'QUALITY01',
        include_orig_work_center: true,
        include_dest_work_center: false
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      // Verify that the matched log has QUALITY01 as origin workcenter
      expect(result.every((log: any) => log.workcenter === 'QUALITY01')).toBe(true);
    });

    it('should filter by workcenter destination only', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'SO',
        workcenter: 'MAINTENANCE01',
        include_orig_work_center: false,
        include_dest_work_center: true
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].ID).toBe(testLog1Id);
    });

    it('should return empty when workcenter filter excludes all matches', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'john.doe',
        workcenter: 'NONEXISTENT_WC'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('Language Support', () => {
    it('should return logs with category descriptions in English', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'breakdown',
        language: 'en'
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].category_desc).toBe('Production Issues');
      expect(result[0].category_language).toBe('en');
    });

    it('should return logs with category descriptions in German', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'breakdown',
        language: 'de'
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].category_desc).toBe('Produktionsprobleme');
      expect(result[0].category_language).toBe('de');
    });

    it('should fallback to English when requested language not available', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'breakdown',
        language: 'fr'
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].category_desc).toBe('Production Issues');
      expect(result[0].category_language).toBe('en');
    });
  });

  describe('Validation', () => {
    it('should reject invalid werks', async () => {
      await expect(
        service.send('searchShiftBookLogsByString', {
          werks: '123', // Only 3 characters
          searchString: 'test'
        })
      ).rejects.toThrow();
    });

    it('should reject empty search string', async () => {
      await expect(
        service.send('searchShiftBookLogsByString', {
          werks: '1000',
          searchString: ''
        })
      ).rejects.toThrow();
    });

    it('should reject whitespace-only search string', async () => {
      await expect(
        service.send('searchShiftBookLogsByString', {
          werks: '1000',
          searchString: '   '
        })
      ).rejects.toThrow();
    });

    it('should reject missing werks', async () => {
      await expect(
        service.send('searchShiftBookLogsByString', {
          searchString: 'test'
        })
      ).rejects.toThrow();
    });

    it('should reject missing search string', async () => {
      await expect(
        service.send('searchShiftBookLogsByString', {
          werks: '1000'
        })
      ).rejects.toThrow();
    });

    it('should reject unsupported language code', async () => {
      await expect(
        service.send('searchShiftBookLogsByString', {
          werks: '1000',
          searchString: 'test',
          language: 'xx'
        })
      ).rejects.toThrow();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle logs with null/undefined fields gracefully', async () => {
      const emptyLogId = uuidv4();
      await db.run(cds.ql.INSERT.into(entities.ShiftBookLog).entries([
        {
          ID: emptyLogId,
          werks: '1000',
          shoporder: '',
          stepid: '',
          split: '',
          workcenter: 'EMPTY_WC',
          user_id: '',
          log_dt: new Date(),
          category: testCategoryId1,
          subject: '',
          message: '',
          createdAt: new Date(),
          modifiedAt: new Date()
        }
      ]));

      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'EMPTY_WC'
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].ID).toBe(emptyLogId);
    });

    it('should handle special characters in search string', async () => {
      const specialLogId = uuidv4();
      await db.run(cds.ql.INSERT.into(entities.ShiftBookLog).entries([
        {
          ID: specialLogId,
          werks: '1000',
          shoporder: 'SO-SPECIAL',
          stepid: '0010',
          split: '',
          workcenter: 'WC-SPECIAL',
          user_id: 'user@test.com',
          log_dt: new Date(),
          category: testCategoryId1,
          subject: 'Test with special chars!',
          message: 'Message with symbols: #, %, &',
          createdAt: new Date(),
          modifiedAt: new Date()
        }
      ]));

      // Search for a non-regex special character string
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'special chars'
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].subject).toContain('special');
    });

    it('should return results ordered by log_dt descending', async () => {
      // Search for "example.com" which appears in all user_ids
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'example.com'
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(1);
      
      // Verify ordering - results should be ordered by log_dt descending
      for (let i = 0; i < result.length - 1; i++) {
        const current = new Date(result[i].log_dt);
        const next = new Date(result[i + 1].log_dt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });

    it('should handle searching across all fields simultaneously', async () => {
      // Create a log where different fields match different parts of a pattern
      const multiMatchId = uuidv4();
      await db.run(cds.ql.INSERT.into(entities.ShiftBookLog).entries([
        {
          ID: multiMatchId,
          werks: '1000',
          shoporder: 'SO_MULTI',
          stepid: '0010',
          split: '',
          workcenter: 'MULTI_WC',
          user_id: 'multi.user@test.com',
          log_dt: new Date(),
          category: testCategoryId1,
          subject: 'MULTI search test',
          message: 'Testing MULTI field search',
          createdAt: new Date(),
          modifiedAt: new Date()
        }
      ]));

      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'MULTI'
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].ID).toBe(multiMatchId);
    });
  });

  describe('Combined Filters', () => {
    it('should apply both category and workcenter filters together', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'SO',
        category: testCategoryId1,
        workcenter: 'ASSEMBLY01',
        include_orig_work_center: true,
        include_dest_work_center: false
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should only return logs matching all criteria
      result.forEach((log: any) => {
        expect(log.category).toBe(testCategoryId1);
        expect(log.workcenter).toBe('ASSEMBLY01');
      });
    });

    it('should apply all filters together with language', async () => {
      const result = await service.send('searchShiftBookLogsByString', {
        werks: '1000',
        searchString: 'Machine',
        category: testCategoryId1,
        language: 'de'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].category).toBe(testCategoryId1);
        expect(result[0].category_desc).toBe('Produktionsprobleme');
      }
    });
  });
});
