---
title: Research Session
query: "SAP CAP draft feature disable configuration best practices 2024"
date: 7/29/2025
time: 4:28:05 PM
timestamp: 2025-07-29T15:28:05.501Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** SAP CAP draft feature disable configuration best practices 2024

**Response:**

# SAP CAP Draft Feature: Configuration Best Practices in 2024

## Introduction to CAP Draft Mode

SAP Cloud Application Programming (CAP) model includes a powerful "draft" feature that enables applications to save incomplete data entries before they are officially submitted. This is particularly valuable for complex forms or multi-step processes where users might need to save their work in progress. However, while draft mode offers significant benefits, it also introduces complexity, performance considerations, and security implications that need to be carefully managed. In the context of the Shift Book Service project, understanding how to properly configure or disable draft features is essential for optimal performance and user experience.

## Understanding When to Use or Disable Draft Mode

### When Draft Mode is Beneficial

Draft mode is particularly useful in scenarios where:

1. **Complex Data Entry**: Forms require extensive data input that users may need to complete over multiple sessions
2. **Multi-Step Processes**: Workflows involve several steps that cannot be completed in a single session
3. **Collaborative Editing**: Multiple users need to work on the same record before it's finalized
4. **Validation-Heavy Forms**: Forms with complex validation rules where users benefit from saving partial progress

### When to Consider Disabling Draft Mode

For the Shift Book Service project, you might want to disable draft mode in these scenarios:

1. **Simple, Quick Entries**: ShiftBookLog entries might be simple and quick to create, making draft functionality unnecessary overhead
2. **Performance-Critical Operations**: If the service needs to handle high volumes of concurrent operations
3. **Mobile Scenarios**: For mobile-optimized interfaces where simplified interactions are preferred
4. **Read-Heavy Services**: If your service is primarily used for reading data with minimal write operations
5. **Resource Constraints**: When optimizing for minimal resource consumption is a priority

## Technical Implementation for Disabling Draft in CAP (2024 Best Practices)

### Method 1: Service Definition Level Configuration

The most common and recommended approach in 2024 is to control draft mode at the service definition level:

```cds
// In shiftbook-service.cds
service ShiftBookService @(requires: 'authenticated-user') {
    // Disable draft for the entire service
    @cds.draft.enabled: false
    entity ShiftBookLog as projection on db.ShiftBookLog;
    
    // Or selectively enable/disable for specific entities
    entity ShiftBookCategory @cds.draft.enabled: true as projection on db.ShiftBookCategory;
    entity ShiftBookCategoryMail @cds.draft.enabled: false as projection on db.ShiftBookCategoryMail;
}
```

This approach gives you fine-grained control over which entities support draft mode.

### Method 2: Entity-Level Configuration

You can also configure draft at the entity level in your schema definition:

```cds
// In schema.cds
namespace syntax.gbi.sap.dme.plugins.shiftbook;

entity ShiftBookLog @(cds.draft.enabled: false) {
    key ID : UUID;
    timestamp : Timestamp;
    // other fields...
}
```

### Method 3: Runtime Configuration via cds.env.json

For more dynamic control, especially across different environments, you can use the `cds.env.json` configuration:

```json
{
  "features": {
    "draft": {
      "enabled": false
    }
  },
  "cds": {
    "features": {
      "draft": {
        "ShiftBookService.ShiftBookLog": false,
        "ShiftBookService.ShiftBookCategory": true
      }
    }
  }
}
```

This approach allows you to have different draft configurations for development, testing, and production environments.

## Performance Implications and Optimization

### Database Impact

Draft mode creates additional tables with `_drafts` suffix for each entity that has drafting enabled. In your project, we can see these tables already generated in the `gen/db/src/gen/` folder:

```
ShiftBookService.ShiftBookCategory_drafts.hdbtable
ShiftBookService.ShiftBookCategoryLng_drafts.hdbtable
ShiftBookService.ShiftBookCategoryMail_drafts.hdbtable
ShiftBookService.ShiftBookLog_drafts.hdbtable
```

Each draft operation involves:
1. Additional database writes to the draft tables
2. More complex queries when retrieving data (to merge draft and active data)
3. Increased storage requirements
4. Additional indexes to maintain

### Optimizing When Draft is Needed

If you determine that draft functionality is necessary for certain entities (like complex ShiftBookCategory configurations), consider these optimizations:

1. **Selective Enablement**: Only enable drafts for entities that truly need it
2. **Draft Cleanup**: Implement a scheduled job to clean up abandoned drafts:

```javascript
// Example draft cleanup logic for a scheduled job
async function cleanupAbandonedDrafts() {
  const db = await cds.connect.to('db');
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - 7); // 7 days old drafts
  
  const result = await db.run(DELETE.from('DRAFT.DraftAdministrativeData')
    .where({ LastChangedAt: { '<': threshold } }));
  
  console.log(`Cleaned up ${result} abandoned drafts`);
}
```

3. **Optimize Draft Queries**: Use the `$expand` and `$select` query parameters to minimize the data retrieved in draft operations

## Security Considerations for Draft Mode

Draft mode introduces specific security considerations that should be addressed:

### Access Control for Draft Data

Draft data needs the same level of access control as the final data. Ensure your authentication configuration (as defined in your `xs-security.json` and implemented in Task 5) properly secures draft entities:

```javascript
// In config/auth/production.js
module.exports = {
  // Ensure draft tables have the same restrictions
  restricts: {
    'ShiftBookService.ShiftBookLog': {
      grant: ['READ', 'WRITE'],
      to: 'ShiftBookOperator'
    },
    'ShiftBookService.ShiftBookLog_drafts': {
      grant: ['READ', 'WRITE'],
      to: 'ShiftBookOperator'
    }
  }
}
```

### Draft Ownership

By default, CAP associates drafts with the user who created them. This is handled through the `DraftAdministrativeData` entity which tracks the draft owner. Ensure your authentication is properly configured to maintain this association.

## Integration with UI5 Applications

For the POD plugin integration mentioned in your project context, consider these best practices:

### UI5 Draft Handling

If your UI5 application needs to work with draft-enabled entities:

1. Use `sap.ui.model.odata.v4.ODataModel` which has built-in support for OData V4 draft handling
2. Implement proper draft indicators in the UI to show users which entries are in draft state
3. Consider using the `sap.fe` (Fiori Elements) framework which has excellent built-in support for draft handling

### Example UI5 Draft Configuration

```javascript
// In your Component.js for the POD plugin
createContent: function() {
  return new sap.ui.core.mvc.View({
    viewName: "syntax.gbi.sap.dme.plugins.shiftbook.view.Main",
    type: "XML",
    models: {
      "": new sap.ui.model.odata.v4.ODataModel({
        serviceUrl: "/shift-book/",
        synchronizationMode: "None",
        groupId: "$auto",
        autoExpandSelect: true,
        operationMode: "Server",
        // Draft handling configuration
        submitBatch: true,
        draftQuality: "Medium" // or "Low" for simple forms
      })
    }
  });
}
```

## Monitoring and Troubleshooting Draft Operations

### Monitoring Draft Usage

To understand if draft mode is being effectively used in your application, implement monitoring:

```javascript
// In srv/lib/audit-logger.ts
export function logDraftOperation(req) {
  const isDraftOperation = req.path.includes('draftActivate') || 
                          req.path.includes('draftEdit') ||
                          req.path.includes('draftSave');
  
  if (isDraftOperation) {
    console.log(`Draft operation: ${req.path} by user ${req.user.id}`);
    // Add metrics or logging as needed
  }
}
```

### Common Draft-Related Issues and Solutions

1. **Orphaned Drafts**: Implement the cleanup job mentioned earlier
2. **Performance Issues**: Monitor draft table sizes and query performance
3. **Concurrency Problems**: Use proper error handling for draft conflicts:

```javascript
// In shiftbook-service.ts
async function handleDraftConflict(req, next) {
  try {
    return await next();
  } catch (err) {
    if (err.message.includes('draft conflict')) {
      return req.reject(409, 'Another user has modified this record. Please refresh and try again.');
    }
    throw err;
  }
}
```

## Recommendations for the Shift Book Service Project

Based on your project context, here are specific recommendations for draft configuration:

1. **Disable Draft for ShiftBookLog**: Since log entries are typically simple, one-time records, draft mode adds unnecessary overhead:

```cds
entity ShiftBookLog @(cds.draft.enabled: false) as projection on db.ShiftBookLog {
    // fields...
}
```

2. **Consider Enabling Draft for Categories**: Category management might be more complex and benefit from draft support:

```cds
entity ShiftBookCategory @(cds.draft.enabled: true) as projection on db.ShiftBookCategory {
    // fields...
}
```

3. **Update Database Configuration**: After changing draft settings, update your database configuration:

```bash
# Run this command to update the database schema
cds deploy --to hana
```

4. **Document Draft Configuration**: Update your technical documentation (Task 21) to include information about draft configuration:

```markdown
## Draft Configuration

The Shift Book Service uses selective draft enablement:
- ShiftBookLog: Draft disabled for performance optimization
- ShiftBookCategory: Draft enabled to support complex category configuration
- ShiftBookCategoryMail: Draft enabled to support category configuration
- ShiftBookCategoryLng: Draft enabled to support category configuration

Draft cleanup is performed weekly to remove abandoned drafts older than 7 days.
```

5. **Add Draft Configuration Tests**: Include tests to verify draft behavior:

```javascript
// In test/shiftbook.datamodel.test.js
describe('Draft Configuration', () => {
  it('should have draft disabled for ShiftBookLog', async () => {
    // Test that draft operations fail for ShiftBookLog
  });
  
  it('should have draft enabled for ShiftBookCategory', async () => {
    // Test that draft operations work for ShiftBookCategory
  });
});
```

## Conclusion

Properly configuring draft mode in your SAP CAP application is crucial for balancing functionality, performance, and user experience. For the Shift Book Service, a selective approach is recommended - disabling draft for simple, high-volume entities like ShiftBookLog while enabling it for more complex configuration entities like ShiftBookCategory.

By following these best practices, you'll ensure your application provides the right level of functionality while maintaining optimal performance and resource utilization. Remember to document your draft configuration decisions in your technical documentation (Task 21) and include appropriate testing to verify the behavior.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-07-29T15:28:05.501Z*
