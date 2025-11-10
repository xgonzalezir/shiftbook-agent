/**
 * Mock Users Management Module
 * 
 * Defines mock users for development and testing environments.
 * Used by MockAuthStrategy for local development authentication.
 * 
 * Test utilities moved to mock-users-utils.ts.
 */

export interface MockUser {
  ID: string;
  name: string;
  email: string;
  roles: string[];
  scopes: string[];
  attributes?: Record<string, any>;
}

/**
 * Development mock users
 * Used for local development authentication
 */
export const MOCK_USERS_DEVELOPMENT: Record<string, MockUser> = {
  alice: {
    ID: 'alice',
    name: 'Alice Admin',
    email: 'alice@shiftbook.local',
    roles: ['admin', 'operator'],
    scopes: ['admin', 'operator'],
  },
  bob: {
    ID: 'bob',
    name: 'Bob Operator',
    email: 'bob@shiftbook.local',
    roles: ['operator'],
    scopes: ['operator'],
  },
  operator: {
    ID: 'operator',
    name: 'Default Operator',
    email: 'operator@shiftbook.local',
    roles: ['operator'],
    scopes: ['operator'],
  },
  manager: {
    ID: 'manager',
    name: 'Manager User',
    email: 'manager@shiftbook.local',
    roles: ['manager', 'operator'],
    scopes: ['operator'],
  },
  admin: {
    ID: 'admin',
    name: 'Administrator',
    email: 'admin@shiftbook.local',
    roles: ['admin'],
    scopes: ['admin', 'operator'],
  },
};

/**
 * Test mock users
 * Used for test environment authentication
 */
export const MOCK_USERS_TEST: Record<string, MockUser> = {
  'test-readonly': {
    ID: 'test-readonly',
    name: 'Test Read Only User',
    email: 'readonly@test.local',
    roles: ['readonly'],
    scopes: ['operator'],
  },
  'test-user': {
    ID: 'test-user',
    name: 'Test User',
    email: 'testuser@test.local',
    roles: ['operator'],
    scopes: ['operator'],
  },
  'test-admin': {
    ID: 'test-admin',
    name: 'Test Admin',
    email: 'admin@test.local',
    roles: ['admin', 'operator'],
    scopes: ['admin', 'operator'],
  },
  'test-operator': {
    ID: 'test-operator',
    name: 'Test Operator',
    email: 'operator@test.local',
    roles: ['operator'],
    scopes: ['operator'],
  },
  'test-manager': {
    ID: 'test-manager',
    name: 'Test Manager',
    email: 'manager@test.local',
    roles: ['manager'],
    scopes: ['operator'],
  },
  'test-guest': {
    ID: 'test-guest',
    name: 'Test Guest',
    email: 'guest@test.local',
    roles: ['guest'],
    scopes: [],
  },
};

/**
 * Gets mock users for specific environment
 * 
 * Used by MockAuthStrategy to select the appropriate user set.
 * 
 * @param {boolean} isDevelopment - True for development, false for test
 * @returns {Record<string, MockUser>} Mock users for the environment
 * 
 * @example
 * const users = getMockUsersForEnvironment(true); // Development users
 */
export function getMockUsersForEnvironment(isDevelopment: boolean): Record<string, MockUser> {
  return isDevelopment ? MOCK_USERS_DEVELOPMENT : MOCK_USERS_TEST;
}

/**
 * Retrieves a mock user by ID
 * 
 * Used by MockAuthStrategy to authenticate users with mock tokens.
 * 
 * @param {string} userId - User ID to retrieve
 * @param {boolean} isDevelopment - True for development, false for test
 * @returns {MockUser | undefined} Mock user or undefined if not found
 * 
 * @example
 * const user = getMockUser('alice', true);
 */
export function getMockUser(userId: string, isDevelopment: boolean): MockUser | undefined {
  const users = getMockUsersForEnvironment(isDevelopment);
  return users[userId];
}

/**
 * Gets list of available mock user IDs
 * 
 * Used by MockAuthStrategy to log available users when authentication fails.
 * 
 * @param {boolean} isDevelopment - True for development, false for test
 * @returns {string[]} Array of available user IDs
 * 
 * @example
 * const userIds = getAvailableMockUserIds(true);
 * console.log(`Available: ${userIds.join(', ')}`);
 */
export function getAvailableMockUserIds(isDevelopment: boolean): string[] {
  const users = getMockUsersForEnvironment(isDevelopment);
  return Object.keys(users);
}
