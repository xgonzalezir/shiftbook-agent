# BTP Destination Service - Understanding the Hierarchy

## Overview

When you configure destinations in SAP BTP, there are **two levels** where destinations can be defined. Understanding which one your application uses is crucial for troubleshooting and maintenance.

## The Two Levels

### 1. Subaccount Level (BTP Cockpit)
- **Location**: BTP Cockpit > Connectivity > Destinations
- **Scope**: Available to all applications in the subaccount
- **Configuration**: Manual configuration through BTP Cockpit UI
- **Use case**: Shared destinations used by multiple applications

### 2. Service Instance Level (Space Level)
- **Location**: Cloud Foundry Space > Service Instance > Destinations
- **Scope**: Only available to applications bound to that specific service instance
- **Configuration**: Can be defined in `mta.yaml` or configured manually
- **Use case**: Application-specific destinations, isolated per application

## Priority Order

When the SAP Cloud SDK's `getDestination()` function is called, it searches in this order:

```
1. SERVICE INSTANCE LEVEL (Space Level) ← Checked FIRST
   ↓ (if not found)
2. SUBACCOUNT LEVEL                     ← Fallback
```

**Important**: Instance-level destinations take **priority** over subaccount-level destinations with the same name.

## Your Shiftbook Configuration

Based on your [mta.yaml](mta.yaml:95-109), you have:

```yaml
resources:
  - name: shiftbook-destination
    type: org.cloudfoundry.managed-service
    parameters:
      service: destination
      service-plan: lite
      config:
        init_data:
          instance:
            existing_destinations_policy: update
            destinations:
              - Name: shiftbook-email
                Type: MAIL
```

This configuration creates an **instance-level** destination named `shiftbook-email`.

## How Your Application Uses It

In [srv/lib/email-service.ts](srv/lib/email-service.ts:96), the destination name is hardcoded:

```typescript
private destinationName = "shiftbook-email";
```

The email service retrieves it using [srv/lib/email-service.ts](srv/lib/email-service.ts:250):

```typescript
const destination = await getDestination({
  destinationName: this.destinationName,
});
```

## Determining Which Level Is Actually Used

### Method 1: Run the Diagnostic Script (Recommended)

We've created a script to check which destination is being used:

```bash
# From your deployed application
cf ssh shiftbook-srv -c "cd app && node scripts/email/check-which-destination-is-used.js"
```

### Method 2: Check Manually

#### A. Check Instance Level (Space Level)

Via CF CLI:
```bash
cf target -s manu-dev
cf service shiftbook-destination
```

Via BTP Cockpit:
1. Navigate to: Cloud Foundry > Spaces > manu-dev
2. Click on "Service Instances"
3. Find and click "shiftbook-destination"
4. Go to "Destinations" tab
5. Look for "shiftbook-email"

#### B. Check Subaccount Level

Via BTP Cockpit:
1. Navigate to: Connectivity > Destinations
2. Look for "shiftbook-email" in the list

### Method 3: Check Application Logs

When the email service initializes, it logs the configuration source:

```bash
cf logs shiftbook-srv --recent | grep "SMTP configuration"
```

Look for lines like:
```
Using cached SMTP configuration (source: btp-destination)
```

## Common Scenarios

### Scenario 1: You Have Both Levels Configured

If you created a destination at both levels with the same name "shiftbook-email":

- ✅ **Instance level will be used** (it has priority)
- ❌ Subaccount level will be ignored

**Solution**: To use the subaccount level, you must:
1. Remove or rename the instance-level destination, OR
2. Update the instance-level destination with correct configuration

### Scenario 2: Only Subaccount Level Exists

If you created the destination only in BTP Cockpit > Connectivity > Destinations:

- ✅ **Subaccount level will be used** (fallback)
- This is fine, but less isolated than instance-level

### Scenario 3: Only Instance Level Exists (Your Current Setup)

Based on your `mta.yaml`, you have an instance-level destination defined:

- ✅ **Instance level will be used** (defined in mta.yaml)
- More isolated and application-specific
- Recommended approach for production

## How to Modify Each Level

### Modifying Instance Level (Space Level)

#### Option A: Via BTP Cockpit UI
1. Go to: Cloud Foundry > Spaces > manu-dev
2. Navigate to: Service Instances > shiftbook-destination
3. Click on "Destinations" tab
4. Find "shiftbook-email" and click "Edit"
5. Update the configuration
6. Save changes

#### Option B: Via mta.yaml (Requires Redeployment)
1. Edit `mta.yaml` and add configuration:
```yaml
resources:
  - name: shiftbook-destination
    parameters:
      config:
        init_data:
          instance:
            destinations:
              - Name: shiftbook-email
                Type: MAIL
                URL: smtp://smtp.gmail.com:587
                Authentication: BasicAuthentication
                User: your-email@example.com
                Password: your-app-password
                ProxyType: Internet
                mail.smtp.host: smtp.gmail.com
                mail.smtp.port: 587
                mail.smtp.auth: true
                mail.smtp.starttls.enable: true
                mail.smtp.ssl.enable: false
```
2. Redeploy: `mbt build && cf deploy mta_archives/shiftbook_1.0.0.mtar`

### Modifying Subaccount Level

Via BTP Cockpit UI only:
1. Go to: Connectivity > Destinations
2. Find "shiftbook-email" and click it
3. Click "Edit"
4. Update the configuration
5. Save changes

## Recommendations for manu-dev

Given your current setup with two destinations created:

### ✅ Recommended: Use Instance-Level Destination

**Why?**
- Better isolation (only your app can access it)
- Version controlled (defined in mta.yaml)
- Follows SAP best practices
- Easier to manage in CI/CD pipelines

**What to do:**
1. Configure the instance-level destination (space level) properly
2. Remove or ignore the subaccount-level destination
3. The instance-level will take priority automatically

### ❌ Not Recommended: Use Subaccount-Level Destination

**Why not?**
- Less isolated (shared across all apps in subaccount)
- Not version controlled
- Can be accidentally modified by other developers
- Instance-level already takes priority anyway

**Only use if:**
- You need to share the destination across multiple applications
- You want quick testing without redeployment

## Troubleshooting

### Issue: "I configured the destination but my app isn't using it"

**Possible causes:**
1. You configured the wrong level (subaccount when instance exists)
2. The destination name doesn't match exactly ("shiftbook-email")
3. The app needs to be restaged after destination changes
4. Configuration cache needs to be cleared

**Solution:**
```bash
# Check which is being used
node scripts/email/check-which-destination-is-used.js

# If needed, restage the app
cf restage shiftbook-srv
```

### Issue: "How do I know which one I'm actually using?"

**Solution:**
Run the diagnostic script from the deployed app:
```bash
cf ssh shiftbook-srv
cd app
node scripts/email/check-which-destination-is-used.js
exit
```

Or check the application logs during email service initialization.

## Quick Reference Commands

```bash
# Check current space
cf target

# Switch to manu-dev space
cf target -s manu-dev

# List service instances
cf services

# Check destination service instance
cf service shiftbook-destination

# Check app environment (includes bound services)
cf env shiftbook-srv

# View recent logs
cf logs shiftbook-srv --recent

# SSH into app
cf ssh shiftbook-srv

# Restage app (applies new service configurations)
cf restage shiftbook-srv
```

## Summary

- **Two levels exist**: Subaccount and Instance (Space)
- **Instance level has priority**: It's checked first
- **Your setup**: Instance-level defined in mta.yaml
- **Recommendation**: Configure and use the instance-level destination
- **To check**: Run the diagnostic script or check BTP Cockpit

## References

- [SAP Cloud SDK Connectivity Documentation](https://sap.github.io/cloud-sdk/docs/js/features/connectivity/destination)
- [BTP Destination Service](https://help.sap.com/docs/connectivity/sap-btp-connectivity-cf/destination-service)
- [MTA Development and Deployment Guide](https://help.sap.com/docs/SAP_HANA_PLATFORM/4505d0bdaf4948449b7f7379d24d0f0d/490c8f71e2b74bc0a59302cada66117c.html)
