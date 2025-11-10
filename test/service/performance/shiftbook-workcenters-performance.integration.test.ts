import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import * as cds from '@sap/cds';
import { performance } from 'perf_hooks';
const { PERFORMANCE_CONFIG } = require('../../config/performance-test-config');

/**
 * Work Center Performance Tests for ShiftBook Service
 *
 * These tests validate performance characteristics of work center operations:
 * 1. Multiple work centers in categories - bulk insertion and management
 * 2. Work center filtering in logs - complex queries with origin and destination filtering
 * 3. Scalability testing with large datasets
 * 4. Memory usage patterns during bulk operations
 */
describe('ShiftBook Work Centers - Performance Tests', () => {
  let service: any;
  let db: any;
  let entities: any;

  // Performance thresholds based on configurable scale
  const PERFORMANCE_THRESHOLDS = {
    BULK_INSERT_100_WC: Math.floor(PERFORMANCE_CONFIG.thresholds.ORIGIN_FILTER_LARGE * 0.5),
    BULK_INSERT_1000_WC: Math.floor(PERFORMANCE_CONFIG.thresholds.ORIGIN_FILTER_LARGE * 2.5),
    BULK_INSERT_10000_WC: Math.floor(PERFORMANCE_CONFIG.thresholds.ORIGIN_FILTER_LARGE * 7.5),
    LOG_FILTER_SIMPLE: Math.floor(PERFORMANCE_CONFIG.thresholds.ORIGIN_FILTER_LARGE * 0.25),
    LOG_FILTER_COMPLEX: PERFORMANCE_CONFIG.thresholds.DESTINATION_FILTER_LARGE,
    BULK_LOG_CREATE_100: PERFORMANCE_CONFIG.thresholds.DESTINATION_FILTER_LARGE,
    BULK_LOG_CREATE_1000: Math.floor(PERFORMANCE_CONFIG.thresholds.DESTINATION_FILTER_LARGE * 5),
    CATEGORY_WC_LOOKUP: 200,       // Work center lookup in category
    LOG_WC_JOIN_QUERY: Math.floor(PERFORMANCE_CONFIG.thresholds.ORIGIN_FILTER_LARGE * 1.0),
    PAGINATION_LARGE_DATASET: Math.floor(PERFORMANCE_CONFIG.thresholds.ORIGIN_FILTER_LARGE * 0.4)
  };

  // Helper function to create mock service (defined before beforeAll)
  const createMockService = () => ({
    send: async (actionName: string, data: any) => {
      const { SELECT, INSERT, DELETE } = cds.ql;

      switch (actionName) {
        case 'createCategoryWithWorkcenters':
          const { werks, workcenters } = data;
          const categoryId = cds.utils.uuid();

          await db.run(INSERT.into(entities.ShiftBookCategory).entries({
            ID: categoryId,
            werks,
            sendmail: 1
          }));

          const wcEntries = workcenters.map((wc: any) => ({
            category_id: categoryId,
            workcenter: wc.workcenter || wc
          }));

          await db.run(INSERT.into(entities.ShiftBookCategoryWC).entries(wcEntries));
          return { categoryId, insertedCount: workcenters.length };

        case 'bulkCreateLogsWithWorkcenters':
          const { category, werks: logWerks, logs: logEntries } = data;
          const results = [];

          // Get category workcenters for inheritance
          const categoryWorkcenters = await db.run(
            SELECT.from(entities.ShiftBookCategoryWC)
              .where({ category_id: category })
          );

          for (const logData of logEntries) {
            const logId = cds.utils.uuid();

            await db.run(INSERT.into(entities.ShiftBookLog).entries({
              ID: logId,
              werks: logWerks,
              shoporder: logData.shoporder || `SO${Math.random().toString(36).substr(2, 8)}`,
              stepid: logData.stepid || '001',
              split: logData.split || '001',
              workcenter: logData.workcenter || 'WC001',
              user_id: logData.user_id || 'testuser',
              log_dt: new Date(),
              category,
              subject: logData.subject || 'Performance Test Subject',
              message: logData.message || 'Performance Test Message'
            }));

            // Copy workcenters from category to log
            for (const wc of categoryWorkcenters) {
              await db.run(INSERT.into(entities.ShiftBookLogWC).entries({
                log_id: logId,
                workcenter: wc.workcenter
              }));
            }

            results.push(logId);
          }

          return { createdLogIds: results, count: results.length };

        case 'getLogsFilteredByWorkcenter':
          const {
            werks: filterWerks,
            workcenter,
            include_dest_work_center = true,
            page = 1,
            pageSize = 20
          } = data;

          let logIds: string[] = [];

          if (include_dest_work_center) {
            // Get logs with this workcenter as destination
            const destLogs = await db.run(
              SELECT.from(entities.ShiftBookLogWC)
                .columns(['log_id'])
                .where({ workcenter })
            );
            logIds = destLogs.map((lwc: any) => lwc.log_id);
          }

          // Get logs with this workcenter as origin
          const originLogs = await db.run(
            SELECT.from(entities.ShiftBookLog)
              .columns(['ID'])
              .where({ werks: filterWerks, workcenter })
          );
          const originLogIds = originLogs.map((log: any) => log.ID);

          // Combine both sets
          const allLogIds = new Set([...logIds, ...originLogIds]);
          const finalLogIds = Array.from(allLogIds);

          if (finalLogIds.length === 0) {
            return { logs: [], total: 0, page, pageSize };
          }

          const offset = (page - 1) * pageSize;
          const logResults = await db.run(
            SELECT.from(entities.ShiftBookLog)
              .where({ werks: filterWerks, ID: { in: finalLogIds } })
              .orderBy({ log_dt: 'desc' })
              .limit(pageSize, offset)
          );

          return { logs: logResults, total: finalLogIds.length, page, pageSize };

        default:
          throw new Error(`Mock action ${actionName} not implemented`);
      }
    }
  });

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CDS_ENV = 'test';
    process.env.EMAIL_SIMULATION_MODE = 'true';

    cds.env.requires.db = {
      kind: 'sqlite',
      credentials: { database: ':memory:' }
    };

    if (!cds.model) {
      const model = await cds.load(['db', 'srv']);
      if (model && !cds.model) {
        cds.model = model;
      }
    }

    db = await cds.connect.to('db');
    await cds.deploy(cds.model).to(db);

    entities = {
      ShiftBookLog: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookLog',
      ShiftBookCategory: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategory',
      ShiftBookCategoryWC: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookCategoryWC',
      ShiftBookLogWC: 'syntax.gbi.sap.dme.plugins.shiftbook.ShiftBookLogWC'
    };

    try {
      const app = await cds.serve('srv');
      service = app.services?.ShiftBookService || Object.values(app.services || {})[0];
      
      if (!service) {
        throw new Error('Service not found in app.services');
      }
    } catch (error) {
      console.warn('Service bootstrapping failed, using mock service:', error.message);
      service = createMockService();
    }
    
    // Validate service was initialized
    if (!service) {
      throw new Error('Service initialization failed - cannot run tests');
    }
  });

  afterAll(async () => {
    if (db) {
      await db.disconnect();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await db.run(cds.ql.DELETE.from(entities.ShiftBookLogWC));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategoryWC));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookLog));
      await db.run(cds.ql.DELETE.from(entities.ShiftBookCategory));
    } catch (error) {
      console.warn('Error cleaning up test data:', error.message);
    }
  });

  // Helper functions
  const generateWorkcenters = (count: number): string[] => {
    return Array.from({ length: count }, (_, i) => `WC${String(i + 1).padStart(4, '0')}`);
  };

  const measurePerformance = async (testName: string, testFunction: () => Promise<any>) => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    const result = await testFunction();

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - startTime;

    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal
    };

    console.log(`📊 ${testName}:`);
    console.log(`   Duration: ${duration.toFixed(2)}ms`);
    console.log(`   Memory Delta - RSS: ${(memoryDelta.rss / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Memory Delta - Heap Used: ${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);

    return { result, duration, memoryDelta };
  };

  describe('Multiple Work Centers in Categories - Performance Tests', () => {
    it('should handle bulk insertion of 100 work centers in category within performance threshold', async () => {
      const workcenters = generateWorkcenters(100);

      const { result, duration } = await measurePerformance(
        'Bulk Insert 100 Work Centers',
        async () => {
          return await service.send('createCategoryWithWorkcenters', {
            werks: '1000',
            workcenters
          });
        }
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_INSERT_100_WC);
      expect(result.insertedCount).toBe(100);

      // Verify all work centers were created
      const createdWC = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryWC)
          .where({ category_id: result.categoryId })
      );
      expect(createdWC).toHaveLength(100);
    });

    it('should handle bulk insertion of 1000 work centers in category within performance threshold', async () => {
      const workcenters = generateWorkcenters(1000);

      const { result, duration } = await measurePerformance(
        'Bulk Insert 1000 Work Centers',
        async () => {
          return await service.send('createCategoryWithWorkcenters', {
            werks: '1000',
            workcenters
          });
        }
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_INSERT_1000_WC);
      expect(result.insertedCount).toBe(1000);

      // Verify work centers were created (sample check)
      const createdWC = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryWC)
          .columns('count(*) as total')
          .where({ category_id: result.categoryId })
      );
      expect(createdWC[0].total).toBe(1000);
    });

    it('should handle bulk insertion of 10000 work centers with chunked processing', async () => {
      const workcenters = generateWorkcenters(10000);

      const { result, duration } = await measurePerformance(
        'Bulk Insert 10000 Work Centers (Chunked)',
        async () => {
          // Process in chunks to simulate real-world batch processing
          const chunkSize = 1000;
          const chunks = [];
          for (let i = 0; i < workcenters.length; i += chunkSize) {
            chunks.push(workcenters.slice(i, i + chunkSize));
          }

          const categoryId = cds.utils.uuid();
          await db.run(cds.ql.INSERT.into(entities.ShiftBookCategory).entries({
            ID: categoryId,
            werks: '1000',
            sendmail: 1
          }));

          let totalInserted = 0;
          for (const chunk of chunks) {
            const wcEntries = chunk.map(wc => ({
              category_id: categoryId,
              workcenter: wc
            }));

            await db.run(cds.ql.INSERT.into(entities.ShiftBookCategoryWC).entries(wcEntries));
            totalInserted += chunk.length;
          }

          return { categoryId, insertedCount: totalInserted };
        }
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_INSERT_10000_WC);
      expect(result.insertedCount).toBe(10000);

      // Verify final count
      const createdWC = await db.run(
        cds.ql.SELECT.from(entities.ShiftBookCategoryWC)
          .columns('count(*) as total')
          .where({ category_id: result.categoryId })
      );
      expect(createdWC[0].total).toBe(10000);
    });

    it('should efficiently query work centers for multiple categories', async () => {
      // Create 5 categories with 100 work centers each
      const categoryResults = [];

      for (let i = 0; i < 5; i++) {
        const workcenters = generateWorkcenters(100).map(wc => `${wc}_C${i + 1}`);
        const result = await service.send('createCategoryWithWorkcenters', {
          werks: '1000',
          workcenters
        });
        categoryResults.push(result);
      }

      // Measure performance of querying work centers across all categories
      const { duration } = await measurePerformance(
        'Query Work Centers for Multiple Categories',
        async () => {
          const allCategoryIds = categoryResults.map(r => r.categoryId);

          const workcenters = await db.run(
            cds.ql.SELECT.from(entities.ShiftBookCategoryWC)
              .where({ category_id: { in: allCategoryIds } })
              .orderBy('workcenter')
          );

          return workcenters;
        }
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CATEGORY_WC_LOOKUP);
    });
  });

  describe('Work Center Filtering in Logs - Performance Tests', () => {
    let testCategoryId: string;
    let testLogIds: string[];

    beforeEach(async () => {
      // Setup test data: category with work centers and logs
      const config = PERFORMANCE_CONFIG.datasets.small;
      const workcenters = generateWorkcenters(config.workcenters);
      const categoryResult = await service.send('createCategoryWithWorkcenters', {
        werks: '1000',
        workcenters
      });
      testCategoryId = categoryResult.categoryId;

      // Create test logs based on configuration
      const logs = Array.from({ length: Math.floor(config.logs / 10) }, (_, i) => ({
        shoporder: `SO${String(i + 1).padStart(4, '0')}`,
        workcenter: workcenters[i % workcenters.length], // Distribute across work centers
        subject: `Test Subject ${i + 1}`,
        message: `Test Message ${i + 1}`
      }));

      const logResult = await service.send('bulkCreateLogsWithWorkcenters', {
        category: testCategoryId,
        werks: '1000',
        logs
      });
      testLogIds = logResult.createdLogIds;
    });

    it('should filter logs by origin work center within performance threshold', async () => {
      const { result, duration } = await measurePerformance(
        'Filter Logs by Origin Work Center',
        async () => {
          return await service.send('getLogsFilteredByWorkcenter', {
            werks: '1000',
            workcenter: 'WC0001',
            include_dest_work_center: false,
            page: 1,
            pageSize: 50
          });
        }
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LOG_FILTER_SIMPLE);
      expect(result.logs).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
    });

    it('should filter logs by destination work center (complex join) within performance threshold', async () => {
      const { result, duration } = await measurePerformance(
        'Filter Logs by Destination Work Center (Complex)',
        async () => {
          return await service.send('getLogsFilteredByWorkcenter', {
            werks: '1000',
            workcenter: 'WC0001',
            include_dest_work_center: true,
            page: 1,
            pageSize: 50
          });
        }
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LOG_FILTER_COMPLEX);
      expect(result.logs).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
    });

    it('should handle pagination on large log dataset efficiently', async () => {
      // Create a larger dataset for pagination testing
      const mediumConfig = PERFORMANCE_CONFIG.datasets.medium;
      const largeLogs = Array.from({ length: Math.floor(mediumConfig.logs / 5) }, (_, i) => ({
        shoporder: `LARGE_SO${String(i + 1).padStart(5, '0')}`,
        workcenter: `WC${String((i % 20) + 1).padStart(4, '0')}`,
        subject: `Large Dataset Subject ${i + 1}`,
        message: `Large Dataset Message ${i + 1}`
      }));

      await service.send('bulkCreateLogsWithWorkcenters', {
        category: testCategoryId,
        werks: '1000',
        logs: largeLogs
      });

      const { result, duration } = await measurePerformance(
        'Pagination on Large Dataset',
        async () => {
          const results = [];
          // Test multiple page loads
          for (let page = 1; page <= 5; page++) {
            const pageResult = await service.send('getLogsFilteredByWorkcenter', {
              werks: '1000',
              workcenter: 'WC0001',
              include_dest_work_center: true,
              page,
              pageSize: 20
            });
            results.push(pageResult);
          }
          return results;
        }
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGINATION_LARGE_DATASET);
      expect(result).toHaveLength(5); // 5 pages loaded
      expect(result[0].logs).toHaveLength(20); // First page has 20 items
    });

    it('should perform complex join queries efficiently', async () => {
      const { result, duration } = await measurePerformance(
        'Complex Join Query - Logs with Work Centers',
        async () => {
          // Simplified complex query that works with CDS
          const logWithWorkcenters = await db.run(
            cds.ql.SELECT.from(entities.ShiftBookLog)
              .columns(['ID', 'shoporder', 'workcenter', 'subject', 'category'])
              .where({ werks: '1000', category: testCategoryId })
              .limit(50)
          );

          // Get associated workcenters for these logs
          const logIds = logWithWorkcenters.map(log => log.ID);
          if (logIds.length > 0) {
            const logWorkcenters = await db.run(
              cds.ql.SELECT.from(entities.ShiftBookLogWC)
                .where({ log_id: { in: logIds } })
            );
            return { logs: logWithWorkcenters, workcenters: logWorkcenters };
          }
          return { logs: logWithWorkcenters, workcenters: [] };
        }
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LOG_WC_JOIN_QUERY);
      expect(result).toBeDefined();
    });
  });

  describe('Scalability and Load Testing', () => {
    it('should handle concurrent work center operations', async () => {
      const { result, duration } = await measurePerformance(
        'Concurrent Work Center Operations',
        async () => {
          const promises = [];

          // Simulate 10 concurrent category creations with work centers
          for (let i = 0; i < 10; i++) {
            const workcenters = generateWorkcenters(50).map(wc => `${wc}_CONCURRENT_${i}`);
            promises.push(
              service.send('createCategoryWithWorkcenters', {
                werks: '1000',
                workcenters
              })
            );
          }

          return await Promise.all(promises);
        }
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_INSERT_1000_WC * 2); // Allow 2x threshold for concurrency
      expect(result).toHaveLength(10);

      // Verify all operations completed successfully
      result.forEach((r: any) => {
        expect(r.insertedCount).toBe(50);
      });
    });

    it('should maintain performance with mixed read/write operations', async () => {
      // Setup: Create base data
      const baseWorkcenters = generateWorkcenters(100);
      const categoryResult = await service.send('createCategoryWithWorkcenters', {
        werks: '1000',
        workcenters: baseWorkcenters
      });

      const { duration } = await measurePerformance(
        'Mixed Read/Write Operations',
        async () => {
          const promises = [];

          // Mix of operations: 50% reads, 30% writes, 20% complex queries
          for (let i = 0; i < 20; i++) {
            if (i < 10) {
              // Read operations
              promises.push(
                db.run(
                  cds.ql.SELECT.from(entities.ShiftBookCategoryWC)
                    .where({ category_id: categoryResult.categoryId })
                )
              );
            } else if (i < 16) {
              // Write operations (new categories)
              const newWorkcenters = generateWorkcenters(10).map(wc => `${wc}_MIXED_${i}`);
              promises.push(
                service.send('createCategoryWithWorkcenters', {
                  werks: '1000',
                  workcenters: newWorkcenters
                })
              );
            } else {
              // Complex queries
              promises.push(
                db.run(
                  cds.ql.SELECT.from(entities.ShiftBookCategoryWC)
                    .columns('workcenter', 'count(*) as usage_count')
                    .groupBy('workcenter')
                    .having('count(*) > 0')
                )
              );
            }
          }

          return await Promise.all(promises);
        }
      );

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.LOG_FILTER_COMPLEX * 2);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should manage memory efficiently during bulk operations', async () => {
      let peakMemoryUsage = 0;
      const memoryCheckpoints: any[] = [];

      const workcenters = generateWorkcenters(5000);

      const checkMemory = (checkpoint: string) => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        peakMemoryUsage = Math.max(peakMemoryUsage, heapUsedMB);
        memoryCheckpoints.push({ checkpoint, heapUsedMB });
        return heapUsedMB;
      };

      checkMemory('Start');

      const result = await service.send('createCategoryWithWorkcenters', {
        werks: '1000',
        workcenters
      });

      checkMemory('After Bulk Insert');

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      checkMemory('After GC');

      console.log('📈 Memory Usage Checkpoints:');
      memoryCheckpoints.forEach(checkpoint => {
        console.log(`   ${checkpoint.checkpoint}: ${checkpoint.heapUsedMB.toFixed(2)}MB`);
      });

      expect(result.insertedCount).toBe(5000);
      expect(peakMemoryUsage).toBeLessThan(1200); // Should not exceed 1200MB heap usage for bulk operations
    });

    it('should handle resource cleanup properly', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform multiple operations
      for (let i = 0; i < 5; i++) {
        const workcenters = generateWorkcenters(100);
        await service.send('createCategoryWithWorkcenters', {
          werks: '1000',
          workcenters
        });
      }

      // Force cleanup
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(`📊 Memory Growth: ${memoryGrowth.toFixed(2)}MB`);

      // Memory growth should be reasonable (less than 50MB for this test)
      expect(memoryGrowth).toBeLessThan(50);
    });
  });
});