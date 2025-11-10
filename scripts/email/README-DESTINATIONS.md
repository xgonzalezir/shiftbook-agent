# Email Destination Configuration - Quick Guide

## Your Question: Which destination is manu-dev using?

You have two destinations configured:
1. **Subaccount level** - configured in BTP Cockpit > Connectivity > Destinations
2. **Space/Instance level** - configured in the destination service instance

## Answer: Instance Level Takes Priority

Based on your [mta.yaml](../../mta.yaml#L95-L109), you have an **instance-level destination** defined:

```yaml
- name: shiftbook-destination
  config:
    init_data:
      instance:
        destinations:
          - Name: shiftbook-email
            Type: MAIL
```

The SAP Cloud SDK checks destinations in this order:
1. **Instance level FIRST** ← This one is used
2. Subaccount level (only if instance level doesn't exist)

So **manu-dev is using the INSTANCE LEVEL destination** from the service instance, NOT the subaccount level one.

## How to Check Which One Is Actually Being Used

### Option 1: Run the Diagnostic Script (Easiest)

```bash
# From your deployed application
cf target -s manu-dev
cf ssh shiftbook-srv -c "cd app && node scripts/email/check-which-destination-is-used.js"
```

### Option 2: Check via BTP Cockpit

#### To check Instance Level (this is what's being used):
1. Go to BTP Cockpit
2. Navigate to: **Cloud Foundry > Spaces > manu-dev**
3. Click: **Service Instances**
4. Find and click: **shiftbook-destination**
5. Go to: **Destinations tab**
6. You'll see: **shiftbook-email** destination

#### To check Subaccount Level (this is being ignored):
1. Go to BTP Cockpit
2. Navigate to: **Connectivity > Destinations**
3. Look for: **shiftbook-email**
4. This one exists but is NOT being used (instance level takes priority)

### Option 3: Check Application Logs

```bash
cf logs shiftbook-srv --recent | grep -i "smtp\|destination\|email"
```

Look for log entries about configuration source.

## How to Modify the Active Destination (Instance Level)

Since the instance level is being used, you need to modify it there:

### Via BTP Cockpit UI (Recommended):
1. Cloud Foundry > Spaces > manu-dev
2. Service Instances > shiftbook-destination
3. Destinations tab
4. Edit "shiftbook-email"
5. Update configuration
6. Restage app: `cf restage shiftbook-srv`

### Via mta.yaml (Requires Full Redeploy):
Edit `mta.yaml` and add full configuration, then redeploy with `cf deploy`.

## What About the Subaccount Level Destination?

You can:
- **Keep it**: It won't interfere (instance level takes priority)
- **Delete it**: If you want to avoid confusion
- **Use it**: Only if you delete/rename the instance level one

## Quick Commands

```bash
# Target the right space
cf target -s manu-dev

# Check destination service
cf service shiftbook-destination

# Check what services are bound to your app
cf env shiftbook-srv | grep destination

# Restage app after destination changes
cf restage shiftbook-srv

# Check email service logs
cf logs shiftbook-srv --recent | grep -i email
```

## Example Configuration for Gmail

If you're setting up Gmail for the instance-level destination:

**Additional Properties:**
```
mail.smtp.host = smtp.gmail.com
mail.smtp.port = 587
mail.smtp.auth = true
mail.smtp.starttls.enable = true
mail.smtp.ssl.enable = false
mail.user = your-email@gmail.com
mail.password = your-app-password
```

**Authentication:**
- Type: `BasicAuthentication` or `NoAuthentication` (properties contain credentials)
- User: `your-email@gmail.com` (or via mail.user property)
- Password: Your Gmail App Password (NOT regular password)

**Note**: You need 2-Factor Authentication enabled to create App Passwords in Gmail.

## Summary

✅ **manu-dev uses**: Instance level destination (from shiftbook-destination service instance)
✅ **To modify**: BTP Cockpit > Cloud Foundry > Spaces > manu-dev > Service Instances > shiftbook-destination
✅ **Priority**: Instance level > Subaccount level
✅ **After changes**: Run `cf restage shiftbook-srv`

## Need More Details?

See the comprehensive guide: [DESTINATION_HIERARCHY_GUIDE.md](../../__docs/DESTINATION_HIERARCHY_GUIDE.md)
