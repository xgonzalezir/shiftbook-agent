# BTP Destination Diagnostic Scripts

Tools to validate and diagnose destination configuration in SAP BTP.

## Available Scripts

### 📧 check-email-destination.sh
Wrapper script to specifically verify the email destination.

```bash
bash scripts/check-destination/check-email-destination.sh
```

**Usage:** Complete verification of the `shiftbook-email` destination with CF login and service binding validation.

---

### 📡 check-destination-btp.js
Verifies destinations using the SAP Cloud SDK.

```bash
node scripts/check-destination/check-destination-btp.js
```

**Usage:** Diagnose if destinations are correctly configured and accessible from the application.

---

### 🔧 check-destination-config.js
Authenticates directly with the destination service using OAuth2.

```bash
node scripts/check-destination/check-destination-config.js
```

**Usage:** Get complete configuration details of the `shiftbook-backend` destination.

---

### 📋 check-destinations.js
Lists all available destinations and their properties.

```bash
node scripts/check-destination/check-destinations.js
```

**Usage:** View all configured destinations (email-service, shiftbook-email, etc.).

---

### 📜 list-destinations.js
Lists all destinations in BTP using VCAP_SERVICES credentials.

```bash
node scripts/check-destination/list-destinations.js
```

**Usage:** Get a complete list of all destinations available in the BTP environment. Uses native HTTPS instead of SDK.

---

### 🔑 check-destination-service-key.js
Verifies configuration using a direct service key.

```bash
node scripts/check-destination/check-destination-service-key.js
```

**Usage:** When you need to validate specific credentials of the destination service.

---

### 🛠️ check-destination-setup.sh
Bash script that shows the required configuration for the backend destination.

```bash
bash scripts/check-destination/check-destination-setup.sh
```

**Usage:** Reference guide to manually configure the `shiftbook-backend` destination.

---

## When to Use These Scripts

- ✅ **During initial setup** of the project in a new environment
- 🐛 **Debugging** when emails are not being sent
- 🔍 **Validation** after changes in BTP Cockpit
- 📊 **Diagnostics** for OAuth2 authentication issues

## Requirements

- Be authenticated in Cloud Foundry: `cf login`
- Have destination services bound to the application
- Dependencies installed: `npm install`

## Notes

⚠️ Some of these scripts contain **sensitive credentials**. Do not commit changes that expose secrets.
