# Phase 1.2 Quick Reference

**Status:** ✅ Complete | **Tests:** 59/59 ✅ | **Coverage:** 100%

## File Locations

| File | Purpose |
|------|---------|
| `srv/config/auth-config.ts` | Core module with 15 functions |
| `test/unit/config/auth-config.test.ts` | 59 comprehensive tests |
| `docs/phases/phase-1.2-auth-config.md` | Complete documentation |

## API Quick Reference

### Get Auth Configuration
```typescript
import { getAuthConfig } from './config';
const config = getAuthConfig(environment);
// → { kind: 'mocked'|'dummy'|'xsuaa', description: string, features: [] }
```

### Manage Mock Users
```typescript
import { getMockUser, getAvailableMockUserIds } from './config';

const user = getMockUser(environment, 'alice');
const userIds = getAvailableMockUserIds(environment);
```

### Check User Permissions
```typescript
import { isUserAdmin, userHasScope, canUserPerformAction } from './config';

const isAdmin = isUserAdmin(environment, userId);
const hasScope = userHasScope(environment, userId, 'admin');
const canPerform = canUserPerformAction(environment, userId, 'write');
```

## Mock Users

**Development:** alice, bob, operator, manager, admin  
**Test:** test-readonly, test-user, test-admin, operator, admin, bob

## Run Tests
```bash
npm test -- test/unit/config/auth-config.test.ts
npm test -- test/unit/config/  # Run all config tests (1.1 + 1.2)
```

## Key Constants

- `MOCK_USERS` - Development mock users
- `TEST_USERS` - Test mock users
- `REQUIRED_SCOPES` - { OPERATOR: 'operator', ADMIN: 'admin' }
