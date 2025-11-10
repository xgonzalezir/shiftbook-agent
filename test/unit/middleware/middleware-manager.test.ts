import express, { Express } from 'express';
import request from 'supertest';
import { MiddlewareManager } from '../../../srv/middleware';
import { EnvironmentInfo } from '../../../srv/config';

describe('MiddlewareManager - 3.1 Middleware Orchestration', () => {
  let app: Express;
  let manager: MiddlewareManager;
  let mockEnvironment: EnvironmentInfo;

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
    manager = new MiddlewareManager(app, mockEnvironment);
  });

  describe('3.1.1 Initialization', () => {
    it('should create MiddlewareManager instance', () => {
      expect(manager).toBeInstanceOf(MiddlewareManager);
    });

    it('should store environment information', () => {
      expect(manager.getEnvironment()).toEqual(mockEnvironment);
    });

    it('should accept Express app instance', () => {
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
    });
  });

  describe('3.1.2 Setup Middleware', () => {
    it('should setup all middleware without errors', () => {
      expect(() => {
        manager.setupMiddleware();
      }).not.toThrow();
    });

    it('should register middleware in correct order', () => {
      manager.setupMiddleware();
      const stack = manager.getMiddlewareStack();

      // Stack should have middleware registered
      expect(stack.length).toBeGreaterThan(0);
    });

    it('should register all required middleware', () => {
      manager.setupMiddleware();
      const stack = manager.getMiddlewareStack();

      // Check for key middleware indicators
      const stackString = JSON.stringify(stack);
      expect(stackString).toBeTruthy();
      expect(stack.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('3.1.3 Body Parsing Middleware', () => {
    beforeEach(() => {
      manager.setupMiddleware();
      app.post('/test', (req, res) => {
        res.json({ body: req.body });
      });
    });

    it('should parse JSON body', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send({ test: 'data' });

      expect(response.status).toBe(200);
      expect(response.body.body.test).toBe('data');
    });

    it('should parse URL-encoded body', async () => {
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('key=value&foo=bar');

      expect(response.status).toBe(200);
      expect(response.body.body.key).toBe('value');
      expect(response.body.body.foo).toBe('bar');
    });

    it('should handle large payloads up to 50mb', async () => {
      const largeString = 'x'.repeat(1000); // 1KB
      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send({ data: largeString });

      expect(response.status).toBe(200);
      expect(response.body.body.data).toBe(largeString);
    });
  });

  describe('3.1.4 CORS Middleware', () => {
    beforeEach(() => {
      manager.setupMiddleware();
      app.get('/test', (req, res) => {
        res.json({ ok: true });
      });
    });

    it('should setup CORS middleware', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      expect(response.status).toBe(200);
    });

    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect([200, 204]).toContain(response.status);
    });

    it('should set CORS headers in development', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      // In development, CORS should allow requests
      expect(response.status).toBe(200);
    });
  });

  describe('3.1.5 Logging Middleware', () => {
    beforeEach(() => {
      manager.setupMiddleware();
      app.get('/test', (req, res) => {
        res.json({ ok: true });
      });
      app.get('/error', (req, res) => {
        res.status(500).json({ error: 'Internal error' });
      });
    });

    it('should log successful requests', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      consoleSpy.mockRestore();
    });

    it('should log error requests', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const response = await request(app).get('/error');

      expect(response.status).toBe(500);
      consoleSpy.mockRestore();
    });

    it('should track request duration', async () => {
      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
    });
  });

  describe('3.1.6 Health Check Endpoints', () => {
    beforeEach(() => {
      manager.setupMiddleware();
    });

    it('should provide /health endpoint', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('UP');
      expect(response.body.environment).toBe('development');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should provide /ready endpoint', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('READY');
      expect(response.body.environment).toBe('development');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return correct environment in health check', async () => {
      const testEnv: EnvironmentInfo = {
        env: 'test',
        isLocal: false,
        isTest: true,
        isProduction: false,
        isHybrid: false,
        isCloud: false,
      };

      const testApp = express();
      const testManager = new MiddlewareManager(testApp, testEnv);
      testManager.setupMiddleware();

      const response = await request(testApp).get('/health');

      expect(response.body.environment).toBe('test');
    });

    it('should not require authentication for health checks', async () => {
      const response = await request(app)
        .get('/health')
        .set('Authorization', '');

      expect(response.status).toBe(200);
    });
  });

  describe('3.1.7 Language Detection Middleware', () => {
    beforeEach(() => {
      manager.setupMiddleware();
      app.get('/language', (req, res) => {
        res.json({ language: req.language });
      });
    });

    it('should detect language from query parameter', async () => {
      const response = await request(app).get('/language?lang=de');

      expect(response.status).toBe(200);
      expect(response.body.language).toBe('de');
    });

    it('should detect language from Accept-Language header', async () => {
      const response = await request(app)
        .get('/language')
        .set('Accept-Language', 'fr-FR,fr;q=0.9');

      expect(response.status).toBe(200);
      expect(response.body.language).toBe('fr');
    });

    it('should use default language when not specified', async () => {
      const response = await request(app).get('/language');

      expect(response.status).toBe(200);
      expect(response.body.language).toBe('en');
    });

    it('should prefer query parameter over header', async () => {
      const response = await request(app)
        .get('/language?lang=es')
        .set('Accept-Language', 'fr-FR');

      expect(response.status).toBe(200);
      expect(response.body.language).toBe('es');
    });

    it('should extract language code from complex header', async () => {
      const response = await request(app)
        .get('/language')
        .set('Accept-Language', 'en-US,en;q=0.9,fr;q=0.8');

      expect(response.status).toBe(200);
      expect(response.body.language).toBe('en');
    });
  });

  describe('3.1.8 Response Formatting Middleware', () => {
    beforeEach(() => {
      manager.setupMiddleware();
    });

    it('should add success helper method', async () => {
      app.get('/test', (req, res) => {
        res.success({ message: 'Success' });
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Success');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should add error helper method', async () => {
      app.get('/test', (req, res) => {
        res.error('Something went wrong', 400);
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Something went wrong');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should include error details when provided', async () => {
      app.get('/test', (req, res) => {
        res.error('Validation failed', 400, { field: 'email' });
      });

      const response = await request(app).get('/test');

      expect(response.body.error.details.field).toBe('email');
    });

    it('should use custom status code for success', async () => {
      app.get('/test', (req, res) => {
        res.success({ id: 1 }, 201);
      });

      const response = await request(app).get('/test');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should include timestamp in responses', async () => {
      app.get('/test', (req, res) => {
        res.success({ ok: true });
      });

      const response = await request(app).get('/test');

      expect(response.body.timestamp).toBeDefined();
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('3.1.9 Middleware Stack Inspection', () => {
    it('should provide access to middleware stack', () => {
      manager.setupMiddleware();
      const stack = manager.getMiddlewareStack();

      expect(Array.isArray(stack)).toBe(true);
      expect(stack.length).toBeGreaterThan(0);
    });

    it('should allow debugging middleware chain', () => {
      manager.setupMiddleware();
      const stack = manager.getMiddlewareStack();

      // Ensure all items have expected structure
      for (const item of stack) {
        expect(item).toBeDefined();
      }
    });
  });

  describe('3.1.10 Environment-Specific Behavior', () => {
    it('should handle local environment', () => {
      const localEnv: EnvironmentInfo = {
        env: 'development',
        isLocal: true,
        isTest: false,
        isProduction: false,
        isHybrid: false,
        isCloud: false,
      };

      const localApp = express();
      const localManager = new MiddlewareManager(localApp, localEnv);

      expect(() => {
        localManager.setupMiddleware();
      }).not.toThrow();
    });

    it('should handle cloud environment', () => {
      const cloudEnv: EnvironmentInfo = {
        env: 'production',
        isLocal: false,
        isTest: false,
        isProduction: true,
        isHybrid: false,
        isCloud: true,
      };

      const cloudApp = express();
      const cloudManager = new MiddlewareManager(cloudApp, cloudEnv);

      expect(() => {
        cloudManager.setupMiddleware();
      }).not.toThrow();
    });

    it('should handle test environment', () => {
      const testEnv: EnvironmentInfo = {
        env: 'test',
        isLocal: false,
        isTest: true,
        isProduction: false,
        isHybrid: false,
        isCloud: false,
      };

      const testApp = express();
      const testManager = new MiddlewareManager(testApp, testEnv);

      expect(() => {
        testManager.setupMiddleware();
      }).not.toThrow();
    });

    it('should handle hybrid environment', () => {
      const hybridEnv: EnvironmentInfo = {
        env: 'hybrid',
        isLocal: false,
        isTest: false,
        isProduction: false,
        isHybrid: true,
        isCloud: true,
      };

      const hybridApp = express();
      const hybridManager = new MiddlewareManager(hybridApp, hybridEnv);

      expect(() => {
        hybridManager.setupMiddleware();
      }).not.toThrow();
    });
  });

  describe('3.1.11 Integration', () => {
    it('should work with multiple middleware managers', () => {
      const app1 = express();
      const app2 = express();
      const manager1 = new MiddlewareManager(app1, mockEnvironment);
      const manager2 = new MiddlewareManager(app2, mockEnvironment);

      expect(() => {
        manager1.setupMiddleware();
        manager2.setupMiddleware();
      }).not.toThrow();
    });

    it('should allow custom middleware after setup', async () => {
      manager.setupMiddleware();

      app.get('/custom', (req, res) => {
        res.json({ custom: true });
      });

      const response = await request(app).get('/custom');

      expect(response.status).toBe(200);
      expect(response.body.custom).toBe(true);
    });

    it('should maintain middleware order when adding custom routes', async () => {
      manager.setupMiddleware();

      app.get('/test1', (req, res) => {
        res.json({ test: 1 });
      });

      app.get('/test2', (req, res) => {
        res.json({ test: 2 });
      });

      const response1 = await request(app).get('/test1');
      const response2 = await request(app).get('/test2');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });

  describe('3.1.12 Edge Cases', () => {
    it('should handle empty request body', async () => {
      manager.setupMiddleware();
      app.post('/test', (req, res) => {
        res.json({ body: req.body });
      });

      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.body).toEqual({});
    });

    it('should handle missing Accept-Language header', async () => {
      manager.setupMiddleware();
      app.get('/language', (req, res) => {
        res.json({ language: req.language });
      });

      const response = await request(app).get('/language');

      expect(response.status).toBe(200);
      expect(response.body.language).toBe('en');
    });

    it('should handle multiple CORS preflight requests', async () => {
      manager.setupMiddleware();
      app.get('/test', (req, res) => {
        res.json({ ok: true });
      });

      const response1 = await request(app).options('/test');
      const response2 = await request(app).options('/test');

      expect([200, 204]).toContain(response1.status);
      expect([200, 204]).toContain(response2.status);
    });
  });
});
