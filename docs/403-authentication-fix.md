# 403 Authentication Error - Root Cause and Solution

## Problem
Frontend and Postman requests are getting **403 Forbidden** errors despite sending valid JWT tokens.

## Root Cause

### The Mismatch
CAP CDS service definitions are using **literal strings** with `$XSAPPNAME` prefix, which CAP **does not resolve at runtime**:

```cds
// srv/shiftbook-service.cds
service ShiftBookService @(requires: [
  '$XSAPPNAME.operator',    // ❌ Treated as literal string "$XSAPPNAME.operator"
  '$XSAPPNAME.admin'        // ❌ Treated as literal string "$XSAPPNAME.admin"
]) { ... }
```

Meanwhile, authentication systems provide different role names:
- **Development/Test**: `"operator"`, `"admin"` (from package.json)
- **Production (XSUAA)**: `"shiftbook-srv.operator"`, `"shiftbook-srv.admin"` (from JWT tokens)

**None of these match the literal string `"$XSAPPNAME.operator"`** → 403 Forbidden

### Why This Happens
According to CAP documentation:
- `$XSAPPNAME` is only resolved in **xs-security.json** by XSUAA service
- In CDS annotations (`@requires`, `@restrict`), it's treated as a **literal string**
- CAP expects **simple role names** like `'operator'`, `'admin'` in service definitions

## Solution

### 1. Update Service Definitions (srv/shiftbook-service.cds)

Change all role references from `$XSAPPNAME` prefix to simple names:

```cds
// Before (WRONG):
service ShiftBookService @(requires: [
  '$XSAPPNAME.operator',
  '$XSAPPNAME.admin',
  '$ACCEPT_GRANTED_AUTHORITIES'
]) {
  entity ShiftBookCategory @(restrict: [
    { grant: 'READ', to: ['$XSAPPNAME.operator', '$ACCEPT_GRANTED_AUTHORITIES'] },
    { grant: 'CREATE,UPDATE,DELETE,READ', to: ['$XSAPPNAME.admin', '$ACCEPT_GRANTED_AUTHORITIES'] }
  ]) { ... }
}

// After (CORRECT):
service ShiftBookService @(requires: ['operator', 'admin']) {
  entity ShiftBookCategory @(restrict: [
    { grant: 'READ', to: 'operator' },
    { grant: 'CREATE,UPDATE,DELETE,READ', to: 'admin' }
  ]) { ... }
}
```

**Apply to all entities and actions** (lines 104-441).

### 2. Update Mock Users (package.json)

Change role names from `shiftbook.*` prefix to simple names:

```json
// Before (WRONG):
"alice": {
  "ID": "alice",
  "tenant": "t1",
  "roles": ["shiftbook.admin", "shiftbook.operator"]
}

// After (CORRECT):
"alice": {
  "ID": "alice",
  "tenant": "t1",
  "roles": ["admin", "operator"]
}
```

**Update all users in both `[development]` and `[test]` sections** (lines 244-297).

### 3. Update XSUAA Authentication Mapping (srv/server.js)

Fix role name mapping to use simple names:

```js
// Before (WRONG) - line 228:
roles[`shiftbook.${scope}`] = 1;
checkedScopes.push(`shiftbook.${scope}`);

// After (CORRECT):
roles[scope] = 1;
checkedScopes.push(scope);
```

**Location**: Lines 226-234 in `setupXSUAAuthentication` function.

### 4. Keep xs-security.json Unchanged

**No changes needed** - `$XSAPPNAME` is correct here:

```json
{
  "xsappname": "shiftbook-srv",
  "scopes": [
    { "name": "$XSAPPNAME.operator" },  // ✓ Correct - XSUAA resolves this
    { "name": "$XSAPPNAME.admin" }
  ],
  "role-templates": [
    { "name": "operator", "scope-references": ["$XSAPPNAME.operator"] },
    { "name": "admin", "scope-references": ["$XSAPPNAME.admin"] }
  ]
}
```

## How It Works After Fix

### Development/Test Flow:
1. Request: `Authorization: Bearer alice`
2. server.js maps to: `{ roles: { operator: 1, admin: 1 } }`
3. CAP checks: `@requires: ['operator', 'admin']`
4. Match found → ✅ **200 OK**

### Production (XSUAA) Flow:
1. Request: JWT token with scope `shiftbook-srv.admin`
2. server.js calls: `checkLocalScope('admin')` → finds `shiftbook-srv.admin`
3. Maps to: `{ roles: { admin: 1 } }`
4. CAP checks: `@requires: ['admin']`
5. Match found → ✅ **200 OK**

## Files to Modify

| File | Changes | Lines |
|------|---------|-------|
| `srv/shiftbook-service.cds` | Remove `$XSAPPNAME` prefix from all `@requires` and `@restrict` | 104-441 (~50 occurrences) |
| `package.json` | Change roles from `shiftbook.*` to simple names | 244-297 |
| `srv/server.js` | Fix role mapping to use simple names | 226-234 |
| `xs-security.json` | ✅ **No changes needed** | - |

## References

- [CAP Authorization Documentation](https://cap.cloud.sap/docs/guides/security/authorization)
- [CAP Java Security](https://cap.cloud.sap/docs/java/security)
- [@sap/xssec Documentation](https://www.npmjs.com/package/@sap/xssec)
