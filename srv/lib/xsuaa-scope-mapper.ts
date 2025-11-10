/**
 * XSUAA Scope Mapper for CAP Services
 *
 * This middleware maps full XSUAA scope names (with app prefix) to simplified scope names
 * that CAP services expect in their @requires annotations.
 *
 * XSUAA provides scopes like: "shiftbook-cap-manu-dev-org-dev!t459223.shiftbook.admin"
 * CAP expects scopes like: "shiftbook.admin"
 */

export interface ScopeMapping {
  [fullScopeName: string]: string;
}

export class XSUAAScopeMapper {
  private static instance: XSUAAScopeMapper;
  private scopeMapping: ScopeMapping;

  private constructor() {
    this.scopeMapping = {};
    this.initializeScopeMapping();
  }

  public static getInstance(): XSUAAScopeMapper {
    if (!XSUAAScopeMapper.instance) {
      XSUAAScopeMapper.instance = new XSUAAScopeMapper();
    }
    return XSUAAScopeMapper.instance;
  }

  /**
   * Initialize the scope mapping based on XSUAA configuration
   */
  private initializeScopeMapping(): void {
    // Get app name from environment or xs-security.json
    const appName = this.getAppName();

    if (appName) {
      // Define the simplified scopes that CAP expects
      const capScopes = ["shiftbook.operator", "shiftbook.admin"];

      // Create mapping from full XSUAA scopes to simplified CAP scopes
      capScopes.forEach((scope) => {
        // Pattern: appname!tenant.scope -> scope
        const pattern = new RegExp(
          `^${appName.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}!\\w+\\.${scope.replace(/\./g, "\\.")}$`
        );
        this.scopeMapping[`${appName}.${scope}`] = scope;

        // Also add pattern matching for any tenant
        Object.keys(process.env).forEach((key) => {
          if (key.startsWith("VCAP_SERVICES")) {
            // In BTP environment, try to extract actual scope names from JWT if available
            try {
              const vcapServices = JSON.parse(process.env[key] || "{}");
              const xsuaaService = vcapServices.xsuaa?.[0];
              if (xsuaaService?.credentials?.xsappname) {
                const fullScope = `${xsuaaService.credentials.xsappname}.${scope}`;
                this.scopeMapping[fullScope] = scope;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        });
      });

      console.log(
        "XSUAA Scope Mapper initialized with mappings:",
        this.scopeMapping
      );
    } else {
      console.warn("Could not determine app name for scope mapping");
    }
  }

  /**
   * Get the application name from environment or configuration
   */
  private getAppName(): string | null {
    // Try to get from VCAP_SERVICES first
    try {
      const vcapServices = JSON.parse(process.env.VCAP_SERVICES || "{}");
      const xsuaaService = vcapServices.xsuaa?.[0];
      if (xsuaaService?.credentials?.xsappname) {
        return xsuaaService.credentials.xsappname;
      }
    } catch (e) {
      // Ignore parsing errors
    }

    // Fallback to xs-security.json pattern
    return "shiftbook-cap-manu-dev-org-dev!t459223";
  }

  /**
   * Map JWT scopes to CAP-expected scopes
   */
  public mapScopes(jwtScopes: string[]): string[] {
    const mappedScopes: string[] = [];

    console.log("🔍 XSUAA Scope Mapper - Input scopes:", jwtScopes);

    jwtScopes.forEach((jwtScope) => {
      // Direct mapping lookup
      if (this.scopeMapping[jwtScope]) {
        mappedScopes.push(this.scopeMapping[jwtScope]);
      }

      // Pattern-based mapping for dynamic tenant IDs
      if (jwtScope.includes("shiftbook.")) {
        // Extract the simplified scope name from full XSUAA scope
        // Look for shiftbook.xxx pattern in the scope string
        const match = jwtScope.match(/shiftbook\.([^.]+)/);
        if (match) {
          const simplifiedScope = match[1]; // Just the scope name without prefix
          // Only add if it's a valid CAP scope
          if (["operator", "admin"].includes(simplifiedScope)) {
            mappedScopes.push(simplifiedScope);
          }
        }
      }

      // Additional pattern for app!tenant.scope format (supports blue-green deployment)
      if (jwtScope.includes("!")) {
        // Extract the simplified scope name from full XSUAA scope
        // Look for app!tenant.scope pattern in the scope string
        const match = jwtScope.match(/(.+)![^.]+\.([^.]+)/);
        if (match) {
          const simplifiedScope = match[2]; // Just the scope name (admin, operator, etc.)
          // Only add if it's a valid CAP scope
          if (["operator", "admin"].includes(simplifiedScope)) {
            mappedScopes.push(simplifiedScope);
          }
        }
      }

      // Always keep the original scope for fallback
      mappedScopes.push(jwtScope);
    });

    // Remove duplicates
    const finalScopes = [...new Set(mappedScopes)];
    console.log("🔍 XSUAA Scope Mapper - Mapped scopes:", finalScopes);
    return finalScopes;
  }

  /**
   * Map JWT authorities to CAP-expected scopes
   */
  public mapAuthorities(jwtAuthorities: string[]): string[] {
    return this.mapScopes(jwtAuthorities);
  }

  /**
   * Get all mapped scopes for debugging
   */
  public getScopeMapping(): ScopeMapping {
    return { ...this.scopeMapping };
  }
}

/**
 * Express middleware factory for CAP services
 */
export function createXSUAAScopeMapperMiddleware() {
  const mapper = XSUAAScopeMapper.getInstance();

  return (req: any, _res: any, next: any) => {
    // Only process requests with JWT tokens
    if (req.user && req.user.tokenInfo) {
      const tokenInfo = req.user.tokenInfo;

      // Map scopes if they exist
      if (tokenInfo.scope && Array.isArray(tokenInfo.scope)) {
        const originalScopes = [...tokenInfo.scope];
        tokenInfo.scope = mapper.mapScopes(originalScopes);

        // Debug logging
        if (originalScopes.join(",") !== tokenInfo.scope.join(",")) {
          console.log("Mapped XSUAA scopes:", {
            original: originalScopes,
            mapped: tokenInfo.scope,
          });
        }
      }

      // Map authorities if they exist
      if (tokenInfo.authorities && Array.isArray(tokenInfo.authorities)) {
        const originalAuthorities = [...tokenInfo.authorities];
        tokenInfo.authorities = mapper.mapAuthorities(originalAuthorities);

        // Debug logging
        if (originalAuthorities.join(",") !== tokenInfo.authorities.join(",")) {
          console.log("Mapped XSUAA authorities:", {
            original: originalAuthorities,
            mapped: tokenInfo.authorities,
          });
        }
      }

      // Also update req.user.scopes if it exists (CAP sometimes uses this)
      if (req.user.scopes && Array.isArray(req.user.scopes)) {
        req.user.scopes = mapper.mapScopes(req.user.scopes);
      }
    }

    next();
  };
}

export default XSUAAScopeMapper;
