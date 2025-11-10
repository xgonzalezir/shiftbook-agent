/**
 * Authentication Manager
 * 
 * Manages authentication setup using strategy pattern
 * Selects appropriate authentication strategy based on environment
 */

import express from 'express';
import { EnvironmentInfo, getEnvironment } from '../config';
import { IAuthStrategy } from './strategies';
import { XsuaaAuthStrategy } from './strategies/xsuaa-strategy';
import { MockAuthStrategy } from './strategies/mock-strategy';
import { ensureUserMiddleware } from './middleware/ensure-user-middleware';

/**
 * Authentication Manager
 */
export class AuthenticationManager {
  private strategy: IAuthStrategy;
  private environment: EnvironmentInfo;

  /**
   * Constructor
   */
  constructor(environment?: EnvironmentInfo) {
    this.environment = environment || getEnvironment();
    this.strategy = this.selectStrategy();
  }

  /**
   * Setup authentication for Express application
   */
  public setupAuthentication(app: express.Application): void {
    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('🔐 AUTHENTICATION SETUP');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`Environment: ${this.environment.env}`);
    console.log(`Strategy: ${this.strategy.constructor.name}`);
    console.log('');

    // Configure the selected strategy
    this.strategy.configure(app);

    // Ensure all requests have a user object (safety fallback)
    app.use(ensureUserMiddleware());

    console.log('');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ Authentication initialized successfully');
    console.log('════════════════════════════════════════════════════════════════');
    console.log('');
  }

  /**
   * Select appropriate authentication strategy based on environment
   */
  private selectStrategy(): IAuthStrategy {
    if (this.environment.isCloud) {
      // Use XSUAA for production and hybrid environments
      return new XsuaaAuthStrategy(this.environment);
    } else {
      // Use Mock for development and test environments
      return new MockAuthStrategy(this.environment);
    }
  }

  /**
   * Get current strategy
   */
  public getStrategy(): IAuthStrategy {
    return this.strategy;
  }

  /**
   * Get environment info
   */
  public getEnvironment(): EnvironmentInfo {
    return this.environment;
  }
}

/**
 * Factory function to create and setup authentication
 */
export function setupAuthentication(app: express.Application, environment?: EnvironmentInfo): void {
  const manager = new AuthenticationManager(environment);
  manager.setupAuthentication(app);
}
