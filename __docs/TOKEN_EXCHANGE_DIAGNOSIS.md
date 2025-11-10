# Token Exchange Diagnosis Report

## Problem Summary

Token exchange is failing with **401 Unauthorized - "Unable to map issuer"** error.

**Latest Test**: 2025-10-27 13:16 UTC - Still failing after XSUAA update and app restart.

## Environment Details

### Frontend (DMC)
- **Issuer**: `https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com`
- **Region**: **EU20** 🇪🇺
- **Subaccount ID**: `de0c070c-9ab6-4bb2-87cc-b7f04b3b5d70`
- **Zone**: `syntax-dmc-demo`
- **Client ID**: `sb-execution-dmc-sap-quality!t330`
- **User**: `ioana-andreea.beudeanu@syntax.com`
- **Token Status**: ✅ Valid (expires in ~8 hours)

### Backend (Shiftbook)
- **Issuer**: `https://gbi-manu-dev.authentication.us10.hana.ondemand.com`
- **Region**: **US10** 🇺🇸
- **Zone**: `gbi-manu-dev`
- **Client ID**: `sb-shiftbook-srv!t459223`
- **Last Updated**: 2025-10-27T12:44:29Z ✅
- **App Restart**: 2025-10-27T13:16:08Z ✅

## Root Cause

This is a **CROSS-REGION token exchange** (EU20 → US10), which requires:

1. ✅ **granted-apps configuration** - CONFIGURED
   - `xs-security.json` includes `sb-execution-dmc-sap-quality`
   
2. ✅ **allowedproviders configuration** - CONFIGURED  
   - `xs-security.json` includes `syntax-dmc-demo`

3. ❌ **Trust relationship at BTP level** - **LIKELY NOT ESTABLISHED**
   - The backend XSUAA doesn't trust the DMC XSUAA's signing keys
   - Cross-region trust requires explicit configuration in BTP Cockpit

## Error Analysis

```json
{
  "error": "unauthorized",
  "error_description": "Unable to map issuer: No identity provider found for issuer: https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com/oauth/token."
}
```

**This error means**:
- The backend XSUAA doesn't recognize the frontend XSUAA as a trusted identity provider
- The `allowedproviders` configuration alone is **not sufficient**
- **Platform-level trust** must be established between the two XSUAA instances
- The signing keys from the DMC XSUAA (EU20) are not available to the backend XSUAA (US10)

## Token Contents (Decoded)

```json
{
  "iss": "https://syntax-dmc-demo.authentication.eu20.hana.ondemand.com/oauth/token",
  "client_id": "sb-execution-dmc-sap-quality!t330",
  "zid": "de0c070c-9ab6-4bb2-87cc-b7f04b3b5d70",
  "xs.rolecollections": [
    "GBI_shiftbook_admin",
    "Syntax_DMC_Fortech",
    "Destination Administrator",
    "Subaccount Viewer",
    "Syntax_DMC_Supervisor_general"
  ],
  "exp": 1761598554,
  "user_name": "ioana-andreea.beudeanu@syntax.com"
}
```

## Solutions

### Option 1: Establish Cross-Region Trust (Recommended for Production)

1. **In DMC Subaccount (EU20)**:
   - Go to BTP Cockpit → Security → Trust Configuration
   - Create a custom IDP trust for the backend subaccount

2. **In Backend Subaccount (US10)**:
   - Go to BTP Cockpit → Security → Trust Configuration  
   - Establish trust with DMC XSUAA
   - Configure SAML trust or OAuth trust

3. **Update XSUAA Service**:
   ```bash
   cf update-service shiftbook-auth -c xs-security.json
   ```

### Option 2: Same-Region Deployment (Easiest)

Deploy Shiftbook backend to **EU20** region to match DMC:
- Eliminates cross-region trust complexity
- Simpler configuration
- Better performance (lower latency)

### Option 3: Use Destination Service (Alternative)

Configure a Destination in BTP that handles the token exchange:
- Create an OAuth2JWTBearer destination
- Configure it with DMC credentials
- Let BTP handle the trust

## Testing Commands

### Test Token Validity
```bash
./scripts/auth/test-token-exchange.sh "<YOUR_DMC_TOKEN>"
```

### Check XSUAA Configuration
```bash
cf service-key shiftbook-auth cross-subaccount-key | tail -n +3 | jq .
```

### Decode Token
```bash
node -e "
const token = '<YOUR_TOKEN>';
const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
console.log(JSON.stringify(payload, null, 2));
"
```

## Configuration Files

### xs-security.json (Current)
```json
{
  "xsappname": "shiftbook-srv",
  "oauth2-configuration": {
    "allowedproviders": ["syntax-dmc-demo"],
    "grant-types": [
      "client_credentials",
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
      "user_token",
      "refresh_token"
    ]
  },
  "scopes": [
    {
      "name": "$XSAPPNAME.operator",
      "granted-apps": [
        "$XSAPPNAME(application, sb-execution-dmc-sap-quality)",
        "$XSAPPNAME(application, execution-dmc-sap-quality)",
        "$XSAPPNAME(application, dmc-quality)"
      ]
    }
  ]
}
```

## Next Steps

1. **Immediate**: Verify if cross-region trust is configured in BTP Cockpit
2. **Short-term**: Consider deploying to EU20 if trust cannot be established
3. **Long-term**: Work with SAP support to establish proper cross-region trust

## References

- [SAP XSUAA Cross-Region Trust](https://help.sap.com/docs/btp/sap-business-technology-platform/trust-configuration)
- [OAuth 2.0 JWT Bearer Grant](https://help.sap.com/docs/btp/sap-business-technology-platform/token-exchange)
- [Project Documentation](./__docs/CROSS_REGION_TRUST_SETUP.md)

---

**Generated**: 2025-10-27  
**Status**: Cross-region trust issue identified

