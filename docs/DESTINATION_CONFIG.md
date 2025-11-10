# Destination Configuration for BTP Cockpit

## Backend Information Retrieved

### Backend XSUAA #2 Credentials
- **Client ID**: `sb-shiftbook-srv!t459223`
- **Client Secret**: `69fa3ec7-ebdd-44f6-95b7-fec07467945e$HZqGJhhfy_8l6C7rEdMvRIV9f-gcr8x0wTdDb9PfcKI=`
- **Token Service URL**: `https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token`
- **Identity Zone**: `gbi-manu-dev`

### Backend Application URL
- **Route**: `manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com`
- **Full URL**: `https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com`

---

## Create Destination in BTP Cockpit (syntax-dmc-demo)

### Step-by-Step Instructions

1. **Log in to BTP Cockpit**
   - Go to: https://cockpit.btp.cloud.sap/
   - Navigate to your **syntax-dmc-demo** subaccount (EU20 region)

2. **Go to Destinations**
   - Click on: **Connectivity** > **Destinations**

3. **Create New Destination**
   - Click: **New Destination** button

4. **Fill in Basic Settings**

| Field | Value |
|-------|-------|
| **Name** | `shiftbook-backend` |
| **Type** | `HTTP` |
| **Description** (optional) | Cross-subaccount access to Shiftbook Backend |
| **URL** | `https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com` |
| **Proxy Type** | `Internet` |
| **Authentication** | `OAuth2UserTokenExchange` |

5. **Fill in OAuth2 Configuration**

| Field | Value |
|-------|-------|
| **Token Service URL Type** | `Dedicated` |
| **Token Service URL** | `https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token` |
| **Client ID** | `sb-shiftbook-srv!t459223` |
| **Client Secret** | `69fa3ec7-ebdd-44f6-95b7-fec07467945e$HZqGJhhfy_8l6C7rEdMvRIV9f-gcr8x0wTdDb9PfcKI=` |

6. **Add Additional Properties**

Click **New Property** for each:

| Name | Value |
|------|-------|
| `HTML5.DynamicDestination` | `true` |
| `WebIDEEnabled` | `true` |
| `WebIDEUsage` | `odata_gen` |

7. **Save the Destination**
   - Click **Save**

---

## Copy-Paste Values

### For URL field:
```
https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com
```

### For Token Service URL:
```
https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token
```

### For Client ID:
```
sb-shiftbook-srv!t459223
```

### For Client Secret:
```
69fa3ec7-ebdd-44f6-95b7-fec07467945e$HZqGJhhfy_8l6C7rEdMvRIV9f-gcr8x0wTdDb9PfcKI=
```

---

## What This Destination Does

When a request comes through this destination:

1. **Receives**: Token #1 from Frontend XSUAA #1 (DMC user token)
   - Issuer: `syntax-dmc-demo.authentication.eu20...`

2. **Exchanges**: Makes OAuth2 token exchange request
   - Calls: `https://gbi-manu-dev.authentication.us10.hana.ondemand.com/oauth/token`
   - With: Client credentials above
   - Grant type: `urn:ietf:params:oauth:grant-type:jwt-bearer`

3. **Gets**: Token #2 from Backend XSUAA #2
   - Issuer: `gbi-manu-dev.authentication.us10...`
   - Scopes: `shiftbook-srv!t459223.operator`, `shiftbook-srv!t459223.admin`

4. **Forwards**: Request to backend
   - To: `https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com`
   - With: Token #2 (backend token)

5. **Returns**: Backend response to DMC frontend

---

## After Creating the Destination

### Test the Integration

Once the destination is created, test your original URL:

```bash
curl -H "Authorization: Bearer <YOUR_DMC_TOKEN>" \
  "https://syntax-dmc-demo.execution.eu20-quality.web.dmc.cloud.sap/destination/shiftbook-backend/shiftbookService/getShiftbookLogPaginated"
```

**Expected Result**: JSON response (not HTML redirect)

### Troubleshooting

**Still getting HTML redirect?**
- Check destination name is exactly: `shiftbook-backend`
- Verify Authentication is: `OAuth2UserTokenExchange` (not OAuth2ClientCredentials)
- Check Token Service URL has `/oauth/token` at the end
- Verify no typos in client credentials

**Getting 403 Forbidden?**
- Ensure xs-security.json was updated with `execution-dmc-sap-quality`
- Check XSUAA service was updated: `cf service shiftbook-auth`
- Verify users are assigned to role collections

**Getting 404 Not Found?**
- Check the backend URL is correct
- Verify backend app is running: `cf app shiftbook-srv-blue`

---

## Next Steps

After creating the destination:

1. ✅ **Test** the endpoint with a DMC user token
2. 🔍 **Check backend logs**: `cf logs shiftbook-srv-blue --recent`
3. ✔️ **Verify** token issuer in logs is `gbi-manu-dev.authentication.us10...`
4. 👥 **Assign** users to appropriate role collections in both subaccounts

---

## Visual Reference - BTP Cockpit

When creating the destination, your screen should look like this:

```
┌─────────────────────────────────────────────────┐
│ New Destination                                  │
├─────────────────────────────────────────────────┤
│ Name: shiftbook-backend                         │
│ Type: HTTP                                       │
│ URL: https://manu-dev-org-dev-shiftbook-srv...  │
│ Proxy Type: Internet                             │
│ Authentication: OAuth2UserTokenExchange          │
│                                                  │
│ Token Service URL Type: Dedicated               │
│ Token Service URL: https://gbi-manu-dev...      │
│ Client ID: sb-shiftbook-srv!t459223             │
│ Client Secret: ••••••••••••••••••••             │
│                                                  │
│ Additional Properties:                           │
│   HTML5.DynamicDestination = true               │
│   WebIDEEnabled = true                           │
│   WebIDEUsage = odata_gen                        │
│                                                  │
│              [Cancel]  [Save]                    │
└─────────────────────────────────────────────────┘
```

---

## Still Need to Update Backend XSUAA?

If you haven't updated the backend XSUAA service yet:

```bash
# Update XSUAA with new xs-security.json
cf target -o manu-dev-org -s dev
cf update-service shiftbook-auth -c xs-security.json

# Wait for completion
cf service shiftbook-auth

# Restart backend (if needed)
cf restart shiftbook-srv-blue
```

---

## Documentation Reference

- [CHANGES_NEEDED.md](__docs/CHANGES_NEEDED.md) - What was changed
- [TWO_XSUAA_EXPLAINED.md](__docs/TWO_XSUAA_EXPLAINED.md) - How it works
- [CROSS_SUBACCOUNT_CHECKLIST.md](__docs/CROSS_SUBACCOUNT_CHECKLIST.md) - Complete checklist
