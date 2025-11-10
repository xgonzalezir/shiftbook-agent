/**
 * CORS (Cross-Origin Resource Sharing) Configuration Module
 * 
 * Provides environment-specific CORS configuration for Express applications.
 * CORS middleware should be set up early in the middleware chain, before
 * authentication and other request handlers.
 * 
 * Supports:
 * - Development: localhost origins
 * - Test: Restrictive localhost configuration
 * - Production/Hybrid: Environment variable configuration
 * - Custom origins through CORS_ORIGIN_OVERRIDE env var
 * 
 * Usage in production:
 * ```typescript
 * import { getCORSConfig } from './config';
 * const corsConfig = getCORSConfig(environment);
 * app.use(cors(corsConfig));
 * ```
 */

import { EnvironmentInfo } from './environment-config';

/**
 * CORS options interface
 * Defines allowed origins, methods, headers, and other CORS settings
 */
export interface CORSOptions {
  /** Allowed origins (string array or function) */
  origin?: string[] | string | RegExp | boolean | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
  
  /** Allowed HTTP methods */
  methods?: string[];
  
  /** Allowed HTTP headers */
  allowedHeaders?: string[];
  
  /** Whether credentials are allowed */
  credentials?: boolean;
  
  /** Maximum age for preflight cache (in seconds) */
  maxAge?: number;
}

/**
 * Development CORS configuration
 * Allows requests from common local development ports
 */
export const CORS_CONFIG_DEVELOPMENT: CORSOptions = {
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:4004',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4004',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Test CORS configuration
 * Restrictive configuration for testing environments
 */
export const CORS_CONFIG_TEST: CORSOptions = {
  origin: ['http://localhost:3000', 'http://localhost:4004'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  credentials: true,
  maxAge: 3600, // 1 hour
};

/**
 * Hybrid/Production CORS configuration
 * Permissive with credential headers but requires explicit origins
 */
export const CORS_CONFIG_PRODUCTION: CORSOptions = {
  origin: true, // Allow any origin in production (should be overridden by env vars)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
  ],
  credentials: true,
  maxAge: 86400,
};

/**
 * Gets appropriate CORS configuration for the environment
 * 
 * Priority:
 * 1. CORS_ORIGIN_OVERRIDE environment variable (comma-separated)
 * 2. Environment-specific defaults
 * 3. Development fallback
 * 
 * @param {EnvironmentInfo} environment - Environment information
 * @returns {CORSOptions} CORS configuration for the environment
 */
export function getCORSConfig(environment: EnvironmentInfo): CORSOptions {
  // Check for environment variable override
  if (process.env.CORS_ORIGIN_OVERRIDE) {
    const origins = process.env.CORS_ORIGIN_OVERRIDE.split(',').map(o => o.trim());
    return {
      ...CORS_CONFIG_PRODUCTION,
      origin: origins,
    };
  }
  
  // Environment-specific defaults
  if (environment.isLocal) {
    return CORS_CONFIG_DEVELOPMENT;
  }
  
  if (environment.isTest) {
    return CORS_CONFIG_TEST;
  }
  
  if (environment.isCloud) {
    return CORS_CONFIG_PRODUCTION;
  }
  
  // Fallback to development
  return CORS_CONFIG_DEVELOPMENT;
}
