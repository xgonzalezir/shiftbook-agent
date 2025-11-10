// Test to demonstrate WHY coverage is 0%

console.log('=== BEFORE MOCK ===');

// Let's first import WITHOUT mocking to see what happens
import RateLimiter from '../../../srv/lib/rate-limiter';

console.log('=== AFTER IMPORT (NO MOCK) ===');

describe('Coverage Debug - No Mock', () => {
  it('should show what happens without mocking', () => {
    console.log('Creating RateLimiter instance...');
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 5 });
    
    console.log('Calling checkLimit...');
    const result = limiter.checkLimit('test-user');
    
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    
    limiter.dispose();
  });
});