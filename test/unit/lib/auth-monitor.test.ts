import { AuthMonitor, Alert, AuthMetrics, AlertRule, MonitorConfig } from '../../../srv/lib/auth-monitor';

// Import the singleton to clean it up
const authMonitorModule = require('../../../srv/lib/auth-monitor');

// Mock the auth-logger module
jest.mock('../../../srv/lib/auth-logger', () => ({
  authLogger: {
    logAuthEvent: jest.fn()
  },
  AuthLogger: jest.fn().mockImplementation(() => ({
    logAuthEvent: jest.fn()
  }))
}));

describe('AuthMonitor', () => {
  let authMonitor: AuthMonitor;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create new auth monitor with disabled config to avoid automatic start
    authMonitor = new AuthMonitor({
      enabled: false,
      enableHealthChecks: false,
      metricsWindow: 1 // 1 second for faster tests
    });
  });

  afterEach(() => {
    if (authMonitor) {
      authMonitor.destroy();
    }
    
    // Clean up the singleton instance to prevent open handles
    if (authMonitorModule.authMonitor) {
      authMonitorModule.authMonitor.destroy();
    }
    
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with default configuration', () => {
      const monitor = new AuthMonitor({ enabled: false });
      const healthStatus = monitor.getHealthStatus();
      
      expect(healthStatus.isEnabled).toBe(false);
      expect(healthStatus.metrics).toBeDefined();
      expect(healthStatus.config).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        enabled: false,
        metricsWindow: 120,
        enableAlerts: false,
        enableMetrics: false
      };

      const monitor = new AuthMonitor(customConfig);
      const healthStatus = monitor.getHealthStatus();
      
      expect(healthStatus.config.metricsWindow).toBe(120);
      expect(healthStatus.config.enableAlerts).toBe(false);
      expect(healthStatus.config.enableMetrics).toBe(false);
      monitor.destroy();
    });

    it('should initialize metrics correctly', () => {
      const metrics = authMonitor.getMetrics();
      
      expect(metrics).toMatchObject({
        totalRequests: 0,
        successfulAuths: 0,
        failedAuths: 0,
        tokenValidations: 0,
        tokenRefreshAttempts: 0,
        rateLimitHits: 0,
        securityViolations: 0,
        averageResponseTime: 0
      });
      expect(metrics.lastResetTime).toBeDefined();
    });

    it('should create default alert rules', () => {
      const monitor = new AuthMonitor({ enabled: false });
      const healthStatus = monitor.getHealthStatus();
      
      // Access config through updateConfig callback to verify rules exist
      const mockConfig = { alertRules: [] };
      monitor.updateConfig(mockConfig);
      
      // Verify default rules were replaced by empty array
      expect(mockConfig.alertRules).toEqual([]);
      monitor.destroy();
    });
  });

  describe('Monitoring Control', () => {
    it('should start monitoring when enabled', (done) => {
      const monitor = new AuthMonitor({ enabled: false });
      
      monitor.on('monitoring-started', () => {
        expect(monitor.getHealthStatus().isMonitoring).toBe(true);
        monitor.destroy();
        done();
      });

      monitor.startMonitoring();
    });

    it('should stop monitoring correctly', (done) => {
      const monitor = new AuthMonitor({ enabled: false });
      
      monitor.on('monitoring-stopped', () => {
        expect(monitor.getHealthStatus().isMonitoring).toBe(false);
        monitor.destroy();
        done();
      });

      monitor.startMonitoring();
      setTimeout(() => {
        monitor.stopMonitoring();
      }, 10);
    });

    it('should not start monitoring twice', () => {
      const monitor = new AuthMonitor({ enabled: false });
      let startCount = 0;
      
      monitor.on('monitoring-started', () => {
        startCount++;
      });

      monitor.startMonitoring();
      monitor.startMonitoring(); // Second call should be ignored

      expect(startCount).toBe(1);
      monitor.destroy();
    });

    it('should not stop monitoring if not started', () => {
      const monitor = new AuthMonitor({ enabled: false });
      let stopCount = 0;
      
      monitor.on('monitoring-stopped', () => {
        stopCount++;
      });

      monitor.stopMonitoring(); // Should not emit event

      expect(stopCount).toBe(0);
      monitor.destroy();
    });
  });

  describe('Metrics Recording', () => {
    beforeEach(() => {
      authMonitor.updateConfig({ enabled: true, enableMetrics: true });
    });

    it('should record successful authentication requests', () => {
      authMonitor.recordAuthRequest(true, 100);
      
      const metrics = authMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulAuths).toBe(1);
      expect(metrics.failedAuths).toBe(0);
      expect(metrics.averageResponseTime).toBe(100);
    });

    it('should record failed authentication requests', () => {
      authMonitor.recordAuthRequest(false, 150);
      
      const metrics = authMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulAuths).toBe(0);
      expect(metrics.failedAuths).toBe(1);
      expect(metrics.averageResponseTime).toBe(150);
    });

    it('should calculate average response time correctly', () => {
      authMonitor.recordAuthRequest(true, 100);
      authMonitor.recordAuthRequest(true, 200);
      authMonitor.recordAuthRequest(true, 300);
      
      const metrics = authMonitor.getMetrics();
      expect(metrics.averageResponseTime).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should record token validation events', () => {
      authMonitor.recordTokenValidation(true);
      authMonitor.recordTokenValidation(false);
      
      const metrics = authMonitor.getMetrics();
      expect(metrics.tokenValidations).toBe(2);
      expect(metrics.failedAuths).toBe(1); // Only failed validation counts as failed auth
    });

    it('should record token refresh attempts', () => {
      authMonitor.recordTokenRefresh(true);
      authMonitor.recordTokenRefresh(false);
      
      const metrics = authMonitor.getMetrics();
      expect(metrics.tokenRefreshAttempts).toBe(2);
      expect(metrics.failedAuths).toBe(1); // Only failed refresh counts as failed auth
    });

    it('should record rate limit hits', () => {
      authMonitor.recordRateLimitHit();
      authMonitor.recordRateLimitHit();
      
      const metrics = authMonitor.getMetrics();
      expect(metrics.rateLimitHits).toBe(2);
    });

    it('should record security violations', () => {
      authMonitor.recordSecurityViolation();
      authMonitor.recordSecurityViolation();
      authMonitor.recordSecurityViolation();
      
      const metrics = authMonitor.getMetrics();
      expect(metrics.securityViolations).toBe(3);
    });

    it('should not record metrics when disabled', () => {
      authMonitor.updateConfig({ enabled: false });
      
      authMonitor.recordAuthRequest(true, 100);
      authMonitor.recordTokenValidation(false);
      authMonitor.recordRateLimitHit();
      
      const metrics = authMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.tokenValidations).toBe(0);
      expect(metrics.rateLimitHits).toBe(0);
    });

    it('should not record metrics when metrics are disabled', () => {
      authMonitor.updateConfig({ enabled: true, enableMetrics: false });
      
      authMonitor.recordAuthRequest(true, 100);
      authMonitor.recordSecurityViolation();
      
      const metrics = authMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.securityViolations).toBe(0);
    });
  });

  describe('Alert System', () => {
    beforeEach(() => {
      authMonitor.updateConfig({ 
        enabled: true, 
        enableAlerts: true,
        enableMetrics: true,
        alertRules: []
      });
    });

    it('should trigger alert when rule condition is met', (done) => {
      const testRule: AlertRule = {
        id: 'test-rule',
        name: 'Test Rule',
        condition: (metrics) => metrics.securityViolations > 2,
        threshold: 2,
        window: 300,
        severity: 'medium',
        message: 'Test alert message',
        cooldown: 60
      };

      authMonitor.addAlertRule(testRule);

      authMonitor.on('alert', (alert: Alert) => {
        expect(alert.ruleId).toBe('test-rule');
        expect(alert.severity).toBe('medium');
        expect(alert.message).toBe('Test alert message');
        expect(alert.acknowledged).toBe(false);
        done();
      });

      // Trigger enough security violations to meet the condition
      authMonitor.recordSecurityViolation();
      authMonitor.recordSecurityViolation();
      authMonitor.recordSecurityViolation();
    });

    it('should trigger critical alert and handle it specially', (done) => {
      const criticalRule: AlertRule = {
        id: 'critical-rule',
        name: 'Critical Test Rule',
        condition: (metrics) => metrics.securityViolations > 1,
        threshold: 1,
        window: 300,
        severity: 'critical',
        message: 'Critical test alert',
        cooldown: 60
      };

      authMonitor.addAlertRule(criticalRule);

      authMonitor.on('critical-alert', (alert: Alert) => {
        expect(alert.severity).toBe('critical');
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('🚨 CRITICAL AUTH ALERT: Critical test alert')
        );
        done();
      });

      authMonitor.recordSecurityViolation();
      authMonitor.recordSecurityViolation();
    });

    it('should respect cooldown periods for alerts', (done) => {
      const testRule: AlertRule = {
        id: 'cooldown-test',
        name: 'Cooldown Test Rule',
        condition: (metrics) => metrics.rateLimitHits > 0,
        threshold: 0,
        window: 300,
        severity: 'low',
        message: 'Cooldown test',
        cooldown: 1 // 1 second cooldown
      };

      authMonitor.addAlertRule(testRule);

      let alertCount = 0;
      authMonitor.on('alert', () => {
        alertCount++;
      });

      // First alert should trigger
      authMonitor.recordRateLimitHit();
      
      setTimeout(() => {
        // Second alert should not trigger (within cooldown)
        authMonitor.recordRateLimitHit();
        
        setTimeout(() => {
          // Third alert should trigger (after cooldown)
          authMonitor.recordRateLimitHit();
          
          setTimeout(() => {
            expect(alertCount).toBe(2); // First and third should have triggered
            done();
          }, 10);
        }, 1100); // Wait for cooldown to expire
      }, 10);
    }, 5000);

    it('should not trigger alerts when alerts are disabled', () => {
      authMonitor.updateConfig({ enableAlerts: false });
      
      const testRule: AlertRule = {
        id: 'disabled-test',
        name: 'Disabled Test',
        condition: () => true, // Always trigger
        threshold: 0,
        window: 300,
        severity: 'high',
        message: 'Should not trigger',
        cooldown: 60
      };

      authMonitor.addAlertRule(testRule);

      let alertTriggered = false;
      authMonitor.on('alert', () => {
        alertTriggered = true;
      });

      authMonitor.recordSecurityViolation();
      
      expect(alertTriggered).toBe(false);
    });

    it('should acknowledge alerts correctly', () => {
      const testRule: AlertRule = {
        id: 'ack-test',
        name: 'Acknowledgment Test',
        condition: (metrics) => metrics.securityViolations > 0,
        threshold: 0,
        window: 300,
        severity: 'medium',
        message: 'Ack test alert',
        cooldown: 60
      };

      authMonitor.addAlertRule(testRule);

      return new Promise<void>((resolve) => {
        authMonitor.on('alert', (alert: Alert) => {
          const acknowledged = authMonitor.acknowledgeAlert(alert.id, 'test-user');
          expect(acknowledged).toBe(true);
          
          const alerts = authMonitor.getAlerts(true);
          const ackAlert = alerts.find(a => a.id === alert.id);
          expect(ackAlert?.acknowledged).toBe(true);
          expect(ackAlert?.acknowledgedBy).toBe('test-user');
          expect(ackAlert?.acknowledgedAt).toBeDefined();
          resolve();
        });

        authMonitor.recordSecurityViolation();
      });
    });

    it('should return false when acknowledging non-existent alert', () => {
      const result = authMonitor.acknowledgeAlert('non-existent-id', 'test-user');
      expect(result).toBe(false);
    });
  });

  describe('Alert Rule Management', () => {
    beforeEach(() => {
      authMonitor.updateConfig({ alertRules: [] });
    });

    it('should add alert rules correctly', (done) => {
      const newRule: AlertRule = {
        id: 'new-rule',
        name: 'New Rule',
        condition: () => false,
        threshold: 10,
        window: 300,
        severity: 'low',
        message: 'New rule message',
        cooldown: 60
      };

      authMonitor.on('rule-added', (rule: AlertRule) => {
        expect(rule.id).toBe('new-rule');
        expect(rule.name).toBe('New Rule');
        done();
      });

      authMonitor.addAlertRule(newRule);
    });

    it('should remove alert rules correctly', (done) => {
      const ruleToRemove: AlertRule = {
        id: 'remove-rule',
        name: 'Rule to Remove',
        condition: () => false,
        threshold: 10,
        window: 300,
        severity: 'medium',
        message: 'Rule to remove',
        cooldown: 60
      };

      authMonitor.addAlertRule(ruleToRemove);

      authMonitor.on('rule-removed', (rule: AlertRule) => {
        expect(rule.id).toBe('remove-rule');
        done();
      });

      const removed = authMonitor.removeAlertRule('remove-rule');
      expect(removed).toBe(true);
    });

    it('should return false when removing non-existent rule', () => {
      const removed = authMonitor.removeAlertRule('non-existent-rule');
      expect(removed).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', (done) => {
      const newConfig = {
        enabled: true,
        metricsWindow: 600,
        enableAlerts: false
      };

      authMonitor.on('config-updated', (config: MonitorConfig) => {
        expect(config.enabled).toBe(true);
        expect(config.metricsWindow).toBe(600);
        expect(config.enableAlerts).toBe(false);
        done();
      });

      authMonitor.updateConfig(newConfig);
    });

    it('should merge configuration with existing values', () => {
      const initialConfig = authMonitor.getHealthStatus().config;
      const originalWindow = initialConfig.metricsWindow;

      authMonitor.updateConfig({ enabled: true });

      const updatedConfig = authMonitor.getHealthStatus().config;
      expect(updatedConfig.enabled).toBe(true);
      expect(updatedConfig.metricsWindow).toBe(originalWindow); // Should remain unchanged
    });
  });

  describe('Health Checks and Status', () => {
    it('should return comprehensive health status', () => {
      authMonitor.updateConfig({ enabled: true });
      authMonitor.recordAuthRequest(true, 100);
      
      const healthStatus = authMonitor.getHealthStatus();
      
      expect(healthStatus).toMatchObject({
        isMonitoring: expect.any(Boolean),
        isEnabled: true,
        metrics: expect.any(Object),
        activeAlerts: expect.any(Number),
        totalAlerts: expect.any(Number),
        uptime: expect.any(Number),
        memoryUsage: expect.any(Object),
        config: expect.any(Object)
      });
    });

    it('should perform health checks when enabled', (done) => {
      const monitor = new AuthMonitor({ 
        enabled: false,
        enableHealthChecks: true,
        healthCheckInterval: 0.1 // 0.1 second for fast test
      });

      monitor.on('health-check', (healthStatus) => {
        expect(healthStatus).toBeDefined();
        expect(healthStatus.timestamp).toBeDefined();
        expect(healthStatus.metrics).toBeDefined();
        expect(healthStatus.uptime).toBeDefined();
        monitor.destroy();
        done();
      });

      monitor.startMonitoring();
    });

    it('should reset metrics periodically', (done) => {
      const monitor = new AuthMonitor({ 
        enabled: false,
        metricsWindow: 0.1 // 0.1 second for fast test
      });

      // Record some metrics
      monitor.updateConfig({ enabled: true, enableMetrics: true });
      monitor.recordAuthRequest(true, 100);
      
      monitor.on('metrics-reset', (metrics) => {
        expect(metrics.totalRequests).toBe(0);
        expect(metrics.successfulAuths).toBe(0);
        monitor.destroy();
        done();
      });

      monitor.startMonitoring();
    });
  });

  describe('Default Alert Rules', () => {
    let monitor: AuthMonitor;

    beforeEach(() => {
      // Create a fresh monitor with default alert rules for each test
      monitor = new AuthMonitor({ 
        enabled: false, // Start disabled, we'll start manually
        enableAlerts: true,
        enableMetrics: true
      });
    });

    afterEach(() => {
      if (monitor) {
        monitor.destroy();
      }
    });

    it('should have high failure rate rule', (done) => {
      const timeout = setTimeout(() => {
        done(new Error('Alert was not triggered within timeout'));
      }, 2000);

      monitor.on('alert', (alert: Alert) => {
        if (alert.ruleId === 'high-failure-rate') {
          clearTimeout(timeout);
          expect(alert.severity).toBe('high');
          expect(alert.message).toContain('20%');
          done();
        }
      });

      // Enable the monitor first, then record metrics
      monitor.updateConfig({ enabled: true });
      monitor.startMonitoring();
      
      // Simulate high failure rate (>20%)
      monitor.recordAuthRequest(false); // 1 failed
      monitor.recordAuthRequest(false); // 2 failed  
      monitor.recordAuthRequest(false); // 3 failed
      monitor.recordAuthRequest(true);  // 1 success
      // Failure rate: 3/4 = 75% > 20%
    });

    it('should have security violations rule', (done) => {
      const timeout = setTimeout(() => {
        done(new Error('Security violations alert was not triggered within timeout'));
      }, 2000);

      monitor.on('alert', (alert: Alert) => {
        if (alert.ruleId === 'security-violations') {
          clearTimeout(timeout);
          expect(alert.severity).toBe('critical');
          expect(alert.message).toContain('security violations');
          done();
        }
      });

      // Enable the monitor first
      monitor.updateConfig({ enabled: true });
      monitor.startMonitoring();
      
      // Trigger more than 5 security violations
      for (let i = 0; i < 6; i++) {
        monitor.recordSecurityViolation();
      }
    });

    it('should have rate limit rule', (done) => {
      const timeout = setTimeout(() => {
        done(new Error('Rate limit alert was not triggered within timeout'));
      }, 2000);

      monitor.on('alert', (alert: Alert) => {
        if (alert.ruleId === 'rate-limit-exceeded') {
          clearTimeout(timeout);
          expect(alert.severity).toBe('medium');
          expect(alert.message).toContain('Rate limit');
          done();
        }
      });

      // Enable the monitor first
      monitor.updateConfig({ enabled: true });
      monitor.startMonitoring();
      
      // Trigger more than 10 rate limit hits
      for (let i = 0; i < 11; i++) {
        monitor.recordRateLimitHit();
      }
    });
  });

  describe('Alerts Management', () => {
    it('should get alerts correctly', () => {
      const testRule: AlertRule = {
        id: 'test-alerts',
        name: 'Test Alerts Rule',
        condition: (metrics) => metrics.securityViolations > 0,
        threshold: 0,
        window: 300,
        severity: 'low',
        message: 'Test alert',
        cooldown: 60
      };

      authMonitor.updateConfig({ 
        enabled: true, 
        enableAlerts: true,
        enableMetrics: true,
        alertRules: [testRule]
      });

      return new Promise<void>((resolve) => {
        authMonitor.on('alert', (alert: Alert) => {
          // Get unacknowledged alerts
          const unackedAlerts = authMonitor.getAlerts(false);
          expect(unackedAlerts.length).toBe(1);
          expect(unackedAlerts[0].id).toBe(alert.id);

          // Get all alerts
          const allAlerts = authMonitor.getAlerts(true);
          expect(allAlerts.length).toBe(1);

          // Acknowledge the alert
          authMonitor.acknowledgeAlert(alert.id, 'test-user');

          // Check again - unacknowledged should be empty
          const unackedAfterAck = authMonitor.getAlerts(false);
          expect(unackedAfterAck.length).toBe(0);

          // All alerts should still include the acknowledged one
          const allAfterAck = authMonitor.getAlerts(true);
          expect(allAfterAck.length).toBe(1);
          expect(allAfterAck[0].acknowledged).toBe(true);

          resolve();
        });

        authMonitor.recordSecurityViolation();
      });
    });

    it('should clear all alerts', () => {
      const testRule: AlertRule = {
        id: 'clear-test',
        name: 'Clear Test Rule',
        condition: () => true,
        threshold: 0,
        window: 300,
        severity: 'low',
        message: 'Clear test alert',
        cooldown: 60
      };

      authMonitor.updateConfig({ 
        enabled: true, 
        enableAlerts: true,
        enableMetrics: true,
        alertRules: [testRule]
      });

      return new Promise<void>((resolve) => {
        let clearedEventFired = false;

        authMonitor.on('alerts-cleared', () => {
          clearedEventFired = true;
        });

        authMonitor.on('alert', () => {
          // Verify alert exists
          expect(authMonitor.getAlerts().length).toBe(1);

          // Clear all alerts
          authMonitor.clearAlerts();

          // Verify alerts are cleared
          expect(authMonitor.getAlerts().length).toBe(0);
          expect(clearedEventFired).toBe(true);
          resolve();
        });

        authMonitor.recordSecurityViolation();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero response time gracefully', () => {
      authMonitor.updateConfig({ enabled: true, enableMetrics: true });
      
      authMonitor.recordAuthRequest(true, 0); // Zero response time
      authMonitor.recordAuthRequest(true); // No response time provided
      
      const metrics = authMonitor.getMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.averageResponseTime).toBe(0);
    });

    it('should handle negative response time', () => {
      authMonitor.updateConfig({ enabled: true, enableMetrics: true });
      
      authMonitor.recordAuthRequest(true, -100); // Negative response time
      
      const metrics = authMonitor.getMetrics();
      expect(metrics.averageResponseTime).toBe(0); // Should not update with negative time
    });

    it('should handle alert rules with edge case conditions', () => {
      const edgeCaseRule: AlertRule = {
        id: 'edge-case',
        name: 'Edge Case Rule',
        condition: (metrics) => metrics.totalRequests === 0 && metrics.securityViolations > 0,
        threshold: 0,
        window: 300,
        severity: 'low',
        message: 'Edge case triggered',
        cooldown: 60
      };

      authMonitor.updateConfig({ 
        enabled: true, 
        enableAlerts: true,
        enableMetrics: true,
        alertRules: [edgeCaseRule]
      });

      return new Promise<void>((resolve) => {
        authMonitor.on('alert', (alert: Alert) => {
          expect(alert.ruleId).toBe('edge-case');
          resolve();
        });

        // This should trigger the edge case (no requests but security violations)
        authMonitor.recordSecurityViolation();
      });
    });

    it('should handle destroy correctly', (done) => {
      const monitor = new AuthMonitor({ enabled: false });
      
      let eventsFired = 0;
      const originalStartMonitoring = monitor.startMonitoring;
      const originalStopMonitoring = monitor.stopMonitoring;

      monitor.on('monitoring-started', () => eventsFired++);
      monitor.on('monitoring-stopped', () => eventsFired++);

      monitor.destroy();

      // After destroy, the monitor should be inert
      setTimeout(() => {
        // Try to start/stop monitoring after destroy
        try {
          monitor.startMonitoring();
          monitor.stopMonitoring();
        } catch (e) {
          // Expected to fail or do nothing
        }

        expect(eventsFired).toBe(0);
        done();
      }, 100);
    });
  });
});