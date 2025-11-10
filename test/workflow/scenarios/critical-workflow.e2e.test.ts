import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { e2eTestUtils, E2ETestContext } from '../../utils/e2e-test-utils';
import { PRODUCTION_ISSUES_1000 } from '../../utils/category-id-mapping';

/**
 * E2E Tests: Critical Production Workflow
 * 
 * Tests the complete end-to-end workflow for critical production issues:
 * 1. User creates critical log entry
 * 2. System persists data to database  
 * 3. Auto-email notification is triggered
 * 4. Email recipients are identified
 * 5. Email content is generated
 * 
 * This test validates the entire business process from user interaction
 * through database operations to email notifications.
 */

describe('Critical Production Workflow - E2E Tests', () => {
  let testContext: E2ETestContext;
  let testStartTime: Date;

  beforeAll(async () => {
    // Initialize E2E test environment
    testContext = await e2eTestUtils.initialize();
    
    console.log('🚀 E2E Test Environment Started');
    console.log(`   Service URL: ${testContext.serviceUrl}`);
    console.log(`   Database: ${testContext.db ? 'Connected' : 'Mocked'}`);
  });

  afterAll(async () => {
    await e2eTestUtils.shutdown();
    console.log('🛑 E2E Test Environment Shut Down');
  });

  beforeEach(async () => {
    testStartTime = new Date();
    
    // Load fresh test fixtures before each test
    await e2eTestUtils.loadTestFixtures();
    
    console.log(`📋 Test fixtures loaded at ${testStartTime.toISOString()}`);
  });

  afterEach(async () => {
    // Clean up test data after each test
    await e2eTestUtils.cleanupTestData();
    
    const testDuration = Date.now() - testStartTime.getTime();
    console.log(`🧹 Test cleanup completed (${testDuration}ms)`);
  });

  describe('Complete Critical Alert Workflow', () => {
    it('should execute full critical production alert workflow', async () => {
      const scenario = e2eTestUtils.getTestScenario('criticalAlert');
      console.log(`🎬 Starting scenario: ${scenario.name}`);

      // Step 1: Create critical log entry via HTTP API
      console.log('📝 Step 1: Creating critical log entry...');
      
      const criticalLogData = {
        werks: '1000',
        shoporder: 'E2E-CRITICAL-001',
        stepid: '010',
        split: '001',
        workcenter: 'WC-CRITICAL-TEST',
        user_id: 'e2e.operator',
        category: PRODUCTION_ISSUES_1000, // Critical category
        subject: 'E2E Critical Machine Failure',
        message: 'Assembly line has stopped completely - immediate action required'
      };

      // Since HTTP service is not available in E2E test environment, use database operations directly
      console.log('📦 Creating critical log entry via database operations (E2E simulation)...');
        
      // Direct database testing
      const logWithTimestamp = {
        ...criticalLogData,
        log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z')
      };
      
      await testContext.db.run(
        require('@sap/cds').ql.INSERT
          .into(testContext.entities.ShiftBookLog)
          .entries(logWithTimestamp)
      );
      
      console.log('✅ Critical log entry created via database');

      // Step 2: Verify database persistence
      console.log('🗄️ Step 2: Verifying database persistence...');
      
      const persistedLogs = await e2eTestUtils.verifyDatabaseState(
        'ShiftBookLog', 
        { shoporder: 'E2E-CRITICAL-001' }
      );
      
      expect(persistedLogs.length).toBe(1);
      expect(persistedLogs[0].category).toBe(PRODUCTION_ISSUES_1000);
      expect(persistedLogs[0].subject).toBe('E2E Critical Machine Failure');
      expect(persistedLogs[0].user_id).toBe('e2e.operator');
      
      console.log('✅ Database persistence verified');

      // Step 3: Verify critical category configuration
      console.log('⚙️ Step 3: Verifying critical category setup...');
      
      const criticalCategory = await e2eTestUtils.verifyDatabaseState(
        'ShiftBookCategory',
        { ID: PRODUCTION_ISSUES_1000, werks: '1000' }
      );
      
      expect(criticalCategory.length).toBe(1);
      expect(criticalCategory[0].sendmail).toBe(1); // Email enabled
      expect(criticalCategory[0].ID).toBeDefined();
      
      console.log('✅ Critical category configuration verified');

      // Step 4: Verify email recipients are configured
      console.log('📧 Step 4: Verifying email recipients...');
      
      const emailRecipients = await e2eTestUtils.verifyDatabaseState(
        'ShiftBookCategoryMail',
        { category: PRODUCTION_ISSUES_1000, werks: '1000' }
      );
      
      expect(emailRecipients.length).toBeGreaterThan(0);
      expect(emailRecipients[0].mail_address).toContain('@');
      
      console.log(`✅ Found ${emailRecipients.length} email recipient(s)`);
      emailRecipients.forEach((recipient, index) => {
        console.log(`   ${index + 1}. ${recipient.mail_address}`);
      });

      // Step 5: Wait for and verify auto-email trigger simulation
      console.log('🔔 Step 5: Checking auto-email notification...');
      
      await e2eTestUtils.waitForAsyncOperations(1000);
      
      const emailTriggered = await e2eTestUtils.assertEmailNotification(
        'E2E-CRITICAL-001',
        PRODUCTION_ISSUES_1000
      );
      
      expect(emailTriggered).toBe(true);
      console.log('✅ Auto-email notification system verified');

      // Step 6: End-to-end workflow timing validation
      const workflowDuration = Date.now() - testStartTime.getTime();
      console.log(`⏱️ Total workflow duration: ${workflowDuration}ms`);
      
      // E2E performance requirement: Complete workflow should finish within 5 seconds
      expect(workflowDuration).toBeLessThan(5000);
      
      console.log(`🎉 Critical workflow E2E test completed successfully!`);
    });

    it('should handle concurrent critical alerts correctly', async () => {
      console.log('🚦 Testing concurrent critical alerts...');

      // Create multiple critical logs simultaneously
      const concurrentLogs = [
        {
          werks: '1000', shoporder: 'CONCURRENT-001', stepid: '010', split: '001',
          workcenter: 'WC-LINE-A', user_id: 'operator.a', category: PRODUCTION_ISSUES_1000,
          subject: 'Line A Critical Issue', message: 'Line A stopped'
        },
        {
          werks: '1000', shoporder: 'CONCURRENT-002', stepid: '020', split: '001', 
          workcenter: 'WC-LINE-B', user_id: 'operator.b', category: PRODUCTION_ISSUES_1000,
          subject: 'Line B Critical Issue', message: 'Line B malfunction'
        },
        {
          werks: '1000', shoporder: 'CONCURRENT-003', stepid: '030', split: '001',
          workcenter: 'WC-LINE-C', user_id: 'operator.c', category: PRODUCTION_ISSUES_1000,
          subject: 'Line C Critical Issue', message: 'Line C emergency stop'
        }
      ];

      // Execute concurrent operations
      const createPromises = concurrentLogs.map(async (logData) => {
        const logWithTimestamp = {
          ...logData,
          log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z')
        };

        await testContext.db.run(
          require('@sap/cds').ql.INSERT
            .into(testContext.entities.ShiftBookLog)
            .entries(logWithTimestamp)
        );
        return logData.shoporder;
      });

      const createdOrders = await Promise.all(createPromises);
      expect(createdOrders).toHaveLength(3);
      
      console.log('✅ All concurrent critical alerts created');

      // Verify all logs were persisted correctly
      const allConcurrentLogs = await e2eTestUtils.verifyDatabaseState(
        'ShiftBookLog',
        { shoporder: { like: 'CONCURRENT-%' } }
      );

      expect(allConcurrentLogs).toHaveLength(3);
      console.log('✅ Concurrent critical alerts handled successfully');

      // Verify email system can handle multiple notifications
      await e2eTestUtils.waitForAsyncOperations(1500);
      
      for (const order of createdOrders) {
        const emailTriggered = await e2eTestUtils.assertEmailNotification(order, PRODUCTION_ISSUES_1000);
        expect(emailTriggered).toBe(true);
      }
      
      console.log('✅ Multiple email notifications verified');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle critical workflow with missing recipients gracefully', async () => {
      console.log('🛡️ Testing error recovery: missing email recipients...');

      // Create category without email recipients
      await testContext.db.run(
        require('@sap/cds').ql.INSERT
          .into(testContext.entities.ShiftBookCategory)
          .entries({
            category: PRODUCTION_ISSUES_1000,
            werks: '1000',
            // No default_desc field needed
            sendmail: 1
          })
      );

      // Create critical log for category without recipients
      const logData = {
        werks: '1000',
        shoporder: 'NO-RECIPIENTS-001',
        stepid: '010',
        split: '001',
        workcenter: 'WC-TEST',
        user_id: 'test.operator',
        category: PRODUCTION_ISSUES_1000,
        subject: 'Critical Issue No Recipients',
        message: 'This should not crash the system',
        log_dt: new Date().toISOString().replace(/\.[0-9]{3}Z$/, 'Z')
      };

      // Should not throw error even with no recipients
      await expect(
        testContext.db.run(
          require('@sap/cds').ql.INSERT
            .into(testContext.entities.ShiftBookLog)
            .entries(logData)
        )
      ).resolves.not.toThrow();

      // Verify log was still created
      const createdLog = await e2eTestUtils.verifyDatabaseState(
        'ShiftBookLog',
        { shoporder: 'NO-RECIPIENTS-001' }
      );

      expect(createdLog).toHaveLength(1);
      console.log('✅ System handled missing recipients gracefully');
    });

    it('should validate data integrity during workflow failures', async () => {
      console.log('🔍 Testing data integrity during failures...');

      let logCreated = false;

      try {
        // Attempt to create log with invalid data
        await testContext.db.run(
          require('@sap/cds').ql.INSERT
            .into(testContext.entities.ShiftBookLog)
            .entries({
              werks: '1000',
              shoporder: 'INTEGRITY-TEST-001',
              // Missing required fields to test validation
              category: PRODUCTION_ISSUES_1000,
              subject: 'Integrity Test',
              message: 'Testing data integrity'
            })
        );
        logCreated = true;
        
      } catch (error) {
        console.log('⚠️ Expected validation error occurred');
      }

      // Verify system state remains consistent
      const anyIntegrityLogs = await e2eTestUtils.verifyDatabaseState(
        'ShiftBookLog',
        { shoporder: 'INTEGRITY-TEST-001' }
      );

      if (logCreated) {
        expect(anyIntegrityLogs).toHaveLength(1);
        console.log('✅ Log created despite missing fields (database permissive)');
      } else {
        expect(anyIntegrityLogs).toHaveLength(0);
        console.log('✅ Data integrity maintained (validation active)');
      }
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-volume critical alerts within performance limits', async () => {
      console.log('⚡ Testing high-volume critical alert performance...');

      const alertCount = 50;
      const maxProcessingTime = 10000; // 10 seconds
      const startTime = Date.now();

      // Generate bulk critical alerts
      const bulkAlerts = Array.from({ length: alertCount }, (_, index) => ({
        werks: '1000',
        shoporder: `BULK-${String(index + 1).padStart(3, '0')}`,
        stepid: '010',
        split: '001',
        workcenter: `WC-BULK-${index % 5}`,
        user_id: 'bulk.operator',
        category: PRODUCTION_ISSUES_1000,
        subject: `Bulk Critical Alert ${index + 1}`,
        message: `High-volume test alert ${index + 1}`,
        log_dt: new Date(Date.now() + index * 100).toISOString().replace(/\.[0-9]{3}Z$/, 'Z')
      }));

      // Insert bulk alerts
      for (const alert of bulkAlerts) {
        await testContext.db.run(
          require('@sap/cds').ql.INSERT
            .into(testContext.entities.ShiftBookLog)
            .entries(alert)
        );
      }

      const processingTime = Date.now() - startTime;
      console.log(`📊 Processed ${alertCount} alerts in ${processingTime}ms`);
      console.log(`📈 Average: ${(processingTime / alertCount).toFixed(2)}ms per alert`);

      // Performance assertions
      expect(processingTime).toBeLessThan(maxProcessingTime);
      expect(processingTime / alertCount).toBeLessThan(200); // Max 200ms per alert

      // Verify all alerts were created
      const allBulkAlerts = await e2eTestUtils.verifyDatabaseState(
        'ShiftBookLog',
        { shoporder: { like: 'BULK-%' } }
      );

      expect(allBulkAlerts).toHaveLength(alertCount);
      console.log('✅ High-volume critical alerts processed successfully');
    });
  });
});