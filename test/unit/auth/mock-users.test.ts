import {
  getMockUsersForEnvironment,
  getMockUser,
  getAvailableMockUserIds,
  MOCK_USERS_DEVELOPMENT,
  MOCK_USERS_TEST,
} from '../../../srv/auth';

describe('Mock Users Management', () => {
  describe('getMockUsersForEnvironment()', () => {
    it('should return development users for development environment', () => {
      const users = getMockUsersForEnvironment(true);
      expect(users).toEqual(MOCK_USERS_DEVELOPMENT);
      expect(Object.keys(users).length).toBe(5);
    });

    it('should return test users for test environment', () => {
      const users = getMockUsersForEnvironment(false);
      expect(users).toEqual(MOCK_USERS_TEST);
      expect(Object.keys(users).length).toBe(6);
    });
  });

  describe('getMockUser()', () => {
    it('should return development user by ID', () => {
      const user = getMockUser('alice', true);
      expect(user).toBeDefined();
      expect(user?.ID).toBe('alice');
      expect(user?.roles).toContain('admin');
    });

    it('should return test user by ID', () => {
      const user = getMockUser('test-admin', false);
      expect(user).toBeDefined();
      expect(user?.ID).toBe('test-admin');
      expect(user?.roles).toContain('admin');
    });

    it('should return undefined for non-existent user', () => {
      const user = getMockUser('nonexistent', true);
      expect(user).toBeUndefined();
    });
  });

  describe('getAvailableMockUserIds()', () => {
    it('should return all development user IDs', () => {
      const ids = getAvailableMockUserIds(true);
      expect(ids).toContain('alice');
      expect(ids).toContain('bob');
      expect(ids).toContain('admin');
      expect(ids.length).toBe(5);
    });

    it('should return all test user IDs', () => {
      const ids = getAvailableMockUserIds(false);
      expect(ids).toContain('test-admin');
      expect(ids).toContain('test-user');
      expect(ids.length).toBe(6);
    });
  });

  // NOTE: Tests for utility functions removed
  // The following functions were moved to mock-users-utils.ts (test utilities only):
  // - validateMockUser()
  // - createMockUser()
  //
  // These are simple utility functions primarily used for test setup.

  describe('MOCK_USERS_DEVELOPMENT', () => {
    it('should have required user properties', () => {
      Object.values(MOCK_USERS_DEVELOPMENT).forEach(user => {
        expect(user.ID).toBeDefined();
        expect(user.name).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.roles).toBeDefined();
        expect(user.scopes).toBeDefined();
      });
    });

    it('should have valid email format', () => {
      Object.values(MOCK_USERS_DEVELOPMENT).forEach(user => {
        expect(user.email).toMatch(/@/);
      });
    });
  });

  describe('MOCK_USERS_TEST', () => {
    it('should have required user properties', () => {
      Object.values(MOCK_USERS_TEST).forEach(user => {
        expect(user.ID).toBeDefined();
        expect(user.name).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.roles).toBeDefined();
        expect(user.scopes).toBeDefined();
      });
    });

    it('should have test-specific users', () => {
      expect(MOCK_USERS_TEST['test-admin']).toBeDefined();
      expect(MOCK_USERS_TEST['test-user']).toBeDefined();
    });
  });
});
