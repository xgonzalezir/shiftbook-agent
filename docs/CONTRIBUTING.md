# Contributing to ShiftBook Service

## Important Development Guidelines

### Duplicate Implementation Files

**⚠️ CRITICAL: The ShiftBook service has TWO implementation files that must be kept in sync:**

- `srv/ShiftBookService.ts` (uppercase S)
- `srv/shiftbook-service.ts` (lowercase s)

**When making ANY changes to service handlers or business logic, you MUST update BOTH files.**

Common changes that require updates to both files:
- Adding or modifying action handlers
- Adding new parameters to existing actions
- Changing business logic
- Updating validation rules
- Modifying database queries
- Adding new utility functions

### File Structure

```
srv/
├── shiftbook-service.cds         # CDS service definition (OData schema)
├── ShiftBookService.ts            # Implementation file #1
├── shiftbook-service.ts           # Implementation file #2 (keep in sync!)
└── server.js                      # Server configuration
```

### Making Changes

1. **Update the CDS definition** (`srv/shiftbook-service.cds`) if adding/modifying actions
2. **Update BOTH TypeScript implementation files**:
   - `srv/ShiftBookService.ts`
   - `srv/shiftbook-service.ts`
3. Test your changes
4. Commit all three files together

### Example Workflow

When adding a new parameter to an action:

```typescript
// 1. Update srv/shiftbook-service.cds
action myAction(..., newParam: Boolean) returns Result;

// 2. Update srv/ShiftBookService.ts
typedService.on("myAction", async (req: any) => {
  const { ..., newParam = true } = req.data;
  // implementation
});

// 3. Update srv/shiftbook-service.ts
this.on("myAction", async (req: any) => {
  const { ..., newParam = true } = req.data;
  // implementation (same as above)
});
```

### Why Two Files?

The project maintains two implementation files for backwards compatibility and migration purposes. Both files serve the same purpose and must contain identical business logic.

## Other Guidelines

### Code Style

- Use TypeScript for all service implementations
- Follow existing patterns for error handling and audit logging
- Include descriptive comments for complex business logic
- Use meaningful variable names

### Testing

- Write tests for new features
- Ensure existing tests pass before committing
- Test both happy paths and error cases

### Commit Messages

- Use clear, descriptive commit messages
- Reference issue numbers when applicable
- Group related changes in a single commit
