# Cross-Subaccount Setup Checklist

Quick reference for configuring cross-subaccount access from DMC (syntax-dmc-demo) to Backend (gbi-manu-dev).

## Understanding: Two XSUAA Instances

This setup involves **two separate XSUAA instances**:
- **XSUAA #1 (Frontend)**: In syntax-dmc-demo → Authenticates DMC users
- **XSUAA #2 (Backend)**: In gbi-manu-dev → Authorizes backend access

The Destination Service will perform **OAuth2 token exchange** between these two XSUAA instances automatically.

## Prerequisites

- [ ] Backend deployed in **gbi-manu-dev** (US10) with XSUAA #2
- [ ] DMC Plugin deployed in **syntax-dmc-demo** (EU20) with XSUAA #1
- [ ] Admin access to both subaccounts in BTP Cockpit
- [ ] Understanding that you have two separate XSUAA instances

---

## Part 1: Backend Configuration (gbi-manu-dev) - XSUAA #2

### 1. Get Backend XSUAA #2 Credentials

```bash
cf target -o <org> -s manu-dev
cf create-service-key shiftbook-auth cross-subaccount-key
cf service-key shiftbook-auth cross-subaccount-key
```

Note these values:
- [ ] `clientid`: _______________
- [ ] `clientsecret`: _______________
- [ ] `url`: _______________
- [ ] `xsappname`: _______________

### 2. Update Backend xs-security.json to Trust Frontend XSUAA

**CRITICAL**: This establishes trust between XSUAA #2 (backend) and XSUAA #1 (frontend).

Verify [xs-security.json](../xs-security.json) has:

```json
{
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "granted-apps": [
        "$XSAPPNAME(application, execution-dmc-sap-quality)"
        // ^^^ This is the Frontend XSUAA #1 xsappname
        // This tells Backend XSUAA #2: "I trust Frontend XSUAA #1"
      ]
    },
    {
      "name": "$XSAPPNAME.admin",
      "granted-apps": [
        "$XSAPPNAME(application, execution-dmc-sap-quality)"
      ]
    }
  ],
  "authorities": [
    "$ACCEPT_GRANTED_AUTHORITIES"
    // ^^^ This tells Backend XSUAA #2: "Accept tokens exchanged from trusted apps"
  ],
  "oauth2-configuration": {
    "grant-types": [
      "urn:ietf:params:oauth:grant-type:jwt-bearer"
      // ^^^ This enables OAuth2 token exchange (JWT Bearer grant)
    ]
  }
}
```

- [ ] `granted-apps` includes Frontend XSUAA #1 xsappname (e.g., `execution-dmc-sap-quality`)
- [ ] `$ACCEPT_GRANTED_AUTHORITIES` present in authorities (enables token exchange)
- [ ] `urn:ietf:params:oauth:grant-type:jwt-bearer` in grant-types (JWT Bearer grant)

### 3. Update Backend XSUAA Service

```bash
cf update-service shiftbook-auth -c xs-security.json
```

- [ ] Service updated successfully
- [ ] No errors in logs: `cf logs shiftbook-srv --recent`

### 4. Get Backend URL

```bash
cf app shiftbook-srv
```

Note the URL:
- [ ] Backend URL: _______________

---

## Part 2: Frontend Configuration (syntax-dmc-demo) - XSUAA #1

### 1. Find Frontend XSUAA #1 xsappname

**This is THE MOST CRITICAL piece of information** - you need the exact xsappname of Frontend XSUAA #1.

The Frontend XSUAA xsappname is typically:
- `execution-dmc-sap-quality` (for SAP DMC Quality environment)
- `execution-dmc-sap-prod` (for SAP DMC Production)
- Or a custom xsappname if using custom DMC deployment

**Use the helper script:**
```bash
./scripts/check-dmc-xsappname.sh
```

**Or check manually:**
```bash
cf target -o <org> -s <dmc-space>
cf env <dmc-plugin-app>
```

Look for `VCAP_SERVICES.xsuaa[0].credentials.xsappname`

- [ ] Frontend XSUAA #1 xsappname: _______________

**IMPORTANT**: Once you have this xsappname, go back to Part 1, Step 2 and add it to the backend's `granted-apps`!

### 2. Update Frontend XSUAA #1 Configuration (Only if Applicable)

**NOTE**: If using **standard SAP DMC**, you typically **don't control** Frontend XSUAA #1 configuration. Skip to Part 3.

**Only do this if** you have a custom plugin with its own XSUAA instance that you control:

Update the frontend xs-security.json:

```json
{
  "xsappname": "shiftbook-plugin",
  "authorities": [
    "shiftbook-srv!t459223.operator",
    "shiftbook-srv!t459223.admin"
    // ^^^ Request Backend XSUAA #2 scopes during token exchange
  ],
  "oauth2-configuration": {
    "grant-types": [
      "authorization_code",
      "urn:ietf:params:oauth:grant-type:jwt-bearer"
      // ^^^ Enable JWT Bearer grant (token exchange)
    ]
  }
}
```

- [ ] Backend XSUAA #2 scopes added to authorities (e.g., `shiftbook-srv!t459223.operator`)
- [ ] JWT bearer grant type enabled (`urn:ietf:params:oauth:grant-type:jwt-bearer`)
- [ ] Service updated: `cf update-service <xsuaa> -c xs-security.json`
- [ ] OR skip this entirely if using standard SAP DMC

---

## Part 3: Destination Configuration (syntax-dmc-demo)

### 1. Create Token Exchange Destination in BTP Cockpit

**Purpose**: This destination bridges Frontend XSUAA #1 and Backend XSUAA #2, performing automatic token exchange.

Navigate to: **syntax-dmc-demo** > **Connectivity** > **Destinations**

Click **New Destination** and configure:

**Basic Settings:**
- [ ] **Name**: `shiftbook-backend`
- [ ] **Type**: `HTTP`
- [ ] **URL**: `https://<backend-url>.cfapps.us10.hana.ondemand.com` (from Part 1, Step 4)
- [ ] **Proxy Type**: `Internet`
- [ ] **Authentication**: `OAuth2UserTokenExchange` ← **CRITICAL for token exchange!**

**OAuth2 Token Exchange Configuration:**
These credentials point to **Backend XSUAA #2** (gbi-manu-dev):
- [ ] **Token Service URL Type**: `Dedicated`
- [ ] **Token Service URL**: `https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token` ← Backend XSUAA #2
- [ ] **Client ID**: `sb-shiftbook-srv!t459223` (from Part 1, Step 1) ← Backend XSUAA #2 client
- [ ] **Client Secret**: (from Part 1, Step 1) ← Backend XSUAA #2 secret

**Additional Properties** (click "New Property"):
- [ ] `HTML5.DynamicDestination` = `true`
- [ ] `WebIDEEnabled` = `true`
- [ ] `WebIDEUsage` = `odata_gen`

### 2. Understand What This Destination Does

When a request comes through this destination:
1. **Receives**: Token #1 from Frontend XSUAA #1 (DMC user token)
2. **Exchanges**: Calls Backend XSUAA #2 with JWT Bearer grant
3. **Gets**: Token #2 from Backend XSUAA #2 (backend authorization token)
4. **Forwards**: Request to backend with Token #2
5. **Result**: Backend receives valid token it can validate

### 3. Save and Test Destination

- [ ] Click **Check Connection** (might not work for OAuth destinations - this is normal)
- [ ] Save the destination
- [ ] Verify no typos in Token Service URL or credentials

---

## Part 4: Role Configuration

### 1. In gbi-manu-dev (Backend)

Create/verify role collections:

1. Navigate to **Security** > **Role Collections**
2. Find or create:
   - [ ] `shiftbook.operator`
   - [ ] `shiftbook.admin`

Each should include:
- [ ] Roles from `shiftbook-auth` XSUAA instance
- [ ] Assigned to the DMC plugin application (if applicable)

### 2. In syntax-dmc-demo (Frontend)

Assign users to role collections:

1. Navigate to **Security** > **Role Collections**
2. For each relevant role collection:
   - [ ] Add actual users or user groups
   - [ ] Users should have both DMC and Shiftbook roles

---

## Part 5: Testing

### 1. Test the Destination

From a Cloud Foundry app in syntax-dmc-demo:

```javascript
const { getDestination } = require('@sap-cloud-sdk/connectivity');

const destination = await getDestination({
  destinationName: 'shiftbook-backend',
  jwt: '<user-token>'
});

console.log('Destination URL:', destination.url);
console.log('Has auth tokens:', !!destination.authTokens);
```

- [ ] Destination resolves successfully
- [ ] Auth tokens are present

### 2. Test End-to-End Request

From the DMC plugin frontend:

```javascript
const url = '/destination/shiftbook-backend/shiftbookService/getShiftbookLogPaginated';

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});
```

- [ ] Request returns JSON (not HTML redirect)
- [ ] Status code is 200
- [ ] Response contains expected data

### 3. Verify Backend Receives Correct Token

Check backend logs:

```bash
cf logs shiftbook-srv --recent
```

Look for:
- [ ] Authentication successful
- [ ] Token issuer: `gbi-manu-dev.authentication.us10.hana.ondemand.com`
- [ ] User has correct scopes: `shiftbook-srv!t459223.operator` or `.admin`

---

## Troubleshooting

### Getting HTML redirect instead of JSON?

**Problem**: Token exchange is not working - Backend XSUAA #2 is not being called

**Check**:
- [ ] Destination authentication is `OAuth2UserTokenExchange` (NOT `OAuth2ClientCredentials`)
- [ ] Token Service URL points to Backend XSUAA #2: `gbi-manu-dev.authentication.us10...`
- [ ] Token Service URL is NOT pointing to Frontend XSUAA #1 (common mistake!)
- [ ] Client ID and Secret are from Backend XSUAA #2 (Part 1, Step 1)
- [ ] No typos in the configuration

### Getting 403 Forbidden?

**Problem**: Token exchange works (Token #2 is issued), but Backend XSUAA #2 rejects the request

**Check**:
- [ ] Backend xs-security.json has `granted-apps` with Frontend XSUAA #1 xsappname
- [ ] Backend has `$ACCEPT_GRANTED_AUTHORITIES` in authorities
- [ ] Frontend XSUAA #1 xsappname is spelled exactly right (case-sensitive!)
- [ ] Backend XSUAA service was updated after changing xs-security.json
- [ ] Users assigned to proper role collections in BOTH subaccounts

### Getting "Destination not found"?

**Problem**: Destination service cannot find the destination

**Check**:
- [ ] Destination name is exactly `shiftbook-backend`
- [ ] Destination created in correct subaccount (syntax-dmc-demo)
- [ ] DMC application has destination service bound

### Token exchange fails with "Invalid client"?

**Problem**: Backend XSUAA #2 rejects the client credentials in the destination

**Check**:
- [ ] Client ID and Secret copied correctly from Backend XSUAA #2 (no spaces)
- [ ] Service key is from Backend XSUAA #2 (shiftbook-auth in gbi-manu-dev)
- [ ] NOT using Frontend XSUAA #1 credentials (common mistake!)
- [ ] Backend XSUAA #2 service is healthy: `cf service shiftbook-auth`

---

## Quick Verification Commands

```bash
# Check backend deployment
cf target -o <org> -s manu-dev
cf app shiftbook-srv
cf service shiftbook-auth

# Check backend logs
cf logs shiftbook-srv --recent

# Check DMC environment
cf target -o <org> -s <dmc-space>
cf apps
cf services

# Get XSUAA credentials
cf service-key shiftbook-auth cross-subaccount-key
```

---

## Success Criteria

✅ All checklist items completed
✅ Destination test returns auth tokens
✅ End-to-end request returns JSON data
✅ Backend logs show correct token issuer
�� No HTML redirects or 403 errors
✅ Users can access the service with proper roles

---

## Need Help?

See detailed documentation:
- [Full Setup Guide](./CROSS_SUBACCOUNT_SETUP.md)
- [Destination Hierarchy Guide](./DESTINATION_HIERARCHY_GUIDE.md)

Common issues and solutions are documented in the [Full Setup Guide](./CROSS_SUBACCOUNT_SETUP.md#common-issues-and-troubleshooting).
