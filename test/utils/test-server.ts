import * as cds from '@sap/cds';

/**
 * Test Server Utilities for HTTP Integration Tests
 *
 * Provides utilities to start and stop a real HTTP server for integration testing
 */

export interface TestServerConfig {
  port: number;
  timeout: number;
  healthCheckPath: string;
}

export class TestServer {
  private static instance: TestServer;
  private server: any = null;
  private config: TestServerConfig;

  private constructor() {
    this.config = {
      port: 4004,
      timeout: 120000, // Increased to 2 minutes
      healthCheckPath: '/health'
    };
  }

  public static getInstance(): TestServer {
    if (!TestServer.instance) {
      TestServer.instance = new TestServer();
    }
    return TestServer.instance;
  }

  /**
   * Start the CDS server for integration testing
   */
  async start(): Promise<void> {
    if (this.server) {
      console.log('✅ Test server already running');
      return;
    }

    try {
      console.log('🚀 Starting test server...');

      // Set test environment
      process.env.NODE_ENV = 'test';
      process.env.CDS_ENV = 'test';
      process.env.EMAIL_SIMULATION_MODE = 'true';

      // Configure in-memory database for testing
      cds.env.requires.db = {
        kind: 'sqlite',
        credentials: { database: ':memory:' }
      };

      // Configure test authentication
      // Use 'basic' auth instead of 'dummy' to properly enforce authentication
      (cds.env.requires as any).auth = {
        kind: 'basic',
        users: {
          'test-admin': { password: '', roles: ['shiftbook.admin', 'shiftbook.operator'] },
          'operator': { password: '', roles: ['shiftbook.operator'] },
          'admin': { password: '', roles: ['shiftbook.admin', 'shiftbook.operator'] },
          'alice': { password: '', roles: ['shiftbook.admin', 'shiftbook.operator'] },
          'bob': { password: '', roles: ['shiftbook.operator'] },
          'carol': { password: '', roles: ['shiftbook.operator'] },
          'dave': { password: '', roles: ['shiftbook.operator'] }
        }
      };

      // Load CDS model
      const model = await cds.load(['db', 'srv']);

      // Connect to database
      const db = await cds.connect.to('db');

      // Deploy schema
      await cds.deploy(model).to(db);

      // Start CAP service and create HTTP server
      // Use express to create an HTTP server for the CAP service
      const express = require('express');
      const expressApp = express();

      // Mount simple health check endpoints for testing
      const startTime = Date.now();
      expressApp.get('/health', (req: any, res: any) => {
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: Math.floor((Date.now() - startTime) / 1000),
          checks: {
            database: true,
            performance: true,
            connectionPool: true,
            services: true,
            memory: true,
            disk: true,
            resourceCleanup: true
          }
        });
      });

      expressApp.get('/health/simple', (req: any, res: any) => {
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString()
        });
      });

      expressApp.get('/metrics', (req: any, res: any) => {
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const memUsage = process.memoryUsage();
        res.set('Content-Type', 'text/plain');
        res.status(200).send(
          `# HELP application_uptime_seconds Application uptime in seconds\n` +
          `# TYPE application_uptime_seconds gauge\n` +
          `application_uptime_seconds ${uptime}\n` +
          `# HELP process_memory_heap_used_bytes Process heap memory used\n` +
          `# TYPE process_memory_heap_used_bytes gauge\n` +
          `process_memory_heap_used_bytes ${memUsage.heapUsed}\n`
        );
      });

      // Serve the CAP service through express
      await cds.serve('ShiftBookService').from(model).in(expressApp);

      // Start HTTP server on the configured port
      await new Promise<void>((resolve, reject) => {
        try {
          this.server = expressApp.listen(this.config.port, () => {
            console.log(`✅ Test server started successfully on port ${this.config.port}`);
            resolve();
          });

          // Set timeout for server startup
          setTimeout(() => {
            reject(new Error('Server startup timeout'));
          }, 30000);
        } catch (error) {
          reject(error);
        }
      });

    } catch (error) {
      console.error('❌ Failed to start test server:', error);
      throw error;
    }
  }

  /**
   * Stop the test server
   */
  async stop(): Promise<void> {
    if (this.server) {
      try {
        console.log('🛑 Stopping test server...');
        await new Promise<void>((resolve, reject) => {
          this.server.close((err: any) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
        this.server = null;
        console.log('✅ Test server stopped successfully');
      } catch (error) {
        console.error('❌ Error stopping test server:', error);
        throw error;
      }
    }
  }

  /**
   * Get server URL for testing
   */
  getServerUrl(): string {
    return `http://localhost:${this.config.port}`;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null;
  }
}

export default TestServer;