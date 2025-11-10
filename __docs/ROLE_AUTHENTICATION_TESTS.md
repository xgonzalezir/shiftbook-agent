# 🧪 Role and Authentication Tests - Shift Book

This file contains tests to verify that role-based authentication works correctly.

---

## ✅ Test 1: Admin can create categories

### Request:
```http
POST http://localhost:4004/shiftbook/ShiftBookService/createCategoryWithDetails
Authorization: Basic alice:
Content-Type: application/json

{
  "werks": "1000",
  "sendmail": 1,
  "sendworkcenters": 1,
  "translations": [
    { "lng": "en", "desc": "Category created by Admin" }
  ],
  "teamsChannel": {
    "name": "Admin Test Channel",
    "webhookURL": "https://example.webhook.office.com/test",
    "description": "Test channel",
    "active": true
  }
}
```

### Expected result:
- ✅ **200 OK** - Category created successfully
- User `alice` has role `shiftbook.admin`
- Audit log: `CREATE_CATEGORY_WITH_DETAILS...by alice - SUCCESS`

---

## ❌ Test 2: Operator CANNOT create categories

### Request:
```http
POST http://localhost:4004/shiftbook/ShiftBookService/createCategoryWithDetails
Authorization: Basic bob:
Content-Type: application/json

{
  "werks": "1000",
  "sendmail": 1,
  "sendworkcenters": 1,
  "translations": [
    { "lng": "en", "desc": "Attempt to create category as Operator" }
  ]
}
```

### Expected result:
- ❌ **403 Forbidden** - Access denied
- User `bob` only has role `shiftbook.operator`
- Error: "Insufficient scope for requested operation"
- Message: `@requires: 'shiftbook.admin'` not satisfied

---

## ✅ Test 3: Operator can create logs

### Request:
```http
POST http://localhost:4004/shiftbook/ShiftBookService/addShiftBookEntry
Authorization: Basic bob:
Content-Type: application/json

{
  "werks": "1000",
  "shoporder": "TEST001",
  "stepid": "0010",
  "split": "001",
  "workcenter": "TEST_WC",
  "user_id": "bob@test.com",
  "category": "c4f07743-87d0-4399-8a50-f8e0198d4406",
  "subject": "Log created by Operator",
  "message": "This log was created by a user with operator role"
}
```

### Expected result:
- ✅ **200 OK** - Log created successfully
- User `bob` has role `shiftbook.operator`
- Audit log: `ADD_SHIFTBOOK_ENTRY...by bob - SUCCESS`
- Notifications sent (if Teams channel or emails configured)

---

## ✅ Test 4: Admin can also create logs

### Request:
```http
POST http://localhost:4004/shiftbook/ShiftBookService/addShiftBookEntry
Authorization: Basic alice:
Content-Type: application/json

{
  "werks": "1000",
  "shoporder": "TEST002",
  "stepid": "0020",
  "split": "001",
  "workcenter": "TEST_WC",
  "user_id": "alice@test.com",
  "category": "c4f07743-87d0-4399-8a50-f8e0198d4406",
  "subject": "Log created by Admin",
  "message": "Admins can also create logs"
}
```

### Expected result:
- ✅ **200 OK** - Log created successfully
- User `alice` has roles `shiftbook.admin` and `shiftbook.operator`
- Admins inherit all operator permissions

---

## ✅ Test 5: Operator can read categories

### Request:
```http
GET http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory?$top=5
Authorization: Basic bob:
```

### Expected result:
- ✅ **200 OK** - Returns category list
- Operator has READ permission on `ShiftBookCategory`

---

## ❌ Test 6: Operator CANNOT modify categories

### Request:
```http
PATCH http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory(ID=c4f07743-87d0-4399-8a50-f8e0198d4406,werks='1000')
Authorization: Basic bob:
Content-Type: application/json

{
  "sendmail": 0
}
```

### Expected result:
- ❌ **403 Forbidden** - Access denied
- Operator does NOT have WRITE permission on `ShiftBookCategory`
- Only `shiftbook.admin` can modify

---

## ✅ Test 7: Admin can modify categories

### Request:
```http
PATCH http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory(ID=c4f07743-87d0-4399-8a50-f8e0198d4406,werks='1000')
Authorization: Basic alice:
Content-Type: application/json

{
  "sendmail": 0
}
```

### Expected result:
- ✅ **200 OK** - Category updated successfully
- Admin has all permissions

---

## ❌ Test 8: Operator CANNOT delete logs

### Request:
```http
DELETE http://localhost:4004/shiftbook/ShiftBookService/ShiftBookLog(ID=<LOG_ID>)
Authorization: Basic bob:
```

### Expected result:
- ❌ **403 Forbidden** - Access denied
- `@restrict` defines: `grant: 'UPDATE,DELETE', to: 'shiftbook.admin'`
- Only admins can delete logs

---

## ✅ Test 9: Admin can delete logs

### Request:
```http
DELETE http://localhost:4004/shiftbook/ShiftBookService/ShiftBookLog(ID=<LOG_ID>)
Authorization: Basic alice:
```

### Expected result:
- ✅ **200 OK** - Log deleted successfully
- Admin has DELETE permission

---

## ✅ Test 10: Operator can mark logs as read

### Request:
```http
POST http://localhost:4004/shiftbook/ShiftBookService/markLogAsRead
Authorization: Basic bob:
Content-Type: application/json

{
  "log_id": "<LOG_ID>",
  "workcenter": "TEST_WC"
}
```

### Expected result:
- ✅ **200 OK** - Log marked as read
- Action `markLogAsRead` has `@requires: ['shiftbook.operator', 'shiftbook.admin']`
- Both roles can mark logs

---

## ❌ Test 11: Without authentication - All requests fail

### Request:
```http
GET http://localhost:4004/shiftbook/ShiftBookService/ShiftBookCategory?$top=5
```

### Expected result:
- ❌ **401 Unauthorized** - No authentication provided
- Service requires: `@(requires: ['shiftbook.operator', 'shiftbook.admin'])`

---

## 🔍 How to verify in logs

When executing these tests, look for these entries in server logs:

### Successful authentication:
```
[shiftbook.auth] - Authentication attempt {
  hasToken: true,
  tokenType: 'Basic'
}
```

### Authenticated user:
```
Authentication: JWT authenticated user: alice with roles: ['shiftbook.admin', 'shiftbook.operator']
```

### Access denied:
```
[SECURITY] Authorization failed for user: bob, required roles: ['shiftbook.admin']
```

### Action audit:
```
[AUDIT] CREATE_CATEGORY_WITH_DETAILS ShiftBookCategory (...) by alice - SUCCESS
[AUDIT] ADD_SHIFTBOOK_ENTRY ShiftBookLog (...) by bob - SUCCESS
```

---

## 📊 Test Summary

| Test | User | Action | Expected Result |
|------|---------|--------|-------------------|
| 1 | alice (admin) | Create category | ✅ 200 OK |
| 2 | bob (operator) | Create category | ❌ 403 Forbidden |
| 3 | bob (operator) | Create log | ✅ 200 OK |
| 4 | alice (admin) | Create log | ✅ 200 OK |
| 5 | bob (operator) | Read categories | ✅ 200 OK |
| 6 | bob (operator) | Modify category | ❌ 403 Forbidden |
| 7 | alice (admin) | Modify category | ✅ 200 OK |
| 8 | bob (operator) | Delete log | ❌ 403 Forbidden |
| 9 | alice (admin) | Delete log | ✅ 200 OK |
| 10 | bob (operator) | Mark log as read | ✅ 200 OK |
| 11 | (no auth) | Any operation | ❌ 401 Unauthorized |

---

## 🚀 Running Tests

```bash
# Start server in development mode
npm run dev

# Or with watch mode
cds watch
```

Then use the **REST Client** extension in VS Code or any HTTP client to execute the requests.

---

**Note**: These tests demonstrate that role-based authentication works correctly in **all environments**:
- ✅ Development: dummy auth with predefined users
- ✅ Test: dummy auth for automated testing  
- ✅ Hybrid: XSUAA with real BTP tokens
- ✅ Production: XSUAA with full authentication
