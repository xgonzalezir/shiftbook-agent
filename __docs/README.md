# Cross-Subaccount Integration Documentation

Complete guide for setting up cross-subaccount integration between DMC (syntax-dmc-demo) and Shiftbook Backend (gbi-manu-dev).

## Overview: Two XSUAA Instances

Your setup involves **two separate XSUAA instances** in different BTP subaccounts:

- **XSUAA #1 (Frontend)**: In syntax-dmc-demo (EU20) - Authenticates DMC users
- **XSUAA #2 (Backend)**: In gbi-manu-dev (US10) - Authorizes backend access

The Destination Service bridges these two XSUAA instances through **OAuth2 token exchange**.

## Documentation Guide

### 1. [TWO_XSUAA_EXPLAINED.md](./TWO_XSUAA_EXPLAINED.md) - Start Here! 📚

**Best for**: Understanding the architecture and token flow

**Contents**:
- Visual architecture diagram showing both XSUAA instances
- Side-by-side token comparison (Token #1 vs Token #2)
- Step-by-step token exchange process
- Detailed explanation of trust configuration
- Common misunderstandings clarified

**Read this if**:
- You're new to cross-subaccount integration
- You want to understand HOW token exchange works
- You need to explain this to others
- You're troubleshooting and need deep understanding

### 2. [CROSS_SUBACCOUNT_SETUP.md](./CROSS_SUBACCOUNT_SETUP.md) - Complete Guide 📖

**Best for**: Step-by-step implementation instructions

**Contents**:
- Architecture diagram with XSUAA instances
- Detailed configuration steps for both subaccounts
- XSUAA trust setup (granted-apps)
- Destination configuration with OAuth2UserTokenExchange
- Role mapping and assignment
- Security considerations
- Common issues and troubleshooting
- Testing procedures

**Read this if**:
- You're implementing the integration
- You need detailed configuration examples
- You want to understand the full process
- You need security best practices

### 3. [CROSS_SUBACCOUNT_CHECKLIST.md](./CROSS_SUBACCOUNT_CHECKLIST.md) - Quick Reference ✅

**Best for**: Following along during implementation

**Contents**:
- Checkbox format for all configuration steps
- Quick verification commands
- Troubleshooting quick checks
- Success criteria
- Copy-paste ready commands

**Read this if**:
- You're actively configuring the system
- You want a quick reference during setup
- You need to verify what's done and what's missing
- You want to track progress

### 4. [DESTINATION_HIERARCHY_GUIDE.md](./DESTINATION_HIERARCHY_GUIDE.md) - Destination Concepts 📍

**Best for**: Understanding BTP destination service levels

**Contents**:
- Subaccount vs Instance level destinations
- Priority order and lookup behavior
- How your application uses destinations
- Troubleshooting destination issues

**Read this if**:
- You're confused about destination configuration
- You have destinations at multiple levels
- You need to understand destination priority
- Destinations aren't working as expected

## Quick Start

### Absolute Beginner?

1. Read: [TWO_XSUAA_EXPLAINED.md](./TWO_XSUAA_EXPLAINED.md)
2. Follow: [CROSS_SUBACCOUNT_CHECKLIST.md](./CROSS_SUBACCOUNT_CHECKLIST.md)
3. Reference: [CROSS_SUBACCOUNT_SETUP.md](./CROSS_SUBACCOUNT_SETUP.md) for details

### Already Familiar with BTP?

1. Skim: [TWO_XSUAA_EXPLAINED.md](./TWO_XSUAA_EXPLAINED.md) (architecture section)
2. Follow: [CROSS_SUBACCOUNT_CHECKLIST.md](./CROSS_SUBACCOUNT_CHECKLIST.md)
3. Troubleshoot: [CROSS_SUBACCOUNT_SETUP.md](./CROSS_SUBACCOUNT_SETUP.md#common-issues-and-troubleshooting)

### Just Need Quick Answers?

**Q: Why am I getting HTML redirect instead of JSON?**
A: Token exchange isn't configured. See [CROSS_SUBACCOUNT_CHECKLIST.md - Troubleshooting](./CROSS_SUBACCOUNT_CHECKLIST.md#getting-html-redirect-instead-of-json)

**Q: How do I find the Frontend XSUAA xsappname?**
A: Run `./scripts/check-dmc-xsappname.sh` or see [CROSS_SUBACCOUNT_CHECKLIST.md - Part 2](./CROSS_SUBACCOUNT_CHECKLIST.md#1-find-frontend-xsuaa-1-xsappname)

**Q: What goes in granted-apps?**
A: The Frontend XSUAA #1 xsappname. See [TWO_XSUAA_EXPLAINED.md - Configuration](./TWO_XSUAA_EXPLAINED.md#backend-xsuaa-gbi-manu-dev---xs-securityjson)

**Q: What's the difference between the two tokens?**
A: See [TWO_XSUAA_EXPLAINED.md - Token Comparison](./TWO_XSUAA_EXPLAINED.md#token-comparison)

## Key Concepts

### OAuth2UserTokenExchange

This is the authentication type for your destination that:
1. Receives Token #1 (from Frontend XSUAA)
2. Calls Backend XSUAA with JWT Bearer grant
3. Gets Token #2 (from Backend XSUAA)
4. Forwards request with Token #2

**Without this**: Backend will reject Frontend tokens → HTML redirect

### granted-apps

This configuration in backend xs-security.json establishes trust:

```json
"granted-apps": ["$XSAPPNAME(application, execution-dmc-sap-quality)"]
```

**Meaning**: "Backend XSUAA trusts Frontend XSUAA for token exchange"

**Without this**: Token exchange fails with 403 Forbidden

### $ACCEPT_GRANTED_AUTHORITIES

This in backend authorities enables token exchange:

```json
"authorities": ["$ACCEPT_GRANTED_AUTHORITIES"]
```

**Without this**: Token exchange doesn't work

## Helper Scripts

### Check DMC XSUAA xsappname

```bash
./scripts/check-dmc-xsappname.sh
```

Finds the Frontend XSUAA #1 xsappname needed for `granted-apps`.

### Diagnose Destination Flow

```bash
node diagnose-destination-flow.js <JWT_TOKEN>
```

Tests token exchange and shows where requests fail.

## Configuration Summary

### Backend (gbi-manu-dev)

1. **xs-security.json**: Add Frontend XSUAA to `granted-apps`
2. **Update service**: `cf update-service shiftbook-auth -c xs-security.json`
3. **Get credentials**: Service key for destination configuration

### Frontend (syntax-dmc-demo)

1. **Find xsappname**: Use helper script or CF CLI
2. **Create destination**: With OAuth2UserTokenExchange
3. **Configure**: Point to Backend XSUAA #2

### The Connection

```
Frontend XSUAA #1 ←→ Destination ←→ Backend XSUAA #2
(Token #1)           (Exchange)      (Token #2)
```

## Success Criteria

✅ Frontend XSUAA #1 xsappname identified
✅ Backend xs-security.json has `granted-apps` with Frontend xsappname
✅ Backend XSUAA service updated
✅ Destination created with OAuth2UserTokenExchange
✅ Destination points to Backend XSUAA #2
✅ Test request returns JSON (not HTML redirect)
✅ Backend logs show Backend XSUAA issuer
✅ Users can access with proper roles

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| HTML redirect | Token exchange not configured | Create destination with OAuth2UserTokenExchange |
| 403 Forbidden | Trust not established | Add Frontend xsappname to `granted-apps` |
| Invalid client | Wrong credentials | Use Backend XSUAA #2 credentials |
| Destination not found | Wrong name/location | Create in syntax-dmc-demo subaccount |

## Getting Help

1. **Check documentation**: Start with [TWO_XSUAA_EXPLAINED.md](./TWO_XSUAA_EXPLAINED.md)
2. **Follow checklist**: Use [CROSS_SUBACCOUNT_CHECKLIST.md](./CROSS_SUBACCOUNT_CHECKLIST.md)
3. **Run diagnostics**: Use helper scripts
4. **Review logs**: Check both frontend and backend logs

## Additional Resources

- [SAP BTP Destination Service](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/create-destination)
- [OAuth2UserTokenExchange](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/oauth-user-token-exchange-authentication)
- [XSUAA Trust Configuration](https://help.sap.com/docs/btp/sap-business-technology-platform/trust-and-federation-with-identity-providers)
- [CAP Security Guide](https://cap.cloud.sap/docs/guides/security/)

## Version History

- **v1.0** - Initial documentation created
- **v1.1** - Added explicit two XSUAA instances clarification
- **v1.2** - Enhanced troubleshooting and helper scripts

---

**Remember**: Two XSUAA instances is the **standard pattern** for cross-subaccount integration. Token exchange handles the trust automatically once configured!
