# ShiftBook CAP Service - Test Engineer Guide

## 📋 Overview

This guide provides comprehensive information for test engineers to access and test the ShiftBook CAP Service, including authentication methods, scopes, token generation, and testing approaches across different environments.

## 🏗️ Service Architecture

**Service Name**: ShiftBook CAP Service  
**Technology**: SAP CAP 9.2.0  
**Base Path**: `/shiftbook/ShiftBookService`  
**Port**: 4004 (development)  
**Authentication**: XSUAA with role-based authorization  

## 🔐 Security Model

### Roles & Scopes

| Role | Scope | Permissions |
|------|-------|-------------|
| **Operator** | `shiftbook.operator` | Read categories, create/read logs |
| **Admin** | `shiftbook.admin` | Full CRUD access to all entities |

### XSUAA Configuration

**Application Name**: `shiftbook-srv-manu-dev-org-dev`  
**Token Validity**: 7200 seconds (2 hours)  
**Refresh Token Validity**: 86400 seconds (24 hours)  
**Grant Types**: `client_credentials`, `urn:ietf:params:oauth:grant-type:jwt-bearer`

## 🌍 Environment-Specific Access

### 1. Development Environment

**Environment Variables**:
```bash
export CDS_ENV=development
# or
export NODE_ENV=development
```

**Authentication Type**: Mock Authentication  
**Server URL**: `http://localhost:4004`

#### Available Mock Users

| Username | Roles | Description |
|----------|-------|-------------|
| `alice` | `shiftbook.admin` | Full admin access |
| `bob` | `shiftbook.operator` | Operator access |
| `operator` | `shiftbook.operator` | Read-only operator |
| `manager` | `shiftbook.admin`, `shiftbook.operator` | Manager access |
| `admin` | `shiftbook.admin`, `shiftbook.operator` | Full admin access |

#### Access Methods

**Method 1: Basic Auth (Username only)**
```bash
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Basic Ym9iOg=="  # bob: (base64 encoded)
```

**Method 2: Bearer Token (Simple string)**
```bash
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Bearer bob"
```

**Method 3: Using curl with auth parameter**
```bash
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -u "alice:"  # username: (empty password)
```

### 2. Test Environment

**Environment Variables**:
```bash
export CDS_ENV=test
# or
export NODE_ENV=test
```

**Authentication Type**: Dummy Authentication  
**Server URL**: `http://localhost:4004`

#### Available Test Users

| Username | Roles | Description |
|----------|-------|-------------|
| `test-readonly` | `shiftbook.operator` | Read-only test user |
| `operator` | `shiftbook.operator` | Operator test user |
| `test-user` | `shiftbook.operator` | Standard test user |
| `test-admin` | `shiftbook.operator`, `shiftbook.admin` | Admin test user |
| `admin` | `shiftbook.operator`, `shiftbook.admin` | Full admin test user |
| `bob` | `shiftbook.operator` | Operator test user |

#### Access Methods

**Method 1: Bearer Token (Simple string)**
```bash
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Bearer test-admin"
```

**Method 2: JWT Token (for realistic testing)**
```bash
# Generate test JWT token
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Production Environment

**Environment Variables**:
```bash
export CDS_ENV=production
# or
export NODE_ENV=production
```

**Authentication Type**: XSUAA Authentication  
**Server URL**: `https://your-app.cfapps.io`

#### Access Methods

**Method 1: Real JWT Token from XSUAA**
```bash
curl -X GET "https://your-app.cfapps.io/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Bearer <real-jwt-token-from-xsuaa>"
```

**Method 2: Client Credentials Flow**
```bash
# Get token using client credentials
curl -X POST "https://your-xsuaa-instance.authentication.eu10.hana.ondemand.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=<your-client-id>&client_secret=<your-client-secret>"
```

## 🔑 Token Generation

### Development/Test Token Generation

**Simple String Tokens** (Development/Test):
```bash
# Direct usage of username as token
TOKEN="alice"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory"
```

**Mock JWT Token Generation** (Test):
```javascript
// test-token-generator.js
const jwt = require('jsonwebtoken');

function generateTestToken(userId, scopes) {
  const payload = {
    user_id: userId,
    scope: scopes,
    authorities: scopes,
    client_id: 'shiftbook-test-client',
    zid: 't1'
  };
  
  return jwt.sign(payload, 'mock-jwt-secret-for-local-development-only', { expiresIn: '1h' });
}

// Generate tokens for different roles
const operatorToken = generateTestToken('test-operator', ['shiftbook.operator']);
const adminToken = generateTestToken('test-admin', ['shiftbook.operator', 'shiftbook.admin']);

console.log('Operator Token:', operatorToken);
console.log('Admin Token:', adminToken);
```

### Production Token Generation

**XSUAA Token Generation**:
```bash
# 1. Get client credentials from XSUAA service binding
# 2. Request token using client credentials flow
curl -X POST "https://your-xsuaa-instance.authentication.eu10.hana.ondemand.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=<your-client-id>" \
  -d "client_secret=<your-client-secret>"

# Response will contain access_token
```

## 📡 Service Endpoints

### Core Entities

| Entity | Endpoint | Operations | Required Scopes |
|--------|----------|------------|-----------------|
| ShiftBookLog | `/shiftbook/ShiftBookService/ShiftBookLog` | CRUD | `shiftbook.operator` (R), `shiftbook.admin` (W) |
| ShiftBookCategory | `/shiftbook/ShiftBookService/ShiftBookCategory` | CRUD | `shiftbook.operator` (R), `shiftbook.admin` (W) |
| ShiftBookCategoryMail | `/shiftbook/ShiftBookService/ShiftBookCategoryMail` | CRUD | `shiftbook.operator` (R), `shiftbook.admin` (W) |
| ShiftBookCategoryLng | `/shiftbook/ShiftBookService/ShiftBookCategoryLng` | CRUD | `shiftbook.operator` (R), `shiftbook.admin` (W) |

### Custom Actions

| Action | Endpoint | Description | Required Scopes |
|--------|----------|-------------|-----------------|
| addShiftBookEntry | `POST /shiftbook/ShiftBookService/addShiftBookEntry` | Create single log entry | `shiftbook.operator` |
| batchAddShiftBookEntries | `POST /shiftbook/ShiftBookService/batchAddShiftBookEntries` | Create multiple log entries | `shiftbook.operator` |
| getShiftBookLogsPaginated | `POST /shiftbook/ShiftBookService/getShiftBookLogsPaginated` | Get paginated logs | `shiftbook.operator` |
| advancedLogSearch | `POST /shiftbook/ShiftBookService/advancedLogSearch` | Full-text search logs | `shiftbook.operator` |
| createCategoryWithDetails | `POST /shiftbook/ShiftBookService/createCategoryWithDetails` | Create category with details | `shiftbook.admin` |
| sendMailByCategory | `POST /shiftbook/ShiftBookService/sendMailByCategory` | Send email notifications | `shiftbook.admin` |

### Health Check Endpoints (No Authentication Required)

| Endpoint | Description | Response |
|----------|-------------|----------|
| `GET /health` | Comprehensive health status | JSON with detailed status |
| `GET /health/simple` | Simple health check | JSON with basic status |
| `GET /health/cf` | Cloud Foundry health check | JSON with UP status |
| `GET /metrics` | Prometheus metrics | Metrics format |

## 🧪 Testing Scenarios

### 1. Authentication Testing

**Test 1: Unauthenticated Access**
```bash
# Should return 401
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory"
```

**Test 2: Invalid Token**
```bash
# Should return 401
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Bearer invalid-token"
```

**Test 3: Valid Operator Access**
```bash
# Should return 200
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Bearer bob"
```

**Test 4: Valid Admin Access**
```bash
# Should return 200
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Bearer alice"
```

### 2. Authorization Testing

**Test 1: Operator Access to Read Operations**
```bash
# ✅ Should work - Operator can read categories
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Bearer bob"
```

**Test 2: Operator Access to Create Logs**
```bash
# ✅ Should work - Operator can create logs
curl -X POST "http://localhost:4004/shiftbook/ShiftBookService/addShiftBookEntry" \
  -H "Authorization: Bearer bob" \
  -H "Content-Type: application/json" \
  -d '{
    "werks": "1000",
    "shoporder": "SO123456789",
    "stepid": "0010",
    "split": "001",
    "workcenter": "WC001",
    "user_id": "operator1",
    "category": "550e8400-e29b-41d4-a716-446655440001",
    "subject": "Production Issue",
    "message": "Machine stopped due to material shortage"
  }'
```

**Test 3: Operator Access to Admin Functions**
```bash
# ❌ Should fail - Operator cannot access admin functions
curl -X POST "http://localhost:4004/shiftbook/ShiftBookService/createCategoryWithDetails" \
  -H "Authorization: Bearer bob" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "new-category",
    "werks": "TEST"
  }'
```

**Test 4: Admin Access to All Functions**
```bash
# ✅ Should work - Admin can access all functions
curl -X POST "http://localhost:4004/shiftbook/ShiftBookService/createCategoryWithDetails" \
  -H "Authorization: Bearer alice" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "new-category",
    "werks": "TEST"
  }'
```

### 3. CRUD Operations Testing

**Test 1: Create Category (Admin Only)**
```bash
curl -X POST "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Bearer alice" \
  -H "Content-Type: application/json" \
  -d '{
    "werks": "1000",
    "default_desc": "Production Issues",
    "sendmail": 1
  }'
```

**Test 2: Read Categories (Operator/Admin)**
```bash
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Bearer bob"
```

**Test 3: Update Category (Admin Only)**
```bash
curl -X PUT "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory(ID='{id}',werks='1000')" \
  -H "Authorization: Bearer alice" \
  -H "Content-Type: application/json" \
  -d '{
    "default_desc": "Updated Production Issues",
    "sendmail": 0
  }'
```

**Test 4: Delete Category (Admin Only)**
```bash
curl -X DELETE "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory(ID='{id}',werks='1000')" \
  -H "Authorization: Bearer alice"
```

### 4. OData Query Testing

**Test 1: Filtering**
```bash
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookLog?\$filter=werks eq '1000'" \
  -H "Authorization: Bearer bob"
```

**Test 2: Pagination**
```bash
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookLog?\$top=10&\$skip=0" \
  -H "Authorization: Bearer bob"
```

**Test 3: Field Selection**
```bash
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookLog?\$select=werks,shoporder,subject" \
  -H "Authorization: Bearer bob"
```

**Test 4: Sorting**
```bash
curl -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookLog?\$orderby=log_dt desc" \
  -H "Authorization: Bearer bob"
```

## 🛠️ Testing Tools & Scripts

### 1. Automated Test Scripts

**Run Existing Tests**:
```bash
# Unit tests
npm run test:unit

# Integration tests (requires running server)
npm run test:integration

# E2E tests (requires running server)
npm run test:e2e

# All tests
npm test
```

### 2. Custom Testing Script

**Create a comprehensive test script**:
```javascript
// test-auth-comprehensive.js
const axios = require('axios');

const BASE_URL = 'http://localhost:4004';
const ENDPOINTS = {
  categories: '/shiftbook/ShiftBookService/ShiftBookCategory',
  logs: '/shiftbook/ShiftBookService/ShiftBookLog',
  adminOnly: '/shiftbook/ShiftBookService/ShiftBookCategoryMail'
};

const USERS = {
  operator: 'bob',
  admin: 'alice',
  invalid: 'invalid-user'
};

async function runComprehensiveTests() {
  console.log('🧪 Running Comprehensive CAP Service Tests\n');

  // Test scenarios...
  await testAuthentication();
  await testAuthorization();
  await testCRUDOperations();
  await testODataQueries();
}

// Run tests
runComprehensiveTests().catch(console.error);
```

### 3. Postman Collection

**Import this collection for API testing**:
```json
{
  "info": {
    "name": "ShiftBook CAP Service Tests",
    "description": "Comprehensive test collection for ShiftBook CAP Service"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:4004"
    },
    {
      "key": "operatorToken",
      "value": "bob"
    },
    {
      "key": "adminToken",
      "value": "alice"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Get Categories (Operator)",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/shiftbook/ShiftBookService/ShiftBookCategory",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{operatorToken}}"
          }
        ]
      }
    }
  ]
}
```

## 🔍 Troubleshooting

### Common Issues

**1. 401 Unauthorized**
- Check if authentication header is present
- Verify token format (Bearer <token>)
- Ensure user exists in the environment

**2. 403 Forbidden**
- Verify user has required scopes
- Check if operation requires admin privileges
- Ensure proper role assignment

**3. 404 Not Found**
- Verify endpoint URL is correct
- Check if service is running
- Ensure proper base path

**4. 500 Internal Server Error**
- Check server logs for detailed error
- Verify database connectivity
- Ensure proper environment configuration

### Debug Commands

**Check Server Status**:
```bash
# Health check (no auth required)
curl http://localhost:4004/health

# Check if server is running
netstat -tulpn | grep 4004
```

**Check Environment**:
```bash
# Verify environment variables
echo $CDS_ENV
echo $NODE_ENV

# Check package.json configuration
cat package.json | grep -A 20 '"requires"'
```

**Check Authentication**:
```bash
# Test with verbose output
curl -v -X GET "http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory" \
  -H "Authorization: Bearer bob"
```

## 📚 Additional Resources

- **API Documentation**: `docs/api/api-reference.md`
- **Integration Guide**: `docs/api/integration-guide.md`
- **Security Model**: `docs/functional/security-model.md`
- **Testing Documentation**: `docs/testing/README.md`
- **Deployment Guide**: `docs/deployment/mta-deployment.md`

## 🎯 Quick Reference

### Environment Setup
```bash
# Development
export CDS_ENV=development
npm run dev

# Test
export CDS_ENV=test
npm run test

# Production
export CDS_ENV=production
npm start
```

### Common Test Commands
```bash
# Health check
curl http://localhost:4004/health

# Operator access
curl -H "Authorization: Bearer bob" http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory

# Admin access
curl -H "Authorization: Bearer alice" http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory

# Run all tests
npm test
```

### Token Formats
```bash
# Development/Test (simple string)
Authorization: Bearer bob

# Production (JWT)
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Contact**: Development Team
