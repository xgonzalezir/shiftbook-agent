/**
 * Authentication Configuration Test Utilities
 * 
 * ⚠️ IMPORTANT: These utilities are ONLY used in tests.
 * They are not used in production code.
 * 
 * This module contains ALL authentication configuration that was previously
 * in auth-config.ts. Analysis showed that NONE of these functions or constants
 * are used in production code - only in tests.
 * 
 * ## What's Here
 * 
 * - Mock user definitions (MOCK_USERS, TEST_USERS)
 * - Authentication configuration mapping (AUTH_CONFIG_MAP)
 * - Test helper functions for user validation and permissions
 * 
 * ## Why Everything Moved Here
 * 
 * After analyzing the codebase:
 * - getAuthConfig() - only used in tests
 * - MOCK_USERS / TEST_USERS - only used in tests and this file
 * - All helper functions - only used in tests
 * 
 * Production code uses:
 * - srv/auth/mock-users.ts for actual mock user management
 * - srv/auth/middleware/ for permission checking
 * - XSUAA/CAP built-in authentication
 * 
 * @module config/auth-config-utils
 * @deprecated Use only in tests - not for production code
 */

import { EnvironmentInfo } from './environment-config';

/**
 * Authentication configuration interface
 * Defines the structure of authentication configuration for an environment
 */
export interface AuthConfig {
  /** Authentication method identifier */
  kind: 'mocked' | 'dummy' | 'xsuaa';
  
  /** Human-readable description of the authentication method */
  description: string;
  
  /** List of enabled features for this authentication method */
  features: string[];
}

/**
 * Mock user interface
 * Defines the structure of a mock user for development and testing
 */
export interface MockUser {
  /** User identifier */
  ID: string;
  
  /** List of scopes/roles assigned to the user */
  scopes: string[];
  
  /** Optional tenant identifier */
  tenant?: string;
  
  /** Optional email address */
  email?: string;
  
  /** Optional display name */
  name?: string;
}

/**
 * Mock users for development environment
 * These users can be authenticated using simple string tokens
 */
export const MOCK_USERS: Record<string, MockUser> = {
  alice: {
    ID: 'alice',
    scopes: ['operator', 'admin'],
    email: 'alice@example.com',
    name: 'Alice Admin',
  },
  bob: {
    ID: 'bob',
    scopes: ['operator'],
    email: 'bob@example.com',
    name: 'Bob Operator',
  },
  operator: {
    ID: 'operator',
    scopes: ['operator'],
    email: 'operator@example.com',
    name: 'Standard Operator',
  },
  manager: {
    ID: 'manager',
    scopes: ['operator', 'admin'],
    email: 'manager@example.com',
    name: 'Manager',
  },
  admin: {
    ID: 'admin',
    scopes: ['operator', 'admin'],
    email: 'admin@example.com',
    name: 'System Administrator',
  },
};

/**
 * Test users for test environment
 * These users can be authenticated using simple string tokens in test mode
 */
export const TEST_USERS: Record<string, MockUser> = {
  'test-readonly': {
    ID: 'test-readonly',
    scopes: ['operator'],
    email: 'readonly@test.example.com',
    name: 'Test Read Only',
  },
  'test-user': {
    ID: 'test-user',
    scopes: ['operator'],
    email: 'user@test.example.com',
    name: 'Test User',
  },
  'test-admin': {
    ID: 'test-admin',
    scopes: ['operator', 'admin'],
    email: 'admin@test.example.com',
    name: 'Test Admin',
  },
  operator: {
    ID: 'operator',
    scopes: ['operator'],
    email: 'operator@test.example.com',
    name: 'Test Operator',
  },
  admin: {
    ID: 'admin',
    scopes: ['operator', 'admin'],
    email: 'admin@test.example.com',
    name: 'Test Admin User',
  },
  bob: {
    ID: 'bob',
    scopes: ['operator'],
    email: 'bob@test.example.com',
    name: 'Bob Test',
  },
};

/**
 * Required scopes for the application
 * These scopes must be present for users to access protected resources
 */
export const REQUIRED_SCOPES = {
  /** Operator scope: allows read and write access */
  OPERATOR: 'operator',
  
  /** Admin scope: allows administrative access */
  ADMIN: 'admin',
};

/**
 * Authentication configuration mapping by environment
 * Maps environment types to their corresponding authentication configuration
 */
const AUTH_CONFIG_MAP: Record<string, AuthConfig> = {
  development: {
    kind: 'mocked',
    description: 'Mock authentication for local development',
    features: ['mock-users', 'no-token-validation', 'development-logging'],
  },
  test: {
    kind: 'dummy',
    description: 'Dummy authentication with predefined test users',
    features: ['test-users', 'no-token-validation', 'test-logging'],
  },
  hybrid: {
    kind: 'xsuaa',
    description: 'XSUAA authentication for hybrid deployment',
    features: ['jwt-validation', 'xsuaa-integration', 'production-logging'],
  },
  production: {
    kind: 'xsuaa',
    description: 'XSUAA authentication for production deployment',
    features: [
      'jwt-validation',
      'xsuaa-integration',
      'production-logging',
      'error-handling',
    ],
  },
};

/**
 * Gets authentication configuration for the specified environment
 * 
 * @param {EnvironmentInfo} environment - Environment information object
 * @returns {AuthConfig} Authentication configuration for the environment
 */
export function getAuthConfig(environment: EnvironmentInfo): AuthConfig {
  return AUTH_CONFIG_MAP[environment.env] || AUTH_CONFIG_MAP.development;
}

/**
 * Gets the appropriate mock users collection for the environment
 * 
 * Used in tests to get the correct set of mock users based on environment.
 * 
 * @param {EnvironmentInfo} environment - Environment information
 * @returns {Record<string, MockUser>} Mock users collection
 * 
 * @example
 * const users = getMockUsersForEnvironment(testEnv);
 * expect(users['test-admin']).toBeDefined();
 */
export function getMockUsersForEnvironment(
  environment: EnvironmentInfo
): Record<string, MockUser> {
  if (environment.isTest) {
    return TEST_USERS;
  }
  if (environment.isLocal) {
    return MOCK_USERS;
  }
  // Cloud environments should not use mock users
  return {};
}

/**
 * Validates if a user ID exists in the mock users for the environment
 * 
 * Used in tests to verify that a mock user exists before attempting
 * to use it for authentication testing.
 * 
 * @param {EnvironmentInfo} environment - Environment information
 * @param {string} userId - User ID to validate
 * @returns {boolean} True if the user exists in the mock users
 * 
 * @example
 * const isValid = isMockUserValid(testEnv, 'test-admin');
 * expect(isValid).toBe(true);
 */
export function isMockUserValid(
  environment: EnvironmentInfo,
  userId: string
): boolean {
  const users = getMockUsersForEnvironment(environment);
  return !!users[userId];
}

/**
 * Gets the scopes/roles for a specific user
 * 
 * Helper function for tests to verify user permissions without
 * needing to access the user object directly.
 * 
 * @param {EnvironmentInfo} environment - Environment information
 * @param {string} userId - User ID
 * @returns {string[]} Array of scopes/roles for the user
 * 
 * @example
 * const scopes = getUserScopes(testEnv, 'test-admin');
 * expect(scopes).toContain('admin');
 */
export function getUserScopes(
  environment: EnvironmentInfo,
  userId: string
): string[] {
  const users = getMockUsersForEnvironment(environment);
  const user = users[userId];
  return user?.scopes || [];
}

/**
 * Gets secret for JWT token validation in development/test environments
 * 
 * ⚠️ FOR TESTING ONLY - DO NOT USE IN PRODUCTION
 * 
 * This secret is only suitable for local development and testing.
 * Production environments should use XSUAA with proper secrets
 * managed by SAP BTP.
 * 
 * @returns {string} JWT secret for mock authentication
 * 
 * @example
 * const secret = getMockJwtSecret();
 * const token = jwt.sign(payload, secret);
 */
export function getMockJwtSecret(): string {
  return 'mock-jwt-secret-for-local-development-only';
}

/**
 * Gets the minimum required scope level for a given action
 * 
 * Maps action names to required scopes. Used in tests to verify
 * that permission checking logic works correctly.
 * 
 * @param {string} action - Action name (e.g., 'read', 'write', 'admin')
 * @returns {string} Required scope for the action
 * 
 * @example
 * const scope = getRequiredScopeForAction('admin');
 * expect(scope).toBe('admin');
 */
export function getRequiredScopeForAction(action: string): string {
  switch (action) {
    case 'admin':
      return REQUIRED_SCOPES.ADMIN;
    case 'write':
    case 'delete':
      return REQUIRED_SCOPES.OPERATOR;
    case 'read':
    default:
      return REQUIRED_SCOPES.OPERATOR;
  }
}

/**
 * Checks if a user has required scope for an action
 * 
 * Convenience function for testing authorization logic.
 * Combines scope retrieval and comparison in one call.
 * 
 * @param {EnvironmentInfo} environment - Environment information
 * @param {string} userId - User ID
 * @param {string} action - Action to perform
 * @returns {boolean} True if the user has the required scope
 * 
 * @example
 * const canDelete = canUserPerformAction(testEnv, 'operator', 'delete');
 * expect(canDelete).toBe(true);
 */
export function canUserPerformAction(
  environment: EnvironmentInfo,
  userId: string,
  action: string
): boolean {
  const requiredScope = getRequiredScopeForAction(action);
  const userScopes = getUserScopes(environment, userId);
  return userScopes.includes(requiredScope);
}
