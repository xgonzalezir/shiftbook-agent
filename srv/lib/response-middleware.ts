/**
 * Response Middleware to Force 200 Responses for Specific Actions
 * This middleware intercepts responses and modifies status codes for certain actions
 */

export interface ResponseMiddlewareOptions {
  force200ForActions: string[];
  enableLogging: boolean;
}

export class ResponseMiddleware {
  private static defaultOptions: ResponseMiddlewareOptions = {
    force200ForActions: [
//      'createCategoryWithDetails',
      'getShiftBookLogsPaginated',
      'addShiftBookEntry',
      'batchAddShiftBookEntries',
      'getShiftbookCategories',
      'getLatestShiftbookLog'
    ],
    enableLogging: true
  };

  /**
   * Create middleware that forces 200 responses for specific actions
   */
  static createMiddleware(options: Partial<ResponseMiddlewareOptions> = {}) {
    const config = { ...this.defaultOptions, ...options };
    
    return (req: any, res: any, next: any) => {
      // Store original end method
      const originalEnd = res.end;
      const originalJson = res.json;
      
      // Override res.end to modify status codes
      res.end = function(chunk?: any, encoding?: any) {
        // Check if this is a response for one of our target actions
        if (config.force200ForActions.some(action => 
          req.url?.includes(action) || req.path?.includes(action)
        )) {
          // Force 200 status for these actions
          if (res.statusCode === 204) {
            res.statusCode = 200;
            if (config.enableLogging) {
              console.log(`🔄 Response middleware: Forced 200 for action in ${req.url}`);
            }
          }
        }
        
        // Call original end method
        originalEnd.call(this, chunk, encoding);
      };

      // Override res.json to modify status codes
      res.json = function(obj: any) {
        // Check if this is a response for one of our target actions
        if (config.force200ForActions.some(action => 
          req.url?.includes(action) || req.path?.includes(action)
        )) {
          // Force 200 status for these actions
          if (res.statusCode === 204) {
            res.statusCode = 200;
            if (config.enableLogging) {
              console.log(`🔄 Response middleware: Forced 200 for action in ${req.url}`);
            }
          }
        }
        
        // Call original json method
        originalJson.call(this, obj);
      };
      
      next();
    };
  }

  /**
   * Create middleware that forces 200 responses for specific actions in cloud environments
   */
  static createCloudResponseMiddleware(options: Partial<ResponseMiddlewareOptions> = {}) {
    const config = { ...this.defaultOptions, ...options };

    return (req: any, res: any, next: any) => {
      // Store original methods
      const originalEnd = res.end;
      const originalStatus = res.status;

      // Override res.status to prevent 204 for our target actions
      res.status = function(code: number) {
        // If this is one of our target actions and status is 204, change to 200
        if (code === 204 && config.force200ForActions.some(action =>
          req.url?.includes(action) || req.path?.includes(action)
        )) {
          if (config.enableLogging) {
            console.log(`🔄 Response middleware: Preventing 204 for ${req.url}, forcing 200`);
          }
          return originalStatus.call(this, 200);
        }
        return originalStatus.call(this, code);
      };

      // Override res.end to ensure proper response
      res.end = function(chunk?: any, encoding?: any) {
        // Check if this is a response for one of our target actions
        if (config.force200ForActions.some(action =>
          req.url?.includes(action) || req.path?.includes(action)
        )) {
          // Force 200 status and ensure JSON content type
          if (res.statusCode === 204) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');

            if (config.enableLogging) {
              console.log(`🔄 Response middleware: Forced 200 for ${req.url}`);
            }
          }
        }

        // Call original end method
        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Create data enrichment middleware (placeholder for future use)
   */
  static createDataEnrichmentMiddleware(_options: Partial<ResponseMiddlewareOptions> = {}) {
    return (_req: any, _res: any, next: any) => {
      // Currently just passes through - can be extended for data enrichment
      next();
    };
  }
}

// Export middleware functions
export const responseMiddleware = ResponseMiddleware.createMiddleware();
export const dataEnrichmentMiddleware = ResponseMiddleware.createDataEnrichmentMiddleware();
export const cloudResponseMiddleware = ResponseMiddleware.createCloudResponseMiddleware();

// CommonJS compatibility
module.exports = {
  ResponseMiddleware,
  responseMiddleware,
  dataEnrichmentMiddleware,
  cloudResponseMiddleware
};
