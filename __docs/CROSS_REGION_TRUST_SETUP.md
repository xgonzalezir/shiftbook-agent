# Cross-Region XSUAA Trust Setup (EU20 ↔ US10)

## Problem Identified

The OAuth2UserTokenExchange is failing with:

```
"error": "unauthorized",
"error_description": "Unable to map issuer: No identity provider found for issuer:
https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com/oauth/token."
```

### Root Cause

The backend XSUAA in `gbi-manu-dev` (US10 region) **does not recognize** the frontend XSUAA from `syntax-dmc-demo` (EU20 region) as a trusted identity provider.

**The `granted-apps` configuration in xs-security.json is necessary but NOT sufficient** for cross-region trust.

## Architecture

```
┌──────────────────────────────────────────────────┐
│  Frontend Subaccount: syntax-dmc-demo (EU20)     │
│                                                   │
│  XSUAA Issuer:                                    │
│  https://syntax-dmc-demo.authentication.         │
│         eu20.hana.ondemand.com/oauth/token        │
│                                                   │
│  Client ID: sb-execution-dmc-sap-quality!t330    │
│  Signing Key: default-jwt-key-1695493128          │
└──────────────────────┬────────────────────────────┘
                       │
                       │ Token Exchange Request
                       │ ❌ FAILS: "Unable to map issuer"
                       ↓
┌──────────────────────────────────────────────────┐
│  Backend Subaccount: gbi-manu-dev (US10)         │
│                                                   │
│  XSUAA Instance: shiftbook-auth                   │
│  Client ID: sb-shiftbook-srv!t459223              │
│  Signing Key: default-jwt-key-9e7082302e          │
│                                                   │
│  ❌ Does NOT trust EU20 XSUAA issuer              │
└──────────────────────────────────────────────────┘
```

## Solution: Establish Cross-Region Trust

You need to configure the backend subaccount (`gbi-manu-dev`) to trust the frontend subaccount (`syntax-dmc-demo`) as an identity provider.

### Option 1: Custom Trust Configuration (Recommended)

1. **Get Frontend XSUAA Details**

   From the `syntax-dmc-demo` subaccount:
   - Log in to BTP Cockpit → `syntax-dmc-demo` subaccount
   - Go to **Cloud Foundry** → **Spaces** → (DMC space)
   - Find the **XSUAA service instance** for DMC
   - Create a service key or view existing credentials

   Note:
   - **Issuer**: `https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com`
   - **JWKS URI**: `https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com/token_keys`

2. **Configure Backend Trust**

   In the `gbi-manu-dev` subaccount:

   **A. Via BTP Cockpit (if supported):**

   - Go to BTP Cockpit → `gbi-manu-dev` subaccount
   - Navigate to **Security** → **Trust Configuration**
   - Click **New Trust Configuration**
   - Select **Custom Trust Configuration**
   - Enter:
     - **Name**: `syntax-dmc-demo-xsuaa`
     - **Description**: `Trust for DMC frontend in EU20`
     - **Origin Key**: `syntax-dmc-demo`
     - **Identity Provider**: Copy SAML metadata or OIDC configuration from frontend XSUAA
     - **JWKS Endpoint**: `https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com/token_keys`

   **B. Via xs-security.json (Alternative):**

   Add to your `xs-security.json`:

   ```json
   {
     "xsappname": "shiftbook-srv",
     "tenant-mode": "dedicated",
     "foreign-scope-references": [
       "sb-execution-dmc-sap-quality!t330.Display",
       "sb-execution-dmc-sap-quality!t330.Modify"
     ],
     "oauth2-configuration": {
       "allowedproviders": [
         "syntax-dmc-demo"
       ],
       "grant-types": [
         "client_credentials",
         "urn:ietf:params:oauth:grant-type:jwt-bearer",
         "user_token",
         "refresh_token"
       ]
     }
   }
   ```

### Option 2: Subaccount Trust Establishment

Establish a trust relationship at the subaccount level:

1. **In Backend Subaccount (gbi-manu-dev)**:

   - BTP Cockpit → `gbi-manu-dev` subaccount
   - **Security** → **Trust Configuration** → **Establish Trust**
   - Select **Custom SAP ID Service** or **Other Identity Provider**
   - Configure with frontend XSUAA details

2. **Metadata Exchange**:

   Get metadata from frontend XSUAA:
   ```bash
   curl https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com/saml/metadata
   ```

   Import this metadata into backend trust configuration.

### Option 3: Use SAP Cloud Identity Services (IAS)

If both subaccounts are connected to SAP Cloud Identity Services:

1. Configure both XSUAA instances to use the same IAS tenant
2. Set up trust through the central IAS tenant
3. This allows cross-region, cross-subaccount authentication

## Implementation Steps

### Step 1: Verify Current Configuration

✅ **Already Done:**
- [x] xs-security.json has correct `granted-apps`
- [x] XSUAA service updated
- [x] App restarted

### Step 2: Establish Trust

⚠️ **Needs to be done:**

1. **Contact BTP Administrator** for `gbi-manu-dev` subaccount
2. Request to establish trust with `syntax-dmc-demo` XSUAA
3. Provide:
   - Frontend XSUAA issuer: `https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com`
   - Frontend XSUAA JWKS: `https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com/token_keys`
   - Frontend client ID: `sb-execution-dmc-sap-quality!t330`

### Step 3: Update xs-security.json (Additional Configuration)

Add foreign scope references and allowed providers:

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
        "$XSAPPNAME(application, sb-execution-dmc-sap-quality)",
        "$XSAPPNAME(application, execution-dmc-sap-quality)",
        "$XSAPPNAME(application, dmc-quality)",
        "$XSAPPNAME(application, dmc-services-quality)"
      ]
    },
    {
      "name": "$XSAPPNAME.admin",
      "description": "Admin - Full access",
      "granted-apps": [
        "$XSAPPNAME(application, shiftbook-plugin)",
        "$XSAPPNAME(application, sb-execution-dmc-sap-quality)",
        "$XSAPPNAME(application, execution-dmc-sap-quality)",
        "$XSAPPNAME(application, dmc-quality)",
        "$XSAPPNAME(application, dmc-services-quality)"
      ]
    },
    {
      "name": "uaa.user",
      "description": "UAA user for propagation"
    }
  ],
  "foreign-scope-references": [
    "sb-execution-dmc-sap-quality!t330.*"
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
      "scope-references": ["$XSAPPNAME.operator"]
    },
    {
      "name": "admin",
      "description": "Admin Role",
      "scope-references": ["$XSAPPNAME.admin"]
    }
  ],
  "oauth2-configuration": {
    "token-validity": 7200,
    "refresh-token-validity": 86400,
    "allowedproviders": [
      "syntax-dmc-demo"
    ],
    "grant-types": [
      "client_credentials",
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "user_token",
      "refresh_token"
    ]
  }
}
```

Then update:
```bash
cf update-service shiftbook-auth -c xs-security.json
cf restart shiftbook-srv-green
```

### Step 4: Verify Token Exchange

Run the test script:
```bash
./scripts/auth/test-token-exchange.sh "<DMC_TOKEN>"
```

Expected result:
```
✅ Token Exchange SUCCESSFUL!
```

## Alternative Solution: Same-Region Deployment

If cross-region trust cannot be established, consider:

1. **Deploy backend to EU20** (same region as DMC)
2. This allows automatic XSUAA trust within the same landscape
3. The `granted-apps` configuration will work without additional trust setup

## Troubleshooting

### Error: "Unable to map issuer"

**Cause**: Backend XSUAA doesn't recognize frontend XSUAA as trusted IDP

**Solution**:
1. Establish trust configuration in backend subaccount
2. Add `allowedproviders` to oauth2-configuration
3. Contact BTP administrator if you don't have permissions

### Error: "Unknown signing key"

**Cause**: Trust is established but signing key not fetched

**Solution**:
1. Restart XSUAA service: `cf update-service shiftbook-auth -c xs-security.json`
2. Wait a few minutes for key cache to update
3. Verify JWKS endpoint is accessible from backend region

### Still Not Working?

Check:
1. **Network connectivity**: Can US10 reach EU20 XSUAA endpoints?
2. **Firewall rules**: Are cross-region API calls allowed?
3. **BTP global account**: Are both subaccounts in the same global account?

## References

- [SAP Help: Trust and Federation](https://help.sap.com/docs/btp/sap-business-technology-platform/trust-and-federation-with-identity-providers)
- [SAP Help: OAuth 2.0 Configuration](https://help.sap.com/docs/btp/sap-business-technology-platform/application-security-descriptor-configuration-syntax)
- [SAP Community: Cross-Subaccount Integration](https://community.sap.com/)

## Summary

**The issue is NOT with:**
- ✅ granted-apps configuration (correct)
- ✅ xs-security.json syntax (correct)
- ✅ XSUAA service binding (correct)

**The issue IS with:**
- ❌ **Missing trust relationship between EU20 and US10 XSUAA instances**

**Next Action**: Contact BTP administrator to establish cross-region trust configuration.
