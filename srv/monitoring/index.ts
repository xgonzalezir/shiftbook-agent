/**
 * Monitoring Module
 * Exports all monitoring and lifecycle management components
 */

export { default as lifecycleManager } from './lifecycle-manager';
export { default as performanceMonitor } from './performance-monitor';
export { default as resourceCleanup } from './resource-cleanup';
export { createProcessErrorHandlers } from './process-error-handlers';

// Export types
export type { LifecycleConfig, LifecycleStatus } from './lifecycle-manager';
export type { PerformanceMetrics, Metric, HistogramBucket } from './performance-monitor';
export type { CleanupTask, CleanupMetrics } from './resource-cleanup';
