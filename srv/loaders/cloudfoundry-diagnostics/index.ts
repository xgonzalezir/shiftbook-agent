/**
 * Cloud Foundry Diagnostic Utilities
 * 
 * This module contains diagnostic functions specifically for troubleshooting
 * service loading issues in SAP Cloud Foundry (CF) deployments.
 * 
 * ⚠️ IMPORTANT: These utilities are NOT used in production code.
 * They are kept for manual debugging and troubleshooting when needed.
 * 
 * ## When to Use These Functions
 * 
 * Use these diagnostics when:
 * - Services fail to load in Cloud Foundry but work locally
 * - You need to verify service files are present in CF deployment
 * - Debugging `cf push` issues where services are not found
 * - Investigating file system structure in CF runtime
 * 
 * ## How to Use
 * 
 * 1. SSH into Cloud Foundry instance:
 *    ```bash
 *    cf ssh shiftbook-srv
 *    ```
 * 
 * 2. Run Node REPL and load diagnostics:
 *    ```javascript
 *    const { logDiagnostics, getDiagnosticInfo } = require('./srv/loaders/cloudfoundry-diagnostics');
 *    logDiagnostics(); // Quick logging
 *    const info = getDiagnosticInfo(); // Get detailed info
 *    ```
 * 
 * 3. Or add temporary logging in server.ts:
 *    ```typescript
 *    import { logDiagnostics } from './loaders/cloudfoundry-diagnostics';
 *    logDiagnostics(); // Add temporarily for debugging
 *    ```
 * 
 * ## Why Not in Production Code
 * 
 * - CDS v9 handles service discovery automatically
 * - CDS provides better error messages when services are missing
 * - File system inspection adds unnecessary overhead
 * - Only useful for specific debugging scenarios
 * 
 * @module loaders/cloudfoundry-diagnostics
 * @deprecated Use only for debugging Cloud Foundry deployments
 */

import * as cds from '@sap/cds';
import * as fs from 'fs';

/**
 * Diagnostic information about service files in Cloud Foundry
 */
export interface DiagnosticInfo {
  /** List of service files found (filtered by 'shiftbook-service' pattern) */
  serviceFiles: string[];
  
  /** Total number of files in srv directory */
  totalFiles: number;
  
  /** Whether at least one shiftbook-service file was found */
  hasShiftbookService: boolean;
}

/**
 * Get diagnostic information about service files in srv directory
 * 
 * This function scans the srv directory (or current directory in CF)
 * and looks for service implementation files matching 'shiftbook-service'.
 * 
 * ## Use Cases
 * - Verify service files are present after `cf push`
 * - Check file names and extensions in CF environment
 * - Diagnose "service not found" errors in CF
 * 
 * ## Example Output
 * ```javascript
 * {
 *   serviceFiles: ['shiftbook-service.js', 'shiftbook-service.js.map'],
 *   totalFiles: 15,
 *   hasShiftbookService: true
 * }
 * ```
 * 
 * @returns {DiagnosticInfo | null} Diagnostic info or null if not in Cloud Foundry
 * 
 * @example
 * // In CF SSH session or debugging
 * const info = getDiagnosticInfo();
 * if (info && !info.hasShiftbookService) {
 *   console.error('Service file not found in CF!');
 * }
 */
export function getDiagnosticInfo(): DiagnosticInfo | null {
  const isCloudFoundry = !!process.env.VCAP_APPLICATION;
  
  if (!isCloudFoundry) {
    console.log('ℹ️ Not in Cloud Foundry - diagnostics skipped');
    return null;
  }
  
  try {
    const srvFolder = cds.env.folders?.srv || '.';
    const files = fs.readdirSync(srvFolder);
    const serviceFiles = files.filter(f => f.includes('shiftbook-service'));
    
    return {
      serviceFiles,
      totalFiles: files.length,
      hasShiftbookService: serviceFiles.length > 0
    };
  } catch (error) {
    console.error('❌ Error reading srv directory:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Log diagnostic information about service files to console
 * 
 * Quick logging function for troubleshooting in Cloud Foundry.
 * Only executes in CF environments (checks VCAP_APPLICATION).
 * 
 * ## When to Use
 * - Quick check during `cf ssh` session
 * - Add temporarily to server.ts for debugging
 * - Verify files after deployment
 * 
 * ## Output Example
 * ```
 * 📂 Files in srv directory: ['shiftbook-service.js']
 * ```
 * 
 * Or if no service files found:
 * ```
 * 📂 Files in srv directory: No shiftbook-service files found!
 * ```
 * 
 * @returns {void}
 * 
 * @example
 * // Temporarily add to srv/server.ts for debugging
 * import { logDiagnostics } from './loaders/cloudfoundry-diagnostics';
 * 
 * if (process.env.VCAP_APPLICATION) {
 *   logDiagnostics(); // Only in CF
 * }
 */
export function logDiagnostics(): void {
  const info = getDiagnosticInfo();
  
  if (info) {
    console.log(
      '📂 CF Diagnostics - Files in srv directory:',
      info.hasShiftbookService
        ? info.serviceFiles
        : '⚠️ No shiftbook-service files found!'
    );
    
    console.log(`   Total files: ${info.totalFiles}`);
    
    if (!info.hasShiftbookService) {
      console.warn('⚠️ WARNING: Service implementation files not found in CF!');
      console.warn('   This may cause service loading failures.');
      console.warn('   Check your build output and mta.yaml configuration.');
    }
  }
}

/**
 * Check if running in Cloud Foundry environment
 * 
 * Detects CF by checking for VCAP_APPLICATION environment variable.
 * 
 * @returns {boolean} True if running in Cloud Foundry
 * 
 * @example
 * if (isCloudFoundryEnvironment()) {
 *   console.log('Running in CF - using CF-specific paths');
 * }
 */
export function isCloudFoundryEnvironment(): boolean {
  return !!process.env.VCAP_APPLICATION;
}
