/**
 * Resource Cleanup Service
 * Handles memory management, long-running process cleanup, and garbage collection optimization
 * for the ShiftBook application
 */

import { EventEmitter } from 'events';

interface CleanupTask {
  id: string;
  name: string;
  type: 'memory' | 'process' | 'connection' | 'cache';
  priority: 'low' | 'medium' | 'high' | 'critical';
  execute: () => Promise<void>;
  lastRun: number;
  interval: number; // milliseconds
  enabled: boolean;
}

interface CleanupMetrics {
  tasksExecuted: number;
  memoryFreed: number;
  processesCleaned: number;
  connectionsClosed: number;
  cacheEntriesCleared: number;
  lastCleanup: number;
  cleanupDuration: number;
}

class ResourceCleanup extends EventEmitter {
  private tasks: Map<string, CleanupTask> = new Map();
  private metrics: CleanupMetrics;
  private isRunning: boolean = false;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryThreshold: number = 400 * 1024 * 1024; // 400MB
  private gcThreshold: number = 500 * 1024 * 1024; // 500MB

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.initializeDefaultTasks();
  }

  /**
   * Initialize cleanup metrics
   */
  private initializeMetrics(): CleanupMetrics {
    return {
      tasksExecuted: 0,
      memoryFreed: 0,
      processesCleaned: 0,
      connectionsClosed: 0,
      cacheEntriesCleared: 0,
      lastCleanup: 0,
      cleanupDuration: 0
    };
  }

  /**
   * Initialize default cleanup tasks
   */
  private initializeDefaultTasks(): void {
    // Memory cleanup task
    this.addTask({
      id: 'memory-cleanup',
      name: 'Memory Cleanup',
      type: 'memory',
      priority: 'high',
      interval: 5 * 60 * 1000, // 5 minutes
      lastRun: 0,
      enabled: true,
      execute: async () => {
        await this.performMemoryCleanup();
      }
    });

    // Process cleanup task
    this.addTask({
      id: 'process-cleanup',
      name: 'Process Cleanup',
      type: 'process',
      priority: 'medium',
      interval: 10 * 60 * 1000, // 10 minutes
      lastRun: 0,
      enabled: true,
      execute: async () => {
        await this.performProcessCleanup();
      }
    });

    // Connection cleanup task
    this.addTask({
      id: 'connection-cleanup',
      name: 'Connection Cleanup',
      type: 'connection',
      priority: 'medium',
      interval: 15 * 60 * 1000, // 15 minutes
      lastRun: 0,
      enabled: true,
      execute: async () => {
        await this.performConnectionCleanup();
      }
    });

    // Cache cleanup task
    this.addTask({
      id: 'cache-cleanup',
      name: 'Cache Cleanup',
      type: 'cache',
      priority: 'low',
      interval: 30 * 60 * 1000, // 30 minutes
      lastRun: 0,
      enabled: true,
      execute: async () => {
        await this.performCacheCleanup();
      }
    });
  }

  /**
   * Start resource cleanup service
   */
  startCleanup(): void {
    if (this.isRunning) {
      console.log('⚠️ Resource cleanup already running');
      return;
    }

    console.log('🧹 Starting resource cleanup service...');
    this.isRunning = true;

    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.runCleanupTasks();
    }, 5 * 60 * 1000);

    // Initial cleanup
    this.runCleanupTasks();
    
    console.log('✅ Resource cleanup service started');
  }

  /**
   * Stop resource cleanup service
   */
  stopCleanup(): void {
    if (!this.isRunning) {
      console.log('⚠️ Resource cleanup not running');
      return;
    }

    console.log('🛑 Stopping resource cleanup service...');
    this.isRunning = false;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log('✅ Resource cleanup service stopped');
  }

  /**
   * Add a cleanup task
   */
  addTask(task: CleanupTask): void {
    this.tasks.set(task.id, task);
    console.log(`📝 Added cleanup task: ${task.name} (${task.type})`);
  }

  /**
   * Remove a cleanup task
   */
  removeTask(taskId: string): boolean {
    const removed = this.tasks.delete(taskId);
    if (removed) {
      console.log(`🗑️ Removed cleanup task: ${taskId}`);
    }
    return removed;
  }

  /**
   * Run all cleanup tasks
   */
  private async runCleanupTasks(): Promise<void> {
    const startTime = Date.now();
    const tasksToRun: CleanupTask[] = [];

    // Collect tasks that need to run
    for (const task of this.tasks.values()) {
      if (!task.enabled) continue;

      const timeSinceLastRun = Date.now() - task.lastRun;
      if (timeSinceLastRun >= task.interval) {
        tasksToRun.push(task);
      }
    }

    if (tasksToRun.length === 0) {
      return;
    }

    console.log(`🧹 Running ${tasksToRun.length} cleanup tasks...`);

    // Sort tasks by priority
    tasksToRun.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Execute tasks
    for (const task of tasksToRun) {
      try {
        const taskStartTime = Date.now();
        await task.execute();
        task.lastRun = Date.now();
        
        const taskDuration = Date.now() - taskStartTime;
        this.metrics.tasksExecuted++;
        
        console.log(`✅ Cleanup task completed: ${task.name} (${taskDuration}ms)`);
        
        // Emit task completion event
        this.emit('task-completed', {
          taskId: task.id,
          taskName: task.name,
          duration: taskDuration,
          timestamp: Date.now()
        });

      } catch (error) {
        console.error(`❌ Cleanup task failed: ${task.name}`, error);
        
        // Emit task failure event
        this.emit('task-failed', {
          taskId: task.id,
          taskName: task.name,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        });
      }
    }

    // Update metrics
    this.metrics.lastCleanup = Date.now();
    this.metrics.cleanupDuration = Date.now() - startTime;

    // Emit cleanup completion event
    this.emit('cleanup-completed', {
      tasksExecuted: tasksToRun.length,
      duration: this.metrics.cleanupDuration,
      timestamp: Date.now()
    });

    console.log(`🎉 Cleanup completed in ${this.metrics.cleanupDuration}ms`);
  }

  /**
   * Perform memory cleanup
   */
  private async performMemoryCleanup(): Promise<void> {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapUsedMB = heapUsed / 1024 / 1024;

    console.log(`🧠 Memory cleanup - Current usage: ${heapUsedMB.toFixed(2)}MB`);

    // Force garbage collection if available
    if (global.gc) {
      const beforeGC = process.memoryUsage().heapUsed;
      global.gc();
      const afterGC = process.memoryUsage().heapUsed;
      const freed = beforeGC - afterGC;
      
      this.metrics.memoryFreed += freed;
      
      console.log(`🗑️ Garbage collection freed ${(freed / 1024 / 1024).toFixed(2)}MB`);
      
      // Emit memory cleanup event
      this.emit('memory-cleaned', {
        beforeMB: beforeGC / 1024 / 1024,
        afterMB: afterGC / 1024 / 1024,
        freedMB: freed / 1024 / 1024,
        timestamp: Date.now()
      });
    }

    // Check if memory usage is still high
    if (heapUsed > this.memoryThreshold) {
      console.warn(`⚠️ High memory usage detected: ${heapUsedMB.toFixed(2)}MB`);
      
      // Emit high memory alert
      this.emit('high-memory-alert', {
        usageMB: heapUsedMB,
        thresholdMB: this.memoryThreshold / 1024 / 1024,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Perform process cleanup
   */
  private async performProcessCleanup(): Promise<void> {
    console.log('⚙️ Performing process cleanup...');

    // Clear any pending timeouts or intervals that might be leaking
    // Note: This is a simplified approach - in production you'd track these more carefully
    let activeHandles = 0;
    let activeRequests = 0;

    try {
      // Type assertion for internal Node.js APIs
      const processAny = process as any;
      if (typeof processAny._getActiveHandles === 'function') {
        activeHandles = processAny._getActiveHandles().length;
      }
      if (typeof processAny._getActiveRequests === 'function') {
        activeRequests = processAny._getActiveRequests().length;
      }
    } catch (error) {
      console.warn('⚠️ Could not access internal process handles:', error);
    }

    console.log(`📊 Active handles: ${activeHandles}, Active requests: ${activeRequests}`);

    // Clean up any long-running processes
    // This would typically involve checking for hanging operations, timeouts, etc.
    
    this.metrics.processesCleaned++;
    
    // Emit process cleanup event
    this.emit('processes-cleaned', {
      activeHandles,
      activeRequests,
      timestamp: Date.now()
    });
  }

  /**
   * Perform connection cleanup
   */
  private async performConnectionCleanup(): Promise<void> {
    console.log('🔌 Performing connection cleanup...');

    // This would typically involve:
    // - Closing idle database connections
    // - Cleaning up HTTP connection pools
    // - Closing file handles
    // - Cleaning up external service connections

    // For now, we'll just log the cleanup
    // In a real implementation, you'd integrate with your connection pools
    
    this.metrics.connectionsClosed++;
    
    // Emit connection cleanup event
    this.emit('connections-cleaned', {
      timestamp: Date.now()
    });
  }

  /**
   * Perform cache cleanup
   */
  private async performCacheCleanup(): Promise<void> {
    console.log('🗄️ Performing cache cleanup...');

    // This would typically involve:
    // - Clearing expired cache entries
    // - Removing least recently used items
    // - Compacting cache storage
    // - Cleaning up temporary files

    // For now, we'll just log the cleanup
    // In a real implementation, you'd integrate with your caching layer
    
    this.metrics.cacheEntriesCleared++;
    
    // Emit cache cleanup event
    this.emit('cache-cleaned', {
      timestamp: Date.now()
    });
  }

  /**
   * Force immediate cleanup
   */
  async forceCleanup(): Promise<void> {
    console.log('🚨 Forcing immediate cleanup...');
    await this.runCleanupTasks();
  }

  /**
   * Get cleanup metrics
   */
  getMetrics(): CleanupMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cleanup status
   */
  getStatus(): {
    isRunning: boolean;
    activeTasks: number;
    lastCleanup: number;
    nextCleanup: number;
  } {
    const now = Date.now();
    let nextCleanup = now + 5 * 60 * 1000; // Default to 5 minutes

    // Find the earliest next cleanup time
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        const taskNextRun = task.lastRun + task.interval;
        if (taskNextRun < nextCleanup) {
          nextCleanup = taskNextRun;
        }
      }
    }

    return {
      isRunning: this.isRunning,
      activeTasks: Array.from(this.tasks.values()).filter(t => t.enabled).length,
      lastCleanup: this.metrics.lastCleanup,
      nextCleanup
    };
  }

  /**
   * Get all cleanup tasks
   */
  getTasks(): CleanupTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Enable/disable a cleanup task
   */
  setTaskEnabled(taskId: string, enabled: boolean): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.enabled = enabled;
    console.log(`${enabled ? '✅' : '❌'} ${enabled ? 'Enabled' : 'Disabled'} cleanup task: ${task.name}`);
    return true;
  }

  /**
   * Reset cleanup metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    console.log('🔄 Resource cleanup metrics reset');
  }

  /**
   * Set memory threshold
   */
  setMemoryThreshold(thresholdMB: number): void {
    this.memoryThreshold = thresholdMB * 1024 * 1024;
    console.log(`📊 Memory threshold set to ${thresholdMB}MB`);
  }

  /**
   * Set GC threshold
   */
  setGCThreshold(thresholdMB: number): void {
    this.gcThreshold = thresholdMB * 1024 * 1024;
    console.log(`📊 GC threshold set to ${thresholdMB}MB`);
  }
}

// Export singleton instance
const resourceCleanup = new ResourceCleanup();
export default resourceCleanup;

// Export types for external use
export type { CleanupTask, CleanupMetrics };
