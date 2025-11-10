import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock perf_hooks
const mockPerformance = {
  now: jest.fn(() => 1000.123)
};

jest.mock('perf_hooks', () => ({
  performance: mockPerformance
}));

// Import after mocking
import performanceMonitor from '../../../srv/monitoring/performance-monitor';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    performanceMonitor.resetMetrics();
    performanceMonitor.stopMonitoring();
    
    // Clear all event listeners to prevent test interference
    performanceMonitor.removeAllListeners();
    
    // Reset performance.now mock
    mockPerformance.now.mockReturnValue(1000.123);
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
  });

  describe('Initialization', () => {
    it('should extend EventEmitter', () => {
      expect(performanceMonitor).toBeInstanceOf(EventEmitter);
    });

    it('should initialize with default metrics', () => {
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.httpRequestsTotal).toBe(0);
      expect(metrics.httpRequestDuration).toEqual([]);
      expect(metrics.httpRequestErrors).toBe(0);
      expect(metrics.databaseQueriesTotal).toBe(0);
      expect(metrics.databaseQueryDuration).toEqual([]);
      expect(metrics.databaseErrors).toBe(0);
      expect(metrics.shiftbookLogsCreated).toBe(0);
      expect(metrics.emailNotificationsSent).toBe(0);
      expect(metrics.criticalIssuesReported).toBe(0);
      expect(metrics.memoryUsage).toBe(0);
      expect(metrics.cpuUsage).toBe(0);
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.userSessionsActive).toBe(0);
      expect(metrics.categoriesAccessed).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
    });

    it('should initialize custom metrics map', () => {
      const customMetrics = performanceMonitor.getCustomMetrics();
      expect(customMetrics).toBeInstanceOf(Map);
      expect(customMetrics.size).toBe(0);
    });

    it('should initialize histogram buckets', () => {
      const histogramBuckets = performanceMonitor.getHistogramBuckets();
      expect(histogramBuckets).toBeInstanceOf(Map);
      expect(histogramBuckets.size).toBeGreaterThan(0);
      
      // Check that HTTP request buckets are initialized
      expect(histogramBuckets.has('http_request_duration')).toBe(true);
      expect(histogramBuckets.has('database_query_duration')).toBe(true);
    });
  });

  describe('Monitoring Control', () => {
    it('should start monitoring successfully', () => {
      jest.useFakeTimers();
      
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      performanceMonitor.startMonitoring();
      
      expect(setIntervalSpy).toHaveBeenCalledTimes(2); // One for general monitoring, one for resource checks
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000); // 30 second interval
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000); // 60 second interval
      
      jest.useRealTimers();
    });

    it('should not start monitoring if already monitoring', () => {
      jest.useFakeTimers();
      
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      performanceMonitor.startMonitoring();
      performanceMonitor.startMonitoring(); // Second call should be ignored
      
      expect(setIntervalSpy).toHaveBeenCalledTimes(2); // Should only be called once
      
      jest.useRealTimers();
    });

    it('should stop monitoring successfully', () => {
      jest.useFakeTimers();
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      performanceMonitor.startMonitoring();
      performanceMonitor.stopMonitoring();
      
      expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });

    it('should not stop monitoring if not currently monitoring', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      performanceMonitor.stopMonitoring();
      
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Performance monitoring not running');
      
      consoleSpy.mockRestore();
    });
  });

  describe('HTTP Request Tracking', () => {
    it('should record successful HTTP requests', () => {
      performanceMonitor.recordHttpRequest(250, 200, 'GET', '/api/shiftbook');
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.httpRequestsTotal).toBe(1);
      expect(metrics.httpRequestDuration).toEqual([250]);
      expect(metrics.httpRequestErrors).toBe(0);
    });

    it('should record HTTP request errors', () => {
      performanceMonitor.recordHttpRequest(500, 404, 'GET', '/api/missing');
      performanceMonitor.recordHttpRequest(750, 500, 'POST', '/api/error');
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.httpRequestsTotal).toBe(2);
      expect(metrics.httpRequestErrors).toBe(2);
      expect(metrics.httpRequestDuration).toEqual([500, 750]);
    });

    it('should update histogram buckets for HTTP requests', () => {
      performanceMonitor.recordHttpRequest(150, 200, 'GET', '/fast');
      performanceMonitor.recordHttpRequest(1500, 200, 'GET', '/slow');
      
      const buckets = performanceMonitor.getHistogramBuckets().get('http_request_duration');
      expect(buckets).toBeDefined();
      
      // Both requests should be counted in appropriate buckets
      const bucket250 = buckets!.find(b => b.le === '0.25'); // 250ms bucket
      const bucket2500 = buckets!.find(b => b.le === '2.5'); // 2.5s bucket
      
      expect(bucket250?.count).toBe(1); // 150ms request (under 250ms)
      expect(bucket2500?.count).toBe(2); // Both requests under 2.5s
    });

    it('should emit alert for slow HTTP requests', (done) => {
      performanceMonitor.on('alert', (alert) => {
        expect(alert.type).toBe('performance_degradation');
        expect(alert.value).toBe(6000);
        expect(alert.severity).toBe('warning');
        done();
      });
      
      performanceMonitor.recordHttpRequest(6000, 200, 'GET', '/slow-endpoint');
    });
  });

  describe('Database Query Tracking', () => {
    it('should record successful database queries', () => {
      performanceMonitor.recordDatabaseQuery(120, 'SELECT', 'ShiftBookLog', true);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.databaseQueriesTotal).toBe(1);
      expect(metrics.databaseQueryDuration).toEqual([120]);
      expect(metrics.databaseErrors).toBe(0);
    });

    it('should record database query errors', () => {
      performanceMonitor.recordDatabaseQuery(300, 'INSERT', 'ShiftBookLog', false);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.databaseQueriesTotal).toBe(1);
      expect(metrics.databaseErrors).toBe(1);
      expect(metrics.databaseQueryDuration).toEqual([300]);
    });

    it('should update histogram buckets for database queries', () => {
      performanceMonitor.recordDatabaseQuery(50, 'SELECT', 'ShiftBookLog', true);
      performanceMonitor.recordDatabaseQuery(800, 'UPDATE', 'ShiftBookCategory', true);
      
      const buckets = performanceMonitor.getHistogramBuckets().get('database_query_duration');
      expect(buckets).toBeDefined();
      
      const bucket100 = buckets!.find(b => b.le === '0.1');  // 100ms bucket
      const bucket1000 = buckets!.find(b => b.le === '1');   // 1s bucket
      
      expect(bucket100?.count).toBe(1); // 50ms query (under 100ms)
      expect(bucket1000?.count).toBe(2); // Both queries under 1s
    });

    it('should emit alert for slow database queries', (done) => {
      performanceMonitor.on('alert', (alert) => {
        expect(alert.type).toBe('database_performance');
        expect(alert.value).toBe(3500);
        expect(alert.severity).toBe('warning');
        done();
      });
      
      performanceMonitor.recordDatabaseQuery(3500, 'SELECT', 'ShiftBookLog', true);
    });
  });

  describe('Business Metrics Tracking', () => {
    it('should record shiftbook logs created', () => {
      performanceMonitor.recordBusinessMetric('shiftbook_log_created');
      performanceMonitor.recordBusinessMetric('shiftbook_log_created', 3);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.shiftbookLogsCreated).toBe(4); // 1 + 3
    });

    it('should record email notifications sent', () => {
      performanceMonitor.recordBusinessMetric('email_notification_sent', 2);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.emailNotificationsSent).toBe(2);
    });

    it('should record critical issues reported', () => {
      performanceMonitor.recordBusinessMetric('critical_issue_reported');
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.criticalIssuesReported).toBe(1);
    });

    it('should record user sessions active', () => {
      performanceMonitor.recordBusinessMetric('user_session_active', 5);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.userSessionsActive).toBe(5);
    });

    it('should record categories accessed', () => {
      performanceMonitor.recordBusinessMetric('categories_accessed', 10);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.categoriesAccessed).toBe(10);
    });

    it('should create custom metrics with labels', () => {
      performanceMonitor.recordBusinessMetric('custom_business_event', 1, { 
        type: 'order', 
        status: 'completed' 
      });
      
      const customMetrics = performanceMonitor.getCustomMetrics();
      expect(customMetrics.has('custom_business_event')).toBe(true);
      
      const metric = customMetrics.get('custom_business_event');
      expect(metric?.value).toBe(1);
      expect(metric?.labels).toEqual({ type: 'order', status: 'completed' });
      expect(metric?.type).toBe('counter');
    });
  });

  describe('Prometheus Metrics', () => {
    it('should generate Prometheus metrics format', () => {
      performanceMonitor.recordHttpRequest(150, 200, 'GET', '/test');
      performanceMonitor.recordDatabaseQuery(75, 'SELECT', 'TestEntity', true);
      performanceMonitor.recordBusinessMetric('shiftbook_log_created', 2);
      
      const prometheusMetrics = performanceMonitor.getPrometheusMetrics();
      
      expect(prometheusMetrics).toContain('# HELP http_requests_total Total number of HTTP requests');
      expect(prometheusMetrics).toContain('http_requests_total 1');
      expect(prometheusMetrics).toContain('database_queries_total 1');
      expect(prometheusMetrics).toContain('shiftbook_logs_created_total 2');
    });

    it('should include histogram buckets in Prometheus format', () => {
      performanceMonitor.recordHttpRequest(150, 200, 'GET', '/test');
      
      const prometheusMetrics = performanceMonitor.getPrometheusMetrics();
      
      expect(prometheusMetrics).toContain('http_request_duration_seconds_bucket{le=\"0.1\"} 0');
      expect(prometheusMetrics).toContain('http_request_duration_seconds_bucket{le=\"0.25\"} 1');
    });
  });

  describe('Status and Health', () => {
    it('should return monitoring status', () => {
      const status = performanceMonitor.getStatus();
      
      expect(status.isMonitoring).toBe(false);
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.startTime).toBeDefined();
      expect(status.metricsCollected).toBe(0);
    });

    it('should update status when monitoring starts', () => {
      jest.useFakeTimers();
      
      performanceMonitor.startMonitoring();
      const status = performanceMonitor.getStatus();
      
      expect(status.isMonitoring).toBe(true);
      
      jest.useRealTimers();
    });
  });

  describe('Metrics Reset', () => {
    it('should reset all metrics to initial state', () => {
      // Add some metrics
      performanceMonitor.recordHttpRequest(200, 200, 'GET', '/test');
      performanceMonitor.recordDatabaseQuery(100, 'SELECT', 'Test', true);
      performanceMonitor.recordBusinessMetric('custom_event', 5);
      
      // Verify metrics are recorded
      let metrics = performanceMonitor.getMetrics();
      expect(metrics.httpRequestsTotal).toBe(1);
      expect(metrics.databaseQueriesTotal).toBe(1);
      
      // Reset metrics
      performanceMonitor.resetMetrics();
      
      // Verify metrics are reset
      metrics = performanceMonitor.getMetrics();
      expect(metrics.httpRequestsTotal).toBe(0);
      expect(metrics.databaseQueriesTotal).toBe(0);
      expect(metrics.httpRequestDuration).toEqual([]);
      expect(metrics.databaseQueryDuration).toEqual([]);
      
      // Custom metrics should also be cleared
      const customMetrics = performanceMonitor.getCustomMetrics();
      expect(customMetrics.size).toBe(0);
    });
  });

  describe('Memory and Resource Monitoring', () => {
    it('should emit memory alert for high usage', (done) => {
      performanceMonitor.on('alert', (alert) => {
        if (alert.type === 'HIGH_MEMORY_USAGE') {
          expect(alert.value).toBeGreaterThan(400);
          done();
        }
      });
      
      // Simulate high memory usage (this is typically done by internal monitoring)
      // We'll directly call the private method for testing
      (performanceMonitor as any).checkMemoryUsage(500 * 1024 * 1024); // 500MB
    });

    it('should emit CPU alert for high usage', (done) => {
      performanceMonitor.on('alert', (alert) => {
        if (alert.type === 'HIGH_CPU_USAGE') {
          expect(alert.value).toBeGreaterThan(80);
          done();
        }
      });
      
      // Simulate high CPU usage
      (performanceMonitor as any).checkCpuUsage(85);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid business metric types gracefully', () => {
      performanceMonitor.recordBusinessMetric('invalid_metric_type' as any, 1);
      
      // Unknown metric types should be created as custom metrics
      const customMetrics = performanceMonitor.getCustomMetrics();
      expect(customMetrics.has('invalid_metric_type')).toBe(true);
      expect(customMetrics.get('invalid_metric_type')?.value).toBe(1);
    });

    it('should handle negative durations gracefully', () => {
      performanceMonitor.recordHttpRequest(-100, 200, 'GET', '/test');
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.httpRequestsTotal).toBe(1);
      expect(metrics.httpRequestDuration).toEqual([-100]); // Should still record it
    });
  });
});