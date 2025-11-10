/**
 * CDS Folders Configuration
 * 
 * Configures CDS folder paths for different environments (local, Cloud Foundry).
 * 
 * ⚠️ CRITICAL: This configuration must be executed BEFORE CAP scans for service
 * implementations. CDS uses these paths to discover service files and database models.
 * 
 * ## Environment Detection
 * 
 * The configuration adapts based on the runtime environment:
 * 
 * - **Local Development**: Uses `./srv` and `./db` (standard CAP structure)
 * - **Cloud Foundry**: Uses `.` and `../db` (MTA build output structure)
 * - **Custom**: Can be overridden with `CDS_FOLDERS_SRV` and `CDS_FOLDERS_DB` env vars
 * 
 * ## Usage
 * 
 * This module is called automatically in `srv/server.ts` during initialization:
 * 
 * ```typescript
 * import { configureCdsFolders } from './loaders';
 * 
 * // Must be called before any CDS operations
 * configureCdsFolders();
 * ```
 * 
 * ## Cloud Foundry Diagnostics
 * 
 * For troubleshooting CF deployments, see `./cloudfoundry-diagnostics/` directory.
 * 
 * @module loaders/cds-folders-config
 */

import * as cds from '@sap/cds';

/**
 * CDS Folders configuration interface
 * Defines the directory paths for CDS service and database files
 */
export interface CDSFoldersConfig {
  /** Path to service implementations directory */
  srv: string;
  
  /** Path to database models directory */
  db: string;
}

/**
 * CDS Folder path constants for different environments
 */
export const CDS_FOLDER_DEFAULTS = {
  /** Local development paths */
  LOCAL: {
    srv: './srv',
    db: './db',
  },
  
  /** Cloud Foundry paths */
  CLOUD: {
    srv: '.',
    db: '../db',
  },
};

/**
 * Configure CDS folders based on environment
 * CRITICAL: Must be called before CAP initialization
 * 
 * Priority order:
 * 1. CDS_FOLDERS_SRV and CDS_FOLDERS_DB environment variables
 * 2. Cloud Foundry defaults (if VCAP_APPLICATION present)
 * 3. Local development defaults
 * 
 * This function directly modifies cds.env.folders
 */
export function configureCdsFolders(): CDSFoldersConfig {
  const isCloudFoundry = !!process.env.VCAP_APPLICATION;
  
  // Initialize folders object
  cds.env.folders = cds.env.folders || {};
  
  // Configure srv folder
  if (process.env.CDS_FOLDERS_SRV) {
    cds.env.folders.srv = process.env.CDS_FOLDERS_SRV;
    console.log(`📂 CDS folders.srv set from env: ${process.env.CDS_FOLDERS_SRV}`);
  } else if (isCloudFoundry) {
    // Fallback for CF if env var not set
    cds.env.folders.srv = CDS_FOLDER_DEFAULTS.CLOUD.srv;
    console.log('☁️ CF environment detected - CDS folders.srv set to current directory (fallback)');
  } else {
    // Local development
    cds.env.folders.srv = CDS_FOLDER_DEFAULTS.LOCAL.srv;
    console.log('💻 Local environment detected - CDS folders.srv set to ./srv');
  }
  
  // Configure db folder
  if (process.env.CDS_FOLDERS_DB) {
    cds.env.folders.db = process.env.CDS_FOLDERS_DB;
  } else if (isCloudFoundry) {
    cds.env.folders.db = CDS_FOLDER_DEFAULTS.CLOUD.db;
  } else {
    cds.env.folders.db = CDS_FOLDER_DEFAULTS.LOCAL.db;
  }
  
  return {
    srv: cds.env.folders.srv,
    db: cds.env.folders.db
  };
}

/**
 * Get current CDS folders configuration without modifying it
 * 
 * Use this to read the current configuration after it has been set up.
 * This function does not modify `cds.env.folders`.
 * 
 * @returns {CDSFoldersConfig} Current CDS folder paths
 * 
 * @example
 * const folders = getCdsFolders();
 * console.log(`Services: ${folders.srv}, Database: ${folders.db}`);
 */
export function getCdsFolders(): CDSFoldersConfig {
  return {
    srv: cds.env.folders?.srv || CDS_FOLDER_DEFAULTS.LOCAL.srv,
    db: cds.env.folders?.db || CDS_FOLDER_DEFAULTS.LOCAL.db
  };
}

