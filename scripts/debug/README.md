# Debug Scripts

Utility scripts for debugging and testing specific functionality during development.

## Available Scripts

### 📧 debug-email-creation.js
Tests email creation functionality by calling the `createCategoryWithDetails` action.

```bash
node scripts/debug/debug-email-creation.js
```

**Purpose:** Verify that email notifications are being created correctly when categories are created.

**What it does:**
- Sends a test request to create a category with email recipients
- Validates that emails are generated properly
- Useful for debugging email sending issues

---

### 🔑 debug-token.js
Decodes JWT tokens to understand scope mapping and authentication.

```bash
node scripts/debug/debug-token.js
```

**Purpose:** Debug OAuth2 token issues and understand scope assignments.

**What it does:**
- Fetches an OAuth2 token from the authentication service
- Decodes and displays the JWT token payload
- Shows scopes, user info, and token expiration
- Useful for debugging authorization problems

---

## When to Use These Scripts

- 🐛 **Local debugging** of specific features
- 🧪 **Testing** functionality without running full test suites
- 🔍 **Investigating** issues with emails or authentication
- 📊 **Understanding** token structure and scopes

## Requirements

- Application running locally (for debug-email-creation.js)
- Valid credentials configured in the script
- Dependencies installed: `npm install`

## Notes

⚠️ These scripts contain **hardcoded credentials** for development environments. Never use production credentials in these scripts.

🔒 Do not commit changes that expose sensitive credentials to version control.

