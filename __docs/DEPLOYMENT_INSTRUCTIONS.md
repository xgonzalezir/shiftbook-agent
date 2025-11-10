# Deployment Instructions for OAuth2 Cross-Region Trust Fix

## Summary

Fixed the OAuth2UserTokenExchange error by adding cross-region trust configuration between:
- **Frontend**: `syntax-dmc-demo` (EU20)
- **Backend**: `gbi-manu-dev` (US10)

## Changes Made

### 1. Updated [xs-security.json](../xs-security.json)

**Added:**
- `foreign-scope-references`: Allows accepting scopes from frontend XSUAA
- `allowedproviders`: Explicitly allows `syntax-dmc-demo` as trusted provider
- Additional xsappname variant: `execution-dmc-sap-quality`

**Key sections:**
```json
{
  "foreign-scope-references": [
    "sb-execution-dmc-sap-quality!t330.*"
  ],
  "oauth2-configuration": {
    "allowedproviders": [
      "syntax-dmc-demo"
    ]
  }
}
```

### 2. New Diagnostic Tools

- **[scripts/auth/decode-jwt-token.js](../scripts/auth/decode-jwt-token.js)**: Decode and analyze JWT tokens
- **[scripts/auth/test-token-exchange.sh](../scripts/auth/test-token-exchange.sh)**: Test OAuth2 token exchange manually

### 3. Documentation

- **[__docs/CROSS_REGION_TRUST_SETUP.md](__docs/CROSS_REGION_TRUST_SETUP.md)**: Complete cross-region setup guide

## Deployment Steps

### Step 1: Merge and Deploy

1. **Review the merge request**:
   https://gitlab.com/syntax-cloud/sap-products/manu/dm/shift-book/-/merge_requests/new?merge_request%5Bsource_branch%5D=roles-issues

2. **Merge to main branch**

3. **Deploy to manu-dev** (your deployment process)

### Step 2: Update XSUAA Service

After deployment, run these commands:

```bash
# Target the correct space
cf target -o manu-dev-org -s dev

# Update XSUAA service with new configuration
cf update-service shiftbook-auth -c xs-security.json

# Check status (wait for "update succeeded")
cf service shiftbook-auth

# Restart the app
cf restart shiftbook-srv-green

# Verify app is running
cf app shiftbook-srv-green
```

### Step 3: Test Token Exchange

Get a fresh JWT token from DMC UI (F12 → Network → Authorization header), then run:

```bash
./scripts/auth/test-token-exchange.sh "eyJ0eXAiOiJKV1QiLCJqa..."
```

**Expected output:**
```
✅ Token Exchange SUCCESSFUL!
```

**If still failing:**
```
❌ Token Exchange FAILED!
Error: "Unable to map issuer: No identity provider found..."
```

→ See "Alternative Solutions" below

## Expected Results

### Before Fix
```
Error: "Unable to map issuer: No identity provider found for issuer:
https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com/oauth/token."
```

### After Fix
- Token exchange should succeed
- DMC UI can access ShiftBook backend
- No more 500 errors on category/log requests

## Alternative Solutions (If Still Not Working)

### Option 1: Contact BTP Administrator

The `allowedproviders` configuration might not be sufficient for full cross-region trust.

**You may need BTP Admin to:**
1. Establish IDP trust in BTP Cockpit
2. Add custom trust configuration for `syntax-dmc-demo` XSUAA
3. Configure trust at subaccount level

**Details**: See [CROSS_REGION_TRUST_SETUP.md](CROSS_REGION_TRUST_SETUP.md#solution-establish-cross-region-trust)

### Option 2: Same-Region Deployment

If cross-region trust cannot be established:
- Deploy backend to EU20 (same region as DMC)
- This allows automatic XSUAA trust within the same landscape

## Verification Checklist

After deployment and XSUAA update:

- [ ] XSUAA service updated: `cf service shiftbook-auth` shows "update succeeded"
- [ ] App restarted: `cf app shiftbook-srv-green` shows "running"
- [ ] Token exchange test passes: `./scripts/auth/test-token-exchange.sh` returns 200
- [ ] DMC UI can load ShiftBook categories
- [ ] DMC UI can load ShiftBook logs
- [ ] No 500 errors in browser console

## Troubleshooting

### Error: "Unknown signing key"
**Cause**: Trust established but key cache not updated
**Solution**: Wait a few minutes, or restart XSUAA service again

### Error: "Unauthorized client"
**Cause**: granted-apps not updated properly
**Solution**: Verify xs-security.json deployed correctly

### Error: "Unable to map issuer" (still)
**Cause**: `allowedproviders` not sufficient for cross-region
**Solution**: Contact BTP Admin for IDP trust configuration (Option 1 above)

## Diagnostic Commands

```bash
# Check XSUAA service status
cf service shiftbook-auth

# View XSUAA credentials
cf service-key shiftbook-auth cross-subaccount-key

# Check app logs for auth errors
cf logs shiftbook-srv-green --recent | grep -i "auth\|token\|error"

# Get backend signing keys
curl -s https://gbi-manu-dev.authentication.us10.hana.ondemand.com/token_keys | jq '.'

# Decode a DMC token
node scripts/decode-jwt-token.js "eyJ0eXAiOiJKV1QiLCJqa..."

# Test token exchange
./scripts/auth/test-token-exchange.sh "eyJ0eXAiOiJKV1QiLCJqa..."
```

## Important Notes

- The changes are **backward compatible** - existing functionality won't break
- The `allowedproviders` configuration is **specific to cross-region** scenarios
- This fix addresses the **root cause** identified through token analysis
- If issues persist, it's likely a **platform-level trust configuration** issue requiring BTP Admin access

## Commits

1. **6c68ded**: Initial cross-subaccount configuration and documentation
2. **0d5ae8d**: Cross-region XSUAA trust configuration (current)

## Support

For questions or issues:
1. Review [CROSS_REGION_TRUST_SETUP.md](CROSS_REGION_TRUST_SETUP.md)
2. Run diagnostic tools
3. Check BTP Cockpit trust configuration
4. Contact BTP Administrator if platform-level access needed

---

**Status**: Ready for merge and deployment
**Next Action**: Merge PR → Deploy → Update XSUAA → Test
