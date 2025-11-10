# Understanding Two XSUAA Instances in Cross-Subaccount Integration

## Overview

When you have a frontend in one BTP subaccount and a backend in another, you have **two separate XSUAA instances**. This is the standard and correct pattern for cross-subaccount integrations.

## Your Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend Subaccount: syntax-dmc-demo (EU20-quality)            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  XSUAA Instance #1 (Frontend XSUAA)                      │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  Name: execution-dmc-sap-quality (or similar)            │  │
│  │  Region: EU20                                             │  │
│  │  Purpose: Authenticate DMC users                         │  │
│  │  Issues: User tokens for DMC application                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         │ User authenticates                                    │
│         ↓                                                        │
│  ┌──────────────────┐                                           │
│  │  DMC Application │                                           │
│  │  (Frontend)      │                                           │
│  └──────────────────┘                                           │
│         │                                                        │
│         │ Makes API call with Token #1                          │
│         ↓                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BTP Destination Service                                  │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  Destination: shiftbook-backend                          │  │
│  │  Auth: OAuth2UserTokenExchange                           │  │
│  │                                                           │  │
│  │  Receives: Token #1 (from Frontend XSUAA)               │  │
│  │  Action: Exchange with Backend XSUAA                     │  │
│  │  Sends: Token #2 (from Backend XSUAA)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         │ Token Exchange Request                                │
│         ↓                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │
          │ grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
          │ assertion=<Token #1>
          │ client_id=sb-shiftbook-srv!t459223
          │ scope=shiftbook-srv!t459223.operator
          │
          ↓
┌─────────────────────────────────────────────────────────────────┐
│  Backend Subaccount: gbi-manu-dev (US10)                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  XSUAA Instance #2 (Backend XSUAA)                       │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  Name: shiftbook-srv!t459223                             │  │
│  │  Region: US10                                             │  │
│  │  Purpose: Authorize backend access                       │  │
│  │  Issues: Backend tokens for CAP service                  │  │
│  │                                                           │  │
│  │  Trust Configuration:                                     │  │
│  │  - Trusts Frontend XSUAA via granted-apps                │  │
│  │  - Validates token exchange requests                     │  │
│  │  - Issues tokens with backend scopes                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│         │                                                        │
│         │ Validates trust & issues Token #2                     │
│         ↓                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Shiftbook Backend (CAP Service)                          │  │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  │
│  │  Receives: Token #2 (from Backend XSUAA)                │  │
│  │  Validates: Token issuer is gbi-manu-dev                 │  │
│  │  Checks: User has required scopes (operator/admin)       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Token Comparison

### Token #1: Frontend Token (from XSUAA #1)

```json
{
  "jti": "abc123...",
  "ext_attr": {
    "enhancer": "XSUAA",
    "subaccountid": "syntax-dmc-demo-subaccount-id",
    "zdn": "syntax-dmc-demo"
  },
  "xs.system.attributes": {
    "xs.rolecollections": ["DMC_Operator", ...]
  },
  "sub": "user@example.com",
  "iss": "https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com/oauth/token",
  "aud": [
    "execution-dmc-sap-quality",
    "sb-execution-dmc-sap-quality!t123"
  ],
  "scope": [
    "execution-dmc-sap-quality.Display",
    "execution-dmc-sap-quality.Modify",
    "uaa.user"
  ],
  "client_id": "sb-execution-dmc-sap-quality!t123",
  "cid": "sb-execution-dmc-sap-quality!t123",
  "azp": "sb-execution-dmc-sap-quality!t123",
  "grant_type": "authorization_code",
  "user_id": "user@example.com",
  "origin": "sap.default",
  "user_name": "user@example.com",
  "email": "user@example.com",
  "auth_time": 1234567890,
  "rev_sig": "xyz789...",
  "iat": 1234567890,
  "exp": 1234578890,
  "zid": "syntax-dmc-demo-zone-id"
}
```

**Key characteristics:**
- **Issuer**: syntax-dmc-demo XSUAA (EU20)
- **Audience**: DMC application
- **Scopes**: DMC-specific scopes
- **Purpose**: Proves user is authenticated in DMC
- **Valid for**: DMC application only
- **Won't work for**: Backend service (different issuer)

### Token #2: Backend Token (from XSUAA #2)

After token exchange:

```json
{
  "jti": "def456...",
  "ext_attr": {
    "enhancer": "XSUAA",
    "subaccountid": "gbi-manu-dev-subaccount-id",
    "zdn": "gbi-manu-dev"
  },
  "xs.system.attributes": {
    "xs.rolecollections": ["shiftbook.operator", ...]
  },
  "sub": "user@example.com",
  "iss": "https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token",
  "aud": [
    "shiftbook-srv!t459223",
    "sb-shiftbook-srv!t459223"
  ],
  "scope": [
    "shiftbook-srv!t459223.operator",
    "shiftbook-srv!t459223.admin",
    "uaa.user"
  ],
  "client_id": "sb-execution-dmc-sap-quality!t123",  // Original client preserved
  "cid": "sb-shiftbook-srv!t459223",  // Backend client for technical access
  "azp": "sb-execution-dmc-sap-quality!t123",  // Authorized party (original app)
  "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
  "user_id": "user@example.com",  // User identity preserved
  "origin": "sap.default",
  "user_name": "user@example.com",
  "email": "user@example.com",
  "auth_time": 1234567890,  // Original auth time preserved
  "rev_sig": "uvw012...",
  "iat": 1234568900,  // New issuance time
  "exp": 1234579900,  // New expiration
  "zid": "gbi-manu-dev-zone-id"
}
```

**Key characteristics:**
- **Issuer**: gbi-manu-dev XSUAA (US10)
- **Audience**: Backend service
- **Scopes**: Backend-specific scopes (operator/admin)
- **Purpose**: Authorizes user for backend operations
- **Valid for**: Backend CAP service
- **User identity**: Preserved from original token
- **Client identity**: Shows where request came from (azp)

## The Token Exchange Process (Step by Step)

### Step 1: User Authenticates in DMC

```javascript
// User logs in to DMC application
POST https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com/oauth/authorize
→ Returns: Token #1 (Frontend token)
```

### Step 2: Frontend Calls Backend via Destination

```javascript
// Frontend code
fetch('/destination/shiftbook-backend/shiftbookService/getShiftbookLogPaginated', {
  headers: {
    'Authorization': 'Bearer <Token #1>'  // Frontend token
  }
});
```

### Step 3: DMC Gateway Intercepts Request

```javascript
// DMC Execution Gateway receives:
GET /destination/shiftbook-backend/shiftbookService/getShiftbookLogPaginated
Authorization: Bearer <Token #1>

// Gateway extracts:
// - Destination name: "shiftbook-backend"
// - User token: Token #1
// - Request path: "/shiftbookService/getShiftbookLogPaginated"
```

### Step 4: Destination Service Performs Token Exchange

```javascript
// Destination Service looks up "shiftbook-backend" configuration
// Sees: Authentication = OAuth2UserTokenExchange

// Makes token exchange request to Backend XSUAA:
POST https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion=<Token #1>  // The frontend token
&client_id=sb-shiftbook-srv!t459223  // Backend client ID
&client_secret=<secret>  // Backend client secret
&scope=shiftbook-srv!t459223.operator shiftbook-srv!t459223.admin
```

### Step 5: Backend XSUAA Validates and Issues New Token

```javascript
// Backend XSUAA receives token exchange request
// Validation steps:

1. Validates Token #1:
   ✓ Signature is valid
   ✓ Not expired
   ✓ Issued by trusted XSUAA

2. Checks Trust Configuration:
   ✓ Token #1 is from "execution-dmc-sap-quality"
   ✓ This app is in granted-apps for requested scopes
   ✓ $ACCEPT_GRANTED_AUTHORITIES is enabled

3. Validates Client Credentials:
   ✓ client_id matches
   ✓ client_secret is correct

4. Issues Token #2:
   ✓ New token with backend issuer
   ✓ Contains requested scopes
   ✓ Preserves user identity
   ✓ Records original client in azp

// Returns: Token #2 (Backend token)
```

### Step 6: Request Forwarded to Backend

```javascript
// Destination Service forwards request to backend:
GET https://shiftbook-srv.cfapps.us10.hana.ondemand.com/shiftbookService/getShiftbookLogPaginated
Authorization: Bearer <Token #2>  // Backend token!
```

### Step 7: Backend Validates Token

```javascript
// CAP service validates Token #2:
1. Checks issuer: gbi-manu-dev XSUAA ✓
2. Checks audience: shiftbook-srv!t459223 ✓
3. Validates signature ✓
4. Checks scopes: operator/admin ✓
5. Extracts user: user@example.com ✓

// Authorization successful → Processes request
```

## Configuration Requirements

### Backend XSUAA (gbi-manu-dev) - xs-security.json

```json
{
  "xsappname": "shiftbook-srv",
  "tenant-mode": "dedicated",
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "description": "Operator - Read/Create logs",
      "granted-apps": [
        "$XSAPPNAME(application, execution-dmc-sap-quality)"
        // ^^^ Frontend XSUAA xsappname - THIS IS CRITICAL!
      ]
    },
    {
      "name": "$XSAPPNAME.admin",
      "description": "Admin - Full access",
      "granted-apps": [
        "$XSAPPNAME(application, execution-dmc-sap-quality)"
      ]
    }
  ],
  "authorities": [
    "$XSAPPNAME.operator",
    "$XSAPPNAME.admin",
    "$ACCEPT_GRANTED_AUTHORITIES"
    // ^^^ Enables accepting tokens from granted-apps
  ],
  "oauth2-configuration": {
    "grant-types": [
      "client_credentials",
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      // ^^^ Required for token exchange
      "user_token",
      "refresh_token"
    ]
  }
}
```

### Destination Configuration (syntax-dmc-demo)

In BTP Cockpit → Connectivity → Destinations:

```properties
# Basic
Name=shiftbook-backend
Type=HTTP
URL=https://shiftbook-srv.cfapps.us10.hana.ondemand.com
ProxyType=Internet
Authentication=OAuth2UserTokenExchange

# OAuth2 Configuration
tokenServiceURLType=Dedicated
tokenServiceURL=https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token
clientId=sb-shiftbook-srv!t459223
clientSecret=<backend-xsuaa-secret>

# Additional Properties
HTML5.DynamicDestination=true
WebIDEEnabled=true
```

## Finding the Frontend XSUAA xsappname

This is the **critical piece of information** you need. Use the provided script:

```bash
./scripts/check-dmc-xsappname.sh
```

Or manually:

```bash
# Target DMC space
cf target -o <org> -s <dmc-space>

# Get DMC app environment
cf env <dmc-app-name> | grep xsappname
```

Common values:
- `execution-dmc-sap-quality` (for SAP DMC Quality)
- `execution-dmc-sap-prod` (for SAP DMC Production)
- `syntax-dmc-demo` (might be custom)

## Common Misunderstandings

### ❌ Misconception: "I need to share one XSUAA between subaccounts"

**Reality**: You **cannot** share XSUAA instances across subaccounts. Each subaccount has its own XSUAA instances.

### ❌ Misconception: "Both tokens should have the same scopes"

**Reality**: Tokens have **different scopes**:
- Frontend token has DMC scopes
- Backend token has backend scopes

### ❌ Misconception: "The frontend token should work directly with backend"

**Reality**: The backend **only accepts tokens from its own XSUAA**. That's why token exchange is necessary.

### ❌ Misconception: "I need to configure the DMC XSUAA"

**Reality**: If using **standard SAP DMC**, you don't control its XSUAA. You only configure your **backend XSUAA** to trust it.

## Troubleshooting

### Issue: "How do I know if token exchange is working?"

Check the token issuer in backend logs:

```typescript
// Add to your CAP service
srv.before('*', (req) => {
  const tokenIssuer = req.user.tokenInfo?.getPayload()?.iss;
  console.log('Token issuer:', tokenIssuer);

  // Should be: https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token
  // NOT: https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com/oauth/token
});
```

### Issue: "Token exchange fails with 'unauthorized_client'"

**Cause**: Backend XSUAA doesn't trust the frontend XSUAA

**Fix**: Add frontend xsappname to `granted-apps` in backend xs-security.json

### Issue: "Token exchange works but user has no scopes"

**Cause**: Frontend XSUAA doesn't request backend scopes, or user not assigned to role collections

**Fix**:
1. Verify role collections are assigned to users
2. Check that `granted-apps` includes the frontend xsappname

## Summary

✅ **Two XSUAA instances** is the standard pattern for cross-subaccount integration

✅ **Token exchange** is automatic via OAuth2UserTokenExchange destination

✅ **Trust is established** via `granted-apps` in backend xs-security.json

✅ **User identity is preserved** across token exchange

✅ **Each XSUAA** controls its own scopes and authorization

The key is properly configuring the trust relationship so Backend XSUAA will issue tokens when requested by the trusted Frontend XSUAA.
