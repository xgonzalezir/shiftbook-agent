# Email Service Check - manu-dev-org (CF Logs & Curl Tests)

**Date:** October 22, 2025  
**Subaccount:** manu-dev-org  
**Space:** dev  
**App:** shiftbook-srv-blue  
**Test Method:** CF logs + curl commands

---

## 🎯 Executive Summary

**STATUS: ❌ EMAIL SERVICE IS NOT FUNCTIONAL**

### Critical Issue Identified

The email service cannot send emails because the configured SMTP server **`exo-relay.one.gx.local`** is **not accessible** from the BTP Cloud Foundry environment.

**Error:** `getaddrinfo ENOTFOUND exo-relay.one.gx.local`

This is a **DNS/network connectivity issue** - the internal Gerresheimer SMTP relay cannot be reached from SAP BTP cloud.

---

## 🔍 Test Results

### Test 1: Health Check - Destination Accessibility ✅

**Command:**
```bash
curl -s "https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com/health" \
  | jq '.checks.destination, .details.destination'
```

**Result:**
```json
true
"Email destination accessible"
```

**Analysis:** ✅ The destination **configuration** is accessible (meaning the destination service is working), but this doesn't test actual SMTP connectivity.

---

### Test 2: Email Sending Test ❌

**Command:**
```bash
curl -X POST "https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com/health/email-test" \
  -H "Content-Type: application/json" \
  -d '{"email":"eliezer.ramirez@syntax.com"}'
```

**Result:**
```json
{
  "success": false,
  "message": "Email test failed",
  "timestamp": "2025-10-22T13:11:59.607Z",
  "error": "getaddrinfo ENOTFOUND exo-relay.one.gx.local"
}
```

**HTTP Status:** 500 Internal Server Error

**Analysis:** ❌ **Email sending FAILS** - The SMTP server hostname cannot be resolved from BTP.

---

## 📊 CF Logs Analysis

### Application Logs (cf logs shiftbook-srv-blue --recent)

#### Health Check Logs (Every 30 seconds):
```
✅ [HEALTH] Destination 'shiftbook-email' is accessible
✅ [HEALTH] Destination URL: not set
✅ [HEALTH] Destination type: MAIL
```
**Interpretation:** Regular health checks confirm the destination is configured and accessible.

#### Email Test Attempt Logs:
```
🔧 [EMAIL TEST] Starting email test...
Email Service Initialization - Environment: production
Attempting to fetch SMTP configuration from BTP Destination Service...

🔧 [DEBUG] Extracted SMTP config from destination:
  Host: exo-relay.one.gx.local
  "mail.user": "GX_Service_PPG_MES_SMTP@gerresheimer.com"
  "mail.smtp.host": "exo-relay.one.gx.local"
  "mail.smtp.port": "587"
  "mail.smtp.ssl.enable": "false"
  "mail.smtp.starttls.enable": "true"
  "mail.smtp.auth": "true"

❌ Failed to initialize Email Service: Error: getaddrinfo ENOTFOUND exo-relay.one.gx.local
hostname: 'exo-relay.one.gx.local'
```

**Interpretation:** 
- The destination service successfully provides the SMTP configuration
- The application extracts the SMTP settings correctly
- **The connection to `exo-relay.one.gx.local` fails at the DNS resolution level**

---

## 📧 Current Email Configuration

### Instance-Level Destination: `shiftbook-email`

From CF logs, the **ACTIVE** configuration is:

```yaml
Name: shiftbook-email
Type: MAIL
SMTP Host: exo-relay.one.gx.local
SMTP Port: 587
SMTP User: GX_Service_PPG_MES_SMTP@gerresheimer.com
SMTP Password: [CONFIGURED]
Authentication: true
STARTTLS: true
SSL: false
```

### Service Status

```
Service: shiftbook-destination
Status: ⚠️ UPDATE FAILED
Bound Apps: shiftbook-srv-blue, shiftbook-plugin
```

---

## 🔧 Root Cause Analysis

### Issue: DNS Resolution Failure

**Problem:** The hostname `exo-relay.one.gx.local` cannot be resolved from BTP Cloud Foundry.

**Why:**
1. `.gx.local` is a **private internal domain** (Gerresheimer internal)
2. SAP BTP Cloud Foundry runs in the **public cloud** (AWS/Azure/GCP)
3. Internal DNS domains are **not accessible** from public cloud without special networking configuration

**Evidence:**
- Error: `getaddrinfo ENOTFOUND` = DNS lookup failed
- Hostname: `exo-relay.one.gx.local` = internal domain pattern

### Architectural Challenge

```
┌─────────────────────────┐
│  SAP BTP Cloud (Public) │
│                         │
│  ┌──────────────────┐   │      ❌ CANNOT REACH
│  │ shiftbook-srv    │───┼──────────────────────┐
│  │  (Cloud Foundry) │   │                      │
│  └──────────────────┘   │                      ▼
└─────────────────────────┘         ┌─────────────────────────┐
                                    │ Gerresheimer Network     │
                                    │ (Private)                │
                                    │                          │
                                    │ ┌────────────────────┐   │
                                    │ │ exo-relay          │   │
                                    │ │ .one.gx.local      │   │
                                    │ │ (Internal SMTP)    │   │
                                    │ └────────────────────┘   │
                                    └─────────────────────────┘
```

---

## ✅ Possible Solutions

### Option 1: Use Public SMTP Relay (Recommended for Quick Fix)

**Gmail (Testing Only):**
```yaml
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: <gmail-address>
SMTP Password: <gmail-app-password>
STARTTLS: true
SSL: false
```

**Office 365 / Microsoft (Production Ready):**
```yaml
SMTP Host: smtp.office365.com
SMTP Port: 587
SMTP User: <office365-email>
SMTP Password: <password or app password>
STARTTLS: true
SSL: false
```

**SendGrid / Mailgun / AWS SES (Professional):**
Production-grade email services with better deliverability.

---

### Option 2: Configure VPN/Cloud Connector (Enterprise Solution)

To use the internal Gerresheimer SMTP relay, you need:

1. **SAP Cloud Connector**
   - Install on-premises connector
   - Expose `exo-relay.one.gx.local` to BTP
   - Configure access control

2. **BTP Connectivity Service**
   - Create connectivity destination
   - Configure tunnel through Cloud Connector
   - Update app to use connectivity proxy

**Pros:**
- Can use existing Gerresheimer infrastructure
- Centralized email governance
- No external email service needed

**Cons:**
- Complex setup
- Requires on-premises infrastructure
- Additional component to maintain

---

### Option 3: Deploy SMTP Relay in Public Cloud

Deploy an SMTP relay server in the same cloud region as BTP:
- AWS SES + SMTP relay in same region
- Azure SMTP relay
- Dedicated SMTP server in cloud

**Pros:**
- Low latency
- Good performance
- Direct connectivity

**Cons:**
- Additional costs
- Additional infrastructure to manage

---

## 🚀 Quick Fix Instructions

### Fastest Solution: Switch to Office 365 SMTP

1. **Update Destination via BTP Cockpit:**
   ```
   BTP Cockpit → Cloud Foundry → Spaces → dev
   → Service Instances → shiftbook-destination
   → Destinations tab → Edit "shiftbook-email"
   ```

2. **Change Configuration:**
   ```
   SMTP Host: smtp.office365.com
   SMTP Port: 587
   User: <gerresheimer-office365-email>
   Password: <password>
   
   Additional Properties:
   mail.smtp.host = smtp.office365.com
   mail.smtp.port = 587
   mail.smtp.auth = true
   mail.smtp.starttls.enable = true
   mail.smtp.ssl.enable = false
   mail.user = <gerresheimer-office365-email>
   mail.from = <gerresheimer-office365-email>
   ```

3. **Test:**
   ```bash
   curl -X POST "https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com/health/email-test" \
     -H "Content-Type: application/json" \
     -d '{"email":"your-test-email@gerresheimer.com"}'
   ```

4. **No app restart needed** - configuration is read dynamically

---

## 📊 Service Information

### App Details
```
Name: shiftbook-srv-blue
URL: manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com
Status: running
Instances: 1/1
Memory: 88.7M of 256M
Last Upload: Wed 22 Oct 11:51:50 WEST 2025
```

### Destination Service
```
Name: shiftbook-destination
Type: destination (lite plan)
Status: update failed
Bound Apps: shiftbook-srv-blue, shiftbook-plugin
Instance ID: f53b990e-6850-4542-a0b9-5cc1d9586faf
```

---

## 🧪 Test Commands

### Check Health (No Auth Required)
```bash
curl -s "https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com/health" | jq .
```

### Test Email Sending (No Auth Required)
```bash
curl -X POST "https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com/health/email-test" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' | jq .
```

### Check Recent Logs
```bash
cf logs shiftbook-srv-blue --recent | grep -i "email\|smtp"
```

### Stream Live Logs
```bash
cf logs shiftbook-srv-blue | grep -i "email\|smtp"
```

### Check Destination Service
```bash
cf service shiftbook-destination
```

---

## 📋 Summary of Findings

| Component | Status | Details |
|-----------|--------|---------|
| **App Status** | ✅ Running | shiftbook-srv-blue healthy |
| **Destination Config** | ✅ Accessible | Configuration can be read |
| **SMTP Server** | ❌ **Not Reachable** | `exo-relay.one.gx.local` DNS fails |
| **Email Sending** | ❌ **Failing** | Cannot connect to SMTP server |
| **Service Update** | ⚠️ Failed | Destination service update failed |

---

## 🎯 Recommendations

### Immediate (Within 1 day):
1. ✅ **Decision:** Choose email provider (Office 365, Gmail, or professional service)
2. ✅ **Action:** Update destination configuration with accessible SMTP server
3. ✅ **Test:** Run curl test to verify email sending works
4. ✅ **Document:** Which email service is officially approved for production

### Short-term (Within 1 week):
1. 📧 **Email Governance:** Define email sender policies
2. 🔐 **Security:** Set up dedicated service account for SMTP
3. 📊 **Monitoring:** Set up alerts for email failures
4. ✅ **Fix:** Resolve destination service "update failed" status

### Long-term (Future):
1. 🏗️ **Architecture:** Consider SAP Cloud Connector if internal SMTP is required
2. 🔧 **Professional Service:** Evaluate SendGrid, Mailgun, or AWS SES
3. 📈 **Scalability:** Plan for high-volume email sending if needed

---

## 🔗 Related Documentation

- [Email Destination Setup](./EMAIL_DESTINATION_SETUP.md)
- [Destination Hierarchy Guide](./DESTINATION_HIERARCHY_GUIDE.md)
- [Quick Destinations Guide](../scripts/email/README-DESTINATIONS.md)

---

## 📞 Next Steps

**Contact Gerresheimer IT:**
- Question: "Does Gerresheimer have an externally accessible SMTP relay?"
- Alternative: "Can we use Office 365 SMTP for ShiftBook notifications?"
- Enterprise: "Should we set up SAP Cloud Connector for email?"

**SAP BTP Support (if needed):**
- Issue: Destination service "update failed" status
- Service: shiftbook-destination (f53b990e-6850-4542-a0b9-5cc1d9586faf)

---

**Report Generated:** October 22, 2025  
**Test Method:** CF CLI + curl commands  
**Tested Endpoints:**
- ✅ `/health` - Health check
- ❌ `/health/email-test` - Email sending test

