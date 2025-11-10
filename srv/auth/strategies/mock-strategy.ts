/**
 * Mock Authentication Strategy
 * 
 * Implements mock/fake authentication for development and testing
 */

import express from 'express';
import { IAuthStrategy, AuthenticatedRequest } from '.';
import { EnvironmentInfo } from '../../config';
import { getMockUser, getAvailableMockUserIds } from '../mock-users/mock-users';

/**
 * Mock Authentication Strategy
 */
export class MockAuthStrategy implements IAuthStrategy {
  constructor(private environment: EnvironmentInfo) {}

  /**
   * Configure mock authentication
   */
  public configure(app: express.Application): void {
    const strategyName = this.environment.isLocal ? '🔧 Mock' : '🧪 Fake';
    console.log(`${strategyName} authentication configured (${this.environment.env} environment)`);

    if (this.environment.isLocal) {
      this.setupMockAuthMiddleware(app);
    } else {
      this.setupFakeAuthMiddleware(app);
    }

    console.log('✅ Mock authentication configured');
  }

  /**
   * Setup mock authentication middleware (development - optional auth)
   */
  private setupMockAuthMiddleware(app: express.Application): void {
    console.log('🔧 Mock authentication: Requests without Bearer token will use default user');

    app.use((req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
      const authHeader = req.headers.authorization;

      // If no auth header, use default user in development
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = {
          id: 'dev-default-user',
          name: 'Development User',
          email: 'dev@localhost.local',
          roles: ['operator'],
          scopes: ['operator'],
        };
        console.log('🔧 Mock auth: Using default developer user (no Bearer token provided)');
        return next();
      }

      // Extract token and lookup mock user
      const token = authHeader.substring(7);
      const mockUser = getMockUser(token, true);

      if (mockUser) {
        req.user = {
          id: mockUser.ID,
          name: mockUser.name,
          email: mockUser.email,
          roles: mockUser.roles,
          scopes: mockUser.scopes,
          attributes: mockUser.attributes,
        };
        console.log(`🔧 Mock auth: User authenticated - ${mockUser.ID}`);
        next();
      } else {
        console.warn(`⚠️ Mock auth: Unknown user ID in Bearer token - ${token}`);
        console.log(`   Available mock users: ${getAvailableMockUserIds(true).join(', ')}`);
        // In mock mode, still allow the request but with unknown user
        req.user = {
          id: token,
          name: 'Unknown Mock User',
          email: 'unknown@localhost.local',
          roles: ['operator'],
          scopes: ['operator'],
        };
        next();
      }
    });
  }

  /**
   * Setup fake authentication middleware (test - required auth)
   */
  private setupFakeAuthMiddleware(app: express.Application): void {
    console.log('🧪 Fake authentication: Bearer token with valid user ID required');

    app.use((req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): void => {
      const authHeader = req.headers.authorization;

      // Auth header is required in test mode
      if (!authHeader) {
        res.status(401).json({
          error: {
            code: '401',
            message: 'Authentication required',
            details: 'Missing authorization header',
          },
        });
        return;
      }

      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: {
            code: '401',
            message: 'Invalid authorization format',
            details: 'Expected: Bearer <user-id>',
          },
        });
        return;
      }

      // Extract token and lookup mock user
      const token = authHeader.substring(7);
      const mockUser = getMockUser(token, false);

      if (!mockUser) {
        console.warn(`🧪 Fake auth: Invalid user ID - ${token}`);
        console.log(`   Available test users: ${getAvailableMockUserIds(false).join(', ')}`);
        res.status(401).json({
          error: {
            code: '401',
            message: 'Invalid user ID',
            details: `Unknown test user: ${token}`,
          },
        });
        return;
      }

      req.user = {
        id: mockUser.ID,
        name: mockUser.name,
        email: mockUser.email,
        roles: mockUser.roles,
        scopes: mockUser.scopes,
        attributes: mockUser.attributes,
      };

      console.log(`🧪 Fake auth: User authenticated - ${mockUser.ID}`);
      next();
    });
  }
}
