/**
 * Authentication Module Exports
 * 
 * Central export point for all authentication components
 */

// Core manager
export * from './authentication-manager';

// Strategies (including types)
export * from './strategies';
export * from './strategies/xsuaa-strategy';
export * from './strategies/mock-strategy';

// Mock users (production only - test utilities not exported)
export * from './mock-users';

// Middleware
export * from './middleware';
