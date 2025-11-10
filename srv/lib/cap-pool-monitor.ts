/**
 * CAP Database Pool Monitoring Integration
 * Hooks into CAP's built-in connection pool to provide monitoring metrics
 */

import cds from '@sap/cds';
import connectionPoolMonitor from './connection-pool-monitor';

interface RequestContext {
  id?: string;
  event?: string;
  target?: { name?: string };
  _connectionId?: string;
  _startTime?: number;
  _operationType?: string;
}

/**
 * Integrates connection pool monitoring with CAP's database service
 */
export async function integratePoolMonitoring(): Promise<void> {
  try {
    // Wait for database connection to be established
    const db = await cds.connect.to('db');
    
    if (!db) {
      console.warn('⚠️ Database service not available for monitoring');
      return;
    }

    console.log('🔌 Integrating connection pool monitoring with CAP database service');

    // Monitor before database operations (connection acquisition)
    db.before('*', (req: RequestContext) => {
      const connectionId = `cap_${Date.now()}_${req.id || Math.random()}`;
      const operationType = `${req.event}:${req.target?.name || 'unknown'}`;
      
      // Store context for later use
      req._connectionId = connectionId;
      req._startTime = Date.now();
      req._operationType = operationType;
      
      // Record connection acquisition (instant since CAP handles pooling)
      connectionPoolMonitor.recordAcquisition(connectionId, 0);
      
      // Debug logging for development
      if (process.env.CDS_ENV === 'development') {
        console.log(`📊 [POOL] Starting operation: ${operationType} with connection: ${connectionId}`);
      }
    });

    // Monitor after successful operations (connection release)
    db.after('*', (_result: any, req: RequestContext) => {
      if (req._connectionId && req._startTime) {
        const duration = Date.now() - req._startTime;
        
        // Record successful operation and connection release
        connectionPoolMonitor.recordRelease(req._connectionId, duration);
        
        // Debug logging for development
        if (process.env.CDS_ENV === 'development') {
          console.log(`✅ [POOL] Completed ${req._operationType} in ${duration}ms`);
        }
      }
    });

    // Monitor errors (connection failures)
    db.on('error', (err: Error, req: RequestContext) => {
      if (req._connectionId) {
        // Record failure
        connectionPoolMonitor.recordFailure(req._connectionId, err);
        
        console.error(`❌ [POOL] Failed ${req._operationType}:`, err.message);
      }
    });

    // Monitor transaction-specific events if available
    if (db.tx) {
      const originalTx = db.tx.bind(db);
      
      db.tx = function(...args: any[]) {
        const tx = originalTx(...args);
        const txId = `tx_${Date.now()}_${Math.random()}`;
        const txStartTime = Date.now();
        
        // Monitor transaction lifecycle
        connectionPoolMonitor.recordAcquisition(txId, 0);
        
        // Wrap commit
        const originalCommit = tx.commit?.bind(tx);
        if (originalCommit) {
          tx.commit = async function(res?: any) {
            const result = await originalCommit(res);
            const duration = Date.now() - txStartTime;
            connectionPoolMonitor.recordRelease(txId, duration);
            
            if (process.env.CDS_ENV === 'development') {
              console.log(`✅ [POOL] Transaction ${txId} committed in ${duration}ms`);
            }
            
            return result;
          };
        }
        
        // Wrap rollback
        const originalRollback = tx.rollback?.bind(tx);
        if (originalRollback) {
          tx.rollback = async function(err?: Error) {
            connectionPoolMonitor.recordFailure(txId, err || new Error('Transaction rolled back'));
            
            if (process.env.CDS_ENV === 'development') {
              console.log(`⚠️ [POOL] Transaction ${txId} rolled back`);
            }
            
            return originalRollback(err);
          };
        }
        
        return tx;
      };
    }

    // Update pool size metrics periodically based on CAP configuration
    const poolConfig = (cds.env.requires?.db as any)?.pool || {};
    const updatePoolMetrics = () => {
      // CAP doesn't expose actual pool stats, so we estimate based on operations
      const metrics = connectionPoolMonitor.getMetrics();
      const estimatedTotal = poolConfig.max || 100;
      const estimatedIdle = Math.max(0, estimatedTotal - metrics.activeConnections);
      
      connectionPoolMonitor.updatePoolSize(
        estimatedTotal,
        metrics.activeConnections,
        estimatedIdle
      );
    };
    
    // Update metrics every 5 seconds
    setInterval(updatePoolMetrics, 5000);
    
    console.log('✅ Connection pool monitoring integrated successfully with CAP');
    console.log('📊 Pool configuration:', {
      min: poolConfig.min || 0,
      max: poolConfig.max || 100,
      acquireTimeoutMillis: poolConfig.acquireTimeoutMillis || 10000,
      idleTimeoutMillis: poolConfig.idleTimeoutMillis || 30000
    });
    
  } catch (error) {
    console.error('❌ Failed to integrate connection pool monitoring:', error);
  }
}

/**
 * Get current CAP pool configuration
 */
export function getCapPoolConfig(): any {
  const dbConfig = (cds.env.requires?.db as any) || {};
  return {
    kind: dbConfig.kind || 'sqlite',
    pool: dbConfig.pool || {
      min: 0,
      max: 100,
      acquireTimeoutMillis: process.env.NODE_ENV === 'production' ? 1000 : 10000,
      idleTimeoutMillis: 30000,
      softIdleTimeoutMillis: 30000,
      testOnBorrow: true,
      fifo: false
    }
  };
}

export default {
  integratePoolMonitoring,
  getCapPoolConfig
};