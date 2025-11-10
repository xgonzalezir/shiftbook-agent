# Changes Needed for Cross-Subaccount Integration

## Summary

Based on the URL you provided (`https://syntax-dmc-demo.execution.eu20-quality.web.dmc.cloud.sap`), the Frontend XSUAA xsappname is most likely: **`execution-dmc-sap-quality`**

## Changes Required

### 1. Update xs-security.json ✏️

**File**: `/xs-security.json`

**Current configuration** (Lines 9 and 14):
```json
"granted-apps": ["$XSAPPNAME(application, shiftbook-plugin)"]
```

**Change to**:
```json
"granted-apps": [
  "$XSAPPNAME(application, shiftbook-plugin)",
  "$XSAPPNAME(application, execution-dmc-sap-quality)"
]
```

**Full updated scopes section should look like**:

```json
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
]
```

**Why this change?**
- `shiftbook-plugin` - Your custom plugin (if you have one)
- `execution-dmc-sap-quality` - The SAP DMC Frontend XSUAA that needs access

**Good news**: You already have:
- ✅ `$ACCEPT_GRANTED_AUTHORITIES` in authorities (line 26)
- ✅ `urn:ietf:params:oauth:grant-type:jwt-bearer` in grant-types (line 45)

### 2. Update Backend XSUAA Service 🔄

After updating xs-security.json:

```bash
# Target the backend space
cf target -o manu-dev-org -s dev

# Update the XSUAA service
cf update-service shiftbook-auth -c xs-security.json

# Wait for update to complete (check status)
cf service shiftbook-auth

# Restart the backend app
cf restart shiftbook-srv
```

### 3. Get Backend XSUAA Credentials 🔑

You need these for the destination configuration:

```bash
# Create or view service key
cf create-service-key shiftbook-auth cross-subaccount-key
cf service-key shiftbook-auth cross-subaccount-key
```

Note these values:
- `clientid`: (e.g., `sb-shiftbook-srv!t459223`)
- `clientsecret`: (the secret value)
- `url`: (e.g., `https://gbi-manu-dev.authentication.us10.hana.ondemand.com`)

### 4. Get Backend Application URL 🌐

```bash
cf app shiftbook-srv
```

Note the `routes` field (e.g., `shiftbook-srv.cfapps.us10.hana.ondemand.com`)

### 5. Create Destination in DMC Subaccount 🎯

**You need to do this in BTP Cockpit** (syntax-dmc-demo subaccount):

1. Log in to BTP Cockpit
2. Navigate to **syntax-dmc-demo** subaccount
3. Go to **Connectivity** > **Destinations**
4. Click **New Destination**

**Configuration**:

| Property | Value |
|----------|-------|
| **Name** | `shiftbook-backend` |
| **Type** | `HTTP` |
| **URL** | `https://shiftbook-srv.cfapps.us10.hana.ondemand.com` (from step 4) |
| **Proxy Type** | `Internet` |
| **Authentication** | `OAuth2UserTokenExchange` |
| **Token Service URL Type** | `Dedicated` |
| **Token Service URL** | `https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token` (from step 3) |
| **Client ID** | `sb-shiftbook-srv!t459223` (from step 3) |
| **Client Secret** | `<secret from step 3>` |

**Additional Properties** (click "New Property" for each):

| Name | Value |
|------|-------|
| `HTML5.DynamicDestination` | `true` |
| `WebIDEEnabled` | `true` |
| `WebIDEUsage` | `odata_gen` |

## Verification Steps

### Test 1: Check XSUAA Service Update

```bash
cf service shiftbook-auth
```

Look for: `Status: update succeeded`

### Test 2: Check Backend Logs

```bash
cf logs shiftbook-srv --recent
```

Look for: No errors related to XSUAA or authentication

### Test 3: Test the Endpoint Again

Once everything is configured, test your original URL:

```bash
curl -v -H "Authorization: Bearer <YOUR_TOKEN>" \
  "https://syntax-dmc-demo.execution.eu20-quality.web.dmc.cloud.sap/destination/shiftbook-backend/shiftbookService/getShiftbookLogPaginated"
```

**Expected result**: JSON response (not HTML redirect)

## If the xsappname is Different

If `execution-dmc-sap-quality` is **not** the correct xsappname, you need to:

### Method 1: Ask DMC Admin

Contact your DMC administrator and ask:
> "What is the XSUAA xsappname for the syntax-dmc-demo DMC application?"

### Method 2: Check BTP Cockpit

1. Log in to BTP Cockpit for syntax-dmc-demo
2. Go to: Cloud Foundry > Spaces > (DMC space)
3. Service Instances > (XSUAA instance)
4. View credentials and find the `xsappname` field

### Method 3: Decode JWT Token from DMC

1. Log in to DMC UI
2. Open browser DevTools (F12)
3. Go to Network tab
4. Make a request
5. Copy the Authorization header (JWT token)
6. Decode at https://jwt.io
7. Look at the `client_id` or `azp` field - remove the `sb-` prefix and `!t123` suffix

Once you have the correct xsappname, replace `execution-dmc-sap-quality` in the changes above.

## Quick Command Summary

```bash
# 1. Update XSUAA service
cf target -o manu-dev-org -s dev
cf update-service shiftbook-auth -c xs-security.json
cf restart shiftbook-srv

# 2. Get credentials for destination
cf service-key shiftbook-auth cross-subaccount-key

# 3. Get backend URL
cf app shiftbook-srv

# 4. Then create destination in BTP Cockpit (syntax-dmc-demo)
```

## Checklist

- [ ] Updated xs-security.json with `execution-dmc-sap-quality` in granted-apps
- [ ] Updated XSUAA service: `cf update-service shiftbook-auth -c xs-security.json`
- [ ] Verified update succeeded: `cf service shiftbook-auth`
- [ ] Restarted backend: `cf restart shiftbook-srv`
- [ ] Got XSUAA credentials: `cf service-key shiftbook-auth cross-subaccount-key`
- [ ] Got backend URL: `cf app shiftbook-srv`
- [ ] Created destination in syntax-dmc-demo BTP Cockpit
- [ ] Tested endpoint - got JSON response (not HTML redirect)

## Need Help?

See the full documentation:
- [TWO_XSUAA_EXPLAINED.md](./TWO_XSUAA_EXPLAINED.md) - Understand how it works
- [CROSS_SUBACCOUNT_SETUP.md](./CROSS_SUBACCOUNT_SETUP.md) - Complete guide
- [CROSS_SUBACCOUNT_CHECKLIST.md](./CROSS_SUBACCOUNT_CHECKLIST.md) - Step-by-step checklist
