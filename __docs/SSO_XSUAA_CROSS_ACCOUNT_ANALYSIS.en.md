# Analysis: SSO between Client's XSUAA and Our XSUAA on SAP BTP

**Date**: October 23, 2025  
**Project**: ShiftBook - Backend CAP Service  
**Context**: Fiori Plugin (Frontend) deployed in client's DMC instance + Backend CAP in our BTP account

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Context](#problem-context)
3. [Current Architecture](#current-architecture)
4. [Problem Analysis](#problem-analysis)
5. [Proposed Solutions](#proposed-solutions)
6. [Solution Comparison](#solution-comparison)
7. [Recommendations](#recommendations)
8. [References and Resources](#references-and-resources)

---

## 🎯 Executive Summary

### The Problem
We need to establish SSO (Single Sign-On) between two XSUAA instances in different SAP BTP accounts:
- **Frontend**: Fiori Plugin (SAP Approuter + UI5) deployed in client's DMC instance (CloudFoundry in their account)
- **Backend**: CAP Service + HANA DB + XSUAA deployed in our BTP account

The frontend is a DMC Pod Plugin that runs embedded in the client's Digital Manufacturing Cloud system as an iframe, with SAP Approuter handling authentication routing and the UI communicating with our backend via configured destinations.

### Objective
Allow users authenticated in the client's XSUAA to consume our backend service without reauthentication, maintaining user identity (principal propagation) and authorization controls.

### Key Findings from Frontend Analysis
The `shift-book-pod-plugin` repository reveals:
- Currently uses **shared XSUAA pattern** in development (both frontend and backend in same account)
- Three destination patterns configured (`/backend/`, `/backend-noauth/`, `/backend-clientcredentials/`)
- Successfully resolved authentication using route-based authentication in xs-app.json
- Proven pattern: `NoAuthentication` destination with `forwardAuthToken: true` works within same account
- **Challenge for production**: Cross-account requires OAuth2SAMLBearerAssertion and explicit trust configuration

---

## 🏗️ Problem Context

### Multi-Account Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│               CLIENT'S BTP ACCOUNT                               │
│                                                                   │
│  ┌──────────────────────────────────────────┐                   │
│  │  DMC (Digital Manufacturing Cloud)        │                   │
│  │  ┌────────────────────────────────────┐  │                   │
│  │  │  Fiori Frontend Plugin             │  │                   │
│  │  │  (ShiftBook UI)                    │  │                   │
│  │  │  - SAP Approuter (@sap/approuter)  │  │                   │
│  │  │  - UI5 Application                 │  │                   │
│  │  │  - xs-app.json routing             │  │                   │
│  │  └────────────────────────────────────┘  │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                   │
│  ┌──────────────────────────────────────────┐                   │
│  │  Client XSUAA                             │                   │
│  │  - Corporate users                        │                   │
│  │  - Authentication policies                │                   │
│  │  - Corporate IdP (IAS/AD)                 │                   │
│  └──────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                          ⬇️  SSO required
┌─────────────────────────────────────────────────────────────────┐
│               OUR BTP ACCOUNT (PROVIDER)                         │
│                                                                   │
│  ┌──────────────────────────────────────────┐                   │
│  │  Backend CAP Service                      │                   │
│  │  - ShiftBookService (OData V4)            │                   │
│  │  - Business logic                         │                   │
│  │  - Notifications (Email/Teams)            │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                   │
│  ┌──────────────────────────────────────────┐                   │
│  │  HANA Cloud Database                      │                   │
│  │  - ShiftBookLog                           │                   │
│  │  - ShiftBookCategory                      │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                   │
│  ┌──────────────────────────────────────────┐                   │
│  │  Our XSUAA                                │                   │
│  │  - Scopes: operator, admin                │                   │
│  │  - Role Collections                       │                   │
│  │  - tenant-mode: dedicated                 │                   │
│  └──────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Current Configuration

#### Backend xs-security.json

```json
{
  "xsappname": "shiftbook-srv",
  "tenant-mode": "dedicated",
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "description": "Operator - Read/Create logs",
      "granted-apps": ["$XSAPPNAME(application, shiftbook-plugin)"]
    },
    {
      "name": "$XSAPPNAME.admin",
      "description": "Admin - Full access",
      "granted-apps": ["$XSAPPNAME(application, shiftbook-plugin)"]
    }
  ],
  "oauth2-configuration": {
    "grant-types": [
      "client_credentials",
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "user_token",
      "refresh_token"
    ]
  }
}
```

#### Frontend xs-security.json (shift-book-pod-plugin)

```json
{
  "xsappname": "shiftbook-plugin",
  "tenant-mode": "dedicated",
  "description": "Security profile of called application",
  "scopes": [
    {
      "name": "uaa.user",
      "description": "UAA"
    }
  ],
  "role-templates": [
    {
      "name": "Token_Exchange",
      "description": "UAA",
      "scope-references": [
        "uaa.user"
      ]
    }
  ]
}
```

#### Frontend xs-app.json Routing Configuration

```json
{
  "welcomeFile": "/PodPlugins/index.html",
  "authenticationMethod": "route",
  "logout": {
    "logoutEndpoint": "/do/logout"
  },
  "routes": [
    {
      "source": "^/PodPlugins/(.*)$",
      "target": "$1",
      "localDir": "webapp",
      "authenticationType": "none"
    },
    {
      "source": "^/backend/(.*)$",
      "target": "$1",
      "destination": "shiftbook-backend",
      "authenticationType": "xsuaa",
      "csrfProtection": false,
      "scope": ["$XSAPPNAME.operator", "$XSAPPNAME.admin"]
    },
    {
      "source": "^/backend-noauth/(.*)$",
      "target": "$1",
      "destination": "shiftbook-backend-noauth",
      "authenticationType": "none",
      "csrfProtection": true
    },
    {
      "source": "^/backend-clientcredentials/(.*)$",
      "target": "$1",
      "destination": "shiftbook-backend-OAuth2ClientCredentials",
      "authenticationType": "none",
      "csrfProtection": true
    }
  ]
}
```

#### Frontend Application Stack

**Repository**: `shift-book-pod-plugin`

**Technology Stack**:
- **Approuter**: `@sap/approuter` v14.3.2 - handles authentication and routing
- **UI Framework**: SAP UI5 (JavaScript-based)
- **Deployment**: CloudFoundry HTML5 Application
- **Architecture**: DMC Pod Plugin embedded in client's Digital Manufacturing Cloud

**Key Components**:
1. **start.js**: Custom approuter startup with JWT token logging middleware
2. **CommonController.js**: Base controller with HTTP client logic using `fetch()` API
3. **config.json**: Environment-specific configuration (DEV/QA/PRD/LOCAL)
4. **Multiple destinations configured**:
   - `/backend/` - XSUAA authenticated (requires operator/admin scopes)
   - `/backend-noauth/` - No authentication
   - `/backend-clientcredentials/` - OAuth2 Client Credentials flow

**Current Backend Communication Pattern**:
```javascript
// From CommonController.js (updated pattern)
// Centralized URL building function
_buildApiUrl: function(tableUrl, filter) {
    filter = filter || "";
    return `${this.configObject[this.env].appUrl}${tableUrl}${filter}`;
},

// Usage example - explicit destination path:
const url = this._buildApiUrl(
    "/destinations/shiftbook-backend/shiftbook/ShiftBookService/ShiftBookCategory",
    "?$filter=werks eq '2000'"
);

// Example constructed URL:
// https://manu-dev-org-dev-shiftbook-plugin.cfapps.us10-001.hana.ondemand.com
// /destinations/shiftbook-backend/shiftbook/ShiftBookService/ShiftBookCategory?$filter=werks eq '2000'
```

**CORS Configuration** (from mta.yaml):
- Allowed origins: Client's DMC host (e.g., `syntax-dmc-demo.execution.eu20-quality.web.dmc.cloud.sap`)
- Allowed methods: GET, POST, OPTIONS, PATCH, DELETE, PUT
- Special headers: `x-dme-plant`, `x-dme-industry-type` (DMC-specific)
- Configured for iframe embedding in DMC

---

## 🔍 Problem Analysis

### Technical Challenges

1. **BTP Account Isolation**
   - Each BTP account has its own independent XSUAA
   - No automatic trust exists between XSUAAs in different accounts
   - JWT tokens issued by one XSUAA are not valid in another by default

2. **Identity Propagation**
   - User authenticates in the client's XSUAA
   - Backend needs to validate that authentication
   - Authorizations (scopes) defined in our xs-security.json must be maintained

3. **Configuration Complexity**
   - Requires configuration in both BTP accounts
   - Needs coordination between client and provider
   - Certificate and SAML/OAuth metadata management

4. **Authorization vs Authentication**
   - **Authentication**: Verify user identity (client's responsibility)
   - **Authorization**: Verify permissions in our service (our responsibility)

### Frontend-Specific Challenges

5. **DMC Pod Plugin Architecture**
   - Frontend runs as an embedded iframe within client's DMC application
   - Must respect DMC's CSP (Content Security Policy) and iframe restrictions
   - Requires specific CORS configuration for cross-origin communication
   - Limited control over the authentication flow (DMC controls the outer frame)

6. **Current Authentication Flow Issues**
   - Frontend currently uses **three different destination patterns**:
     - `/backend/` with XSUAA authentication (expects scopes from backend XSUAA)
     - `/backend-noauth/` without authentication
     - `/backend-clientcredentials/` using client credentials flow
   - This creates confusion: which flow to use for cross-account SSO?
   - Client credentials flow doesn't maintain user identity (loses principal propagation)
   - No-auth destinations expose endpoints without proper security

7. **Approuter Token Forwarding Complexity**
   - Approuter needs to forward tokens from client's XSUAA to our backend
   - Current `xs-app.json` has mixed authentication strategies:
     ```json
     "scope": ["$XSAPPNAME.operator", "$XSAPPNAME.admin"]
     ```
   - These scopes reference **backend's XSUAA** (`$XSAPPNAME` = shiftbook-srv)
   - But tokens come from **client's XSUAA** - scope mismatch!

8. **Token Scope Mismatch**
   - Frontend expects scopes: `shiftbook-srv.operator`, `shiftbook-srv.admin`
   - Client XSUAA issues tokens with their own scopes
   - Backend validates against its XSUAA scopes
   - **Critical gap**: How to map client's user roles to our backend scopes?

9. **Destination Service Configuration Challenge**
   - Frontend's `mta.yaml` requires destination service:
     ```yaml
     - name: shiftbook-plugin-destination
       type: org.cloudfoundry.existing-service
       parameters:
         service-name: shiftbook-destination
     ```
   - This destination needs to be configured for **cross-account token exchange**
   - Current configuration likely points to our XSUAA, not client's XSUAA
   - Needs OAuth2SAMLBearerAssertion or OAuth2UserTokenExchange authentication type

10. **Multiple Environments Configuration**
    - Frontend has DEV/QA/PRD environments in `config.json`
    - Each environment may have different:
      - DMC host URLs
      - Destination configurations
      - XSUAA trust relationships
    - Changes must be coordinated across all environments

---

## 💡 Proposed Solutions

### Solution 1: OAuth 2.0 Token Exchange (JWT Bearer Grant) ⭐ **RECOMMENDED**

#### Description
Use OAuth 2.0 JWT Bearer Token Exchange flow (RFC 8693) to exchange the client's token for a valid token in our XSUAA, maintaining user identity.

#### Architecture

```
┌─────────────┐                                    ┌──────────────┐
│    User     │                                    │  Client      │
│  (Client)   │                                    │  XSUAA       │
└──────┬──────┘                                    └──────┬───────┘
       │                                                  │
       │ 1. Login                                         │
       │─────────────────────────────────────────────────>│
       │                                                  │
       │ 2. JWT Token (from client)                       │
       │<─────────────────────────────────────────────────│
       │                                                  │
┌──────▼──────────────────────────────────────────┐       │
│  Frontend Plugin (in client account)            │       │
│  - JWT Token from client's XSUAA                │       │
└──────┬──────────────────────────────────────────┘       │
       │                                                  │
       │ 3. API Call with client JWT                      │
       │                                                  │
┌──────▼───────────────────────────────────────────┐      │
│  Backend CAP (our account)                       │      │
│  ┌────────────────────────────────────────────┐  │      │
│  │  XSUAA Token Exchange Service              │  │      │
│  │  4. Validate client JWT                    │  │      │
│  │  5. Exchange for our JWT                   │──┼──────┘
│  │  6. Return new JWT                         │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  CAP Service with our JWT                  │  │
│  │  - Authorization with our scopes           │  │
│  │  - Principal propagation maintained        │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

#### Configuration

**1. Configure Trust between XSUAAs**

In **our BTP account** (xs-security.json):

```json
{
  "xsappname": "shiftbook-srv",
  "tenant-mode": "dedicated",
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "description": "Operator - Read/Create logs"
    },
    {
      "name": "$XSAPPNAME.admin",
      "description": "Admin - Full access"
    }
  ],
  "oauth2-configuration": {
    "grant-types": [
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "client_credentials"
    ],
    "token-validity": 7200,
    "refresh-token-validity": 86400
  },
  "foreign-scope-references": [
    "uaa.user"
  ],
  "trusted-client-id-suffixes": [
    "!b*|shiftbook-plugin",
    "!b*|client-xsuaa-app-id"
  ]
}
```

**2. Configure Frontend for Token Exchange**

**Update xs-app.json** in `shift-book-pod-plugin`:

```json
{
  "welcomeFile": "/PodPlugins/index.html",
  "authenticationMethod": "route",
  "logout": {
    "logoutEndpoint": "/do/logout"
  },
  "routes": [
    {
      "source": "^/PodPlugins/(.*)$",
      "target": "$1",
      "localDir": "webapp",
      "authenticationType": "none"
    },
    {
      "source": "^/backend/(.*)$",
      "target": "$1",
      "destination": "shiftbook-backend-tokenexchange",
      "authenticationType": "xsuaa",
      "csrfProtection": false
    }
  ]
}
```

**Update Destination Configuration** (`shiftbook-backend-tokenexchange`):

Create a new destination in client's BTP account with these properties:

```properties
Name=shiftbook-backend-tokenexchange
Type=HTTP
URL=https://our-backend-url.cfapps.eu10.hana.ondemand.com
Authentication=OAuth2SAMLBearerAssertion
# OR
Authentication=OAuth2JWTBearer

# Token Service Configuration
tokenServiceURL=https://our-xsuaa.authentication.eu10.hana.ondemand.com/oauth/token
clientId=<our-xsuaa-client-id>
clientSecret=<our-xsuaa-client-secret>

# Additional properties
HTML5.DynamicDestination=true
WebIDEEnabled=true
WebIDEUsage=odata_gen
```

**Update mta.yaml** in `shift-book-pod-plugin`:

```yaml
ID: shiftbook-plugin
_schema-version: "3.2"
version: 1.0.0

modules:
  - name: shiftbook-plugin
    type: html5
    path: PodPlugins
    parameters:
      disk-quota: 256M
      memory: 128M
    requires:
      - name: shiftbook-plugin-auth  # Client's XSUAA
      - name: shiftbook-plugin-destination

resources:
  - name: shiftbook-plugin-auth
    type: org.cloudfoundry.existing-service
    parameters:
      service-name: client-xsuaa-service  # Provided by client
  
  - name: shiftbook-plugin-destination
    type: org.cloudfoundry.existing-service
    parameters:
      service-name: client-destination-service  # Provided by client
```

**Update Frontend Code** (CommonController.js):

```javascript
// Remove the multiple destination patterns, consolidate to one
// Use the centralized _buildApiUrl() method

// Add/Update _buildApiUrl to support cross-account destination
_buildApiUrl: function(tableUrl, filter) {
    filter = filter || "";
    return `${this.configObject[this.env].appUrl}${tableUrl}${filter}`;
},

// Update doDatabaseCallGet to use the unified destination
doDatabaseCallGet: function(sTableUrl, filter, sModelName, callBackFunction) {
    const that = this;
    BusyIndicator.show(0);
    
    // Build URL using unified pattern - approuter handles token exchange
    var sUrl = this._buildApiUrl(
        `/backend/shiftbook/ShiftBookService/${sTableUrl}`,
        filter ? filter : ""
    );
    
    return fetch(sUrl, {
        method: 'GET',
        headers: {
            "Accept": "application/json",
            "X-Dme-Plant": this.plant
            // Authorization header automatically added by approuter
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        that.logger.info("doDatabaseCallGet => response received");
        that.getView().setModel(new JSONModel(data), sModelName);
        if (callBackFunction) {
            callBackFunction(data);
        }
        return data;
    })
    .catch(err => {
        that.logger.error("doDatabaseCallGet => Error: " + err.message);
        that.showErrorMessage(err.message, 10000);
        that.getView().setModel(new JSONModel(), sModelName);
        throw err;
    })
    .finally(() => {
        BusyIndicator.hide();
    });
}
```

**Update config.json**:

```json
{
  "DEV": {
    "dmcHost": "syntax-dmc-demo.execution.eu20-quality.web.dmc.cloud.sap",
    "appUrl": "https://client-dev-shiftbook-plugin.cfapps.us10-001.hana.ondemand.com",
    "destinationPath": "/backend/",  // Unified destination
    "publicAPIPath": ""
  },
  "QA": {
    "dmcHost": "client-qa-dmc.execution.eu20.web.dmc.cloud.sap",
    "appUrl": "https://client-qa-shiftbook-plugin.cfapps.us10-001.hana.ondemand.com",
    "destinationPath": "/backend/"
  },
  "PRD": {
    "dmcHost": "client-prd-dmc.execution.eu10.web.dmc.cloud.sap",
    "appUrl": "https://client-prd-shiftbook-plugin.cfapps.eu10.hana.ondemand.com",
    "destinationPath": "/backend/"
  }
}
```

**3. Implement Token Exchange in Backend**

```typescript
// srv/middleware/token-exchange.ts
import * as xsenv from '@sap/xsenv';
import axios from 'axios';

interface TokenExchangeConfig {
  clientid: string;
  clientsecret: string;
  url: string;
}

export class TokenExchangeMiddleware {
  private xsuaaConfig: TokenExchangeConfig;

  constructor() {
    const services = xsenv.getServices({ 
      xsuaa: { tag: 'xsuaa' } 
    });
    this.xsuaaConfig = services.xsuaa;
  }

  async exchangeToken(clientToken: string): Promise<string> {
    const tokenEndpoint = `${this.xsuaaConfig.url}/oauth/token`;
    
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: clientToken,
      client_id: this.xsuaaConfig.clientid,
      client_secret: this.xsuaaConfig.clientsecret,
      response_type: 'token'
    });

    try {
      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw new Error('Authentication failed');
    }
  }
}

// Middleware in srv/server.ts
cds.on('bootstrap', async (app) => {
  const tokenExchange = new TokenExchangeMiddleware();
  
  app.use('/shiftbook', async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const clientToken = authHeader.substring(7);
      
      try {
        // Exchange client token for our token
        const ourToken = await tokenExchange.exchangeToken(clientToken);
        
        // Replace token in request
        req.headers.authorization = `Bearer ${ourToken}`;
      } catch (error) {
        return res.status(401).json({ 
          error: 'Authentication failed' 
        });
      }
    }
    
    next();
  });
});
```

#### Advantages
✅ **SAP Guidelines Compliant**: Uses standard OAuth 2.0 mechanisms  
✅ **Principal Propagation**: Maintains original user identity  
✅ **Granular Authorization**: Allows applying our scopes and role collections  
✅ **Complete Auditing**: Original user is recorded in logs  
✅ **No IAS Changes**: Doesn't require additional Identity Authentication Service  
✅ **Flexibility**: Allows different authentication policies per client

#### Disadvantages
⚠️ **Initial Complexity**: Requires configuration in both accounts  
⚠️ **Network Overhead**: Each request requires a token exchange  
⚠️ **Trust Management**: Needs to maintain trusted-client-id-suffixes updated  
⚠️ **Debugging**: More complex to trace authentication issues

#### Implementation Effort
- **Configuration**: 2-3 days
- **Development**: 3-5 days
- **Testing**: 2-3 days
- **Documentation**: 1-2 days
- **Total**: ~10-15 days

---

### Solution 2: SAP Identity Authentication Service (IAS) as Central Hub ⭐

#### Description
Use SAP IAS as central Identity Provider that acts as proxy between client's corporate IdP and both XSUAAs, establishing common trust.

#### Architecture

```
                    ┌────────────────────────┐
                    │   Corporate IdP        │
                    │   (Azure AD, Okta...)  │
                    └───────────┬────────────┘
                                │ SAML/OIDC
                                │
                    ┌───────────▼────────────┐
                    │  SAP IAS (Hub)         │
                    │  - User Federation     │
                    │  - Central SSO         │
                    │  - MFA / Policies      │
                    └───┬────────────────┬───┘
                        │                │
            SAML Trust  │                │  SAML Trust
                        │                │
        ┌───────────────▼──┐         ┌──▼──────────────┐
        │  Client XSUAA    │         │  Our XSUAA      │
        │  (DMC Frontend)  │         │  (CAP Backend)  │
        └──────────────────┘         └─────────────────┘
```

#### Configuration

**1. Configure IAS as Central IdP**

```yaml
# Trust Configuration in Client's XSUAA
identity-provider: sap-ias
origin: https://client-tenant.accounts.ondemand.com
saml:
  metadata-url: https://client-tenant.accounts.ondemand.com/saml/metadata
```

**2. Configure Trust in Our Account**

In SAP BTP Cockpit → Subaccount → Security → Trust Configuration:

```yaml
# Establish trust with same IAS
identity-provider: sap-ias
origin: https://client-tenant.accounts.ondemand.com
saml:
  metadata-url: https://client-tenant.accounts.ondemand.com/saml/metadata
  
# Attribute Mapping
attributes:
  - name: Groups
    source: groups
  - name: email
    source: mail
```

**3. Configure IAS for Both Applications**

In IAS Administration Console:

```yaml
# Application 1: DMC Frontend
applications:
  - name: shiftbook-frontend
    type: saml
    assertion-attributes:
      - name: Groups
        value: ${user.groups}
    default-attributes:
      scope: operator

# Application 2: CAP Backend
applications:
  - name: shiftbook-backend
    type: saml
    assertion-attributes:
      - name: Groups
        value: ${user.groups}
      - name: email
        value: ${user.email}
```

**4. Map Groups to Role Collections**

In our BTP account:

```json
// Group mapping configuration
{
  "role-collections": [
    {
      "name": "ShiftBook_Operator",
      "role-template-references": [
        "$XSAPPNAME.operator"
      ],
      "group-mappings": [
        "SHIFTBOOK_OPERATORS",
        "DMC_USERS"
      ]
    },
    {
      "name": "ShiftBook_Admin",
      "role-template-references": [
        "$XSAPPNAME.admin"
      ],
      "group-mappings": [
        "SHIFTBOOK_ADMINS",
        "DMC_ADMINS"
      ]
    }
  ]
}
```

#### Advantages
✅ **True SSO**: Single authentication for all applications  
✅ **SAP Best Practice**: Officially recommended solution by SAP  
✅ **Centralized Management**: Users and policies in one place  
✅ **Integrated MFA**: Native support for multi-factor authentication  
✅ **User Provisioning**: Automatic user synchronization  
✅ **Scalable**: Easy to add more applications in the future

#### Disadvantages
⚠️ **Requires IAS**: Client must have SAP IAS tenant (additional cost)  
⚠️ **Coordination**: Needs administrative access to client's IAS  
⚠️ **User Migration**: May require migration if using different IdP  
⚠️ **Vendor Lock-in**: Greater dependency on SAP ecosystem

#### Implementation Effort
- **IAS Provisioning**: 1-2 days
- **Trust Configuration**: 2-3 days
- **User Migration**: 3-5 days (depends on number of users)
- **Testing**: 3-4 days
- **Documentation**: 2 days
- **Total**: ~12-18 days

---

### Solution 3: SAP Destination Service with Principal Propagation

#### Description
Use SAP Destination Service as intermediary that handles authentication between accounts, leveraging Principal Propagation mechanism.

#### Architecture

```
┌────────────────────────────────────────────────────────┐
│          CLIENT'S BTP ACCOUNT                          │
│                                                        │
│  ┌──────────────────────────────────────────┐          │
│  │  Frontend Plugin                         │          │
│  │  - User authenticated                    │          │
│  └──────┬───────────────────────────────────┘          │
│         │                                              │
│  ┌──────▼───────────────────────────────────┐          │
│  │  Destination: "ShiftBookBackend"         │          │
│  │  - URL: backend.cfapps.eu10...           │          │
│  │  - Authentication: OAuth2SAMLBearer      │          │
│  │  - audience: shiftbook-srv               │          │
│  │  - authnContextClassRef: ...             │          │
│  └──────┬───────────────────────────────────┘          │
│         │                                              │
│  ┌──────▼───────────────────────────────────┐          │
│  │  Connectivity Service                    │          │
│  │  - Token conversion                      │          │
│  │  - Principal propagation                 │          │
│  └──────┬───────────────────────────────────┘          │
└─────────┼──────────────────────────────────────────────┘
          │ HTTP + JWT
          │
┌─────────▼────────────────────────────────────────────┐
│          OUR BTP ACCOUNT (PROVIDER)                  │
│                                                      │
│  ┌──────────────────────────────────────────┐        │
│  │  CAP Backend Service                     │        │
│  │  - Validates JWT                         │        │
│  │  - Apply scopes/authorizations           │        │
│  └──────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘
```

#### Configuration

**1. Create Destination in Client's Account**

In Client's BTP Cockpit → Connectivity → Destinations:

```properties
# Destination Configuration
Name=ShiftBookBackend
Type=HTTP
URL=https://shiftbook-srv.cfapps.eu10.hana.ondemand.com
ProxyType=Internet
Authentication=OAuth2SAMLBearerAssertion

# OAuth2 Configuration
tokenServiceURL=https://provider-xsuaa.authentication.eu10.hana.ondemand.com/oauth/token
clientId=sb-shiftbook-srv!t12345
clientSecret=<client-secret>
audience=shiftbook-srv

# Additional Properties
authnContextClassRef=urn:oasis:names:tc:SAML:2.0:ac:classes:X509
nameIdFormat=urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
```

**2. Configure xs-security.json to Accept Principal Propagation**

```json
{
  "xsappname": "shiftbook-srv",
  "tenant-mode": "dedicated",
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "description": "Operator - Read/Create logs"
    },
    {
      "name": "$XSAPPNAME.admin",
      "description": "Admin - Full access"
    }
  ],
  "oauth2-configuration": {
    "grant-types": [
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "urn:ietf:params:oauth:grant-type:saml2-bearer",
      "client_credentials"
    ],
    "token-validity": 7200
  },
  "role-collections": [
    {
      "name": "ShiftBook_Operator",
      "description": "Operator role for ShiftBook",
      "role-template-references": [
        "$XSAPPNAME.operator"
      ]
    }
  ]
}
```

**3. Configure Frontend to Use Destination**

```javascript
// In Fiori plugin code
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/odata/v4/ODataModel"
], function(UIComponent, ODataModel) {
  "use strict";

  return UIComponent.extend("com.client.shiftbook.Component", {
    init: function() {
      UIComponent.prototype.init.apply(this, arguments);
      
      // Use Destination Service
      const oModel = new ODataModel({
        serviceUrl: "/destinations/ShiftBookBackend/shiftbook/",
        synchronizationMode: "None",
        operationMode: "Server",
        autoExpandSelect: true,
        earlyRequests: true
      });
      
      this.setModel(oModel);
    }
  });
});
```

**4. Configure approuter in Client Account (xs-app.json)**

```json
{
  "welcomeFile": "/index.html",
  "authenticationMethod": "route",
  "routes": [
    {
      "source": "^/destinations/ShiftBookBackend/(.*)$",
      "target": "$1",
      "destination": "ShiftBookBackend",
      "authenticationType": "xsuaa",
      "csrfProtection": true
    },
    {
      "source": "^(.*)$",
      "target": "$1",
      "authenticationType": "xsuaa"
    }
  ]
}
```

#### Advantages
✅ **SAP Native Solution**: Uses native BTP services  
✅ **Principal Propagation**: Maintains user identity  
✅ **Centralized Configuration**: Destinations managed in cockpit  
✅ **No Additional Code**: Mainly configuration  
✅ **Auditing**: Original user visible in logs

#### Disadvantages
⚠️ **Requires Connectivity Service**: Additional binding in client account  
⚠️ **Complex Configuration**: Many OAuth2 parameters  
⚠️ **Secret Management**: Client secrets must be shared  
⚠️ **Difficult Debugging**: Configuration errors are cryptic  
⚠️ **Limited to Cloud Foundry**: Doesn't work well in Kyma

#### Implementation Effort
- **Destination Configuration**: 2-3 days
- **XSUAA Configuration**: 1-2 days
- **Frontend Integration**: 2-3 days
- **Testing**: 3-4 days
- **Documentation**: 1-2 days
- **Total**: ~10-16 days

---

## 📊 Solution Comparison

| Criteria | OAuth Token Exchange | IAS Hub | Destination Service |
|----------|---------------------|---------|---------------------|
| **Technical Complexity** | Medium | Medium-High | High |
| **Additional Cost** | ❌ No | ✅ Yes (IAS) | ❌ No |
| **Time-to-Market** | 2-3 weeks | 3-4 weeks | 2-3 weeks |
| **Maintainability** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Scalability** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **SAP Best Practice** | ✅ Yes | ✅✅ Highly Recommended | ✅ Yes |
| **Principal Propagation** | ✅ Complete | ✅ Complete | ✅ Complete |
| **MFA Support** | ⚠️ Limited | ✅ Native | ⚠️ Limited |
| **Multi-Tenant Ready** | ✅ Yes | ✅ Yes | ⚠️ Partial |
| **Vendor Lock-in** | Medium | High | High |
| **SAP Documentation** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎯 Recommendations

### Main Recommendation: **Solution 1 + Solution 2 (Hybrid)**

#### Phase 1: Quick Implementation (2-3 weeks)
**Implement OAuth Token Exchange (Solution 1)**
- ✅ Allows quick launch without external dependencies
- ✅ Doesn't require additional IAS
- ✅ Meets SSO and principal propagation requirements
- ✅ Maintains full control over authentication/authorization

#### Phase 2: Long-Term Optimization (3-6 months)
**Migrate to IAS as Hub (Solution 2)**
- ✅ SAP best practice
- ✅ Ready to scale to multiple clients
- ✅ Centralized MFA and security policies
- ✅ Reduces operational complexity long-term

### Justification

1. **Time-to-Market**: Solution 1 allows immediate value delivery
2. **Flexibility**: No commitment to IAS costs until business model is validated
3. **Scalability**: IAS is the best option when we have multiple clients
4. **Risk Reduction**: Validate architecture before investing in IAS

### Migration Plan

```
Month 1-2: OAuth Token Exchange
  ├─ Basic implementation
  ├─ Testing with pilot client
  └─ MVP Go-Live

Month 3-4: Evaluation
  ├─ Client feedback
  ├─ Log/performance analysis
  └─ Decision on IAS

Month 5-6: IAS Migration (if appropriate)
  ├─ IAS provisioning
  ├─ Parallel configuration
  ├─ Gradual user migration
  └─ Token exchange deprecation
```

---

## 📖 Learnings from Existing Implementation (Development Environment)

### Current Development Setup Analysis

Based on the `shift-book-pod-plugin` repository analysis, the development environment currently uses a **simplified shared XSUAA approach** that differs from the production cross-account scenario.

#### Current Development Architecture

```
┌──────────────────────────────────────────────────┐
│  SAME BTP ACCOUNT (Development/Testing)          │
│                                                  │
│  ┌────────────────────────┐                     │
│  │  shiftbook-plugin      │                     │
│  │  (Frontend Approuter)  │─────┐               │
│  └────────────────────────┘     │               │
│                                 │               │
│  ┌────────────────────────┐     │               │
│  │  shiftbook-srv         │     │               │
│  │  (Backend CAP)         │─────┤               │
│  └────────────────────────┘     │               │
│                                 ▼               │
│                        ┌────────────────┐        │
│                        │ shiftbook-auth │        │
│                        │ (Shared XSUAA) │        │
│                        └────────────────┘        │
│                                                  │
│  Destination: shiftbook-backend                  │
│  - NoAuthentication                              │
│  - forwardAuthToken: true                        │
└──────────────────────────────────────────────────┘
```

#### Key Findings from Development Environment

**1. Successful Shared XSUAA Pattern** (Documented in XSUAA-DESTINATION-ANALYSIS.md)

The development environment successfully resolved authentication issues by:
- Using a **single XSUAA instance** (`shiftbook-auth`) shared by both frontend and backend
- Configuring approuter with **route-based authentication**:
  ```json
  {
    "authenticationMethod": "route",
    "routes": [
      {
        "source": "^/PodPlugins/(.*)$",
        "authenticationType": "none"  // Static resources
      },
      {
        "source": "^/destinations/shiftbook-backend/(.*)$",
        "authenticationType": "xsuaa"  // API calls require auth
      }
    ]
  }
  ```
- Destination configured as `NoAuthentication` with `forwardAuthToken: true`

**2. Lessons Learned - What Didn't Work**

❌ **Separate XSUAA Instances Failed**:
- Initially tried separate `shiftbook-plugin-auth` and `shiftbook-auth` instances
- Result: `Unable to map issuer: Origin claim is missing in the token`
- Root cause: Frontend XSUAA tokens lacked required claims for Destination service validation
- Token exchange between separate instances not supported by SAP Destination service

❌ **Global Authentication "none" Failed**:
- Initial xs-app.json had `"authenticationMethod": "none"` globally
- No JWT tokens were generated
- Users weren't authenticated at all
- Fixed by switching to route-based authentication

**3. Critical Success Factors**

✅ **Route-Based Authentication is Essential**:
```json
{
  "authenticationMethod": "route",  // NOT "none"!
  "routes": [
    {
      "source": "^/backend/(.*)$",
      "authenticationType": "xsuaa"  // Token generation happens here
    }
  ]
}
```

✅ **Destination Token Forwarding**:
```properties
Name=shiftbook-backend
Authentication=NoAuthentication
forwardAuthToken=true
HTML5.DynamicDestination=true
```

✅ **Backend xs-security.json with granted-apps**:
```json
{
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "granted-apps": ["$XSAPPNAME(application, shiftbook-plugin)"]
    }
  ]
}
```

### Implications for Cross-Account Production Scenario

The development environment proves that **within the same account**, shared XSUAA works perfectly. However, for **cross-account production**, this approach won't work because:

1. **Cannot Share XSUAA Across Accounts**: 
   - Each BTP account has isolated XSUAA instances
   - Client's XSUAA cannot be "shared" with our backend

2. **Token Forwarding Won't Work Cross-Account**:
   - `forwardAuthToken: true` only works when destination XSUAA trusts the source XSUAA
   - Cross-account requires explicit trust configuration via OAuth2SAMLBearerAssertion

3. **Scope Validation Challenge**:
   - In dev: Backend validates scopes from same XSUAA where they're issued
   - In prod: Backend must validate scopes from client's XSUAA (different issuer)
   - Requires `foreign-scope-references` and `trusted-client-id-suffixes`

### Migration Path from Dev to Production

```
Development (Same Account)          Production (Cross-Account)
─────────────────────────          ───────────────────────────

Frontend XSUAA: shiftbook-auth  →  Frontend XSUAA: client-xsuaa
Backend XSUAA: shiftbook-auth   →  Backend XSUAA: our-xsuaa

Destination:                       Destination:
- NoAuthentication              →  - OAuth2SAMLBearerAssertion
- forwardAuthToken: true        →  - tokenServiceURL: our-xsuaa
                                   - clientId: our-xsuaa-client
                                   - clientSecret: ***

Backend xs-security.json:          Backend xs-security.json:
- granted-apps: [               →  - trusted-client-id-suffixes:
    "shiftbook-plugin"          →      ["!b*|client-app-id"]
  ]                             →  - foreign-scope-references:
                                       ["uaa.user"]
```

### Testing Strategy

**Phase 1: Validate Dev Environment** ✅ (Already completed)
- Shared XSUAA working
- Token forwarding confirmed
- HTTP 200 responses in production logs

**Phase 2: Create Trust Configuration** (Next step)
1. Configure `trusted-client-id-suffixes` in our backend xs-security.json
2. Add client's XSUAA app-id to trusted list
3. Test with OAuth2SAMLBearerAssertion destination

**Phase 3: Frontend Changes**
1. Update xs-app.json destination route to use cross-account destination
2. Update config.json with client's URLs
3. Test token exchange flow

**Phase 4: Scope Mapping**
1. Define role mappings between client roles and our scopes
2. Implement scope validation in backend
3. Test authorization with different user roles

---

## 📚 References and Resources

### Official SAP Documentation

1. **OAuth Token Exchange**
   - [CAP - Consuming Services (Forward Auth Token)](https://cap.cloud.sap/docs/guides/using-services#forward-auth-token)
   - [SAP Authorization and Trust Management](https://help.sap.com/docs/CP_AUTHORIZ_TRUST_MNG/ae8e8427ecdf407790d96dad93b5f723/6373bb7a96114d619bfdfdc6f505d1b9.html)

2. **IAS Integration**
   - [SAP Cloud Identity Services - Identity Authentication](https://help.sap.com/docs/IDENTITY_AUTHENTICATION)
   - [Establish Trust with SAP IAS](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/cb1bc8f1bd5c482e891063960d7acd78.html)

3. **Destination Service**
   - [SAP BTP Connectivity - Destinations](https://help.sap.com/docs/CP_CONNECTIVITY/cca91383641e40ffbe03bdc78f00f681/e4f1d97cbb571014a247d10f9f9a685d.html)
   - [OAuth2SAMLBearerAssertion](https://help.sap.com/docs/CP_CONNECTIVITY/cca91383641e40ffbe03bdc78f00f681/c69ea6aacd714ad2ae8ceb5fc3ceea56.html)

4. **Cross-Account Scenarios**
   - [SAP BTP Security Guide](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/e129aa20c78c4a9fb379b9803b02e5f6.html)
   - [Multi-Tenancy in CAP](https://cap.cloud.sap/docs/guides/multitenancy/)

5. **SAP Approuter**
   - [@sap/approuter npm package](https://www.npmjs.com/package/@sap/approuter)
   - [Application Router Configuration](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/01c5f9ba7d6847aaaf069d153b981b51.html)
   - [xs-app.json Configuration](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/c19f165084d742a2b8e1bcacb9c8e9c1.html)
   - [Route-Based Authentication](https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/6ba89596e3a64a5480c3977d4ea7fdba.html)

6. **DMC Pod Plugin Development**
   - [SAP Digital Manufacturing Cloud - Pod Plugin Guide](https://help.sap.com/docs/sap-digital-manufacturing)
   - [DMC UI Framework Integration](https://help.sap.com/docs/SAP_DIGITAL_MANUFACTURING_CLOUD/extensions)

### Relevant SAP Community Posts

1. **"Embedding SAP Cloud Portal into Microsoft Teams including SSO"**
   - Practical example of cross-account trust configuration
   - CSP headers and iframe domains configuration

2. **"SAP BTP FAQs - Part 3 (Security)"**
   - Explanation of XSUAA, OAuth, SAML and JWT
   - Differences between platform users and business users

3. **"Strengthening SAP BTP Security: SSO with Cloud Connector"**
   - Token-based authentication
   - Elimination of static credentials

### Tools and Utilities

- **JWT Debugger**: https://jwt.io
- **SAML Tracer**: Plugin for debugging SAML flows
- **Postman Collections**: For OAuth flows testing
- **SAP API Business Hub**: API specifications

---

## 📝 Implementation Notes

### Security Considerations

1. **Token Lifetime**: Configure appropriate lifetimes
   ```json
   "token-validity": 7200,        // 2 hours
   "refresh-token-validity": 86400 // 24 hours
   ```

2. **Minimum Scopes**: Apply least privilege principle
   ```json
   {
     "granted-apps": ["$XSAPPNAME(application, shiftbook-plugin)"]
   }
   ```

3. **Audit Logging**: Implement comprehensive logging
   ```typescript
   cds.on('served', () => {
     cds.log('info').log('Service authenticated', {
       user: req.user.id,
       origin: req.headers.origin,
       timestamp: new Date().toISOString()
     });
   });
   ```

### Testing Checklist

- [ ] Client user can authenticate in DMC
- [ ] Token is exchanged correctly
- [ ] Appropriate scopes are applied in backend
- [ ] Principal propagation maintains original identity
- [ ] Audit logs capture correct user
- [ ] Token timeout and refresh work
- [ ] Authentication errors are handled properly
- [ ] Performance is acceptable (<200ms overhead)

### Success Metrics

| Metric | Target | Measurement |
|---------|--------|----------|
| Token Exchange Latency | <100ms | Prometheus metrics |
| Authentication Success Rate | >99% | Application logs |
| User Experience (SSO) | Seamless | User feedback |
| Security Incidents | 0 | Audit logs review |

---

## 🔄 Document Versioning

| Version | Date | Author | Changes |
|---------|-------|-------|---------|
| 1.0 | 2025-10-23 | GitHub Copilot | Initial document with 3 proposed solutions |
| 1.1 | 2025-10-23 | GitHub Copilot | Added frontend repository analysis from shift-book-pod-plugin:<br>- Frontend architecture (Approuter + UI5)<br>- Current xs-security.json and xs-app.json configurations<br>- Frontend-specific authentication challenges<br>- DMC Pod Plugin constraints (CORS, iframe embedding)<br>- Token scope mismatch analysis<br>- Development environment learnings (shared XSUAA pattern)<br>- Migration path from dev to production cross-account<br>- Updated Solution 1 with frontend implementation details<br>- Added Approuter and DMC references |
| 1.2 | 2025-10-23 | GitHub Copilot | Updated code examples to reflect latest frontend patterns:<br>- Replaced DESTINATION constant with _buildApiUrl() method<br>- Updated backend communication pattern to use centralized URL building<br>- Added X-Dme-Plant header in fetch examples<br>- Aligned with remote main branch improvements (13 commits ahead) |

---

**End of Analysis**

