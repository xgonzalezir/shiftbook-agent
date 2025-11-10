# ShiftBook Service Testing Scripts

This directory contains comprehensive testing scripts for the ShiftBook Service CRUD operations and actions.

## Scripts

### `test-crud-operations.js`
Comprehensive testing script that covers all CRUD operations, service actions, and OData queries.

### `auth/get-auth-token.js`  
Simple authentication token retrieval and basic service testing.

## Usage

### Run All Tests
```bash
node scripts/test-crud-operations.js
```

### Run Specific Test Suites
```bash
# Test basic CRUD operations
node scripts/test-crud-operations.js crud

# Test service actions (operator/admin level)
node scripts/test-crud-operations.js actions

# Test admin-only actions
node scripts/test-crud-operations.js admin

# Test OData query capabilities
node scripts/test-crud-operations.js odata

# Test error scenarios
node scripts/test-crud-operations.js errors
```

### Get Authentication Token Only
```bash
node scripts/auth/get-auth-token.js
```

## Test Coverage

### Entity CRUD Operations
- ✅ **READ** - Get all categories, logs, mails, translations
- ✅ **READ** - Get specific entities by ID
- ✅ **CREATE** - Create new log entries
- ✅ **UPDATE** - Update existing log entries
- ⚠️ **DELETE** - Only available via admin actions

### Service Actions (Operator/Admin Level)
- ✅ `getShiftbookCategories` - Get categories with localization
- ✅ `advancedCategorySearch` - Search categories by query
- ✅ `advancedLogSearch` - Search logs by query
- ✅ `addShiftBookEntry` - Create single log entry
- ✅ `batchAddShiftBookEntries` - Create multiple log entries
- ✅ `getShiftBookLogsPaginated` - Get paginated logs
- ✅ `getLatestShiftbookLog` - Get latest log for work center
- ✅ `getMailRecipients` - Get email recipients for category

### Admin-Only Actions
- ✅ `createCategoryWithDetails` - Create category with translations/mails
- ✅ `updateCategoryWithDetails` - Update category with translations/mails
- ✅ `batchInsertMails` - Add multiple email addresses
- ✅ `batchInsertTranslations` - Add multiple language translations
- ✅ `sendMailByCategory` - Send emails to category recipients
- ⚠️ `deleteCategoryCascade` - Skipped (destructive operation)

### OData Query Options
- ✅ `$filter` - Filter results by field values
- ✅ `$select` - Select specific fields only
- ✅ `$top` & `$skip` - Pagination
- ✅ `$orderby` - Sort results
- ✅ `$count` - Get total count
- ✅ Complex queries - Multiple options combined

### Error Scenarios
- ✅ Invalid UUID handling
- ✅ Missing required fields
- ✅ Invalid category references
- ✅ Non-existent resources

## Configuration

### Environment
- **Service URL**: `https://manu-dev-org-dev-shiftbooksrv.cfapps.us10-001.hana.ondemand.com`
- **Service Path**: `/shiftbook/ShiftBookService`
- **Authentication**: XSUAA OAuth2 Client Credentials

### Test Data
```javascript
const TEST_DATA = {
  werks: "1000",           // Plant code
  language: "en",          // Language for translations
  shoporder: "TEST123456", // Shop order number
  stepid: "0010",          // Operation step
  split: "001",            // Split number
  workcenter: "WC_TEST_001", // Work center
  user_id: "test-user@example.com" // User identifier
};
```

## Authentication

The scripts use the configured XSUAA service credentials to obtain OAuth2 access tokens automatically. The token includes both `admin` and `operator` scopes, allowing testing of all operations.

### Token Details
- **Grant Type**: `client_credentials`
- **Scopes**: `shiftbook.admin`, `shiftbook.operator`
- **Valid For**: ~2 hours
- **Token Type**: `Bearer`

## Expected Results

### Successful Operations
- HTTP 200 responses with proper JSON data
- Correct OData metadata and context
- Proper error handling for expected failures

### Expected Errors
- **404 Not Found**: Category not found for specific plant
- **400 Bad Request**: Missing required fields
- **403 Forbidden**: Insufficient permissions (if using operator-only token)

## Output Format

Each test displays:
- 📡 **Request Details**: Method, URL, payload
- ✅ **Success Response**: Status code and data
- ❌ **Error Response**: Status code and error details
- 📊 **Summary Information**: Counts and statistics

## Security Notes

- Scripts include real XSUAA credentials for testing environment only
- Never use these credentials in production
- Tokens are automatically obtained and have limited lifetime
- All operations respect CAP service authorization rules

## Troubleshooting

### Common Issues
1. **401 Unauthorized**: Check XSUAA service binding and credentials
2. **403 Forbidden**: Verify user has required scopes
3. **404 Not Found**: Ensure service URL and path are correct
4. **Network Errors**: Check Cloud Foundry app status and routing

### Debug Mode
Add environment variable for detailed logging:
```bash
DEBUG=* node scripts/test-crud-operations.js
```