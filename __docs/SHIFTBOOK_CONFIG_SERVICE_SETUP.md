# ShiftBook Config User-Provided Service Setup

## Overview

The `shiftbook-config` is a **user-provided service** in Cloud Foundry that stores application configuration, including email destination settings. This service must be created **before** deploying the application.

---

## Why User-Provided Service?

Unlike managed services (XSUAA, Destination, HANA), a user-provided service allows you to:
- ✅ Store custom configuration data
- ✅ Keep sensitive information secure (bound to app only)
- ✅ Update configuration without redeploying the app
- ✅ Share configuration across multiple apps

---

## Creating the Service in BTP

### Step 1: Login to Cloud Foundry

```bash
cf login -a https://api.cf.us10-001.hana.ondemand.com --sso

# Target your organization and space
cf target -o manu-dev-org -s dev
```

---

### Step 2: Create the User-Provided Service

#### Option A: Email with Microsoft 365 / Office 365

```bash
cf create-user-provided-service shiftbook-config -p '{
  "EMAIL_DESTINATION_NAME": "shiftbook-email",
  "EMAIL_SMTP_HOST": "smtp.office365.com",
  "EMAIL_SMTP_PORT": "587",
  "EMAIL_SMTP_SECURE": "false",
  "EMAIL_SMTP_USER": "shiftbook-notifications@syntax.com",
  "EMAIL_SMTP_PASSWORD": "YOUR_PASSWORD_HERE",
  "EMAIL_FROM": "shiftbook-notifications@syntax.com"
}'
```

**Notes**:
- Replace `YOUR_PASSWORD_HERE` with the actual password or app password
- For Microsoft 365, you may need to enable "SMTP AUTH" for the mailbox
- Alternatively, use Microsoft Graph API via BTP Destination (see Option C)

---

#### Option B: Email with Gmail

```bash
cf create-user-provided-service shiftbook-config -p '{
  "EMAIL_DESTINATION_NAME": "shiftbook-email",
  "EMAIL_SMTP_HOST": "smtp.gmail.com",
  "EMAIL_SMTP_PORT": "587",
  "EMAIL_SMTP_SECURE": "false",
  "EMAIL_SMTP_USER": "your-email@gmail.com",
  "EMAIL_SMTP_PASSWORD": "YOUR_16_CHAR_APP_PASSWORD",
  "EMAIL_FROM": "your-email@gmail.com"
}'
```

**Gmail Requirements**:
1. Enable 2-Step Verification in your Google Account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Create password for "Mail"
   - Use the 16-character password (no spaces)

---

#### Option C: Using BTP Destination Service (Recommended for Production)

If you prefer to use the BTP Destination service instead of direct SMTP:

```bash
cf create-user-provided-service shiftbook-config -p '{
  "EMAIL_DESTINATION_NAME": "shiftbook-email",
  "USE_BTP_DESTINATION": "true"
}'
```

Then configure the destination `shiftbook-email` in BTP Cockpit:
- Go to: BTP Cockpit → manu-dev-org → Connectivity → Destinations
- Create destination named: `shiftbook-email`
- See `__docs/EMAIL_DESTINATION_SETUP.md` for detailed configuration

---

### Step 3: Verify the Service

```bash
# List user-provided services
cf services | grep shiftbook-config

# View service details
cf service shiftbook-config
```

Expected output:
```
name:             shiftbook-config
service:          user-provided
bound apps:       shiftbook-srv (after deployment)
```

---

### Step 4: Deploy the Application

Once the service is created, deploy the application:

```bash
cd /path/to/shift-book

# Build MTA
mbt build -t mta_archives

# Deploy
cf deploy mta_archives/shiftbook_1.0.0.mtar
```

The MTA deployment will automatically bind `shiftbook-config` to `shiftbook-srv`.

---

## Updating Configuration

To update the service configuration without redeploying:

### Option 1: Delete and Recreate

```bash
# Unbind from app (if already bound)
cf unbind-service shiftbook-srv shiftbook-config

# Delete service
cf delete-service shiftbook-config

# Create with new configuration
cf create-user-provided-service shiftbook-config -p '{
  "EMAIL_DESTINATION_NAME": "shiftbook-email",
  "EMAIL_SMTP_HOST": "new-smtp-server.com",
  ...
}'

# Rebind to app
cf bind-service shiftbook-srv shiftbook-config

# Restage app to apply changes
cf restage shiftbook-srv
```

### Option 2: Update in Place (CF CLI v8+)

```bash
cf update-user-provided-service shiftbook-config -p '{
  "EMAIL_DESTINATION_NAME": "shiftbook-email",
  "EMAIL_SMTP_HOST": "new-smtp-server.com",
  ...
}'

# Restage app to apply changes
cf restage shiftbook-srv
```

---

## Configuration Parameters Reference

| Parameter | Description | Required | Example |
|-----------|-------------|----------|---------|
| `EMAIL_DESTINATION_NAME` | Name of the email destination | ✅ Yes | `shiftbook-email` |
| `EMAIL_SMTP_HOST` | SMTP server hostname | ❌ No* | `smtp.gmail.com` |
| `EMAIL_SMTP_PORT` | SMTP server port | ❌ No* | `587` |
| `EMAIL_SMTP_SECURE` | Use SSL/TLS | ❌ No | `false` |
| `EMAIL_SMTP_USER` | SMTP username | ❌ No* | `user@example.com` |
| `EMAIL_SMTP_PASSWORD` | SMTP password | ❌ No* | `your-password` |
| `EMAIL_FROM` | Default sender email | ❌ No | `noreply@syntax.com` |
| `USE_BTP_DESTINATION` | Use BTP Destination instead of SMTP | ❌ No | `true` |

\* Required if not using `USE_BTP_DESTINATION=true`

---

## How the Application Uses This Service

### In Development (Local)

The application reads from `.env` file:
```bash
EMAIL_DESTINATION_NAME=shiftbook-email
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
...
```

### In Production (BTP)

The application reads from the bound `shiftbook-config` service:

```javascript
// srv/lib/email-service.ts automatically detects environment
if (isProduction()) {
  // Read from VCAP_SERVICES (shiftbook-config)
  const config = process.env.VCAP_SERVICES;
  const emailConfig = JSON.parse(config)['user-provided'][0].credentials;
}
```

---

## Security Best Practices

### 1. Never Commit Credentials
- ❌ Don't put real passwords in code or Git
- ✅ Use user-provided services for BTP
- ✅ Use `.env` for local (add to `.gitignore`)

### 2. Use App Passwords
- ❌ Don't use main account passwords
- ✅ Use Gmail App Passwords (16 chars)
- ✅ Use Microsoft 365 App Passwords

### 3. Rotate Credentials Regularly
- Change passwords every 90 days
- Update the service: `cf update-user-provided-service`
- Restage app: `cf restage shiftbook-srv`

### 4. Limit Permissions
- Use dedicated service account for emails
- Grant only "Send Mail" permission
- Monitor for unauthorized access

---

## Troubleshooting

### Issue: Service not found during deployment

**Error**:
```
Service "shiftbook-config" not found
```

**Solution**:
Create the service before deploying:
```bash
cf create-user-provided-service shiftbook-config -p '{ ... }'
```

---

### Issue: Email not sending in BTP

**Check 1**: Verify service is bound
```bash
cf env shiftbook-srv | grep shiftbook-config
```

**Check 2**: View application logs
```bash
cf logs shiftbook-srv --recent | grep -i email
```

**Check 3**: Test SMTP connection
```bash
# Check if credentials are correct
cf ssh shiftbook-srv
# Inside app container:
curl -v smtp://smtp.gmail.com:587
```

---

### Issue: Authentication failed

**Common causes**:
1. Wrong password (use app password, not main password)
2. 2FA enabled but no app password generated
3. SMTP authentication disabled in email provider
4. IP address blocked by email provider

**Solution for Gmail**:
1. Enable 2-Step Verification
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use the 16-character password

**Solution for Microsoft 365**:
1. Enable SMTP AUTH for the mailbox
2. Use Modern Authentication if available
3. Consider using Microsoft Graph API instead (via BTP Destination)

---

## Example: Complete Setup Flow

```bash
# 1. Login to CF
cf login -a https://api.cf.us10-001.hana.ondemand.com --sso

# 2. Target space
cf target -o manu-dev-org -s dev

# 3. Create service
cf create-user-provided-service shiftbook-config -p '{
  "EMAIL_DESTINATION_NAME": "shiftbook-email",
  "EMAIL_SMTP_HOST": "smtp.gmail.com",
  "EMAIL_SMTP_PORT": "587",
  "EMAIL_SMTP_SECURE": "false",
  "EMAIL_SMTP_USER": "shiftbook@syntax.com",
  "EMAIL_SMTP_PASSWORD": "abcd efgh ijkl mnop",
  "EMAIL_FROM": "shiftbook@syntax.com"
}'

# 4. Verify
cf service shiftbook-config

# 5. Build and deploy
cd /Users/xgonzalez/Documents/GBI_CAP_Projects/shift-book
mbt build -t mta_archives
cf deploy mta_archives/shiftbook_1.0.0.mtar

# 6. Test email functionality
# Create a log entry and check logs
cf logs shiftbook-srv --recent | grep "Email sent"
```

---

## Alternative: Using CF Environment Variables

If you prefer not to use a user-provided service, you can set environment variables directly:

```bash
cf set-env shiftbook-srv EMAIL_SMTP_HOST smtp.gmail.com
cf set-env shiftbook-srv EMAIL_SMTP_PORT 587
cf set-env shiftbook-srv EMAIL_SMTP_USER your-email@gmail.com
cf set-env shiftbook-srv EMAIL_SMTP_PASSWORD your-app-password

# Restage to apply
cf restage shiftbook-srv
```

**Pros**: Simpler, no separate service
**Cons**: Less secure, harder to manage, visible in `cf env` output

---

## Summary

1. ✅ Create `shiftbook-config` user-provided service in BTP
2. ✅ Configure with email SMTP settings
3. ✅ Deploy application (auto-binds the service)
4. ✅ Test email functionality
5. ✅ Update service as needed without redeployment

**The service must exist BEFORE deploying the MTA, or the deployment will fail.**

---

**For more details on email destination configuration, see `__docs/EMAIL_DESTINATION_SETUP.md`**
