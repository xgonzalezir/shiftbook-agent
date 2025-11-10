import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Import the connection pool monitor
import connectionPoolMonitor from '../../../srv/lib/connection-pool-monitor';

describe('ConnectionPoolMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Clear event listeners to prevent interference
    connectionPoolMonitor.removeAllListeners();
    
    // Reset the monitor state
    connectionPoolMonitor.reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should extend EventEmitter', () => {
      expect(connectionPoolMonitor).toBeInstanceOf(EventEmitter);
    });

    it('should initialize with default metrics', () => {
      const metrics = connectionPoolMonitor.getMetrics();
      
      expect(metrics.totalConnections).toBe(0);
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.idleConnections).toBe(0);
      expect(metrics.waitingRequests).toBe(0);
      expect(metrics.acquiredConnections).toBe(0);
      expect(metrics.releasedConnections).toBe(0);
      expect(metrics.failedConnections).toBe(0);
      expect(metrics.avgAcquisitionTime).toBe(0);
      expect(metrics.avgQueryTime).toBe(0);
      expect(metrics.lastReset).toBeInstanceOf(Date);
    });

    it('should start periodic reset', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      // Create a new instance to test initialization
      jest.resetModules();
      require('../../../srv/lib/connection-pool-monitor');
      
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        24 * 60 * 60 * 1000 // 24 hours
      );
    });
  });

  describe('Connection Acquisition', () => {
    it('should record connection acquisition correctly', () => {
      connectionPoolMonitor.recordAcquisition('conn-123', 150);
      
      const metrics = connectionPoolMonitor.getMetrics();
      expect(metrics.acquiredConnections).toBe(1);
      expect(metrics.activeConnections).toBe(1);
      expect(metrics.avgAcquisitionTime).toBe(150);
    });

    it('should emit pool event on acquisition', (done) => {
      connectionPoolMonitor.on('pool-event', (event) => {
        expect(event.type).toBe('acquire');
        expect(event.connectionId).toBe('conn-456');
        expect(event.duration).toBe(200);
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });
      
      connectionPoolMonitor.recordAcquisition('conn-456', 200);
    });

    it('should update average acquisition time correctly', () => {
      connectionPoolMonitor.recordAcquisition('conn-1', 100);
      connectionPoolMonitor.recordAcquisition('conn-2', 300);
      
      const metrics = connectionPoolMonitor.getMetrics();
      expect(metrics.avgAcquisitionTime).toBe(200); // (100 + 300) / 2
    });

    it('should decrease idle connections when acquiring', () => {
      // Set initial pool size with idle connections
      connectionPoolMonitor.updatePoolSize(5, 0, 5);
      
      connectionPoolMonitor.recordAcquisition('conn-test', 50);
      
      const metrics = connectionPoolMonitor.getMetrics();
      expect(metrics.idleConnections).toBe(4);
      expect(metrics.activeConnections).toBe(1);
    });

    it('should not allow idle connections to go below zero', () => {
      // Start with 0 idle connections
      connectionPoolMonitor.recordAcquisition('conn-test', 50);
      
      const metrics = connectionPoolMonitor.getMetrics();
      expect(metrics.idleConnections).toBe(0);
      expect(metrics.activeConnections).toBe(1);
    });
  });

  describe('Connection Release', () => {
    beforeEach(() => {
      // Set up an acquired connection first
      connectionPoolMonitor.recordAcquisition('conn-123', 100);
    });

    it('should record connection release correctly', () => {
      connectionPoolMonitor.recordRelease('conn-123', 500);
      
      const metrics = connectionPoolMonitor.getMetrics();
      expect(metrics.releasedConnections).toBe(1);
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.idleConnections).toBe(1);
      expect(metrics.avgQueryTime).toBe(500);
    });

    it('should emit pool event on release', (done) => {
      connectionPoolMonitor.on('pool-event', (event) => {
        if (event.type === 'release') {
          expect(event.connectionId).toBe('conn-123');
          expect(event.duration).toBe(750);
          expect(event.timestamp).toBeInstanceOf(Date);
          done();
        }
      });
      
      connectionPoolMonitor.recordRelease('conn-123', 750);
    });

    it('should update average query time correctly', () => {
      connectionPoolMonitor.recordAcquisition('conn-2', 50); // Set up second connection
      
      connectionPoolMonitor.recordRelease('conn-123', 400);
      connectionPoolMonitor.recordRelease('conn-2', 600);
      
      const metrics = connectionPoolMonitor.getMetrics();
      expect(metrics.avgQueryTime).toBe(500); // (400 + 600) / 2
    });

    it('should not allow active connections to go below zero', () => {
      // Release more connections than acquired
      connectionPoolMonitor.recordRelease('conn-123', 100);
      connectionPoolMonitor.recordRelease('conn-456', 200);
      
      const metrics = connectionPoolMonitor.getMetrics();
      expect(metrics.activeConnections).toBe(0);
    });
  });

  describe('Connection Failures', () => {
    it('should record connection failures correctly', () => {
      const error = new Error('Connection timeout');
      connectionPoolMonitor.recordFailure('conn-fail', error);
      
      const metrics = connectionPoolMonitor.getMetrics();
      expect(metrics.failedConnections).toBe(1);
    });

    it('should emit pool event on failure', (done) => {
      const error = new Error('Database unreachable');
      
      connectionPoolMonitor.on('pool-event', (event) => {
        expect(event.type).toBe('fail');
        expect(event.connectionId).toBe('conn-error');
        expect(event.error).toBe(error);
        expect(event.timestamp).toBeInstanceOf(Date);
        done();
      });
      
      connectionPoolMonitor.recordFailure('conn-error', error);
    });

    it('should log error details', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Connection failed');
      
      connectionPoolMonitor.recordFailure('conn-fail-log', error);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ [POOL] Connection failure for conn-fail-log:',
        'Connection failed'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Event History', () => {
    it('should maintain event history up to maximum limit', () => {
      // Record more events than the maximum
      for (let i = 0; i < 1200; i++) {
        connectionPoolMonitor.recordAcquisition(`conn-${i}`, 100);
      }
      
      const history = connectionPoolMonitor.getEventHistory();
      expect(history.length).toBeLessThanOrEqual(1000); // maxEventHistory
    });

    it('should return event history in chronological order', () => {
      connectionPoolMonitor.recordAcquisition('conn-1', 100);
      jest.advanceTimersByTime(1000);
      connectionPoolMonitor.recordRelease('conn-1', 200);
      jest.advanceTimersByTime(1000);
      connectionPoolMonitor.recordFailure('conn-2', new Error('Test error'));
      
      const history = connectionPoolMonitor.getEventHistory();
      
      expect(history.length).toBe(3);
      expect(history[0].type).toBe('acquire');
      expect(history[1].type).toBe('release');
      expect(history[2].type).toBe('fail');
      
      // Check timestamps are in order
      expect(history[0].timestamp <= history[1].timestamp).toBe(true);
      expect(history[1].timestamp <= history[2].timestamp).toBe(true);
    });
  });

  describe('Pool Status', () => {
    beforeEach(() => {
      // Set up some activity
      connectionPoolMonitor.recordAcquisition('conn-1', 100);
      connectionPoolMonitor.recordAcquisition('conn-2', 150);
      connectionPoolMonitor.recordRelease('conn-1', 300);
      connectionPoolMonitor.recordFailure('conn-3', new Error('Test error'));
    });

    it('should return comprehensive status information', () => {
      const status = connectionPoolMonitor.getStatus();
      
      expect(status.isHealthy).toBeDefined();
      expect(status.metrics).toBeDefined();
      expect(status.eventHistory).toBeInstanceOf(Array);
      expect(status.lastActivity).toBeInstanceOf(Date);
      expect(status.warnings).toBeInstanceOf(Array);
    });

    it('should identify healthy pool status', () => {
      // Reset and create healthy scenario (no failures)
      connectionPoolMonitor.reset();
      connectionPoolMonitor.recordAcquisition('conn-healthy-1', 100);
      connectionPoolMonitor.recordAcquisition('conn-healthy-2', 150);
      connectionPoolMonitor.recordRelease('conn-healthy-1', 300);
      connectionPoolMonitor.recordRelease('conn-healthy-2', 250);
      
      const status = connectionPoolMonitor.getStatus();
      
      // With normal activity and no failures, pool should be healthy
      expect(status.isHealthy).toBe(true);
    });

    it('should identify unhealthy pool status with high failure rate', () => {
      // Generate many failures
      for (let i = 0; i < 50; i++) {
        connectionPoolMonitor.recordFailure(`fail-${i}`, new Error('Test'));
      }
      
      const status = connectionPoolMonitor.getStatus();
      
      expect(status.isHealthy).toBe(false);
      expect(status.warnings).toContain('High failure rate detected');
    });

    it('should detect slow acquisition times', () => {
      // Record slow acquisitions
      for (let i = 0; i < 10; i++) {
        connectionPoolMonitor.recordAcquisition(`slow-${i}`, 5000); // 5 seconds
      }
      
      const status = connectionPoolMonitor.getStatus();
      
      expect(status.warnings).toContain('Slow connection acquisition detected');
    });

    it('should detect slow query times', () => {
      // Set up connections and record slow queries
      for (let i = 0; i < 10; i++) {
        connectionPoolMonitor.recordAcquisition(`query-${i}`, 100);
        connectionPoolMonitor.recordRelease(`query-${i}`, 8000); // 8 seconds
      }
      
      const status = connectionPoolMonitor.getStatus();
      
      expect(status.warnings).toContain('Slow query execution detected');
    });
  });

  describe('Metrics Reset', () => {
    beforeEach(() => {
      // Set up some metrics
      connectionPoolMonitor.recordAcquisition('conn-1', 100);
      connectionPoolMonitor.recordRelease('conn-1', 200);
      connectionPoolMonitor.recordFailure('conn-2', new Error('Test'));
    });

    it('should reset all metrics to initial state', () => {
      connectionPoolMonitor.reset();
      
      const metrics = connectionPoolMonitor.getMetrics();
      expect(metrics.totalConnections).toBe(0);
      expect(metrics.activeConnections).toBe(0);
      expect(metrics.idleConnections).toBe(0);
      expect(metrics.acquiredConnections).toBe(0);
      expect(metrics.releasedConnections).toBe(0);
      expect(metrics.failedConnections).toBe(0);
      expect(metrics.avgAcquisitionTime).toBe(0);
      expect(metrics.avgQueryTime).toBe(0);
    });

    it('should clear event history on reset', () => {
      const historyBefore = connectionPoolMonitor.getEventHistory();
      expect(historyBefore.length).toBeGreaterThan(0);
      
      connectionPoolMonitor.reset();
      
      const historyAfter = connectionPoolMonitor.getEventHistory();
      expect(historyAfter.length).toBe(0);
    });

    it('should emit reset event', (done) => {
      connectionPoolMonitor.on('pool-event', (event) => {
        if (event.type === 'reset') {
          expect(event.timestamp).toBeInstanceOf(Date);
          done();
        }
      });
      
      connectionPoolMonitor.reset();
    });
  });

  describe('Periodic Reset', () => {
    it('should perform periodic reset at 24-hour intervals', () => {
      // Stop existing interval and spy on resetMetrics before starting a new one
      connectionPoolMonitor.stopPeriodicReset();
      const resetMetricsSpy = jest.spyOn(connectionPoolMonitor as any, 'resetMetrics');
      
      // Start a fresh periodic reset that we can spy on
      (connectionPoolMonitor as any).startPeriodicReset();
      
      // Fast forward 24 hours
      jest.advanceTimersByTime(24 * 60 * 60 * 1000);
      
      expect(resetMetricsSpy).toHaveBeenCalled();
      
      resetMetricsSpy.mockRestore();
    });

    it('should stop periodic reset when requested', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      connectionPoolMonitor.stopPeriodicReset();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    it('should allow setting pool size for metrics calculation', () => {
      connectionPoolMonitor.setPoolSize(20);
      
      // Pool size affects total connections calculation
      const metrics = connectionPoolMonitor.getMetrics();
      expect(metrics.totalConnections).toBe(20);
    });

    it('should allow configuring event history size', () => {
      connectionPoolMonitor.setMaxEventHistory(500);
      
      // Generate more events than the new limit
      for (let i = 0; i < 600; i++) {
        connectionPoolMonitor.recordAcquisition(`conn-${i}`, 100);
      }
      
      const history = connectionPoolMonitor.getEventHistory();
      expect(history.length).toBeLessThanOrEqual(500);
    });
  });

  describe('Logging and Debug', () => {
    it('should log acquisition events in development', () => {
      const originalEnv = process.env.CDS_ENV;
      process.env.CDS_ENV = 'development';
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      connectionPoolMonitor.recordAcquisition('debug-conn', 123);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔌 [POOL] Acquired connection debug-conn in 123ms')
      );
      
      process.env.CDS_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should log release events in development', () => {
      const originalEnv = process.env.CDS_ENV;
      process.env.CDS_ENV = 'development';
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      connectionPoolMonitor.recordAcquisition('debug-conn-2', 50);
      connectionPoolMonitor.recordRelease('debug-conn-2', 456);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔌 [POOL] Released connection debug-conn-2 after 456ms')
      );
      
      process.env.CDS_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should not log in production environment', () => {
      const originalEnv = process.env.CDS_ENV;
      process.env.CDS_ENV = 'production';
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      connectionPoolMonitor.recordAcquisition('prod-conn', 100);
      connectionPoolMonitor.recordRelease('prod-conn', 200);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      process.env.CDS_ENV = originalEnv;
      consoleSpy.mockRestore();
    });
  });
});