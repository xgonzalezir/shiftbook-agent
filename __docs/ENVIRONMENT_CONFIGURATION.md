# 🏗️ Environment Configuration Guide

## Environment Configuration: SQLite → HANA

### 📋 Environment Summary

| Environment | Database | Authentication | Destinations | Purpose |
|-------------|----------|----------------|--------------|---------|
| **development** | SQLite (local file) | Mocked | Simulated | Local development |
| **test** | SQLite (memory) | Mocked | Mock | Automated testing |
| **hybrid** | HANA Cloud | XSUAA | BTP Destinations | BTP Testing |
| **production** | HANA Cloud | XSUAA | BTP Destinations | Production |

## 🚀 Commands by Environment

### Development (Local SQLite)
```bash
# Development with persistent SQLite
npm run dev
# Or specifically:
npm run dev:sqlite

# Deploy development database
npm run db:deploy:dev
```

### Test (SQLite memory)
```bash
# Unit tests with SQLite in memory
npm run test:unit
npm test
```

### Hybrid (HANA in BTP - Testing)
```bash
# Testing in BTP environment with HANA
npm run hybrid

# Deploy to HANA (requires binding)
npm run db:deploy:hybrid
```

### Production (HANA in BTP - Live)
```bash
# Production in BTP
npm run prod

# Deploy to HANA production
npm run db:deploy:prod
```

## 🔧 Automatic CDS Configuration

### Development Profile
```json
{
  "db": {
    "kind": "sqlite",
    "credentials": {
      "url": "db/shiftbook-dev.db"
    }
  },
  "auth": {
    "kind": "mocked"
  }
}
```

### Test Profile  
```json
{
  "db": {
    "kind": "sqlite", 
    "credentials": {
      "url": ":memory:"
    }
  },
  "auth": {
    "kind": "mocked"
  }
}
```

### Hybrid/Production Profile
```json
{
  "db": {
    "kind": "hana"
    // Credentials via VCAP_SERVICES binding
  },
  "auth": {
    "kind": "xsuaa"
    // Credentials via VCAP_SERVICES binding
  }
}
```

## 📁 File Structure

```
shift-book/
├── db/
│   ├── shiftbook-dev.db         # SQLite development (auto-created)
│   ├── data/                    # Mock data for all environments
│   │   ├── ShiftBookCategory.csv
│   │   ├── ShiftBookCategoryLng.csv
│   │   ├── ShiftBookCategoryMail.csv
│   │   └── ShiftBookLog.csv
│   └── schema.cds              # Universal model (SQLite + HANA)
├── srv/
│   └── shiftbook-service.ts    # Logic that works in all environments
└── .env                        # Environment variables
```

## 🔄 Development Flow

### 1. Local Development (SQLite)
```bash
# Work locally with SQLite
export CDS_ENV=development
npm run dev

# Persistent database in db/shiftbook-dev.db
# Mock data loads automatically
# Auth disabled (mocked)
# Destinations simulated
```

### 2. Testing (SQLite memory)
```bash
# Fast tests in memory
export CDS_ENV=test
npm run test:unit

# In-memory database (clean each test)
# Fresh mock data each time
# No authentication
# Mock destinations
```

### 3. BTP Testing (HANA)
```bash
# Deploy to hybrid environment
export CDS_ENV=hybrid
mbt build && cf deploy

# HANA Cloud as database
# XSUAA authentication enabled  
# Real BTP Destinations
# End-to-end testing
```

### 4. Production (HANA)
```bash
# Deploy to production
export CDS_ENV=production
mbt build && cf deploy

# Enterprise HANA Cloud
# Complete XSUAA authentication
# Configured BTP Destinations
# Complete monitoring and logging
```

## 🔍 Environment Variables by Profile

### Development (.env)
```properties
CDS_ENV=development
DEV_DB_FILE=db/shiftbook-dev.db

# Simulation modes
EMAIL_SIMULATION_MODE=true
DMC_SIMULATION_MODE=true

# Local testing
EMAIL_FROM_ADDRESS=dev@localhost
EMAIL_FROM_NAME=Dev Shift Book
```

### Hybrid/Production (BTP)
```properties
# Set via CF environment or mta.yaml
CDS_ENV=hybrid  # or production

# BTP service bindings provide:
# - HANA credentials via VCAP_SERVICES
# - XSUAA credentials via VCAP_SERVICES  
# - Destination service via VCAP_SERVICES

# Real email configuration
EMAIL_SIMULATION_MODE=false
DMC_SIMULATION_MODE=false
```

## 📊 Advantages of this Configuration

### ✅ Development (SQLite)
- **Fast**: No remote connections
- **Offline**: Works without internet
- **Persistent**: Data preserved between restarts
- **Debug**: Easy data inspection

### ✅ Test (SQLite memory)
- **Speed**: Super fast tests
- **Isolation**: Each test starts clean
- **Parallelization**: Parallel tests without conflicts
- **CI/CD**: Perfect for pipelines

### ✅ Hybrid (HANA)
- **Realism**: Same environment as production
- **Integration Testing**: End-to-end tests
- **BTP Services**: Validate destinations and auth
- **Performance**: Testing with real data

### ✅ Production (HANA)
- **Enterprise**: Complete HANA features
- **Scale**: High volume handling
- **Security**: XSUAA and enterprise auth
- **Monitoring**: BTP logging and metrics

## 🎯 Common Usage Commands

```bash
# Daily development
npm run dev                    # SQLite development

# Testing during development
npm run test:unit             # SQLite memory tests

# Prepare for BTP
npm run build:mta             # Build MTA
npm run db:deploy:hybrid      # Deploy to HANA testing

# Final deployment
cf push                       # Deploy to BTP production
npm run db:deploy:prod        # Deploy DB to production
```

## 🔧 Troubleshooting

### SQLite Issues
```bash
# Recreate development database
rm db/shiftbook-dev.db
npm run db:deploy:dev
```

### HANA Issues  
```bash
# Check service bindings
cf services
cf env shiftbook-srv

# Redeploy to HANA
npm run db:deploy:hybrid
```

### Environment Issues
```bash
# Check current configuration
npx cds env

# List all available profiles
npx cds env --profiles
```

Your configuration is now optimized for the complete flow: **SQLite (dev/test) → HANA (hybrid/prod)** 🚀
