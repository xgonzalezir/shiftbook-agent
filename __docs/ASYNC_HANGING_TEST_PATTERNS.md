# Async Hanging Test Patterns & Solutions

This document records common patterns of async hanging issues in Jest tests and proven solutions.

## Overview

During the unit test fixing process, we encountered several patterns of tests that "hang" (don't exit properly), causing Jest to timeout or report open handles. This document provides a baseline for identifying and fixing these issues in future tests.

## Common Patterns of Async Hanging

### 1. Singleton Instances with Timers

**Pattern:** Module creates singleton instances that start timers automatically.

**Example:**
```typescript
// In module: auth-monitor.ts
export const authMonitor = new AuthMonitor(); // Starts timers automatically
```

**Problem:** When tests import the module, timers are created and never cleaned up.

**Detection:** Jest reports "2 open handles potentially keeping Jest from exiting" with timer references.

**Solution:**
```typescript
// In test file
import { AuthMonitor } from '../../../srv/lib/auth-monitor';
const authMonitorModule = require('../../../srv/lib/auth-monitor');

afterEach(() => {
  // Clean up the singleton instance
  if (authMonitorModule.authMonitor) {
    authMonitorModule.authMonitor.destroy();
  }
  jest.clearAllTimers();
});
```

### 2. Promise-Based Event Handlers with Infinite Waits

**Pattern:** Tests using `done()` callbacks with Promise patterns that never resolve.

**Example:**
```typescript
// PROBLEMATIC
it('should trigger alert', (done) => {
  monitor.on('alert', (alert) => {
    // Test logic
    done();
  });
  // If alert never triggers, test hangs forever
});
```

**Problem:** If the event doesn't fire, the test hangs indefinitely.

**Solution:**
```typescript
// FIXED
it('should trigger alert', (done) => {
  const timeout = setTimeout(() => {
    done(new Error('Alert was not triggered within timeout'));
  }, 2000);

  monitor.on('alert', (alert) => {
    clearTimeout(timeout);
    // Test logic
    done();
  });
});
```

### 3. Timer Management in Tests

**Pattern:** Tests using fake timers but not properly cleaning up.

**Example:**
```typescript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  // Missing proper cleanup
  jest.useRealTimers();
});
```

**Problem:** Timers not properly cleared between tests.

**Solution:**
```typescript
beforeEach(() => {
  jest.clearAllTimers();
  jest.useFakeTimers();
});

afterEach(() => {
  // Clean up all timers before switching back
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
```

### 4. EventEmitter Memory Leaks

**Pattern:** Tests creating EventEmitter instances without proper cleanup.

**Solution:**
```typescript
afterEach(() => {
  if (emitterInstance) {
    emitterInstance.removeAllListeners();
    emitterInstance.destroy(); // If available
  }
});
```

## Testing Strategies

### 1. Open Handle Detection

Always run tests with open handle detection during development:

```bash
npm test -- --detectOpenHandles --forceExit
```

### 2. Timeout Configuration

Set reasonable timeouts for async operations:

```bash
npm test -- --testTimeout=10000  # 10 seconds
```

### 3. Test Isolation

Ensure each test is properly isolated:

```typescript
describe('TestSuite', () => {
  let instance: MyClass;

  beforeEach(() => {
    instance = new MyClass({ enabled: false }); // Start disabled
  });

  afterEach(() => {
    if (instance) {
      instance.destroy();
    }
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });
});
```

## Implementation Patterns That Cause Issues

### 1. Auto-Starting Services

```typescript
// PROBLEMATIC
constructor(config?: Config) {
  this.config = { enabled: true, ...config };
  
  if (this.config.enabled) {
    this.start(); // Automatically starts timers
  }
}
```

**Test-Friendly Alternative:**
```typescript
// BETTER
constructor(config?: Config) {
  this.config = { enabled: true, ...config };
  // Don't auto-start in constructor
}

// Explicit start method
start() {
  if (this.config.enabled) {
    // Start timers here
  }
}
```

### 2. Missing Destroy Methods

Always implement proper cleanup:

```typescript
destroy() {
  if (this.intervals) {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
  }
  
  if (this.timeouts) {
    this.timeouts.forEach(clearTimeout);
    this.timeouts = [];
  }
  
  this.removeAllListeners();
}
```

## Test File Template

Here's a template for avoiding async hanging issues:

```typescript
import { MyService } from '../../../srv/lib/my-service';

// Mock external dependencies
jest.mock('../../../srv/lib/external-dep', () => ({
  // Mock implementation
}));

describe('MyService', () => {
  let service: MyService;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Start with disabled services to prevent auto-starting
    service = new MyService({ enabled: false });
    
    // Mock console to avoid noise
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Clear timers
    jest.clearAllTimers();
  });

  afterEach(() => {
    // Clean up service instance
    if (service) {
      service.destroy();
    }
    
    // Clean up mocks and timers
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  describe('Async Operations', () => {
    it('should handle events with timeout', (done) => {
      const timeout = setTimeout(() => {
        done(new Error('Event not triggered within timeout'));
      }, 2000);

      service.on('event', () => {
        clearTimeout(timeout);
        done();
      });

      service.triggerEvent();
    });
  });
});
```

## Diagnostic Commands

When investigating hanging tests:

```bash
# Run with open handle detection
npm test -- --detectOpenHandles

# Run with verbose output
npm test -- --verbose

# Run single test file with debugging
npm test -- path/to/test.ts --detectOpenHandles --forceExit --testTimeout=5000
```

## Common Fixes Applied

1. **auth-monitor.test.ts**: Fixed singleton cleanup and Promise timeout patterns
2. **circuit-breaker.test.ts**: Fixed timer management and event structure expectations
3. **business-validator.test.ts**: Fixed import mocking and validation data patterns

## Prevention Checklist

- [ ] Always implement `destroy()` methods in services
- [ ] Clean up timers and intervals in `afterEach()`
- [ ] Use timeout patterns for async event tests
- [ ] Start services disabled in tests, enable manually
- [ ] Mock external dependencies properly
- [ ] Use `--detectOpenHandles` during development
- [ ] Set reasonable test timeouts
- [ ] Clear all mocks and timers between tests

This baseline should help identify and fix similar issues in future test development.