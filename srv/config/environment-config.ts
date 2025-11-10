/**
 * Environment Configuration Module
 * 
 * Centralizes all environment detection and configuration logic
 * for SAP BTP CAP applications, supporting development, testing,
 * hybrid, and production environments.
 */

/**
 * Environment information interface
 * Provides a unified view of the current runtime environment
 */
export interface EnvironmentInfo {
  /** Raw environment name (development, test, hybrid, production) */
  env: string;

  isLocal: boolean;
  isTest: boolean;
  isProduction: boolean;

  /** True if running in hybrid mode */
  isHybrid: boolean;
  /** True if running in any cloud environment (production or hybrid) */
  isCloud: boolean;
}

/**
 * Detects the current runtime environment
 * 
 * Priority order:
 * 1. CDS_ENV (CAP-specific environment variable)
 * 2. NODE_ENV (standard Node.js environment variable)
 * 3. Default to 'development'
 * 
 * Production is detected either explicitly via CDS_ENV/NODE_ENV or
 * implicitly via presence of VCAP_APPLICATION (Cloud Foundry runtime)
 * 
 * @returns {EnvironmentInfo} Normalized environment information
 */
export function getEnvironment(): EnvironmentInfo {
  // Prioritize CDS_ENV over NODE_ENV for CAP applications
  const env = process.env.CDS_ENV || process.env.NODE_ENV || "development";
  
  const isLocal = env === "development";
  const isTest = env === "test";
  const isHybrid = env === "hybrid";
  
  // Only consider production if explicitly set to 'production' and not in test mode
  const isProduction =
    (env === "production" && !isTest) ||
    (isCloudFoundry() && !isTest);
  
  return {
    env,
    isLocal,
    isTest,
    isProduction,
    isHybrid,
    isCloud: isProduction || isHybrid,
  };
}

/**
 * Checks if the application is running on Cloud Foundry
 * 
 * Detection is based on presence of VCAP_APPLICATION environment variable,
 * which is only available in Cloud Foundry environments
 * 
 * @returns {boolean} True if running on Cloud Foundry
 */
export function isCloudFoundry(): boolean {
  return !!process.env.VCAP_APPLICATION;
}
