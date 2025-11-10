/**
 * Database Connection Wrapper
 * Provides connection pooling and monitoring integration
 */

import cds from '@sap/cds';
import connectionPoolMonitor from './connection-pool-monitor';

interface ConnectionOptions {
  timeout?: number;
  retries?: number;
  monitor?: boolean;
}

interface QueryResult<T = any> {
  data: T;
  executionTime: number;
  connectionId: string;
}

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private connectionCount = 0;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Execute a database query with connection pooling and monitoring
   */
  async executeQuery<T = any>(
    queryFn: () => Promise<T>,
    options: ConnectionOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const connectionId = this.generateConnectionId();
    const { timeout = 30000, retries = 3, monitor = true } = options;

    try {
      // Record connection acquisition
      if (monitor) {
        connectionPoolMonitor.recordAcquisition(connectionId, Date.now() - startTime);
      }

      // Execute query with timeout
      const result = await this.executeWithTimeout(queryFn, timeout);
      
      // Record successful execution
      const executionTime = Date.now() - startTime;
      if (monitor) {
        connectionPoolMonitor.recordRelease(connectionId, executionTime);
      }

      return {
        data: result,
        executionTime,
        connectionId
      };

    } catch (error) {
      // Record failure
      if (monitor) {
        connectionPoolMonitor.recordFailure(connectionId, error as Error);
      }

      // Retry logic for transient errors
      if (retries > 0 && this.isRetryableError(error as Error)) {
        console.log(`Retrying query for connection ${connectionId}, ${retries} attempts remaining`);
        return this.executeQuery(queryFn, { ...options, retries: retries - 1 });
      }

      throw error;
    }
  }

  /**
   * Execute a transaction with connection pooling
   */
  async executeTransaction<T = any>(
    transactionFn: () => Promise<T>,
    options: ConnectionOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    const connectionId = this.generateConnectionId();
    const { timeout = 60000, retries = 3, monitor = true } = options;

    try {
      // Record transaction start
      if (monitor) {
        connectionPoolMonitor.recordAcquisition(connectionId, Date.now() - startTime);
      }

      // Execute transaction
      const result = await cds.transaction(transactionFn);
      
      // Record successful transaction
      const executionTime = Date.now() - startTime;
      if (monitor) {
        connectionPoolMonitor.recordRelease(connectionId, executionTime);
      }

      return {
        data: result,
        executionTime,
        connectionId
      };

    } catch (error) {
      // Record failure
      if (monitor) {
        connectionPoolMonitor.recordFailure(connectionId, error as Error);
      }

      // Retry logic for transient errors
      if (retries > 0 && this.isRetryableError(error as Error)) {
        console.log(`Retrying transaction for connection ${connectionId}, ${retries} attempts remaining`);
        return this.executeTransaction(transactionFn, { ...options, retries: retries - 1 });
      }

      throw error;
    }
  }

  /**
   * Execute query with timeout
   */
  private async executeWithTimeout<T>(
    queryFn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Query timeout after ${timeout}ms`));
      }, timeout);

      queryFn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
      'Connection lost',
      'Connection timeout',
      'Pool timeout'
    ];

    return retryableErrors.some(retryableError => 
      error.message.includes(retryableError) || 
      (error as any).code === retryableError
    );
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    this.connectionCount++;
    return `conn_${Date.now()}_${this.connectionCount}`;
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    return connectionPoolMonitor.getMetrics();
  }

  /**
   * Get connection pool health
   */
  getPoolHealth() {
    return connectionPoolMonitor.getPoolHealth();
  }

  /**
   * Get connection pool events
   */
  getPoolEvents(limit: number = 100) {
    return connectionPoolMonitor.getEventHistory(limit);
  }
}

// Export singleton instance
export const databaseConnection = DatabaseConnection.getInstance();
export default databaseConnection;
export type { ConnectionOptions, QueryResult };
export { DatabaseConnection };
