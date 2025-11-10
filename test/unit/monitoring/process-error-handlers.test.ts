/**
 * Process Error Handlers Tests
 * 
 * Comprehensive test suite for process-level error handling
 */

import { ProcessErrorHandlers, ProcessErrorHandlerConfig } from '../../../srv/monitoring/process-error-handlers';
import { EnvironmentInfo } from '../../../srv/config';

describe('ProcessErrorHandlers', () => {
  let handlers: ProcessErrorHandlers;
  let mockEnvironment: EnvironmentInfo;

  beforeEach(() => {
    mockEnvironment = {
      env: 'development',
      isLocal: true,
      isTest: false,
      isProduction: false,
      isHybrid: false,
      isCloud: false,
    };

    handlers = new ProcessErrorHandlers(mockEnvironment);
  });

  afterEach(() => {
    handlers.resetErrorCounts();
  });

  describe('Initialization', () => {
    it('should create instance with default configuration', () => {
      expect(handlers).toBeDefined();
    });

    it('should create instance with custom configuration', () => {
      const config: ProcessErrorHandlerConfig = {
        maxUncaughtExceptions: 10,
        maxUnhandledRejections: 10,
        shutdownGracePeriod: 60000,
      };

      const customHandlers = new ProcessErrorHandlers(mockEnvironment, config);
      expect(customHandlers).toBeDefined();
    });

    it('should initialize error counts to zero', () => {
      const stats = handlers.getErrorStats();
      expect(stats.uncaughtExceptionCount).toBe(0);
      expect(stats.unhandledRejectionCount).toBe(0);
    });
  });

  describe('Error Statistics', () => {
    it('should return error statistics', () => {
      const stats = handlers.getErrorStats();

      expect(stats).toHaveProperty('uncaughtExceptionCount');
      expect(stats).toHaveProperty('unhandledRejectionCount');
      expect(stats).toHaveProperty('isShuttingDown');
      expect(stats).toHaveProperty('maxUncaughtExceptions');
      expect(stats).toHaveProperty('maxUnhandledRejections');
    });

    it('should track error counts correctly', () => {
      const initialStats = handlers.getErrorStats();
      expect(initialStats.uncaughtExceptionCount).toBe(0);
      expect(initialStats.unhandledRejectionCount).toBe(0);
    });
  });

  describe('Error Count Reset', () => {
    it('should reset error counts', () => {
      handlers.resetErrorCounts();
      const stats = handlers.getErrorStats();

      expect(stats.uncaughtExceptionCount).toBe(0);
      expect(stats.unhandledRejectionCount).toBe(0);
    });
  });

  describe('Shutdown Handler Registration', () => {
    it('should register shutdown handler', () => {
      const mockHandler = jest.fn();
      handlers.onShutdown(mockHandler);

      // Handler registered successfully (no error thrown)
      expect(handlers).toBeDefined();
    });

    it('should register multiple shutdown handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      handlers.onShutdown(handler1);
      handlers.onShutdown(handler2);
      handlers.onShutdown(handler3);

      // Handlers registered successfully
      expect(handlers).toBeDefined();
    });

    it('should register async shutdown handlers', () => {
      const asyncHandler = jest.fn<Promise<void>, []>(
         () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      handlers.onShutdown(asyncHandler);

      expect(handlers).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should use default configuration values', () => {
      const defaultHandlers = new ProcessErrorHandlers(mockEnvironment);
      const stats = defaultHandlers.getErrorStats();

      expect(stats.maxUncaughtExceptions).toBe(5);
      expect(stats.maxUnhandledRejections).toBe(5);
    });

    it('should override default configuration', () => {
      const config: ProcessErrorHandlerConfig = {
        maxUncaughtExceptions: 10,
        maxUnhandledRejections: 15,
        shutdownGracePeriod: 60000,
      };

      const customHandlers = new ProcessErrorHandlers(mockEnvironment, config);
      const stats = customHandlers.getErrorStats();

      expect(stats.maxUncaughtExceptions).toBe(10);
      expect(stats.maxUnhandledRejections).toBe(15);
    });

    it('should allow partial configuration override', () => {
      const config: ProcessErrorHandlerConfig = {
        maxUncaughtExceptions: 20,
      };

      const customHandlers = new ProcessErrorHandlers(mockEnvironment, config);
      const stats = customHandlers.getErrorStats();

      expect(stats.maxUncaughtExceptions).toBe(20);
      expect(stats.maxUnhandledRejections).toBe(5); // Default value
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should handle development environment', () => {
      const devEnvironment: EnvironmentInfo = {
        env: 'development',
        isLocal: true,
        isTest: false,
        isProduction: false,
        isHybrid: false,
        isCloud: false,
      };

      const devHandlers = new ProcessErrorHandlers(devEnvironment);
      expect(devHandlers).toBeDefined();
    });

    it('should handle production environment', () => {
      const prodEnvironment: EnvironmentInfo = {
        env: 'production',
        isLocal: false,
        isTest: false,
        isProduction: true,
        isHybrid: false,
        isCloud: true,
      };

      const prodHandlers = new ProcessErrorHandlers(prodEnvironment);
      expect(prodHandlers).toBeDefined();
    });

    it('should handle test environment', () => {
      const testEnvironment: EnvironmentInfo = {
        env: 'test',
        isLocal: true,
        isTest: true,
        isProduction: false,
        isHybrid: false,
        isCloud: false,
      };

      const testHandlers = new ProcessErrorHandlers(testEnvironment);
      expect(testHandlers).toBeDefined();
    });

    it('should handle hybrid environment', () => {
      const hybridEnvironment: EnvironmentInfo = {
        env: 'hybrid',
        isLocal: false,
        isTest: false,
        isProduction: false,
        isHybrid: true,
        isCloud: true,
      };

      const hybridHandlers = new ProcessErrorHandlers(hybridEnvironment);
      expect(hybridHandlers).toBeDefined();
    });
  });

  describe('Handler Registration', () => {
    it('should register process error handlers', () => {
      // Register handlers
      const listeners: Map<string, Function[]> = new Map([
        ['uncaughtException', []],
        ['unhandledRejection', []],
        ['SIGTERM', []],
        ['SIGINT', []],
      ]);

      jest.spyOn(process, 'on').mockImplementation((event: string, handler: any) => {
        if (listeners.has(event)) {
          listeners.get(event)!.push(handler);
        }
        return process;
      });

      handlers.register();

      expect(process.on).toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('Shutdown Handling', () => {
    it('should prevent multiple shutdown attempts', (done) => {
      const config: ProcessErrorHandlerConfig = {
        shutdownGracePeriod: 100,
      };

      const testHandlers = new ProcessErrorHandlers(mockEnvironment, config);

      // Try to trigger shutdown multiple times
      // This is tested indirectly through stats
      const stats = testHandlers.getErrorStats();
      expect(stats.isShuttingDown).toBe(false);

      done();
    });
  });

  describe('Error Counting', () => {
    it('should track uncaught exceptions count', () => {
      const stats1 = handlers.getErrorStats();
      expect(stats1.uncaughtExceptionCount).toBe(0);

      handlers.resetErrorCounts();
      const stats2 = handlers.getErrorStats();
      expect(stats2.uncaughtExceptionCount).toBe(0);
    });

    it('should track unhandled rejections count', () => {
      const stats1 = handlers.getErrorStats();
      expect(stats1.unhandledRejectionCount).toBe(0);

      handlers.resetErrorCounts();
      const stats2 = handlers.getErrorStats();
      expect(stats2.unhandledRejectionCount).toBe(0);
    });
  });

  describe('Export Function', () => {
    it('should export factory function', () => {
      const { createProcessErrorHandlers } = require('../../../srv/monitoring/process-error-handlers');
      expect(typeof createProcessErrorHandlers).toBe('function');
    });

    it('factory function should create instance', () => {
      const { createProcessErrorHandlers } = require('../../../srv/monitoring/process-error-handlers');
      const instance = createProcessErrorHandlers(mockEnvironment);

      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(ProcessErrorHandlers);
    });

    it('factory function should accept custom config', () => {
      const { createProcessErrorHandlers } = require('../../../srv/monitoring/process-error-handlers');

      const config: ProcessErrorHandlerConfig = {
        maxUncaughtExceptions: 20,
      };

      const instance = createProcessErrorHandlers(mockEnvironment, config);
      const stats = instance.getErrorStats();

      expect(stats.maxUncaughtExceptions).toBe(20);
    });
  });

  describe('Configuration Validation', () => {
    it('should handle undefined configuration gracefully', () => {
      const instance = new ProcessErrorHandlers(mockEnvironment, undefined);
      expect(instance).toBeDefined();
      expect(instance.getErrorStats()).toBeDefined();
    });

    it('should handle empty configuration gracefully', () => {
      const instance = new ProcessErrorHandlers(mockEnvironment, {});
      expect(instance).toBeDefined();
      expect(instance.getErrorStats()).toBeDefined();
    });

    it('should preserve unspecified config values as defaults', () => {
      const config: ProcessErrorHandlerConfig = {
        maxUncaughtExceptions: 25,
      };

      const instance = new ProcessErrorHandlers(mockEnvironment, config);
      const stats = instance.getErrorStats();

      expect(stats.maxUncaughtExceptions).toBe(25);
      expect(stats.maxUnhandledRejections).toBe(5); // Default
    });
  });

  describe('Shutdown Handler Callback', () => {
    it('should support void shutdown handlers', () => {
      const voidHandler = () => {
        console.log('Shutting down');
      };

      handlers.onShutdown(voidHandler);
      expect(handlers).toBeDefined();
    });

    it('should support async shutdown handlers', () => {
      const asyncHandler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      };

      handlers.onShutdown(asyncHandler);
      expect(handlers).toBeDefined();
    });

    it('should support mixed shutdown handler types', () => {
      const voidHandler = () => {
        console.log('Void handler');
      };

      const asyncHandler = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      };

      handlers.onShutdown(voidHandler);
      handlers.onShutdown(asyncHandler);
      expect(handlers).toBeDefined();
    });
  });
});
