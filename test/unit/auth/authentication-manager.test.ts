import { AuthenticationManager, setupAuthentication } from '../../../srv/auth/authentication-manager';
import { EnvironmentInfo } from '../../../srv/config/environment-config';

describe('Authentication Manager', () => {
  const devEnv: EnvironmentInfo = {
    env: 'development',
    isLocal: true,
    isTest: false,
    isProduction: false,
    isHybrid: false,
    isCloud: false,
  };

  const hybridEnv: EnvironmentInfo = {
    env: 'hybrid',
    isLocal: false,
    isTest: false,
    isProduction: false,
    isHybrid: true,
    isCloud: true,
  };

  describe('constructor', () => {
    it('should create manager with provided environment', () => {
      const manager = new AuthenticationManager(devEnv);
      expect(manager).toBeDefined();
      expect(manager.getEnvironment()).toEqual(devEnv);
    });

    it('should select mock strategy for development', () => {
      const manager = new AuthenticationManager(devEnv);
      expect(manager.getStrategy().constructor.name).toBe('MockAuthStrategy');
    });

    it('should select XSUAA strategy for cloud', () => {
      const manager = new AuthenticationManager(hybridEnv);
      expect(manager.getStrategy().constructor.name).toBe('XsuaaAuthStrategy');
    });
  });

  describe('setupAuthentication()', () => {
    it('should configure authentication on app', () => {
      const manager = new AuthenticationManager(devEnv);
      const mockApp: any = {
        use: jest.fn(),
      };

      manager.setupAuthentication(mockApp);

      expect(mockApp.use).toHaveBeenCalled();
    });

    it('should setup auth for both local and cloud environments', () => {
      const mockApp: any = { use: jest.fn() };

      const devManager = new AuthenticationManager(devEnv);
      devManager.setupAuthentication(mockApp);
      const devCalls = mockApp.use.mock.calls.length;

      mockApp.use.mockClear();

      const cloudManager = new AuthenticationManager(hybridEnv);
      cloudManager.setupAuthentication(mockApp);
      const cloudCalls = mockApp.use.mock.calls.length;

      expect(devCalls).toBeGreaterThan(0);
      expect(cloudCalls).toBeGreaterThan(0);
    });
  });

  describe('getEnvironment()', () => {
    it('should return environment info', () => {
      const manager = new AuthenticationManager(devEnv);
      expect(manager.getEnvironment()).toEqual(devEnv);
    });
  });

  describe('setupAuthentication function', () => {
    it('should be a factory function', () => {
      const mockApp: any = { use: jest.fn() };

      expect(() => {
        setupAuthentication(mockApp, devEnv);
      }).not.toThrow();

      expect(mockApp.use).toHaveBeenCalled();
    });
  });
});
