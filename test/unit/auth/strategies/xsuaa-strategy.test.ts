import { XsuaaAuthStrategy } from '../../../../srv/auth';
import { EnvironmentInfo } from '../../../../srv/config';

describe('XSUAA Authentication Strategy', () => {
  const hybridEnv: EnvironmentInfo = {
    env: 'hybrid',
    isLocal: false,
    isTest: false,
    isProduction: false,
    isHybrid: true,
    isCloud: true,
  };

  let strategy: XsuaaAuthStrategy;

  beforeEach(() => {
    strategy = new XsuaaAuthStrategy(hybridEnv);
  });

  describe('constructor', () => {
    it('should create strategy with environment', () => {
      expect(strategy).toBeDefined();
    });
  });

  describe('configure()', () => {
    it('should configure XSUAA auth', () => {
      const mockApp: any = {
        use: jest.fn(),
      };

      strategy.configure(mockApp);

      expect(mockApp.use).toHaveBeenCalled();
      expect(mockApp.use.mock.calls.length).toBeGreaterThan(0);
    });
  });
});
