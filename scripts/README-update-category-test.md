# Testing updateCategoryWithDetails Action

This directory contains test scripts to verify that the `updateCategoryWithDetails` action is working correctly in the ShiftBook service.

## Available Test Scripts

### 1. Node.js Test Script (`test-update-category-action.js`)

A comprehensive Node.js script that performs detailed testing of the `updateCategoryWithDetails` action.

**Features:**
- Creates a test category with initial data
- Updates the category with new details
- Verifies all aspects of the update (category, translations, email addresses)
- Uses `getShiftbookCategories` action for category verification (tests both actions)
- Tests the `getShiftbookCategories` action to ensure updated data is visible
- Automatic cleanup of test data
- Detailed error reporting and colored output
- Comprehensive validation of all data changes

**Usage:**
```bash
node scripts/test-update-category-action.js
```

**Prerequisites:**
- Node.js installed
- Server running on `http://localhost:4004`
- Valid authentication token (default: `admin` for development)

### 2. Curl Test Script (`test-update-category-curl.sh`)

A bash script using curl commands for quick testing and verification.

**Features:**
- Uses standard curl commands
- No Node.js dependencies
- Quick execution
- Basic validation of updates
- Uses `getShiftbookCategories` action for category verification
- Automatic cleanup

**Usage:**
```bash
./scripts/test-update-category-curl.sh
```

**Prerequisites:**
- curl installed
- Server running on `http://localhost:4004`
- Valid authentication token (default: `admin` for development)

## What the updateCategoryWithDetails Action Does

The `updateCategoryWithDetails` action performs the following operations:

1. **Updates the main category record:**
   - Updates `default_desc` (description)
   - Updates `sendmail` flag

2. **Replaces all translations:**
   - Deletes all existing translations for the category
   - Inserts new translations from the input

3. **Replaces all email addresses:**
   - Deletes all existing email addresses for the category
   - Inserts new email addresses from the input

4. **Returns the category ID** on successful completion

## Test Data

Both scripts use the following test scenario:

### Original Data:
- ID: "550e8400-e29b-41d4-a716-446655440888" (Node.js) / "550e8400-e29b-41d4-a716-446655440777" (curl)
- Werks: "TEST"
- Description: "Original Test Category"
- Sendmail: 1 (enabled)
- Translations: EN, DE
- Email addresses: original1@example.com, original2@example.com

### Updated Data:
- Category: Same as original
- Werks: "TEST"
- Description: "Updated Test Category"
- Sendmail: 0 (disabled)
- Translations: EN, DE, ES (added Spanish)
- Email addresses: updated1@example.com, updated2@example.com, updated3@example.com

## Test Verification Points

The scripts verify:

1. **Category Update:**
   - Description changed from "Original Test Category" to "Updated Test Category"
   - Sendmail flag changed from 1 to 0
   - Verified using `getShiftbookCategories` action instead of CRUD GET

2. **Translations Update:**
   - Original translations (EN, DE) are replaced
   - New Spanish translation is added
   - All translations have correct descriptions

3. **Email Addresses Update:**
   - Original email addresses are replaced
   - New email addresses are added
   - All email addresses are correctly stored

4. **Integration Test:**
   - `getShiftbookCategories` action returns the updated category data
   - Both category verification and integration test use the same action

## Expected Output

When the tests pass, you should see output similar to:

```
=== Starting updateCategoryWithDetails Action Test ===
ℹ️  Base URL: http://localhost:4004
ℹ️  Service Path: /shiftbook/ShiftBookService
ℹ️  Test Category: "550e8400-e29b-41d4-a716-446655440888"

ℹ️  Running: Create Test Category
✅ Test category created successfully
✅ Create Test Category - PASSED

ℹ️  Running: Update Category With Details
✅ updateCategoryWithDetails action executed successfully
✅ Update Category With Details - PASSED

ℹ️  Running: Verify Category Update
✅ Category basic details updated correctly
✅ Verify Category Update - PASSED

ℹ️  Running: Verify Translations Update
✅ Translations updated correctly
✅ Verify Translations Update - PASSED

ℹ️  Running: Verify Mails Update
✅ Email addresses updated correctly
✅ Verify Mails Update - PASSED

ℹ️  Running: Test getShiftbookCategories
✅ getShiftbookCategories shows updated category correctly
✅ Test getShiftbookCategories - PASSED

ℹ️  Cleaning up test data...
✅ Test data cleaned up successfully

=== Test Results Summary ===
ℹ️  Total Tests: 6
✅ Passed: 6
✅ All tests passed! 🎉
```

## Troubleshooting

### Common Issues:

1. **Server not running:**
   ```
   ❌ Failed to create test category. HTTP Code: 000, Response: 
   ```
   **Solution:** Start the server with `npm start` or `cds run`

2. **Authentication issues:**
   ```
   ❌ Failed to create test category. HTTP Code: 401, Response: {"error":{"code":"401","message":"Unauthorized"}}
   ```
   **Solution:** Check that the authentication token is correct in the script configuration

3. **Category already exists:**
   ```
   ❌ Failed to create test category. HTTP Code: 409, Response: {"error":{"code":"409","message":"Conflict"}}
   ```
   **Solution:** The test category already exists. Run the cleanup manually or change the test category number

4. **Database connection issues:**
   ```
   ❌ Failed to create test category. HTTP Code: 500, Response: {"error":{"code":"500","message":"Internal Server Error"}}
   ```
   **Solution:** Check database connectivity and server logs

### Manual Cleanup

If the automatic cleanup fails, you can manually delete the test data:

```bash
# Using curl
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin" \
  -d '{"ID": "550e8400-e29b-41d4-a716-446655440888", "werks": "TEST"}' \
  "http://localhost:4004/shiftbook/ShiftBookService/deleteCategoryCascade"

# Or change the category number in the scripts and run them again
```

## Integration with CI/CD

These test scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Test updateCategoryWithDetails Action
  run: |
    node scripts/test-update-category-action.js
  env:
    NODE_ENV: test
```

The scripts exit with code 0 on success and code 1 on failure, making them suitable for automated testing.
