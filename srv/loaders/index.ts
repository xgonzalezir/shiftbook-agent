/**
 * Service Loaders Module
 * 
 * Exports CDS configuration utilities for SAP CAP applications.
 * 
 * ## Main Configuration
 * - CDS folder configuration (local vs Cloud Foundry paths)
 * - Must be called before CAP initialization
 * 
 * ## Cloud Foundry Diagnostics
 * For troubleshooting CF deployments, import from:
 * `./cloudfoundry-diagnostics`
 * 
 * These diagnostics are NOT exported by default as they're only
 * needed for debugging specific CF deployment issues.
 */

// CDS Folders Configuration (core functionality)
export {
  configureCdsFolders,
  getCdsFolders,
  CDSFoldersConfig,
  CDS_FOLDER_DEFAULTS
} from './cds-folders-config';

// Note: Cloud Foundry diagnostic utilities moved to ./cloudfoundry-diagnostics/
// Import directly from that module if needed for debugging:
// import { getDiagnosticInfo, logDiagnostics } from './loaders/cloudfoundry-diagnostics';
