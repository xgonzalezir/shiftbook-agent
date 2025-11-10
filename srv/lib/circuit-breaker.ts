/**
 * Circuit Breaker Implementation for ShiftBook Service
 * 
 * Provides protection against cascading failures by monitoring service health
 * and automatically failing fast when services are unhealthy.
 */

import { EventEmitter } from 'events';

export enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation - requests pass through
  OPEN = 'OPEN',          // Failing fast - requests are rejected immediately
  HALF_OPEN = 'HALF_OPEN' // Testing recovery - limited requests allowed
}

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening circuit
  successThreshold: number;     // Number of successes before closing circuit
  timeout: number;              // Time in ms before attempting recovery
  monitorInterval: number;      // Health check interval in ms
  enableHealthChecks: boolean;  // Whether to perform active health checks
  enableMetrics: boolean;       // Whether to collect metrics
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rejectedRequests: number;
  currentState: CircuitState;
  lastStateChange: Date;
  failureRate: number;
  averageResponseTime: number;
  healthCheckResults: boolean[];
}

export interface HealthCheckResult {
  healthy: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private lastStateChange: Date = new Date();
  private healthCheckInterval?: NodeJS.Timeout;
  private metrics: CircuitBreakerMetrics;
  private config: CircuitBreakerConfig;
  private healthCheckResults: HealthCheckResult[] = [];
  private responseTimes: number[] = [];

  constructor(
    private readonly name: string,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    super();
    
    this.config = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000, // 30 seconds
      monitorInterval: 60000, // 1 minute
      enableHealthChecks: true,
      enableMetrics: true,
      ...config
    };

    this.metrics = this.initializeMetrics();
    
    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    const startTime = Date.now();
    
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        this.recordRejectedRequest();
        this.emit('rejected', { operation: this.name, reason: 'circuit_open' });
        
        if (fallback) {
          return await fallback();
        }
        
        throw new Error(`Circuit breaker '${this.name}' is OPEN - service unavailable`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordFailure(Date.now() - startTime, error);
      
      if (fallback) {
        try {
          return await fallback();
        } catch (fallbackError) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          throw new Error(`Both primary operation and fallback failed: ${errorMessage}, Fallback: ${fallbackErrorMessage}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.timeout;
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(responseTime: number): void {
    this.failureCount = 0;
    this.successCount++;
    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for metrics
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    if (this.state === CircuitState.HALF_OPEN && this.successCount >= this.config.successThreshold) {
      this.transitionToClosed();
    }

    this.updateMetrics();
    this.emit('success', { operation: this.name, responseTime });
  }

  /**
   * Record a failed operation
   */
  private recordFailure(responseTime: number, error: any): void {
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = Date.now();
    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for metrics
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
      this.transitionToOpen();
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    }

    this.updateMetrics();
    this.emit('failure', { operation: this.name, error, responseTime });
  }

  /**
   * Record a rejected request (circuit open)
   */
  private recordRejectedRequest(): void {
    this.metrics.rejectedRequests++;
    this.updateMetrics();
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    if (this.state !== CircuitState.CLOSED) {
      this.state = CircuitState.CLOSED;
      this.lastStateChange = new Date();
      this.metrics.currentState = CircuitState.CLOSED;
      this.emit('stateChange', { from: this.state, to: CircuitState.CLOSED, operation: this.name });
    }
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    if (this.state !== CircuitState.OPEN) {
      this.state = CircuitState.OPEN;
      this.lastStateChange = new Date();
      this.metrics.currentState = CircuitState.OPEN;
      this.emit('stateChange', { from: this.state, to: CircuitState.OPEN, operation: this.name });
    }
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    if (this.state !== CircuitState.HALF_OPEN) {
      this.state = CircuitState.HALF_OPEN;
      this.lastStateChange = new Date();
      this.metrics.currentState = CircuitState.HALF_OPEN;
      this.emit('stateChange', { from: this.state, to: CircuitState.HALF_OPEN, operation: this.name });
    }
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.monitorInterval);
    
    // Unref the timer so it doesn't keep the process alive
    this.healthCheckInterval.unref();
  }

  /**
   * Perform health check (to be implemented by subclasses)
   */
  protected async performHealthCheck(): Promise<HealthCheckResult> {
    // Default implementation - always healthy
    // Subclasses should override this method
    return {
      healthy: true,
      responseTime: 0,
      timestamp: new Date()
    };
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): CircuitBreakerMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      currentState: CircuitState.CLOSED,
      lastStateChange: new Date(),
      failureRate: 0,
      averageResponseTime: 0,
      healthCheckResults: []
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    if (!this.config.enableMetrics) return;

    this.metrics.totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.failureRate = this.metrics.totalRequests > 0 
      ? this.metrics.failedRequests / this.metrics.totalRequests 
      : 0;
    this.metrics.averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;
    this.metrics.lastStateChange = this.lastStateChange;
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Force circuit to CLOSED state (for testing/manual override)
   */
  forceClose(): void {
    this.transitionToClosed();
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Force circuit to OPEN state (for testing/manual override)
   */
  forceOpen(): void {
    this.transitionToOpen();
  }

  /**
   * Reset circuit breaker state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.lastStateChange = new Date();
    this.metrics = this.initializeMetrics();
    this.responseTimes = [];
    this.healthCheckResults = [];
    this.emit('reset', { operation: this.name });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    this.removeAllListeners();
  }
}

/**
 * Email Service Circuit Breaker
 * Specialized circuit breaker for email service operations
 */
export class EmailCircuitBreaker extends CircuitBreaker {
  constructor(
    private readonly emailService: any,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    super('email-service', {
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 60000, // 1 minute
      monitorInterval: 30000, // 30 seconds
      ...config
    });
  }

  /**
   * Perform health check for email service
   */
  protected async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const healthy = await this.emailService.testConnection();
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        healthy,
        responseTime,
        timestamp: new Date()
      };

      if (!healthy) {
        result.error = 'Email service connection test failed';
      }

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: false,
        responseTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Database Circuit Breaker
 * Specialized circuit breaker for database operations
 */
export class DatabaseCircuitBreaker extends CircuitBreaker {
  constructor(
    private readonly db: any,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    super('database', {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 45000, // 45 seconds
      monitorInterval: 60000, // 1 minute
      ...config
    });
  }

  /**
   * Perform health check for database
   */
  protected async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple query to test database connectivity
      await this.db.run('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        responseTime,
        timestamp: new Date()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: false,
        responseTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Get or create a circuit breaker
   */
  getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(name, config);
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get circuit breaker status
   */
  getStatus(): Array<{ name: string; state: CircuitState; metrics: CircuitBreakerMetrics }> {
    return Array.from(this.breakers.entries()).map(([name, breaker]) => ({
      name,
      state: breaker.getState(),
      metrics: breaker.getMetrics()
    }));
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Cleanup all circuit breakers
   */
  destroy(): void {
    for (const breaker of this.breakers.values()) {
      breaker.destroy();
    }
    this.breakers.clear();
  }
}

export default CircuitBreaker; 