/**
 * Connection Pool Monitoring Service
 * Provides real-time monitoring and metrics for database connection pools
 */

// import { cds } from '@sap/cds'; // Not used in this file
import { EventEmitter } from 'events';

interface PoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  acquiredConnections: number;
  releasedConnections: number;
  failedConnections: number;
  avgAcquisitionTime: number;
  avgQueryTime: number;
  lastReset: Date;
}

interface PoolEvent {
  type: 'acquire' | 'release' | 'fail' | 'timeout' | 'reset';
  connectionId?: string;
  duration?: number;
  error?: Error;
  timestamp: Date;
}

class ConnectionPoolMonitor extends EventEmitter {
  private metrics: PoolMetrics;
  private eventHistory: PoolEvent[] = [];
  private maxEventHistory = 1000;
  private resetInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.startPeriodicReset();
  }

  private initializeMetrics(): PoolMetrics {
    return {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      acquiredConnections: 0,
      releasedConnections: 0,
      failedConnections: 0,
      avgAcquisitionTime: 0,
      avgQueryTime: 0,
      lastReset: new Date()
    };
  }

  /**
   * Record connection acquisition
   */
  recordAcquisition(connectionId: string, duration: number): void {
    this.metrics.acquiredConnections++;
    this.metrics.activeConnections++;
    this.metrics.idleConnections = Math.max(0, this.metrics.idleConnections - 1);
    
    // Update average acquisition time
    this.updateAverageTime('avgAcquisitionTime', duration);
    
    this.emit('pool-event', {
      type: 'acquire',
      connectionId,
      duration,
      timestamp: new Date()
    });
    
    this.recordEvent('acquire', connectionId, duration);
    
    // Log in development environment
    if (process.env.CDS_ENV === 'development') {
      console.log(`🔌 [POOL] Acquired connection ${connectionId} in ${duration}ms`);
    }
  }

  /**
   * Record connection release
   */
  recordRelease(connectionId: string, duration: number): void {
    this.metrics.releasedConnections++;
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    this.metrics.idleConnections++;
    
    // Update average query time
    this.updateAverageTime('avgQueryTime', duration);
    
    this.emit('pool-event', {
      type: 'release',
      connectionId,
      duration,
      timestamp: new Date()
    });
    
    this.recordEvent('release', connectionId, duration);
    
    // Log in development environment
    if (process.env.CDS_ENV === 'development') {
      console.log(`🔌 [POOL] Released connection ${connectionId} after ${duration}ms`);
    }
  }

  /**
   * Record connection failure
   */
  recordFailure(connectionId: string, error: Error): void {
    this.metrics.failedConnections++;
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    
    this.emit('pool-event', {
      type: 'fail',
      connectionId,
      error,
      timestamp: new Date()
    });
    
    this.recordEvent('fail', connectionId, 0, error);
    
    // Log error
    console.error(`❌ [POOL] Connection failure for ${connectionId}:`, error.message);
  }

  /**
   * Record connection timeout
   */
  recordTimeout(connectionId: string): void {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1);
    
    this.emit('pool-event', {
      type: 'timeout',
      connectionId,
      timestamp: new Date()
    });
    
    this.recordEvent('timeout', connectionId, 0);
  }

  /**
   * Update pool size metrics
   */
  updatePoolSize(total: number, active: number, idle: number): void {
    this.metrics.totalConnections = total;
    this.metrics.activeConnections = active;
    this.metrics.idleConnections = idle;
  }

  /**
   * Update waiting requests count
   */
  updateWaitingRequests(count: number): void {
    this.metrics.waitingRequests = count;
  }

  /**
   * Get current metrics
   */
  getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Get event history
   */
  getEventHistory(limit: number = 100): PoolEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get comprehensive status information
   */
  getStatus(): {
    isHealthy: boolean;
    metrics: PoolMetrics;
    eventHistory: PoolEvent[];
    lastActivity: Date;
    warnings: string[];
  } {
    const health = this.getPoolHealth();
    const lastEvent = this.eventHistory[this.eventHistory.length - 1];
    
    // Check for specific warning conditions
    const warnings: string[] = [];
    
    // High failure rate warning
    const totalOps = this.metrics.acquiredConnections + this.metrics.releasedConnections;
    const failureRate = totalOps > 0 ? this.metrics.failedConnections / totalOps : 0;
    if (failureRate > 0.1) {
      warnings.push('High failure rate detected');
    }
    
    // Slow acquisition warning
    if (this.metrics.avgAcquisitionTime > 3000) {
      warnings.push('Slow connection acquisition detected');
    }
    
    // Slow query warning
    if (this.metrics.avgQueryTime > 5000) {
      warnings.push('Slow query execution detected');
    }
    
    return {
      isHealthy: health.status === 'healthy',
      metrics: this.getMetrics(),
      eventHistory: this.getEventHistory(),
      lastActivity: lastEvent ? lastEvent.timestamp : this.metrics.lastReset,
      warnings
    };
  }

  /**
   * Set pool size for metrics calculation
   */
  setPoolSize(size: number): void {
    this.metrics.totalConnections = size;
  }

  /**
   * Configure maximum event history size
   */
  setMaxEventHistory(maxSize: number): void {
    this.maxEventHistory = maxSize;
    // Trim current history if needed
    if (this.eventHistory.length > maxSize) {
      this.eventHistory = this.eventHistory.slice(-maxSize);
    }
  }

  /**
   * Get pool health status
   */
  getPoolHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check connection failure rate
    const totalOperations = this.metrics.acquiredConnections + this.metrics.releasedConnections;
    const failureRate = totalOperations > 0 ? this.metrics.failedConnections / totalOperations : 0;
    
    if (failureRate > 0.1) { // 10% failure rate
      issues.push(`High connection failure rate: ${(failureRate * 100).toFixed(2)}%`);
      recommendations.push('Check database connectivity and credentials');
    }
    
    // Check acquisition time
    if (this.metrics.avgAcquisitionTime > 5000) { // 5 seconds
      issues.push(`Slow connection acquisition: ${this.metrics.avgAcquisitionTime.toFixed(2)}ms average`);
      recommendations.push('Consider increasing pool size or optimizing database');
    }
    
    // Check pool utilization
    const utilization = this.metrics.totalConnections > 0 ? 
      this.metrics.activeConnections / this.metrics.totalConnections : 0;
    
    if (utilization > 0.9) { // 90% utilization
      issues.push(`High pool utilization: ${(utilization * 100).toFixed(2)}%`);
      recommendations.push('Consider increasing max pool size');
    }
    
    // Determine overall status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.length > 2 ? 'critical' : 'warning';
    }
    
    return { status, issues, recommendations };
  }

  /**
   * Reset metrics (called periodically)
   */
  private resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.eventHistory = [];
    this.emit('pool-event', {
      type: 'reset',
      timestamp: new Date()
    });
  }

  /**
   * Public reset method for testing and manual resets
   */
  reset(): void {
    this.resetMetrics();
  }

  /**
   * Start periodic metrics reset
   */
  private startPeriodicReset(): void {
    // Reset metrics every 24 hours (matching test expectation)
    this.resetInterval = setInterval(() => {
      this.resetMetrics();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Stop periodic reset
   */
  stopPeriodicReset(): void {
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
      this.resetInterval = null;
    }
  }

  /**
   * Update average time calculation
   */
  private updateAverageTime(metricKey: 'avgAcquisitionTime' | 'avgQueryTime', newDuration: number): void {
    const current = this.metrics[metricKey];
    const count = metricKey === 'avgAcquisitionTime' ? 
      this.metrics.acquiredConnections : this.metrics.releasedConnections;
    
    if (count === 1) {
      this.metrics[metricKey] = newDuration;
    } else {
      this.metrics[metricKey] = (current * (count - 1) + newDuration) / count;
    }
  }

  /**
   * Record pool events
   */
  private recordEvent(type: string, connectionId: string, duration: number, error?: Error): void {
    const event: PoolEvent = {
      type: type as any,
      connectionId,
      duration,
      error,
      timestamp: new Date()
    };
    
    this.eventHistory.push(event);
    
    // Keep event history within limits
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxEventHistory);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
    }
    this.removeAllListeners();
  }
}

// Create singleton instance
const connectionPoolMonitor = new ConnectionPoolMonitor();

export default connectionPoolMonitor;
export type { PoolMetrics, PoolEvent };
export { ConnectionPoolMonitor };
