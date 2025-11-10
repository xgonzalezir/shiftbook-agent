# Cross-Subaccount Integration Setup Guide

## Your Scenario: Two XSUAA Instances

You have a **cross-subaccount** integration with **two separate XSUAA instances**:

| Component | Subaccount | Region | XSUAA Instance | Purpose |
|-----------|------------|--------|----------------|---------|
| **Frontend (DMC Plugin)** | `syntax-dmc-demo` | EU20-quality | XSUAA #1 (Frontend) | Authenticates DMC users |
| **Backend (CAP Service)** | `gbi-manu-dev` | US10 | XSUAA #2 (Backend) | Authorizes backend access |

**This is the standard pattern** for cross-subaccount integrations. Each subaccount has its own XSUAA instance.

The frontend needs to call the backend with proper authentication and authorization, which requires **token exchange** between the two XSUAA instances.

## The Challenge: Two Different XSUAA Instances

When a user authenticates in the DMC application (syntax-dmc-demo), they get a JWT token issued by **Frontend XSUAA #1**:
```
Issuer: syntax-dmc-demo.authentication.eu20.hana.ondemand.com
Audience: execution-dmc-sap-quality (or similar)
Scopes: DMC-specific scopes
```

But your backend service only accepts tokens issued by **Backend XSUAA #2**:
```
Issuer: gbi-manu-dev.authentication.us10.hana.ondemand.com
Audience: shiftbook-srv!t459223
Scopes: Backend-specific scopes (operator, admin)
```

**The backend will reject Frontend XSUAA tokens directly** - this is why you're getting authentication redirects.

## Solution Architecture: Token Exchange Between Two XSUAA Instances

You need to configure a **BTP Destination with OAuth2UserTokenExchange** authentication in the DMC subaccount that:
1. Accepts the user's DMC token (from Frontend XSUAA #1)
2. Exchanges it for a valid backend token (from Backend XSUAA #2)
3. Forwards requests to the backend with the exchanged token
4. Preserves user identity throughout the exchange

**Key Concept**: The Destination Service acts as a bridge between the two XSUAA instances, automatically performing OAuth2 token exchange.

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  DMC Subaccount (syntax-dmc-demo, EU20)                              │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  XSUAA Instance #1 (Frontend XSUAA)                            │ │
│  │  xsappname: execution-dmc-sap-quality                          │ │
│  │  Issuer: syntax-dmc-demo.authentication.eu20...                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│         │ Issues Token #1 (Frontend Token)                           │
│         ↓                                                             │
│  ┌──────────────┐       ┌──────────────────────────────────────┐   │
│  │  DMC Plugin  │──────▶│ BTP Destination Service              │   │
│  │  (Frontend)  │       │                                       │   │
│  └──────────────┘       │  Destination: shiftbook-backend      │   │
│    Sends Token #1       │  Auth: OAuth2UserTokenExchange       │   │
│    (Frontend Token)     │                                       │   │
│                         │  - Receives: Token #1                │   │
│                         │  - Calls: Backend XSUAA              │   │
│                         │  - Gets: Token #2                    │   │
│                         └───────────┬──────────────────────────┘   │
│                                     │ Token Exchange Request         │
│                                     │ (JWT Bearer grant)             │
└─────────────────────────────────────┼────────────────────────────────┘
                                      │
                     POST /oauth/token with:
                     - grant_type: jwt-bearer
                     - assertion: Token #1
                     - client_id: backend-client
                     - scope: operator, admin
                                      ↓
┌──────────────────────────────────────────────────────────────────────┐
│  Manu-Dev Subaccount (gbi-manu-dev, US10)                            │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  XSUAA Instance #2 (Backend XSUAA)                             │ │
│  │  xsappname: shiftbook-srv!t459223                              │ │
│  │  Issuer: gbi-manu-dev.authentication.us10...                   │ │
│  │                                                                 │ │
│  │  Trust Configuration (xs-security.json):                       │ │
│  │  - granted-apps: execution-dmc-sap-quality ← Frontend XSUAA!   │ │
│  │  - $ACCEPT_GRANTED_AUTHORITIES                                 │ │
│  │                                                                 │ │
│  │  Validation:                                                    │ │
│  │  1. ✓ Token #1 signature valid?                               │ │
│  │  2. ✓ Issuer is Frontend XSUAA?                               │ │
│  │  3. ✓ Frontend XSUAA in granted-apps?                         │ │
│  │  4. ✓ Client credentials correct?                             │ │
│  │  5. → Issue Token #2 (Backend Token)                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│         │ Issues Token #2 (Backend Token)                            │
│         ↓                                                             │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Shiftbook Backend (CAP Service)                                │ │
│  │                                                                  │ │
│  │  Receives: Token #2 (Backend Token)                            │ │
│  │  Validates:                                                     │ │
│  │    - Issuer: gbi-manu-dev XSUAA ✓                             │ │
│  │    - Scopes: operator/admin ✓                                  │ │
│  │    - Signature valid ✓                                         │ │
│  │  → Processes request with user identity                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Configuration

### Step 1: Establish XSUAA Trust Between Subaccounts

You need to establish OAuth trust so that syntax-dmc-demo can exchange tokens for gbi-manu-dev.

#### 1.1 Get the OAuth Configuration from gbi-manu-dev

1. Log in to BTP Cockpit
2. Navigate to the **gbi-manu-dev** subaccount (US10)
3. Go to **Cloud Foundry** > **Spaces** > **manu-dev**
4. Go to **Service Instances** > **shiftbook-auth** (your XSUAA instance)
5. Click **View Credentials** or create a service key:
   ```bash
   cf target -o your-org -s manu-dev
   cf create-service-key shiftbook-auth cross-subaccount-key
   cf service-key shiftbook-auth cross-subaccount-key
   ```

6. Note these values from the credentials:
   - `clientid`: e.g., `sb-shiftbook-srv!t459223`
   - `clientsecret`: The secret value
   - `url`: e.g., `https://gbi-manu-dev.authentication.us10.hana.ondemand.com`
   - `xsappname`: e.g., `shiftbook-srv!t459223`
   - `identityzone`: e.g., `gbi-manu-dev`

#### 1.2 Grant Access in Backend XSUAA (gbi-manu-dev)

Your [xs-security.json](../xs-security.json) already has the proper configuration:

```json
{
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "granted-apps": ["$XSAPPNAME(application, shiftbook-plugin)"]
    },
    {
      "name": "$XSAPPNAME.admin",
      "granted-apps": ["$XSAPPNAME(application, shiftbook-plugin)"]
    }
  ],
  "authorities": [
    "$ACCEPT_GRANTED_AUTHORITIES"
  ]
}
```

The key parts:
- `granted-apps`: Specifies which applications can use these scopes
- `$ACCEPT_GRANTED_AUTHORITIES`: Allows accepting authorities from trusted applications
- `$XSAPPNAME(application, shiftbook-plugin)`: References the DMC plugin application

**Important**: The `shiftbook-plugin` must match the xsappname of your DMC plugin's XSUAA instance.

### Step 2: Configure the DMC Plugin XSUAA (syntax-dmc-demo)

The DMC plugin needs to request access to the backend scopes.

#### 2.1 Update DMC Plugin xs-security.json

Add the backend scopes to the DMC plugin's xs-security.json:

```json
{
  "xsappname": "shiftbook-plugin",
  "tenant-mode": "dedicated",
  "scopes": [
    {
      "name": "uaa.user",
      "description": "UAA user"
    }
  ],
  "authorities": [
    "shiftbook-srv!t459223.operator",
    "shiftbook-srv!t459223.admin"
  ],
  "oauth2-configuration": {
    "grant-types": [
      "authorization_code",
      "urn:ietf:params:oauth:grant-type:jwt-bearer"
    ]
  }
}
```

Key changes:
- Add the backend scopes to `authorities`
- Include `urn:ietf:params:oauth:grant-type:jwt-bearer` in grant types (required for token exchange)

#### 2.2 Redeploy the DMC Plugin

After updating xs-security.json, redeploy the plugin or update the XSUAA service:

```bash
cf update-service <dmc-plugin-xsuaa-instance> -c xs-security.json
```

### Step 3: Create the Destination in syntax-dmc-demo

This is the critical step that makes the token exchange work.

#### 3.1 Create Destination via BTP Cockpit

1. Log in to BTP Cockpit
2. Navigate to **syntax-dmc-demo** subaccount (EU20)
3. Go to **Connectivity** > **Destinations**
4. Click **New Destination**
5. Configure as follows:

**Basic Configuration:**
```
Name: shiftbook-backend
Type: HTTP
URL: https://<your-backend-app-url>.cfapps.us10.hana.ondemand.com
Proxy Type: Internet
Authentication: OAuth2UserTokenExchange
```

**OAuth2 Token Exchange Configuration:**
```
Token Service URL Type: Dedicated
Token Service URL: https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token
Client ID: sb-shiftbook-srv!t459223
Client Secret: <secret from step 1.1>
```

**Additional Properties:**
```
HTML5.DynamicDestination: true
WebIDEEnabled: true
WebIDEUsage: odata_gen
```

**System User (Optional, for technical user scenarios):**
If you also need a technical/system user for background jobs:
```
System User: <technical-user-name>
```

#### 3.2 Test the Destination

Create a test script to verify the destination works:

```javascript
const { getDestination } = require('@sap-cloud-sdk/connectivity');

async function testDestination() {
  try {
    const destination = await getDestination({
      destinationName: 'shiftbook-backend',
      jwt: '<user-jwt-token-from-dmc>'
    });

    console.log('Destination retrieved:', destination);
    console.log('URL:', destination.url);
    console.log('Auth tokens:', destination.authTokens ? 'Present' : 'Missing');
  } catch (error) {
    console.error('Failed:', error.message);
  }
}
```

### Step 4: Update Frontend Code to Use Destination

In your DMC plugin frontend code, make HTTP requests using the destination:

#### Using SAP Cloud SDK (Recommended)

```typescript
import { executeHttpRequest } from '@sap-cloud-sdk/connectivity';

async function callBackend() {
  try {
    const response = await executeHttpRequest(
      {
        destinationName: 'shiftbook-backend',
      },
      {
        method: 'GET',
        url: '/shiftbookService/getShiftbookLogPaginated',
      }
    );

    return response.data;
  } catch (error) {
    console.error('Backend call failed:', error);
    throw error;
  }
}
```

#### Using the Destination Proxy Pattern

The DMC execution environment provides a proxy that handles destination resolution:

```javascript
// Frontend makes request to:
const url = '/destination/shiftbook-backend/shiftbookService/getShiftbookLogPaginated';

fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`, // User's DMC token
    'Content-Type': 'application/json'
  }
})
```

The DMC gateway will:
1. Intercept the request at `/destination/shiftbook-backend/`
2. Look up the destination configuration
3. Perform OAuth2UserTokenExchange (user token → backend token)
4. Forward the request to the backend with the new token
5. Return the backend response

### Step 5: Configure Role Mappings

Users need to have the proper roles assigned in **both** subaccounts.

#### 5.1 In gbi-manu-dev Subaccount

Assign backend roles to the DMC plugin application:

1. Go to **Security** > **Role Collections**
2. Find or create role collections:
   - `shiftbook.operator`
   - `shiftbook.admin`
3. Assign the DMC plugin application to these role collections

#### 5.2 In syntax-dmc-demo Subaccount

Assign DMC roles to actual users:

1. Go to **Security** > **Trust Configuration**
2. Click on your identity provider
3. Assign users to appropriate role collections
4. Users should have both:
   - DMC roles (for accessing DMC)
   - Shiftbook roles (which will be propagated to backend)

### Step 6: Verify the Complete Flow

#### 6.1 Test Authentication Flow

```bash
# Get a user token from DMC
# (This would typically be done by logging in to DMC)

# Test the destination from a Cloud Foundry app
cf ssh <dmc-app-name>
cd app
node test-destination.js
```

#### 6.2 Check Backend Logs

Monitor the backend to see if requests are being received with valid tokens:

```bash
cf logs shiftbook-srv --recent | grep "Authentication"
```

Look for successful authentication with the exchanged token.

#### 6.3 Verify Token Contents

Add logging in your backend to verify the token:

```typescript
// In your CAP service handler
srv.before('*', (req) => {
  const user = req.user;
  console.log('User scopes:', user.attr.scopes);
  console.log('User ID:', user.id);
  console.log('Token issuer:', user.tokenInfo?.getPayload()?.iss);
});
```

You should see:
- Issuer: `gbi-manu-dev.authentication.us10.hana.ondemand.com`
- Scopes including: `shiftbook-srv!t459223.admin` or `.operator`

## Common Issues and Troubleshooting

### Issue 1: "Redirect to authentication page"

**Symptom**: Getting HTML redirect instead of JSON response

**Cause**: Token exchange is not happening - the DMC gateway doesn't recognize your token

**Solution**:
- Verify the destination has `Authentication: OAuth2UserTokenExchange`
- Check that `Token Service URL` points to gbi-manu-dev XSUAA
- Verify client credentials are correct

### Issue 2: "403 Forbidden" or "Insufficient scope"

**Symptom**: Request reaches backend but is rejected

**Cause**: Token exchange worked, but the exchanged token doesn't have required scopes

**Solution**:
- Verify `granted-apps` in backend xs-security.json includes the DMC plugin xsappname
- Check that DMC plugin's authorities include the backend scopes
- Verify `$ACCEPT_GRANTED_AUTHORITIES` is present in backend authorities
- Assign proper role collections to users

### Issue 3: "Destination not found"

**Symptom**: 404 error when calling `/destination/shiftbook-backend/...`

**Cause**: Destination is not configured in the DMC subaccount

**Solution**:
- Create the destination in syntax-dmc-demo subaccount
- Verify the destination name matches exactly: `shiftbook-backend`
- Check that the DMC application has the destination service bound

### Issue 4: "Invalid client credentials"

**Symptom**: Token exchange fails with authentication error

**Cause**: Wrong client ID or secret in destination configuration

**Solution**:
- Get fresh credentials from gbi-manu-dev XSUAA service key
- Update destination with correct `Client ID` and `Client Secret`
- Ensure no trailing spaces or encoding issues in credentials

### Issue 5: "Token expired"

**Symptom**: Initial calls work, then start failing after some time

**Cause**: Cached tokens have expired

**Solution**:
- The destination service should automatically refresh tokens
- Verify `token-validity` in xs-security.json is appropriate (7200s = 2 hours)
- Check that `refresh_token` grant type is enabled

## Security Considerations

### 1. Token Scope Limitation

Use the principle of least privilege:
```json
{
  "granted-apps": [
    "$XSAPPNAME(application, shiftbook-plugin)"
  ]
}
```

Only grant access to specific applications, not all applications.

### 2. Audience Restriction

The backend should validate the token audience:
```typescript
// CAP handles this automatically via xs-security.json
// Ensure xsappname is unique and specific
```

### 3. Transport Security

Always use HTTPS:
- Destination URL should use `https://`
- Token Service URL should use `https://`
- All communication is encrypted

### 4. Credential Management

Never hardcode credentials:
- Store client secrets in BTP destination configuration
- Use service keys for testing only
- Rotate credentials regularly

### 5. Role-Based Access Control

Implement proper authorization checks:
```javascript
// In CAP service
@requires: 'operator'
service ShiftbookService {
  // Only users with operator role can access
}
```

## Testing Checklist

- [ ] XSUAA trust established between subaccounts
- [ ] Backend xs-security.json has `granted-apps` and `$ACCEPT_GRANTED_AUTHORITIES`
- [ ] DMC plugin xs-security.json has backend scopes in `authorities`
- [ ] Destination created in syntax-dmc-demo with OAuth2UserTokenExchange
- [ ] Destination has correct Token Service URL (gbi-manu-dev)
- [ ] Destination has valid client credentials
- [ ] Users assigned to proper role collections in both subaccounts
- [ ] Frontend code uses destination proxy pattern
- [ ] Backend receives requests with valid tokens
- [ ] Backend logs show correct token issuer (gbi-manu-dev)
- [ ] Authorization checks work correctly

## Example: Complete xs-security.json for Backend

```json
{
  "xsappname": "shiftbook-srv",
  "tenant-mode": "dedicated",
  "description": "Security for Shift Book Backend",
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "description": "Operator - Read/Create logs",
      "granted-apps": [
        "$XSAPPNAME(application, shiftbook-plugin)",
        "$XSAPPNAME(application, execution-dmc-sap-quality)"
      ]
    },
    {
      "name": "$XSAPPNAME.admin",
      "description": "Admin - Full access",
      "granted-apps": [
        "$XSAPPNAME(application, shiftbook-plugin)",
        "$XSAPPNAME(application, execution-dmc-sap-quality)"
      ]
    },
    {
      "name": "uaa.user",
      "description": "UAA user for propagation"
    }
  ],
  "attributes": [],
  "authorities": [
    "$XSAPPNAME.operator",
    "$XSAPPNAME.admin",
    "uaa.user",
    "$ACCEPT_GRANTED_AUTHORITIES"
  ],
  "role-templates": [
    {
      "name": "operator",
      "description": "Operator Role",
      "scope-references": ["$XSAPPNAME.operator"],
      "attribute-references": []
    },
    {
      "name": "admin",
      "description": "Admin Role",
      "scope-references": ["$XSAPPNAME.admin"],
      "attribute-references": []
    }
  ],
  "oauth2-configuration": {
    "token-validity": 7200,
    "refresh-token-validity": 86400,
    "grant-types": [
      "client_credentials",
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "user_token",
      "refresh_token"
    ]
  }
}
```

Key additions:
- `execution-dmc-sap-quality` in granted-apps (the DMC application xsappname)
- All necessary grant types for token exchange

## References

- [SAP BTP Destination Service Documentation](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/create-destination)
- [OAuth2UserTokenExchange Authentication](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/oauth-user-token-exchange-authentication)
- [XSUAA Trust Configuration](https://help.sap.com/docs/btp/sap-business-technology-platform/trust-and-federation-with-identity-providers)
- [CAP Security Guide](https://cap.cloud.sap/docs/guides/security/)
- [SAP Cloud SDK Connectivity](https://sap.github.io/cloud-sdk/docs/js/features/connectivity/destination)

## Summary

To enable cross-subaccount access:

1. **Establish trust** via `granted-apps` in backend xs-security.json
2. **Configure destination** with OAuth2UserTokenExchange in DMC subaccount
3. **Request scopes** in DMC plugin authorities
4. **Use destination proxy** pattern in frontend code
5. **Assign roles** to users in both subaccounts
6. **Test thoroughly** with actual user tokens

The BTP platform will handle the token exchange automatically when properly configured.
