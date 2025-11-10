# Environment Variables Configuration Guide

## Overview
This document explains how to configure environment variables for the SAP CAP Shift Book service.

## Setup Instructions

1. **Copy the template file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your specific configuration values.

3. **Never commit the `.env` file** to version control (it's already in `.gitignore`).

## Environment Categories

### 🏗️ Application Configuration
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 4004)
- `LOG_LEVEL`: Logging level (info/debug/error)

### 🗄️ Database Configuration
- `DB_KIND`: Database type (sqlite/hana)
- `DB_CREDENTIALS`: Database connection string (JSON format)

### 🔐 Authentication
- `AUTH_KIND`: Authentication type (mocked/xsuaa)
- `UAA_CLIENT_ID`: XSUAA client ID
- `UAA_CLIENT_SECRET`: XSUAA client secret
- `UAA_URL`: XSUAA authentication URL

### 🌍 Internationalization
- `DEFAULT_LANGUAGE`: Default language code (en/es/de)
- `SUPPORTED_LANGUAGES`: Comma-separated language codes
- `I18N_FOLDERS`: i18n message folders

### 📧 Email Configuration
- `EMAIL_DESTINATION_NAME`: Name of BTP destination for email service
- `EMAIL_FROM_ADDRESS`: Default sender email address
- `EMAIL_FROM_NAME`: Default sender name
- `EMAIL_SIMULATION_MODE`: true for development, false for production

**Note**: In production, email credentials are managed via **SAP BTP Destinations** instead of environment variables. See `EMAIL_DESTINATION_SETUP.md` for detailed configuration.

### 🧪 Testing Configuration
- `TEST_BASE_URL`: Base URL for API tests
- `TEST_TIMEOUT`: Test timeout in milliseconds

## Environment-Specific Configurations

### Development (.env)
```bash
NODE_ENV=development
AUTH_KIND=mocked
DB_KIND=sqlite
EMAIL_SIMULATION_MODE=true
```

### Production (.env.production)
```bash
NODE_ENV=production
AUTH_KIND=xsuaa
DB_KIND=hana
EMAIL_SIMULATION_MODE=false
```

## SAP BTP Integration

When deployed to SAP BTP, many variables are automatically provided through service bindings:

- **VCAP_SERVICES**: Service binding information
- **VCAP_APPLICATION**: Application metadata
- Database credentials from HANA service binding
- XSUAA credentials from authorization service binding

## Security Best Practices

1. ✅ **Use different `.env` files** for different environments
2. ✅ **Keep sensitive data secure** - never commit real credentials
3. ✅ **Use BTP service bindings** in production instead of manual configuration
4. ✅ **Rotate credentials regularly**
5. ✅ **Use principle of least privilege** for service accounts

## Common Configuration Examples

### Local Development with SQLite
```bash
NODE_ENV=development
DB_KIND=sqlite
AUTH_KIND=mocked
EMAIL_SIMULATION_MODE=true
```

### Local Development with HANA Cloud
```bash
NODE_ENV=development
DB_KIND=hana
DB_CREDENTIALS={"driver":"com.sap.db.jdbc.Driver","url":"jdbc:sap://your-hana:443/","user":"user","password":"pass"}
AUTH_KIND=mocked
```

### Production on BTP
```bash
NODE_ENV=production
# Service bindings handle DB and AUTH automatically
EMAIL_SIMULATION_MODE=false
FEATURE_AUDIT_LOGGING=true
```

## Troubleshooting

### Common Issues:

1. **Port already in use:**
   - Change `PORT` to an available port (e.g., 4005)

2. **Database connection failed:**
   - Verify `DB_CREDENTIALS` JSON format
   - Check network connectivity to database

3. **Authentication errors:**
   - Verify XSUAA configuration in production
   - Use `AUTH_KIND=mocked` for development

4. **i18n not working:**
   - Ensure `I18N_FOLDERS` points to correct directory
   - Verify message files exist in `_i18n/` folder

## Loading Order

Environment variables are loaded in this order (last one wins):
1. System environment variables
2. `.env` file (this repository)
3. Process-specific environment variables

## Required Variables by Environment

### Development (Minimum)
- NODE_ENV
- PORT
- DB_KIND

### Production (Minimum)
- NODE_ENV
- AUTH_KIND
- EMAIL_SIMULATION_MODE

All other variables have sensible defaults or are optional.
