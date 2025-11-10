/**
 * Performance Monitoring Service
 * Provides comprehensive APM capabilities with Prometheus metrics, custom business metrics,
 * and resource monitoring for the ShiftBook application
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

// Prometheus-style metrics (simplified for CAP environment)
interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

interface HistogramBucket {
  le: string; // less than or equal
  count: number;
}

interface PerformanceMetrics {
  // HTTP Request Metrics
  httpRequestsTotal: number;
  httpRequestDuration: number[];
  httpRequestErrors: number;
  
  // Database Metrics
  databaseQueriesTotal: number;
  databaseQueryDuration: number[];
  databaseErrors: number;
  
  // Business Metrics
  shiftbookLogsCreated: number;
  emailNotificationsSent: number;
  criticalIssuesReported: number;
  
  // Resource Metrics
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  
  // Custom Business Metrics
  userSessionsActive: number;
  categoriesAccessed: number;
  averageResponseTime: number;
}

class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics;
  private customMetrics: Map<string, Metric> = new Map();
  private histogramBuckets: Map<string, HistogramBucket[]> = new Map();
  private startTime: number;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private resourceCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startTime = Date.now();
    this.metrics = this.initializeMetrics();
    this.initializeHistogramBuckets();
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      // HTTP Request Metrics
      httpRequestsTotal: 0,
      httpRequestDuration: [],
      httpRequestErrors: 0,
      
      // Database Metrics
      databaseQueriesTotal: 0,
      databaseQueryDuration: [],
      databaseErrors: 0,
      
      // Business Metrics
      shiftbookLogsCreated: 0,
      emailNotificationsSent: 0,
      criticalIssuesReported: 0,
      
      // Resource Metrics
      memoryUsage: 0,
      cpuUsage: 0,
      activeConnections: 0,
      
      // Custom Business Metrics
      userSessionsActive: 0,
      categoriesAccessed: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Initialize histogram buckets for response time tracking
   */
  private initializeHistogramBuckets(): void {
    const createBuckets = () => [
      { le: '0.1', count: 0 },   // 100ms
      { le: '0.25', count: 0 },  // 250ms
      { le: '0.5', count: 0 },   // 500ms
      { le: '1', count: 0 },     // 1s
      { le: '2.5', count: 0 },   // 2.5s
      { le: '5', count: 0 },     // 5s
      { le: '10', count: 0 },    // 10s
      { le: '+Inf', count: 0 }   // Infinity
    ];
    
    this.histogramBuckets.set('http_request_duration', createBuckets());
    this.histogramBuckets.set('database_query_duration', createBuckets());
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.log('⚠️ Performance monitoring already started');
      return;
    }

    console.log('🚀 Starting performance monitoring...');
    this.isMonitoring = true;

    // Start resource monitoring every 30 seconds
    this.resourceCheckInterval = setInterval(() => {
      this.updateResourceMetrics();
    }, 30000);

    // Start metrics collection every 60 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000);

    // Initial resource check
    this.updateResourceMetrics();
    
    console.log('✅ Performance monitoring started successfully');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('⚠️ Performance monitoring not running');
      return;
    }

    console.log('🛑 Stopping performance monitoring...');
    this.isMonitoring = false;

    if (this.resourceCheckInterval) {
      clearInterval(this.resourceCheckInterval);
      this.resourceCheckInterval = null;
    }

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('✅ Performance monitoring stopped');
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(duration: number, statusCode: number, method: string, endpoint: string): void {
    this.metrics.httpRequestsTotal++;
    this.metrics.httpRequestDuration.push(duration);
    
    // Update histogram buckets (convert ms to seconds)
    this.updateHistogramBuckets('http_request_duration', duration / 1000);
    
    // Record errors
    if (statusCode >= 400) {
      this.metrics.httpRequestErrors++;
    }

    // Calculate average response time
    this.metrics.averageResponseTime = this.calculateAverage(this.metrics.httpRequestDuration);

    // Emit event for real-time monitoring
    this.emit('http-request', {
      duration,
      statusCode,
      method,
      endpoint,
      timestamp: Date.now()
    });

    // Check for performance alerts
    this.checkPerformanceAlerts('http_request', duration);
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(duration: number, operation: string, entity: string, success: boolean): void {
    this.metrics.databaseQueriesTotal++;
    this.metrics.databaseQueryDuration.push(duration);
    
    // Update histogram buckets (convert ms to seconds)
    this.updateHistogramBuckets('database_query_duration', duration / 1000);
    
    // Record errors
    if (!success) {
      this.metrics.databaseErrors++;
    }

    // Emit event for real-time monitoring
    this.emit('database-query', {
      duration,
      operation,
      entity,
      success,
      timestamp: Date.now()
    });

    // Check for performance alerts
    this.checkPerformanceAlerts('database_query', duration);
  }

  /**
   * Record business metrics
   */
  recordBusinessMetric(type: string, value: number = 1, labels: Record<string, string> = {}): void {
    switch (type) {
      case 'shiftbook_log_created':
        this.metrics.shiftbookLogsCreated += value;
        break;
      case 'email_notification_sent':
        this.metrics.emailNotificationsSent += value;
        break;
      case 'critical_issue_reported':
        this.metrics.criticalIssuesReported += value;
        break;
      case 'user_session_active':
        this.metrics.userSessionsActive = value;
        break;
      case 'categories_accessed':
        this.metrics.categoriesAccessed += value;
        break;
      default:
        // Custom metric
        this.recordCustomMetric(type, value, labels);
        return;
    }

    // Emit business metric event
    this.emit('business-metric', {
      type,
      value,
      labels,
      timestamp: Date.now()
    });
  }

  /**
   * Record custom metric
   */
  private recordCustomMetric(name: string, value: number, labels: Record<string, string>): void {
    const metric: Metric = {
      name,
      type: 'counter',
      value,
      labels,
      timestamp: Date.now()
    };

    this.customMetrics.set(name, metric);
  }

  /**
   * Update histogram buckets
   */
  private updateHistogramBuckets(metricName: string, value: number): void {
    const buckets = this.histogramBuckets.get(metricName);
    if (!buckets) return;

    for (const bucket of buckets) {
      const threshold = bucket.le === '+Inf' ? Infinity : parseFloat(bucket.le);
      if (value <= threshold) {
        bucket.count++;
      }
    }
  }

  /**
   * Update resource metrics
   */
  private updateResourceMetrics(): void {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed;
    
    // Get CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.metrics.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

    // Emit resource metrics event
    this.emit('resource-metrics', {
      memoryUsage: this.metrics.memoryUsage,
      cpuUsage: this.metrics.cpuUsage,
      timestamp: Date.now()
    });

    // Check for resource alerts
    this.checkResourceAlerts();
  }

  /**
   * Collect and aggregate metrics
   */
  private collectMetrics(): void {
    const metricsSnapshot = {
      ...this.metrics,
      uptime: process.uptime(),
      timestamp: Date.now()
    };

    // Emit metrics collection event
    this.emit('metrics-collected', metricsSnapshot);

    // Log metrics in development
    if (process.env.CDS_ENV === 'development') {
      console.log('📊 Performance Metrics:', {
        httpRequests: this.metrics.httpRequestsTotal,
        avgResponseTime: this.metrics.averageResponseTime.toFixed(2) + 'ms',
        memoryUsage: (this.metrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB',
        businessMetrics: {
          logsCreated: this.metrics.shiftbookLogsCreated,
          emailsSent: this.metrics.emailNotificationsSent,
          criticalIssues: this.metrics.criticalIssuesReported
        }
      });
    }
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(metricType: string, value: number): void {
    const alerts = [];

    // HTTP request duration alerts
    if (metricType === 'http_request' && value > 5000) {
      alerts.push({
        type: 'performance_degradation',
        severity: 'warning',
        message: `Slow HTTP request detected: ${value}ms`,
        metric: 'http_request_duration',
        value,
        threshold: 5000
      });
    }

    // Database query duration alerts
    if (metricType === 'database_query' && value > 2000) {
      alerts.push({
        type: 'database_performance',
        severity: 'warning',
        message: `Slow database query detected: ${value}ms`,
        metric: 'database_query_duration',
        value,
        threshold: 2000
      });
    }

    // Emit alerts
    alerts.forEach(alert => {
      this.emit('alert', alert);
      console.warn(`🚨 ${alert.severity.toUpperCase()}: ${alert.message}`);
    });
  }

  /**
   * Check for resource alerts
   */
  private checkResourceAlerts(): void {
    const alerts = [];

    // Memory usage alerts
    const memoryMB = this.metrics.memoryUsage / 1024 / 1024;
    if (memoryMB > 400) { // 400MB threshold
      alerts.push({
        type: 'resource_usage',
        severity: 'warning',
        message: `High memory usage: ${memoryMB.toFixed(2)}MB`,
        metric: 'memory_usage',
        value: memoryMB,
        threshold: 400
      });
    }

    // CPU usage alerts
    if (this.metrics.cpuUsage > 80) { // 80% threshold
      alerts.push({
        type: 'resource_usage',
        severity: 'warning',
        message: `High CPU usage: ${this.metrics.cpuUsage.toFixed(2)}%`,
        metric: 'cpu_usage',
        value: this.metrics.cpuUsage,
        threshold: 80
      });
    }

    // Emit alerts
    alerts.forEach(alert => {
      this.emit('alert', alert);
      console.warn(`🚨 ${alert.severity.toUpperCase()}: ${alert.message}`);
    });
  }

  /**
   * Calculate average from array of numbers
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get custom metrics
   */
  getCustomMetrics(): Map<string, Metric> {
    return new Map(this.customMetrics);
  }

  /**
   * Get histogram buckets
   */
  getHistogramBuckets(): Map<string, HistogramBucket[]> {
    return new Map(this.histogramBuckets);
  }

  /**
   * Get Prometheus-formatted metrics
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // HTTP metrics
    lines.push(`# HELP http_requests_total Total number of HTTP requests`);
    lines.push(`# TYPE http_requests_total counter`);
    lines.push(`http_requests_total ${this.metrics.httpRequestsTotal}`);
    
    lines.push(`# HELP http_request_errors_total Total number of HTTP request errors`);
    lines.push(`# TYPE http_request_errors_total counter`);
    lines.push(`http_request_errors_total ${this.metrics.httpRequestErrors}`);
    
    // Database metrics
    lines.push(`# HELP database_queries_total Total number of database queries`);
    lines.push(`# TYPE database_queries_total counter`);
    lines.push(`database_queries_total ${this.metrics.databaseQueriesTotal}`);
    
    // Business metrics
    lines.push(`# HELP shiftbook_logs_created_total Total number of shift book logs created`);
    lines.push(`# TYPE shiftbook_logs_created_total counter`);
    lines.push(`shiftbook_logs_created_total ${this.metrics.shiftbookLogsCreated}`);
    
    lines.push(`# HELP email_notifications_sent_total Total number of email notifications sent`);
    lines.push(`# TYPE email_notifications_sent_total counter`);
    lines.push(`email_notifications_sent_total ${this.metrics.emailNotificationsSent}`);
    
    // Resource metrics
    lines.push(`# HELP memory_usage_bytes Current memory usage in bytes`);
    lines.push(`# TYPE memory_usage_bytes gauge`);
    lines.push(`memory_usage_bytes ${this.metrics.memoryUsage}`);
    
    // Histogram buckets
    const httpBuckets = this.histogramBuckets.get('http_request_duration');
    if (httpBuckets) {
      lines.push(`# HELP http_request_duration_seconds HTTP request duration in seconds`);
      lines.push(`# TYPE http_request_duration_seconds histogram`);
      httpBuckets.forEach(bucket => {
        lines.push(`http_request_duration_seconds_bucket{le="${bucket.le}"} ${bucket.count}`);
      });
    }
    
    return lines.join('\n');
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.customMetrics.clear();
    this.initializeHistogramBuckets();
    console.log('🔄 Performance metrics reset');
  }

  /**
   * Check memory usage and emit alert if threshold exceeded
   * (Private method for testing)
   */
  private checkMemoryUsage(memoryBytes: number): void {
    this.metrics.memoryUsage = memoryBytes;
    
    // Emit alert if memory usage is high (400MB threshold)
    if (memoryBytes > 400 * 1024 * 1024) {
      this.emit('alert', {
        type: 'HIGH_MEMORY_USAGE',
        severity: 'warning',
        message: `High memory usage: ${(memoryBytes / 1024 / 1024).toFixed(2)}MB`,
        metric: 'memory_usage',
        value: memoryBytes,
        threshold: 400 * 1024 * 1024
      });
    }
  }

  /**
   * Check CPU usage and emit alert if threshold exceeded
   * (Private method for testing)
   */
  private checkCpuUsage(cpuPercent: number): void {
    this.metrics.cpuUsage = cpuPercent;
    
    // Emit alert if CPU usage is high (80% threshold)
    if (cpuPercent > 80) {
      this.emit('alert', {
        type: 'HIGH_CPU_USAGE',
        severity: 'warning',
        message: `High CPU usage: ${cpuPercent.toFixed(2)}%`,
        metric: 'cpu_usage',
        value: cpuPercent,
        threshold: 80
      });
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    uptime: number;
    startTime: number;
    metricsCollected: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      uptime: process.uptime(),
      startTime: this.startTime,
      metricsCollected: this.metrics.httpRequestsTotal + this.metrics.databaseQueriesTotal
    };
  }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;

// Export types for external use
export type { PerformanceMetrics, Metric, HistogramBucket };
