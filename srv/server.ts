/**
 * ShiftBook CAP Server - Main Entry Point
 *
 * This file orchestrates the startup process of the SAP CAP server using
 * a modular architecture. All business logic has been extracted to specialized
 * modules to improve maintainability and testability.
 *
 * Modular Architecture:
 * - srv/config/      Environment configuration, authentication and CORS
 * - srv/auth/        Authentication management (Mock, Dummy, XSUAA)
 * - srv/middleware/  Express middleware (CORS, logging, health checks)
 * - srv/monitoring/  Monitoring, lifecycle hooks, resource cleanup
 * - srv/loaders/     Service loading and CDS configuration
 *
 * Initialization Flow:
 * 1. 'loaded' hook: Configure CDS folders and environment
 * 2. 'bootstrap' hook: Configure middleware and authentication
 * 3. Other hooks: Lifecycle management (listening, served)
 *
 * @module srv/server
 * @author ShiftBook Development Team
 * @version 2.0.1
 */

import cds from '@sap/cds';
import type { Express } from 'express';

// Import refactored modules
import { configureCdsFolders } from './loaders';
import { getEnvironment } from './config';
import { setupAuthentication } from './auth';
import { MiddlewareManager } from './middleware';
import lifecycleManager from './monitoring/lifecycle-manager';

// ============================================================================
// Module-level guard to prevent multiple initializations
// ============================================================================
let initialized = false;

// ============================================================================
// HOOK: 'loaded' - Configuración inicial DESPUÉS de que CDS cargue el modelo
// ============================================================================
/**
 * Este hook se ejecuta después de que CDS ha cargado el modelo de datos
 * pero antes de que se inicie el servidor Express.
 * Es el lugar adecuado para configuraciones que dependen del entorno.
 */
cds.on('loaded', () => {
  if (initialized) return;

  try {
    console.log('='.repeat(60));
    console.log('🔧 CDS LOADED - Starting configuration...');
    console.log('='.repeat(60));

    // STEP 1: Configure CDS folders
    // ⚠️ CRITICAL: Must execute AFTER CDS model is loaded
    // Configures paths based on environment:
    // - Local: ./srv and ./db
    // - Cloud Foundry: . and ../db
    // - Custom: uses CDS_FOLDERS_SRV and CDS_FOLDERS_DB if defined
    console.log('📂 Configuring CDS folders...');
    configureCdsFolders();

    // STEP 2: Register lifecycle hooks
    // LifecycleManager centralizes the handling of CAP events:
    // - 'listening': HTTP server listening (starts monitoring)
    // - 'served': CAP services available (logging of services)
    console.log('📋 Registering lifecycle hooks...');
    lifecycleManager.registerLifecycleHooks();

    console.log('✅ Configuration completed successfully');
    console.log('='.repeat(60));

    initialized = true;
  } catch (error) {
    console.error('❌ Error during CDS loaded configuration:');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    throw error;
  }
});

// ============================================================================
// HOOK: 'bootstrap' - Express Configuration
// ============================================================================
/**
 * CAP 'bootstrap' event
 *
 * Fires when the Express application is ready to be configured
 * but has not yet started. Here we configure:
 *
 * - CORS middleware (allowed origins based on environment)
 * - HTTP request logging (with correlation IDs)
 * - Health checks (/health, /readiness, /liveness)
 * - Body parser (JSON and URL-encoded with 50MB limit)
 * - Authentication (XSUAA in cloud, Mock locally)
 * - Language middleware (i18n)
 * - Centralized error handling
 */
cds.on('bootstrap', async (app: Express): Promise<void> => {
  try {
    console.log('='.repeat(60));
    console.log('🚀 BOOTSTRAP START - Configuring Express application');
    console.log('='.repeat(60));

    // Get environment info
    const environment = getEnvironment();

    // Log environment details
    console.log('Environment Details:');
    console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
    console.log('  CDS_ENV:', process.env.CDS_ENV || 'not set');
    console.log('  Environment:', environment.env);
    console.log('  Is Cloud:', environment.isCloud);
    console.log('  Is Production:', environment.isProduction);
    console.log('  Working directory:', process.cwd());
    console.log('  CDS version:', cds.version);
    console.log('='.repeat(60));

    // Configure middleware chain in the correct order
    console.log('⚙️ Setting up middleware...');
    const middlewareManager = new MiddlewareManager(app, environment);
    middlewareManager.setupMiddleware();
    console.log('✅ Middleware configured successfully');

    // Configure authentication only in cloud environments
    // Locally/in tests, CAP uses its built-in mock authentication
    if (environment.isCloud) {
      console.log('☁️ Setting up custom authentication for cloud environment');
      setupAuthentication(app, environment);
      console.log('✅ Authentication configured successfully');
    } else {
      console.log('🔧 Using CAP built-in authentication for local/test environment');
    }

    console.log('='.repeat(60));
    console.log('✅ BOOTSTRAP COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ BOOTSTRAP FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('='.repeat(60));
    throw error; // Re-throw para que Cloud Foundry lo detecte
  }
});

// Export the CDS server instance
export default cds.server;

