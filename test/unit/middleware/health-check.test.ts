import express, { Express } from 'express';
import request from 'supertest';
import { HealthCheckHandler, registerHealthCheckEndpoints } from '../../../srv/middleware';
import { EnvironmentInfo } from '../../../srv/config';

describe('HealthCheckHandler - 3.3 Health Check Endpoints', () => {
  let app: Express;
  let mockEnvironment: EnvironmentInfo;
  let handler: HealthCheckHandler;

  beforeEach(() => {
    app = express();
    mockEnvironment = {
      env: 'development',
      isLocal: true,
      isTest: false,
      isProduction: false,
      isHybrid: false,
      isCloud: false,
    };
    handler = new HealthCheckHandler(app, mockEnvironment);
  });

  describe('3.3.1 Initialization', () => {
    it('should create HealthCheckHandler instance', () => {
      expect(handler).toBeInstanceOf(HealthCheckHandler);
    });

    it('should initialize with Express app and environment', () => {
      expect(handler).toBeDefined();
    });

    it('should register endpoints without errors', () => {
      expect(() => {
        handler.registerEndpoints();
      }).not.toThrow();
    });
  });

  describe('3.3.2 Liveness Probe - /health', () => {
    beforeEach(() => {
      handler.registerEndpoints();
    });

    it('should provide /health endpoint', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should return UP status', async () => {
      const response = await request(app).get('/health');

      expect(response.body.status).toBe('UP');
    });

    it('should return LIVENESS type', async () => {
      const response = await request(app).get('/health');

      expect(response.body.type).toBe('LIVENESS');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/health');

      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
    });

    it('should include environment', async () => {
      const response = await request(app).get('/health');

      expect(response.body.environment).toBe('development');
    });

    it('should include uptime', async () => {
      const response = await request(app).get('/health');

      expect(response.body.uptime).toBeDefined();
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('3.3.3 Liveness Probe - /health/live', () => {
    beforeEach(() => {
      handler.registerEndpoints();
    });

    it('should provide /health/live alternative endpoint', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
    });

    it('should return UP status on /health/live', async () => {
      const response = await request(app).get('/health/live');

      expect(response.body.status).toBe('UP');
    });

    it('should have same behavior as /health', async () => {
      const response1 = await request(app).get('/health');
      const response2 = await request(app).get('/health/live');

      expect(response1.body.status).toBe(response2.body.status);
      expect(response1.body.type).toBe(response2.body.type);
    });
  });

  describe('3.3.4 Readiness Probe - /ready', () => {
    beforeEach(() => {
      handler.registerEndpoints();
    });

    it('should provide /ready endpoint', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('should return READY status', async () => {
      const response = await request(app).get('/ready');

      expect(response.body.status).toBe('READY');
    });

    it('should return READINESS type', async () => {
      const response = await request(app).get('/ready');

      expect(response.body.type).toBe('READINESS');
    });

    it('should include timestamp', async () => {
      const response = await request(app).get('/ready');

      expect(response.body.timestamp).toBeDefined();
    });

    it('should include environment', async () => {
      const response = await request(app).get('/ready');

      expect(response.body.environment).toBe('development');
    });

    it('should include memory usage', async () => {
      const response = await request(app).get('/ready');

      expect(response.body.memoryUsage).toBeDefined();
    });

    it('should include version', async () => {
      const response = await request(app).get('/ready');

      expect(response.body.version).toBeDefined();
      expect(typeof response.body.version).toBe('string');
    });
  });

  describe('3.3.5 Readiness Probe - /health/ready', () => {
    beforeEach(() => {
      handler.registerEndpoints();
    });

    it('should provide /health/ready alternative endpoint', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
    });

    it('should return READY status on /health/ready', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.body.status).toBe('READY');
    });

    it('should have same behavior as /ready', async () => {
      const response1 = await request(app).get('/ready');
      const response2 = await request(app).get('/health/ready');

      expect(response1.body.status).toBe(response2.body.status);
      expect(response1.body.type).toBe(response2.body.type);
    });
  });

  describe('3.3.6 Cloud Foundry Compatibility', () => {
    beforeEach(() => {
      handler.registerEndpoints();
    });

    it('should provide /health/cf endpoint', async () => {
      const response = await request(app).get('/health/cf');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('UP');
    });

    it('should include timestamp on /health/cf', async () => {
      const response = await request(app).get('/health/cf');

      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('3.3.7 No Authentication Required', () => {
    beforeEach(() => {
      handler.registerEndpoints();
    });

    it('should allow /health without authentication', async () => {
      const response = await request(app)
        .get('/health')
        .set('Authorization', '');

      expect(response.status).toBe(200);
    });

    it('should allow /ready without authentication', async () => {
      const response = await request(app)
        .get('/ready')
        .set('Authorization', '');

      expect(response.status).toBe(200);
    });

    it('should allow /health/cf without authentication', async () => {
      const response = await request(app)
        .get('/health/cf')
        .set('Authorization', '');

      expect(response.status).toBe(200);
    });
  });

  describe('3.3.8 Environment-Specific Behavior', () => {
    it('should handle different environments', () => {
      const environments: EnvironmentInfo[] = [
        {
          env: 'development',
          isLocal: true,
          isTest: false,
          isProduction: false,
          isHybrid: false,
          isCloud: false,
        },
        {
          env: 'test',
          isLocal: false,
          isTest: true,
          isProduction: false,
          isHybrid: false,
          isCloud: false,
        },
        {
          env: 'production',
          isLocal: false,
          isTest: false,
          isProduction: true,
          isHybrid: false,
          isCloud: true,
        },
      ];

      for (const env of environments) {
        const envApp = express();
        const envHandler = new HealthCheckHandler(envApp, env);

        expect(() => {
          envHandler.registerEndpoints();
        }).not.toThrow();
      }
    });

    it('should return correct environment in response', async () => {
      const testEnv: EnvironmentInfo = {
        env: 'test',
        isLocal: false,
        isTest: true,
        isProduction: false,
        isHybrid: false,
        isCloud: false,
      };

      const testApp = express();
      const testHandler = new HealthCheckHandler(testApp, testEnv);
      testHandler.registerEndpoints();

      const response = await request(testApp).get('/health');

      expect(response.body.environment).toBe('test');
    });
  });

  describe('3.3.9 Status Getters', () => {
    it('should provide health status', () => {
      const status = handler.getHealthStatus();

      expect(status.status).toBe('UP');
      expect(status.environment).toBe('development');
      expect(status.timestamp).toBeDefined();
      expect(status.uptime).toBeDefined();
      expect(status.memory).toBeDefined();
      expect(status.platform).toBeDefined();
      expect(status.nodeVersion).toBeDefined();
    });

    it('should provide readiness status', () => {
      const status = handler.getReadinessStatus();

      expect(status.status).toBe('READY');
      expect(status.environment).toBe('development');
      expect(status.timestamp).toBeDefined();
      expect(status.uptime).toBeDefined();
      expect(status.ready).toBe(true);
    });

    it('should include current memory usage', () => {
      const status = handler.getHealthStatus();

      expect(status.memory.rss).toBeDefined();
      expect(status.memory.heapTotal).toBeDefined();
      expect(status.memory.heapUsed).toBeDefined();
    });
  });

  describe('3.3.10 Factory Function', () => {
    it('should create handler via factory function', () => {
      const factoryHandler = registerHealthCheckEndpoints(app, mockEnvironment);

      expect(factoryHandler).toBeInstanceOf(HealthCheckHandler);
    });

    it('should register endpoints when using factory', async () => {
      registerHealthCheckEndpoints(app, mockEnvironment);

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('UP');
    });

    it('should return handler instance from factory', () => {
      const factoryHandler = registerHealthCheckEndpoints(app, mockEnvironment);

      expect(typeof factoryHandler.getHealthStatus).toBe('function');
      expect(typeof factoryHandler.getReadinessStatus).toBe('function');
    });
  });

  describe('3.3.11 Multiple Endpoints', () => {
    beforeEach(() => {
      handler.registerEndpoints();
    });

    it('should handle multiple concurrent health checks', async () => {
      const responses = await Promise.all([
        request(app).get('/health'),
        request(app).get('/ready'),
        request(app).get('/health/cf'),
        request(app).get('/health/live'),
        request(app).get('/health/ready'),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(200);
      }
    });

    it('should return consistent environment across endpoints', async () => {
      const healthRes = await request(app).get('/health');
      const readyRes = await request(app).get('/ready');

      expect(healthRes.body.environment).toBe(readyRes.body.environment);
    });
  });

  describe('3.3.12 Response Format', () => {
    beforeEach(() => {
      handler.registerEndpoints();
    });

    it('should return valid JSON', async () => {
      const response = await request(app).get('/health');

      expect(response.type).toContain('json');
      expect(typeof response.body).toBe('object');
    });

    it('should include ISO timestamp format', async () => {
      const response = await request(app).get('/health');

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });

    it('should not expose sensitive information', async () => {
      const response = await request(app).get('/health');

      // Should not include database passwords, API keys, etc.
      const bodyStr = JSON.stringify(response.body);
      expect(bodyStr).not.toContain('password');
      expect(bodyStr).not.toContain('secret');
      expect(bodyStr).not.toContain('token');
    });
  });

  describe('3.3.13 HTTP Methods', () => {
    beforeEach(() => {
      handler.registerEndpoints();
    });

    it('should only accept GET requests for /health', async () => {
      const postResponse = await request(app).post('/health');
      const putResponse = await request(app).put('/health');
      const deleteResponse = await request(app).delete('/health');

      expect(postResponse.status).toBe(404);
      expect(putResponse.status).toBe(404);
      expect(deleteResponse.status).toBe(404);
    });

    it('should only accept GET requests for /ready', async () => {
      const postResponse = await request(app).post('/ready');
      const putResponse = await request(app).put('/ready');

      expect(postResponse.status).toBe(404);
      expect(putResponse.status).toBe(404);
    });
  });

  describe('3.3.14 Performance', () => {
    beforeEach(() => {
      handler.registerEndpoints();
    });

    it('should respond quickly to health checks', async () => {
      const startTime = Date.now();
      await request(app).get('/health');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should handle high frequency health checks', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 20; i++) {
        await request(app).get('/health');
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });
  });
});
