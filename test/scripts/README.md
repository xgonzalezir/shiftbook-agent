# Test Scripts Organization

This directory contains organized test scripts that are used for development, debugging, and manual testing purposes.

## 📁 Directory Structure

### `/test/scripts/notifications/`
Scripts for testing notification functionality:
- `test-new-notification-logic.js` - Tests the new dual notification system
- `test-notification-action.js` - Tests notification actions and triggers
- `test-notification-http.js` - HTTP-based notification testing

### `/test/scripts/teams/`
Scripts for testing Microsoft Teams integration:
- `test-teams-complete-flow.js` - End-to-end Teams notification flow
- `test-teams-curl.js` - cURL-based Teams testing
- `test-teams-from-csv.js` - Teams notifications from CSV data
- `test-teams-message-format.js` - Message formatting tests
- `test-teams-notification.js` - Basic Teams notification tests
- `test-teams-ssl-fixed.js` - SSL/TLS connection tests

### `/test/scripts/email/`
Scripts for testing email functionality:
- `test-email-creation.js` - Email creation and sending tests
- `test-email-creation.sh` - Shell script for email testing
- `test-email-fix.js` - Email troubleshooting scripts
- `test-email-fix.sh` - Email fix automation

### `/test/scripts/destinations/`
Scripts for testing BTP destination configurations:
- `test-destination-cf.js` - Cloud Foundry destination tests
- `test-destination-email.sh` - Email destination configuration tests
- `test-destination-urls.js` - URL and connectivity tests

### `/test/scripts/performance/`
Scripts for performance and load testing:
- `test-workcenters.sh` - Workcenter performance testing

### `/test/scripts/data/`
Scripts for data loading and compatibility:
- `load-test-data.js` - Test data loading utilities
- `test-backward-compatibility.js` - Backward compatibility testing

### `/test/scripts/debug/`
Scripts for debugging and troubleshooting:
- `debug-coverage.test.ts` - Coverage debugging utilities
- `test-fixed-action.sh` - Action debugging and fixes

## 🧪 Jest Integration

These scripts are **automatically excluded** from Jest test runs because:

1. **File Naming**: They don't follow Jest patterns (`*.test.ts`, `*.spec.ts`)
2. **Purpose**: They are utility scripts, not unit/integration tests
3. **Location**: Jest is configured to look in specific test directories

## 🚀 Usage

### Running Individual Scripts:
```bash
# Node.js scripts
node test/scripts/notifications/test-notification-action.js

# Shell scripts
./test/scripts/email/test-email-creation.sh
```

### Running Jest Tests (unaffected):
```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm test
```

## 📝 Benefits

1. **🗂️ Organization**: Scripts grouped by functionality
2. **🧹 Clean Root**: No more test files cluttering the project root
3. **🔧 Jest Compatibility**: No interference with automated test runs
4. **📚 Documentation**: Clear purpose and usage for each script
5. **🛠️ Maintainability**: Easier to find and maintain specific test scripts

## ⚠️ Important Notes

- These scripts are for **manual testing and debugging**
- They **do not run automatically** with `npm test`
- Some scripts may require specific environment setup or credentials
- Check individual script comments for usage instructions