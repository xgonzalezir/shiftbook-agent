/**
 * Lifecycle Manager
 * Orchestrates CAP application lifecycle events and manages monitoring/cleanup
 * 
 * This manager centralizes all CAP lifecycle hook handling (loaded, listening, served)
 * and coordinates performance monitoring and resource cleanup based on environment.
 * 
 * @module monitoring/lifecycle-manager
 */

import cds from '@sap/cds';
import { EventEmitter } from 'events';
import { EnvironmentInfo } from '../config/environment-config';
import performanceMonitor from './performance-monitor';
import resourceCleanup from './resource-cleanup';
import { createProcessErrorHandlers } from './process-error-handlers';

interface LifecycleConfig {
  enablePerformanceMonitoring: boolean;
  enableResourceCleanup: boolean;
  environment: 'development' | 'test' | 'production' | 'hybrid';
}

interface LifecycleStatus {
  performanceMonitoring: {
    enabled: boolean;
    running: boolean;
    uptime: number;
    metricsCollected: number;
  };
  resourceCleanup: {
    enabled: boolean;
    running: boolean;
    tasksExecuted: number;
    lastCleanup: number;
  };
  application: {
    uptime: number;
    startTime: number;
    environment: string;
  };
}

/**
 * Lifecycle Manager Class
 * Manages CAP lifecycle hooks and orchestrates monitoring/cleanup operations
 * 
 * According to the refactoring plan (Phase 5.1), this class should:
 * - Register and handle all CAP lifecycle hooks (loaded, listening, served)
 * - Coordinate performance monitoring and resource cleanup
 * - Provide centralized lifecycle event management
 */
class LifecycleManager extends EventEmitter {
  private config: LifecycleConfig;
  private startTime: number;
  private isInitialized: boolean = false;
  private hooksRegistered: boolean = false;

  constructor(
    private environment?: EnvironmentInfo,
    private perfMonitor: typeof performanceMonitor = performanceMonitor,
    private resCleanup: typeof resourceCleanup = resourceCleanup
  ) {
    super();
    this.startTime = Date.now();
    
    // If no environment provided, detect it
    if (!this.environment) {
      const { getEnvironment } = require('../config/environment-config');
      this.environment = getEnvironment();
    }
    
    this.config = this.getDefaultConfig();
  }

  /**
   * Get default configuration based on environment
   */
  private getDefaultConfig(): LifecycleConfig {
    const envStr = this.environment?.env || 
      (process.env.CDS_ENV || process.env.NODE_ENV || 'development');
    
    const env = ['development', 'test', 'production', 'hybrid'].includes(envStr) 
      ? envStr as 'development' | 'test' | 'production' | 'hybrid'
      : 'development';

    return {
      enablePerformanceMonitoring: true, // Always enable in all environments
      enableResourceCleanup: this.environment?.isCloud || env === 'production' || env === 'hybrid',
      environment: env
    };
  }

  /**
   * Register all CAP lifecycle hooks
   * Main entry point - call this from server.ts during initialization
   * 
   * This method registers handlers for:
   * - 'loaded': CDS model loaded, services not yet initialized
   * - 'listening': Server is accepting connections
   * - 'served': Services are available
   */
  public registerLifecycleHooks(): void {
    if (this.hooksRegistered) {
      console.log('⚠️ Lifecycle hooks already registered');
      return;
    }

    console.log('🔗 Registering CAP lifecycle hooks...');
    
    // Register 'loaded' hook (fires once when model is loaded)
    // @ts-ignore - CDS typing issue with loaded event
    cds.once('loaded', () => this.onLoaded());
    
    // Register 'listening' hook (fires when server starts)
    // @ts-ignore - CDS typing issue with listening event
    cds.on('listening', () => this.onListening());
    
    // Register 'served' hook (fires when services are available)
    // @ts-ignore - CDS typing issue with served event
    cds.on('served', (services: Record<string, any>) => this.onServed(services));
    
    this.hooksRegistered = true;
    this.emit('hooks-registered');
    
    console.log('✅ Lifecycle hooks registered successfully');
  }

  /**
   * Handle CDS 'loaded' event
   * Called once when the CDS model is loaded
   * Services are not yet initialized at this point
   * 
   * @private
   */
  private onLoaded(): void {
    console.log('📚 CDS model loaded successfully');
    
    this.emit('model-loaded', {
      timestamp: Date.now(),
      environment: this.config.environment
    });
    
    // Additional initialization can happen here if needed
    // (e.g., service implementation loading for Cloud Foundry)
  }

  /**
   * Handle CDS 'listening' event
   * Called when the server is ready to accept connections
   * 
   * This is where we start monitoring and cleanup services
   * 
   * @private
   */
  private onListening(): void {
    console.log('🎉 ShiftBook Service started successfully');
    console.log(`🌍 Environment: ${this.config.environment}`);
    console.log(`🔐 Authentication: ${this.environment?.isCloud ? 'XSUAA' : 'Mock/Dummy'}`);

    // Start monitoring and cleanup
    this.startMonitoring();

    // Setup process-level error handlers for graceful shutdown
    createProcessErrorHandlers(
        this.environment,
    )
    console.log('✅ Process error handlers configured');

    this.emit('server-ready', {
      timestamp: Date.now(),
      environment: this.config.environment,
      uptime: this.getUptime()
    });

    console.log('📊 Server ready for requests');
  }

  /**
   * Handle CDS 'served' event
   * Called when all services have been served and are available
   * 
   * @param services - Map of service names to service instances
   * @private
   */
  private onServed(services: Record<string, any>): void {
    console.log('📋 CAP services available:');
    
    const serviceList: string[] = [];
    Object.keys(services).forEach((serviceName: string) => {
      const service = services[serviceName];
      if (service?.definition) {
        const path = service.definition['@path'] || service.path || '/';
        console.log(`  - ${serviceName} at ${path}`);
        serviceList.push(`${serviceName}:${path}`);
      }
    });

    this.emit('services-served', {
      timestamp: Date.now(),
      services: serviceList,
      count: serviceList.length
    });
  }

  /**
   * Start monitoring and resource cleanup
   * Called internally by onListening()
   * 
   * @private
   */
  private startMonitoring(): void {
    if (this.isInitialized) {
      console.log('⚠️ Monitoring already started');
      return;
    }

    console.log('🚀 Starting lifecycle management...');

    // Performance monitoring (enabled in all environments)
    if (this.config.enablePerformanceMonitoring) {
      console.log('📊 Starting performance monitoring...');
      this.perfMonitor.startMonitoring();
      console.log('✅ Performance monitoring started');
    } else {
      console.log('⏭️ Performance monitoring disabled');
    }

    // Resource cleanup (enabled only in cloud environments)
    if (this.config.enableResourceCleanup) {
      console.log('🧹 Starting resource cleanup for cloud environment...');
      this.resCleanup.startCleanup();
      console.log('✅ Resource cleanup started');
    } else {
      console.log('⏭️ Resource cleanup disabled (local/test environment)');
    }

    this.isInitialized = true;
    
    // Emit both 'initialized' and 'monitoring-started' events for backward compatibility
    this.emit('initialized', {
      config: this.config,
      timestamp: Date.now(),
      performanceMonitoring: this.config.enablePerformanceMonitoring,
      resourceCleanup: this.config.enableResourceCleanup
    });
    
    this.emit('monitoring-started', {
      timestamp: Date.now(),
      performanceMonitoring: this.config.enablePerformanceMonitoring,
      resourceCleanup: this.config.enableResourceCleanup
    });

    console.log('✅ Lifecycle management started successfully');
  }

  /**
   * Shutdown lifecycle management gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      console.log('⚠️ Lifecycle manager not initialized');
      return;
    }

    console.log('🛑 Shutting down lifecycle management...');

    // Emit shutdown start event
    this.emit('shutdown-start', {
      uptime: this.getUptime(),
      timestamp: Date.now()
    });

    // Stop performance monitoring
    if (this.config.enablePerformanceMonitoring) {
      console.log('📊 Stopping performance monitoring...');
      this.perfMonitor.stopMonitoring();
      console.log('✅ Performance monitoring stopped');
    }

    // Stop resource cleanup
    if (this.config.enableResourceCleanup) {
      console.log('🧹 Stopping resource cleanup...');
      this.resCleanup.stopCleanup();
      console.log('✅ Resource cleanup stopped');
    }

    this.isInitialized = false;

    // Emit shutdown complete event
    this.emit('shutdown-complete', {
      totalUptime: this.getUptime(),
      timestamp: Date.now()
    });

    console.log('✅ Lifecycle management shutdown complete');
  }

  /**
   * Get lifecycle status
   */
  getStatus(): LifecycleStatus {
    const perfStatus = this.perfMonitor.getStatus();
    const cleanupStatus = this.resCleanup.getStatus();

    return {
      performanceMonitoring: {
        enabled: this.config.enablePerformanceMonitoring,
        running: perfStatus.isMonitoring,
        uptime: perfStatus.uptime,
        metricsCollected: perfStatus.metricsCollected
      },
      resourceCleanup: {
        enabled: this.config.enableResourceCleanup,
        running: cleanupStatus.isRunning,
        tasksExecuted: cleanupStatus.activeTasks,
        lastCleanup: cleanupStatus.lastCleanup
      },
      application: {
        uptime: this.getUptime(),
        startTime: this.startTime,
        environment: this.config.environment
      }
    };
  }

  /**
   * Get configuration
   */
  getConfig(): LifecycleConfig {
    return { ...this.config };
  }

  /**
   * Get application uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Check if lifecycle manager is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.perfMonitor.getMetrics();
  }

  /**
   * Get cleanup metrics
   */
  getCleanupMetrics() {
    return this.resCleanup.getMetrics();
  }

  /**
   * Record HTTP request for performance monitoring
   */
  recordHttpRequest(duration: number, statusCode: number, method: string, endpoint: string): void {
    if (this.config.enablePerformanceMonitoring) {
      this.perfMonitor.recordHttpRequest(duration, statusCode, method, endpoint);
    }
  }

  /**
   * Record database query for performance monitoring
   */
  recordDatabaseQuery(duration: number, operation: string, entity: string, success: boolean): void {
    if (this.config.enablePerformanceMonitoring) {
      this.perfMonitor.recordDatabaseQuery(duration, operation, entity, success);
    }
  }

  /**
   * Record business metric
   */
  recordBusinessMetric(type: string, value: number = 1, labels: Record<string, string> = {}): void {
    if (this.config.enablePerformanceMonitoring) {
      this.perfMonitor.recordBusinessMetric(type, value, labels);
    }
  }

  /**
   * Force immediate resource cleanup
   */
  async forceCleanup(): Promise<void> {
    if (this.config.enableResourceCleanup) {
      await this.resCleanup.forceCleanup();
    } else {
      console.log('⚠️ Resource cleanup is disabled');
    }
  }

  /**
   * Get Prometheus-formatted metrics
   */
  getPrometheusMetrics(): string {
    if (!this.config.enablePerformanceMonitoring) {
      return '# Performance monitoring disabled\n';
    }
    return this.perfMonitor.getPrometheusMetrics();
  }

  /**
   * Check if lifecycle hooks are registered
   */
  areHooksRegistered(): boolean {
    return this.hooksRegistered;
  }

  /**
   * Health check for lifecycle components
   */
  healthCheck(): {
    healthy: boolean;
    components: {
      performanceMonitoring: boolean;
      resourceCleanup: boolean;
    };
    details: LifecycleStatus;
  } {
    const status = this.getStatus();
    
    const performanceHealthy = this.config.enablePerformanceMonitoring
      ? status.performanceMonitoring.running
      : true; // Healthy if disabled
    
    const cleanupHealthy = this.config.enableResourceCleanup
      ? status.resourceCleanup.running
      : true; // Healthy if disabled

    return {
      healthy: performanceHealthy && cleanupHealthy,
      components: {
        performanceMonitoring: performanceHealthy,
        resourceCleanup: cleanupHealthy
      },
      details: status
    };
  }

  /**
   * Enable performance monitoring
   * Can be called before or after initialization
   */
  enablePerformanceMonitoring(): void {
    const wasEnabled = this.config.enablePerformanceMonitoring;
    this.config.enablePerformanceMonitoring = true;

    if (!wasEnabled && this.isInitialized) {
      console.log('📊 Starting performance monitoring...');
      this.perfMonitor.startMonitoring();
      console.log('✅ Performance monitoring started');
    }
  }

  /**
   * Disable performance monitoring
   * Can be called before or after initialization
   */
  disablePerformanceMonitoring(): void {
    const wasEnabled = this.config.enablePerformanceMonitoring;
    this.config.enablePerformanceMonitoring = false;

    if (wasEnabled && this.isInitialized) {
      console.log('📊 Stopping performance monitoring...');
      this.perfMonitor.stopMonitoring();
      console.log('✅ Performance monitoring stopped');
    }
  }

  /**
   * Enable resource cleanup
   * Can be called before or after initialization
   */
  enableResourceCleanup(): void {
    const wasEnabled = this.config.enableResourceCleanup;
    this.config.enableResourceCleanup = true;

    if (!wasEnabled && this.isInitialized) {
      console.log('🧹 Starting resource cleanup...');
      this.resCleanup.startCleanup();
      console.log('✅ Resource cleanup started');
    }
  }

  /**
   * Disable resource cleanup
   * Can be called before or after initialization
   */
  disableResourceCleanup(): void {
    const wasEnabled = this.config.enableResourceCleanup;
    this.config.enableResourceCleanup = false;

    if (wasEnabled && this.isInitialized) {
      console.log('🧹 Stopping resource cleanup...');
      this.resCleanup.stopCleanup();
      console.log('✅ Resource cleanup stopped');
    }
  }
}

/**
 * Create and export singleton instance
 * 
 * The singleton is created without dependencies so it can be imported early.
 * Dependencies will be auto-detected when registerLifecycleHooks() is called.
 */
const lifecycleManager = new LifecycleManager();

export default lifecycleManager;

// Export class for testing and advanced usage
export { LifecycleManager };

// Export types for external use
export type { LifecycleConfig, LifecycleStatus };
