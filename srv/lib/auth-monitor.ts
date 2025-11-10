/**
 * Authentication Monitor
 * Monitoring and alerting system for authentication issues in production
 */

import { EventEmitter } from 'events';
import { authLogger, AuthLogger } from './auth-logger';

export interface AuthMetrics {
  totalRequests: number;
  successfulAuths: number;
  failedAuths: number;
  tokenValidations: number;
  tokenRefreshAttempts: number;
  rateLimitHits: number;
  securityViolations: number;
  averageResponseTime: number;
  lastResetTime: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: AuthMetrics) => boolean;
  threshold: number;
  window: number; // in seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown: number; // in seconds
}

export interface Alert {
  id: string;
  ruleId: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: AuthMetrics;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface MonitorConfig {
  enabled: boolean;
  metricsWindow: number; // in seconds
  alertRules: AlertRule[];
  enableAlerts: boolean;
  alertCooldown: number; // in seconds
  enableMetrics: boolean;
  enableHealthChecks: boolean;
  healthCheckInterval: number; // in seconds
}

export class AuthMonitor extends EventEmitter {
  private config: MonitorConfig;
  private metrics: AuthMetrics;
  private alerts: Alert[] = [];
  private isMonitoring: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsResetInterval?: NodeJS.Timeout;
  private logger: AuthLogger;

  constructor(config?: Partial<MonitorConfig>) {
    super();
    
    this.config = {
      enabled: true,
      metricsWindow: 300, // 5 minutes
      alertRules: this.getDefaultAlertRules(),
      enableAlerts: true,
      alertCooldown: 300, // 5 minutes
      enableMetrics: true,
      enableHealthChecks: true,
      healthCheckInterval: 60, // 1 minute
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.logger = authLogger;

    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  private initializeMetrics(): AuthMetrics {
    return {
      totalRequests: 0,
      successfulAuths: 0,
      failedAuths: 0,
      tokenValidations: 0,
      tokenRefreshAttempts: 0,
      rateLimitHits: 0,
      securityViolations: 0,
      averageResponseTime: 0,
      lastResetTime: new Date().toISOString()
    };
  }

  private getDefaultAlertRules(): AlertRule[] {
    return [
      {
        id: 'high-failure-rate',
        name: 'High Authentication Failure Rate',
        condition: (metrics) => {
          if (metrics.totalRequests === 0) return false;
          const failureRate = (metrics.failedAuths / metrics.totalRequests) * 100;
          return failureRate > 20; // 20% failure rate
        },
        threshold: 20,
        window: 300,
        severity: 'high',
        message: 'Authentication failure rate is above 20%',
        cooldown: 600
      },
      {
        id: 'security-violations',
        name: 'Security Violations Detected',
        condition: (metrics) => metrics.securityViolations > 5,
        threshold: 5,
        window: 300,
        severity: 'critical',
        message: 'Multiple security violations detected',
        cooldown: 300
      },
      {
        id: 'rate-limit-exceeded',
        name: 'Rate Limit Exceeded',
        condition: (metrics) => metrics.rateLimitHits > 10,
        threshold: 10,
        window: 300,
        severity: 'medium',
        message: 'Rate limit hits are above normal threshold',
        cooldown: 300
      },
      {
        id: 'slow-response-time',
        name: 'Slow Authentication Response Time',
        condition: (metrics) => metrics.averageResponseTime > 2000, // 2 seconds
        threshold: 2000,
        window: 300,
        severity: 'medium',
        message: 'Authentication response time is above 2 seconds',
        cooldown: 300
      },
      {
        id: 'token-validation-failures',
        name: 'Token Validation Failures',
        condition: (metrics) => {
          if (metrics.tokenValidations === 0) return false;
          const failureRate = (metrics.failedAuths / metrics.tokenValidations) * 100;
          return failureRate > 15; // 15% token validation failure rate
        },
        threshold: 15,
        window: 300,
        severity: 'high',
        message: 'Token validation failure rate is above 15%',
        cooldown: 600
      }
    ];
  }

  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.logger.logAuthEvent({
      timestamp: new Date().toISOString(),
      eventType: 'security_violation',
      status: 'success',
      details: { action: 'monitoring_started' },
      environment: process.env.NODE_ENV || 'development'
    });

    // Start metrics reset interval
    this.metricsResetInterval = setInterval(() => {
      this.resetMetrics();
    }, this.config.metricsWindow * 1000);

    // Start health check interval
    if (this.config.enableHealthChecks) {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck();
      }, this.config.healthCheckInterval * 1000);
    }

    this.emit('monitoring-started');
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.metricsResetInterval) {
      clearInterval(this.metricsResetInterval);
      this.metricsResetInterval = undefined;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.emit('monitoring-stopped');
  }

  public recordAuthRequest(success: boolean, responseTime: number = 0): void {
    if (!this.config.enabled || !this.config.enableMetrics) {
      return;
    }

    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulAuths++;
    } else {
      this.metrics.failedAuths++;
    }

    // Update average response time
    if (responseTime > 0) {
      const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime;
      this.metrics.averageResponseTime = totalTime / this.metrics.totalRequests;
    }

    this.checkAlertRules();
  }

  public recordTokenValidation(success: boolean): void {
    if (!this.config.enabled || !this.config.enableMetrics) {
      return;
    }

    this.metrics.tokenValidations++;
    
    if (!success) {
      this.metrics.failedAuths++;
    }

    this.checkAlertRules();
  }

  public recordTokenRefresh(success: boolean): void {
    if (!this.config.enabled || !this.config.enableMetrics) {
      return;
    }

    this.metrics.tokenRefreshAttempts++;
    
    if (!success) {
      this.metrics.failedAuths++;
    }

    this.checkAlertRules();
  }

  public recordRateLimitHit(): void {
    if (!this.config.enabled || !this.config.enableMetrics) {
      return;
    }

    this.metrics.rateLimitHits++;
    this.checkAlertRules();
  }

  public recordSecurityViolation(): void {
    if (!this.config.enabled || !this.config.enableMetrics) {
      return;
    }

    this.metrics.securityViolations++;
    this.checkAlertRules();
  }

  private checkAlertRules(): void {
    if (!this.config.enabled || !this.config.enableAlerts) {
      return;
    }

    for (const rule of this.config.alertRules) {
      if (this.shouldTriggerAlert(rule)) {
        this.triggerAlert(rule);
      }
    }
  }

  private shouldTriggerAlert(rule: AlertRule): boolean {
    // Check if rule condition is met
    if (!rule.condition(this.metrics)) {
      return false;
    }

    // Check cooldown period
    const recentAlerts = this.alerts.filter(alert => 
      alert.ruleId === rule.id && 
      !alert.acknowledged &&
      (Date.now() - new Date(alert.timestamp).getTime()) < (rule.cooldown * 1000)
    );

    return recentAlerts.length === 0;
  }

  private triggerAlert(rule: AlertRule): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      timestamp: new Date().toISOString(),
      severity: rule.severity,
      message: rule.message,
      metrics: { ...this.metrics },
      acknowledged: false
    };

    this.alerts.push(alert);

    // Log the alert
    this.logger.logAuthEvent({
      timestamp: alert.timestamp,
      eventType: 'security_violation',
      status: 'failure',
      details: {
        alertId: alert.id,
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.message,
        metrics: this.metrics
      },
      environment: process.env.NODE_ENV || 'development'
    });

    // Emit alert event
    this.emit('alert', alert);

    // Handle critical alerts immediately
    if (rule.severity === 'critical') {
      this.handleCriticalAlert(alert);
    }
  }

  private handleCriticalAlert(alert: Alert): void {
    // Log critical alert
    console.error(`🚨 CRITICAL AUTH ALERT: ${alert.message}`);
    console.error(`Alert ID: ${alert.id}`);
    console.error(`Metrics:`, alert.metrics);

    // Emit critical alert event
    this.emit('critical-alert', alert);

    // In a real production environment, you might:
    // - Send SMS/email notifications
    // - Trigger incident response procedures
    // - Scale up monitoring
    // - Block suspicious IPs
  }

  private performHealthCheck(): void {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      isMonitoring: this.isMonitoring,
      metrics: this.metrics,
      activeAlerts: this.alerts.filter(alert => !alert.acknowledged).length,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };

    this.emit('health-check', healthStatus);

    // Log health check if there are issues
    if (healthStatus.activeAlerts > 0) {
      this.logger.logAuthEvent({
        timestamp: healthStatus.timestamp,
        eventType: 'security_violation',
        status: 'warning',
        details: {
          action: 'health_check',
          activeAlerts: healthStatus.activeAlerts,
          metrics: healthStatus.metrics
        },
        environment: process.env.NODE_ENV || 'development'
      });
    }
  }

  private resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.emit('metrics-reset', this.metrics);
  }

  public getMetrics(): AuthMetrics {
    return { ...this.metrics };
  }

  public getAlerts(includeAcknowledged: boolean = false): Alert[] {
    if (includeAcknowledged) {
      return [...this.alerts];
    }
    return this.alerts.filter(alert => !alert.acknowledged);
  }

  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date().toISOString();

    this.emit('alert-acknowledged', alert);
    return true;
  }

  public addAlertRule(rule: AlertRule): void {
    this.config.alertRules.push(rule);
    this.emit('rule-added', rule);
  }

  public removeAlertRule(ruleId: string): boolean {
    const index = this.config.alertRules.findIndex(rule => rule.id === ruleId);
    if (index === -1) {
      return false;
    }

    const removedRule = this.config.alertRules.splice(index, 1)[0];
    this.emit('rule-removed', removedRule);
    return true;
  }

  public updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', this.config);
  }

  public getHealthStatus(): any {
    return {
      isMonitoring: this.isMonitoring,
      isEnabled: this.config.enabled,
      metrics: this.metrics,
      activeAlerts: this.alerts.filter(alert => !alert.acknowledged).length,
      totalAlerts: this.alerts.length,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      config: {
        enabled: this.config.enabled,
        metricsWindow: this.config.metricsWindow,
        enableAlerts: this.config.enableAlerts,
        enableMetrics: this.config.enableMetrics,
        enableHealthChecks: this.config.enableHealthChecks
      }
    };
  }

  public clearAlerts(): void {
    this.alerts = [];
    this.emit('alerts-cleared');
  }

  public destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

// Create singleton instance
export const authMonitor = new AuthMonitor();

// Export for use in other modules
export default authMonitor; 