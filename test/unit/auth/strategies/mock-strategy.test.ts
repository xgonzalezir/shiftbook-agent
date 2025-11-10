import { MockAuthStrategy } from '../../../../srv/auth';
import { EnvironmentInfo } from '../../../../srv/config';

describe('Mock Authentication Strategy', () => {
  const devEnv: EnvironmentInfo = {
    env: 'development',
    isLocal: true,
    isTest: false,
    isProduction: false,
    isHybrid: false,
    isCloud: false,
  };

  const testEnv: EnvironmentInfo = {
    env: 'test',
    isLocal: false,
    isTest: true,
    isProduction: false,
    isHybrid: false,
    isCloud: false,
  };

  describe('Development Mode', () => {
    let strategy: MockAuthStrategy;

    beforeEach(() => {
      strategy = new MockAuthStrategy(devEnv);
    });

    it('should create strategy for development', () => {
      expect(strategy).toBeDefined();
    });

    it('should configure mock auth middleware', () => {
      const mockApp: any = {
        use: jest.fn(),
      };

      strategy.configure(mockApp);

      expect(mockApp.use).toHaveBeenCalled();
    });
  });

  describe('Test Mode', () => {
    let strategy: MockAuthStrategy;

    beforeEach(() => {
      strategy = new MockAuthStrategy(testEnv);
    });

    it('should create strategy for test', () => {
      expect(strategy).toBeDefined();
    });

    it('should configure dummy auth middleware', () => {
      const mockApp: any = {
        use: jest.fn(),
      };

      strategy.configure(mockApp);

      expect(mockApp.use).toHaveBeenCalled();
    });
  });
});
