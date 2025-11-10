/**
 * Configuration Module Exports
 * 
 * Central export point for all configuration modules
 * 
 * NOTE: Authentication configuration moved to auth-config-utils.ts
 * as it was only used in tests. Import directly if needed:
 * import { getAuthConfig, MOCK_USERS } from './config/auth-config-utils';
 */

export * from "./environment-config";
export * from "./cors-config";