/**
 * Authentication Strategy Interface
 * 
 * Defines the contract for authentication strategy implementations
 */

import express from 'express';

/**
 * Authenticated user interface
 */
export interface AuthenticatedUser {
  id: string;
  name?: string;
  email?: string;
  roles: string[];
  scopes?: string[];
  attributes?: Record<string, any>;
}

/**
 * Express Request with an authenticated user
 */
export interface AuthenticatedRequest extends express.Request {
  user?: AuthenticatedUser;
}

/**
 * Authentication strategy interface
 */
export interface IAuthStrategy {
  /**
   * Configure and setup authentication for the application
   */
  configure(app: express.Application): void;
}
