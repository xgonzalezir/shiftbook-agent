/**
 * Unit tests for Lifecycle Manager
 * Tests lifecycle orchestration, initialization, shutdown, and status tracking
 */

import { LifecycleManager } from '../../../srv/monitoring/lifecycle-manager';

describe('Lifecycle Manager', () => {
  let manager: LifecycleManager;

  // Store original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.CDS_ENV = 'test'; // Use test environment to avoid side effects
    
    // Create a new instance for each test
    manager = new (LifecycleManager as any)();
  });

  afterEach(async () => {
    // Clean up: shutdown if initialized
    if (manager.isReady()) {
      await manager.shutdown();
    }
    
    // Restore environment
    process.env = originalEnv;
  });

  describe('Initialization', () => {
    test('should create a new instance', () => {
      expect(manager).toBeDefined();
      expect(manager.isReady()).toBe(false);
    });

    test('should register lifecycle hooks successfully', () => {
      manager.registerLifecycleHooks();
      
      expect(manager.areHooksRegistered()).toBe(true);
      // Note: isReady() will be false until 'listening' event fires
      expect(manager.isReady()).toBe(false);
    });

    test('should not register hooks twice', () => {
      manager.registerLifecycleHooks();

      // Second call should be idempotent
      manager.registerLifecycleHooks();

      expect(manager.areHooksRegistered()).toBe(true);
    });

    test('should configure before registering hooks', () => {
      manager.disablePerformanceMonitoring();
      manager.disableResourceCleanup();

      const config = manager.getConfig();
      expect(config.enablePerformanceMonitoring).toBe(false);
      expect(config.enableResourceCleanup).toBe(false);
    });

    test('should emit hooks-registered event', (done) => {
      manager.once('hooks-registered', () => {
        expect(manager.areHooksRegistered()).toBe(true);
        done();
      });
      
      manager.registerLifecycleHooks();
    });
  });

  describe('Configuration', () => {
    test('should have correct default configuration for test environment', () => {
      process.env.CDS_ENV = 'test';
      const testManager = new (LifecycleManager as any)();
      
      const config = testManager.getConfig();
      
      expect(config.environment).toBe('test');
      expect(config.enablePerformanceMonitoring).toBe(true);
      expect(config.enableResourceCleanup).toBe(false); // Test environment
    });

    test('should have correct default configuration for production', () => {
      process.env.CDS_ENV = 'production';
      const prodManager = new (LifecycleManager as any)();
      
      const config = prodManager.getConfig();
      
      expect(config.environment).toBe('production');
      expect(config.enableResourceCleanup).toBe(true); // Production environment
    });

    test('should return configuration copy', () => {
      manager.registerLifecycleHooks();
      const config1 = manager.getConfig();
      const config2 = manager.getConfig();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
    });
  });

  describe('Status and Metrics', () => {
    beforeEach(() => {
      manager.registerLifecycleHooks();
    });

    test('should return comprehensive status', () => {
      const status = manager.getStatus();
      
      expect(status).toHaveProperty('performanceMonitoring');
      expect(status).toHaveProperty('resourceCleanup');
      expect(status).toHaveProperty('application');
      
      expect(status.performanceMonitoring).toHaveProperty('enabled');
      expect(status.performanceMonitoring).toHaveProperty('running');
      expect(status.performanceMonitoring).toHaveProperty('uptime');
      expect(status.performanceMonitoring).toHaveProperty('metricsCollected');
      
      expect(status.application).toHaveProperty('uptime');
      expect(status.application).toHaveProperty('startTime');
      expect(status.application).toHaveProperty('environment');
    });

    test('should calculate uptime correctly', () => {
      const uptime = manager.getUptime();
      
      expect(typeof uptime).toBe('number');
      expect(uptime).toBeGreaterThanOrEqual(0);
    });

    test('should return performance metrics', () => {
      const metrics = manager.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('httpRequestsTotal');
      expect(metrics).toHaveProperty('databaseQueriesTotal');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cpuUsage');
    });

    test('should return cleanup metrics', () => {
      const metrics = manager.getCleanupMetrics();
      
      expect(metrics).toHaveProperty('tasksExecuted');
      expect(metrics).toHaveProperty('memoryFreed');
      expect(metrics).toHaveProperty('processesCleaned');
      expect(metrics).toHaveProperty('connectionsClosed');
    });
  });

  describe('Shutdown', () => {
    beforeEach(() => {
      manager.registerLifecycleHooks();
    });

    test('should shutdown gracefully', async () => {
      await manager.shutdown();
      
      expect(manager.isReady()).toBe(false);
    });

    test('should handle shutdown when not initialized', async () => {
      await manager.shutdown(); // First shutdown
      await manager.shutdown(); // Second shutdown
      
      expect(manager.isReady()).toBe(false);
    });

    test('should emit shutdown events', async () => {
      // Create a fresh manager instance
      const testManager = new (LifecycleManager as any)();

      // Register hooks
      testManager.registerLifecycleHooks();

      // Simulate initialization by calling the private startMonitoring() method
      // This is what happens internally when 'listening' event fires
      testManager['startMonitoring']();

      // Set up event listeners BEFORE calling shutdown
      const events: string[] = [];
      
      testManager.once('shutdown-start', () => {
        events.push('start');
      });

      testManager.once('shutdown-complete', () => {
        events.push('complete');
      });

      // Perform shutdown
      await testManager.shutdown();
      
      // Verify events were emitted in correct order
      expect(events).toContain('start');
      expect(events).toContain('complete');
      expect(events.indexOf('start')).toBeLessThan(events.indexOf('complete'));

      // Cleanup
      if (testManager.isReady()) {
        await testManager.shutdown();
      }
    });
  });

  describe('Performance Monitoring Integration', () => {
    beforeEach(() => {
      manager.registerLifecycleHooks();
    });

    test('should record HTTP requests', () => {
      expect(() => {
        manager.recordHttpRequest(150, 200, 'GET', '/api/test');
      }).not.toThrow();
    });

    test('should record database queries', () => {
      expect(() => {
        manager.recordDatabaseQuery(50, 'SELECT', 'ShiftBookLog', true);
      }).not.toThrow();
    });

    test('should record business metrics', () => {
      expect(() => {
        manager.recordBusinessMetric('shiftbook_log_created', 1, { category: 'general' });
      }).not.toThrow();
    });

    test('should track metrics after recording', () => {
      manager.recordHttpRequest(100, 200, 'GET', '/test');
      
      const metrics = manager.getPerformanceMetrics();
      expect(metrics.httpRequestsTotal).toBeGreaterThan(0);
    });
  });

  describe('Resource Cleanup Integration', () => {
    test('should not force cleanup in test environment', async () => {
      process.env.CDS_ENV = 'test';
      manager.registerLifecycleHooks();
      
      // Should complete without errors
      await expect(manager.forceCleanup()).resolves.not.toThrow();
    });

    test('should handle cleanup when disabled', async () => {
      manager.disableResourceCleanup();
      manager.registerLifecycleHooks();

      await manager.forceCleanup();
      // Should log warning but not throw
      expect(manager.getConfig().enableResourceCleanup).toBe(false);
    });
  });

  describe('Prometheus Metrics', () => {
    beforeEach(() => {
      manager.registerLifecycleHooks();
    });

    test('should return Prometheus-formatted metrics', () => {
      const metrics = manager.getPrometheusMetrics();
      
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    test('should include metric names in Prometheus format', () => {
      manager.recordHttpRequest(100, 200, 'GET', '/test');
      
      const metrics = manager.getPrometheusMetrics();
      
      expect(metrics).toContain('http_requests_total');
    });

    test('should return disabled message when monitoring is off', async () => {
      const disabledManager = new (LifecycleManager as any)();
      disabledManager.disablePerformanceMonitoring();
      disabledManager.registerLifecycleHooks();

      const metrics = disabledManager.getPrometheusMetrics();
      
      expect(metrics).toContain('disabled');
      
      await disabledManager.shutdown();
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      manager.registerLifecycleHooks();
    });

    test('should return health check structure', () => {
      const health = manager.healthCheck();
      
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('components');
      expect(health).toHaveProperty('details');
      
      expect(health.components).toHaveProperty('performanceMonitoring');
      expect(health.components).toHaveProperty('resourceCleanup');
    });

    test('should report healthy status when initialized', () => {
      const health = manager.healthCheck();
      
      expect(typeof health.healthy).toBe('boolean');
      expect(health.details).toBeDefined();
    });

    test('should consider disabled components as healthy', async () => {
      const disabledManager = new (LifecycleManager as any)();
      disabledManager.disableResourceCleanup();
      disabledManager.registerLifecycleHooks();

      const health = disabledManager.healthCheck();
      
      expect(health.components.resourceCleanup).toBe(true);
      
      await disabledManager.shutdown();
    });
  });

  describe('Environment-Specific Behavior', () => {
    test('should enable cleanup in production environment', () => {
      process.env.CDS_ENV = 'production';
      const prodManager = new (LifecycleManager as any)();
      
      const config = prodManager.getConfig();
      expect(config.enableResourceCleanup).toBe(true);
    });

    test('should enable cleanup in hybrid environment', () => {
      process.env.CDS_ENV = 'hybrid';
      const hybridManager = new (LifecycleManager as any)();
      
      const config = hybridManager.getConfig();
      expect(config.enableResourceCleanup).toBe(true);
    });

    test('should disable cleanup in development environment', () => {
      process.env.CDS_ENV = 'development';
      const devManager = new (LifecycleManager as any)();
      
      const config = devManager.getConfig();
      expect(config.enableResourceCleanup).toBe(false);
    });

    test('should disable cleanup in test environment', () => {
      process.env.CDS_ENV = 'test';
      const testManager = new (LifecycleManager as any)();
      
      const config = testManager.getConfig();
      expect(config.enableResourceCleanup).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing environment variables gracefully', () => {
      delete process.env.CDS_ENV;
      delete process.env.NODE_ENV;
      
      const defaultManager = new (LifecycleManager as any)();
      const config = defaultManager.getConfig();
      
      expect(config.environment).toBe('development');
    });

    test('should handle initialization errors gracefully', () => {
      expect(() => {
        manager.registerLifecycleHooks();
      }).not.toThrow();
    });

    test('should handle shutdown errors gracefully', async () => {
      manager.registerLifecycleHooks();
      
      await expect(manager.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid initialization and shutdown', async () => {
      manager.registerLifecycleHooks();
      await manager.shutdown();
      
      expect(manager.isReady()).toBe(false);
    });

    test('should handle multiple metric recordings', () => {
      manager.registerLifecycleHooks();
      
      for (let i = 0; i < 100; i++) {
        manager.recordHttpRequest(100, 200, 'GET', '/test');
      }
      
      const metrics = manager.getPerformanceMetrics();
      expect(metrics.httpRequestsTotal).toBeGreaterThanOrEqual(100);
    });

    test('should handle status checks before initialization', () => {
      const status = manager.getStatus();
      
      expect(status).toBeDefined();
      expect(status.application).toBeDefined();
    });
  });
});
