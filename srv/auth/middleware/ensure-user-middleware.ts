/**
 * User Safety Middleware
 * 
 * Ensures all requests have a user object attached for safe processing.
 * Acts as a safety net after authentication strategies run.
 * 
 * Other authorization helpers moved to auth-middleware-utils.ts (test utilities).
 */

import express from 'express';
import { AuthenticatedRequest } from '../strategies';

/**
 * Ensures all requests have a user object
 * 
 * Acts as a safety fallback after authentication strategies.
 * If no user exists (authentication failed or not configured),
 * creates an anonymous user to prevent null reference errors.
 * 
 * @returns {express.RequestHandler} User safety middleware
 * 
 * @example
 * // Use after authentication strategy configuration
 * authStrategy.configure(app);
 * app.use(ensureUserMiddleware());
 */
export function ensureUserMiddleware(): express.RequestHandler {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    // User should already be attached by auth strategy
    if (!req.user) {
      console.warn('⚠️ Auth middleware: User not found in request');
      req.user = {
        id: 'anonymous',
        roles: [],
        scopes: [],
      };
    }
    next();
  };
}
