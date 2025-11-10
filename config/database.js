/**
 * Database Connection Pooling Configuration
 * Optimized for SAP HANA and SQLite environments
 */

const dbConfig = {
  // Development environment (SQLite)
  development: {
    kind: 'sqlite',
    credentials: {
      url: 'db/shiftbook-dev.db'
    },
    // SQLite doesn't need connection pooling, but we can optimize
    options: {
      // Enable WAL mode for better concurrent access
      pragma: {
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        cache_size: 10000,
        temp_store: 'MEMORY'
      }
    }
  },

  // Test environment (SQLite in-memory)
  test: {
    kind: 'sqlite',
    credentials: {
      url: ':memory:'
    },
    options: {
      // Optimize for testing
      pragma: {
        journal_mode: 'DELETE',
        synchronous: 'OFF',
        cache_size: 1000
      }
    }
  },

  // Hybrid/Production environment (HANA)
  hana: {
    kind: 'hana',
    credentials: {
      // Will be loaded from environment variables or service binding
    },
    // HANA Connection Pooling Configuration
    pool: {
      // Connection pool size
      min: 5,           // Minimum connections in pool
      max: 20,          // Maximum connections in pool
      
      // Connection lifecycle
      acquireTimeoutMillis: 30000,    // 30 seconds to acquire connection
      createTimeoutMillis: 30000,     // 30 seconds to create connection
      destroyTimeoutMillis: 5000,     // 5 seconds to destroy connection
      idleTimeoutMillis: 300000,      // 5 minutes idle timeout
      
      // Pool behavior
      createRetryIntervalMillis: 200, // 200ms between retry attempts
      reapIntervalMillis: 1000,       // Check for idle connections every second
      
      // Connection validation
      validate: (connection) => {
        // Validate connection is still alive
        return connection && !connection.closed;
      },
      
      // Error handling
      handleDisconnects: true,
      maxReconnectAttempts: 3,
      reconnectDelay: 1000
    },
    
    // HANA-specific optimizations
    hana: {
      // Connection parameters
      encrypt: true,                   // Enable encryption
      validateCertificate: true,       // Validate SSL certificates
      
      // Performance settings
      packetSize: 32768,              // Network packet size
      maxDataSize: 268435456,         // Max data size (256MB)
      
      // Timeout settings
      connectTimeout: 30000,          // Connection timeout
      queryTimeout: 300000,           // Query timeout (5 minutes)
      
      // Connection pooling at HANA level
      connectionPooling: true,
      maxPoolSize: 20,
      minPoolSize: 5
    }
  }
};

module.exports = dbConfig;
