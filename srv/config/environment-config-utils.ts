/**
 * Environment Configuration Utilities
 * 
 * ⚠️ IMPORTANT: These utilities are ONLY used in tests.
 * They are not used in production code.
 * 
 * This module contains helper functions for testing environment
 * detection and configuration. These provide convenient ways to
 * get human-readable descriptions and authentication method names.
 * 
 * ## Why Separated from environment-config.ts
 * 
 * These functions were extracted because:
 * - They are only used in test files
 * - Production code doesn't need string descriptions
 * - Keeping them separate makes the core config cleaner
 * 
 * ## Usage
 * 
 * Import in test files only:
 * ```typescript
 * import { getEnvironmentDescription } from '../../../srv/config/environment-config-utils';
 * ```
 * 
 * @module config/environment-config-utils
 * @deprecated Use only in tests - not for production code
 */

import { EnvironmentInfo } from './environment-config';

/**
 * Gets a human-readable description of the current environment
 * 
 * Useful for test assertions and debugging output.
 * Production code should check environment flags directly.
 * 
 * @param {EnvironmentInfo} environment - Environment information
 * @returns {string} Human-readable environment description
 * 
 * @example
 * const desc = getEnvironmentDescription(environment);
 * expect(desc).toBe("Local Development");
 */
export function getEnvironmentDescription(environment: EnvironmentInfo): string {
  if (environment.isLocal) {
    return "Local Development";
  }
  if (environment.isTest) {
    return "Test";
  }
  if (environment.isProduction) {
    return "Production";
  }
  if (environment.isHybrid) {
    return "Hybrid";
  }
  return environment.env;
}

/**
 * Gets the authentication method appropriate for the current environment
 * 
 * Returns a simple string identifier for the auth method.
 * Production code should use actual authentication configuration.
 * 
 * @param {EnvironmentInfo} environment - Environment information
 * @returns {string} Authentication method identifier
 * 
 * @example
 * const authMethod = getAuthenticationMethod(environment);
 * expect(authMethod).toBe("mock");
 */
export function getAuthenticationMethod(environment: EnvironmentInfo): string {
  if (environment.isLocal || environment.isTest) {
    return "mock";
  }
  if (environment.isCloud) {
    return "xsuaa";
  }
  return "default";
}
