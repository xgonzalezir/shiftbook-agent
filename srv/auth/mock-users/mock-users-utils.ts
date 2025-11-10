/**
 * Mock Users Test Utilities
 * 
 * ⚠️ IMPORTANT: These utilities are ONLY used in tests.
 * They are not used in production code.
 * 
 * This module contains helper functions for testing with mock users.
 * These provide convenient ways to validate and create mock users
 * for test scenarios.
 * 
 * ## Why Separated from mock-users.ts
 * 
 * These functions were extracted because:
 * - They are only used in test files
 * - Production code (mock-strategy.ts) only needs getMockUser() and getAvailableMockUserIds()
 * - Keeping them separate makes the core module cleaner
 * 
 * ## Usage
 * 
 * Import in test files only:
 * ```typescript
 * import { validateMockUser, createMockUser } from '../../../srv/auth/mock-users-utils';
 * ```
 * 
 * @module auth/mock-users-utils
 * @deprecated Use only in tests - not for production code
 */

import { MockUser, getMockUser } from './mock-users';

/**
 * Validates mock user exists and has required roles
 * 
 * Helper function for tests to validate that a mock user
 * exists and optionally has specific required roles.
 * 
 * @param {string} userId - User ID to validate
 * @param {boolean} isDevelopment - Whether to check development users
 * @param {string[]} [requiredRoles] - Optional roles to verify
 * @returns {boolean} True if user exists and has required roles
 * 
 * @example
 * if (validateMockUser('alice', true, ['admin'])) {
 *   // Alice exists and has admin role
 * }
 */
export function validateMockUser(userId: string, isDevelopment: boolean, requiredRoles?: string[]): boolean {
  const user = getMockUser(userId, isDevelopment);
  if (!user) {
    return false;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    return requiredRoles.every(role => user.roles.includes(role));
  }

  return true;
}

/**
 * Creates a mock authenticated user with default values
 * 
 * Helper function for tests to create mock users with custom properties.
 * If userId exists in predefined users, starts with that user's data.
 * Otherwise creates a new user with default operator role.
 * 
 * @param {string} userId - User ID
 * @param {Partial<MockUser>} [overrides] - Properties to override
 * @returns {MockUser} Mock user object
 * 
 * @example
 * const customUser = createMockUser('alice', { email: 'custom@test.com' });
 * const newUser = createMockUser('custom-user', { roles: ['admin'] });
 */
export function createMockUser(userId: string, overrides?: Partial<MockUser>): MockUser {
  const user = getMockUser(userId, true) || {
    ID: userId,
    name: userId,
    email: `${userId}@shiftbook.local`,
    roles: ['operator'],
    scopes: ['operator'],
  };

  return { ...user, ...overrides };
}
