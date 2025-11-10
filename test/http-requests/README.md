# HTTP Requests Examples

This folder contains HTTP request examples for testing the ShiftBook Service API.

## Files Overview

### 1. `category-management.http`
Category creation, update, deletion, and configuration management actions:
- `createCategoryWithDetails` - Create category with full configuration
- `updateCategoryWithDetails` - Update existing category
- `deleteCategoryCascade` - Delete category and all related data
- `advancedCategorySearch` - Search categories by query
- `getShiftbookCategories` - Get categories for a plant
- `batchInsertMails` - Add multiple email recipients
- `batchInsertTranslations` - Add multiple translations
- `batchInsertWorkcenters` - Add multiple workcenters
- `sendMailByCategory` - Send email notifications
- `getMailRecipients` - Get email recipients for category

### 2. `log-management.http`
ShiftBook log entry operations and read status management:
- `addShiftBookEntry` - Create single log entry
- `batchAddShiftBookEntries` - Create multiple log entries
- `advancedLogSearch` - Search logs by query
- `getShiftBookLogsPaginated` - Get paginated logs
- `getLatestShiftbookLog` - Get most recent log
- `markLogAsRead/Unread` - Mark single log read status
- `batchMarkLogsAsRead/Unread` - Mark multiple logs read status
- `getLastChangeTimestamp` - Get timestamp of last change

### 3. `entity-crud-operations.http`
Direct CRUD operations on all entities:
- **ShiftBookCategory** - Read, Create, Update, Delete
- **ShiftBookCategoryMail** - Manage email recipients
- **ShiftBookCategoryLng** - Manage translations
- **ShiftBookCategoryWC** - Manage workcenter assignments
- **ShiftBookLog** - Manage log entries
- **ShiftBookLogWC** - Manage log-workcenter relationships

### 4. `common-scenarios.http`
End-to-end workflows and common use cases:
- **Scenario 1**: Complete setup for new category
- **Scenario 2**: Log entry with email notification
- **Scenario 3**: Bulk log entry processing (shift handover)
- **Scenario 4**: Read status management
- **Scenario 5**: Category update and maintenance
- **Scenario 6**: Search and filter operations
- **Scenario 7**: Cleanup operations

### 5. `test-teams-notification-flow.http`
Teams integration testing workflow:
- Create category with Teams webhook
- Create log entry to trigger notification
- Verify configuration

## Getting Started

### Prerequisites
1. Service running on `http://localhost:4004`
2. Valid authentication credentials (default: `alice:`)

### Usage Instructions

1. **Variables**: Each file defines common variables at the top:
   ```http
   @baseUrl = http://localhost:4004/shiftbook/ShiftBookService
   @auth = Basic alice:
   ```

2. **Placeholders**: Replace these placeholders with actual values:
   - `CATEGORY_ID` - UUID of a category
   - `LOG_ID` - UUID of a log entry
   - `MAIL_ADDRESS` - Email address

3. **VS Code REST Client**:
   - Install the "REST Client" extension
   - Click "Send Request" above each request
   - Use `###` separator to run individual requests

4. **IntelliJ/WebStorm HTTP Client**:
   - Open `.http` files directly
   - Click the play button next to each request
   - Use `###` separator to navigate between requests

## Authentication

Default authentication uses basic auth with user `alice`:
```
Authorization: Basic alice:
```

Update the `@auth` variable if your setup requires different credentials.

## Response Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `204 No Content` - Successful deletion
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

## Tips

1. **Start with Scenarios**: The `common-scenarios.http` file provides complete workflows
2. **Copy IDs**: After creating resources, copy their IDs from responses to use in subsequent requests
3. **Test Order**: Some requests depend on others (e.g., create before update/delete)
4. **Expand Queries**: Use `$expand` to retrieve related entities in a single request
5. **Filter Results**: Use `$filter`, `$top`, `$orderby` for OData query operations

## OData Query Options

Available OData query options for entity endpoints:
- `$select` - Select specific fields
- `$expand` - Include related entities
- `$filter` - Filter results
- `$orderby` - Sort results
- `$top` - Limit number of results
- `$skip` - Skip number of results
- `$count` - Include total count

Example:
```http
GET {{baseUrl}}/ShiftBookLog?$filter=werks eq '1000'&$orderby=log_dt desc&$top=10&$expand=category
```

## Security Notes

⚠️ **Important**:
- Different actions require different roles (`shiftbook.operator` or `shiftbook.admin`)
- Admin actions are marked in comments
- Ensure you have proper authorization before executing requests
- Never commit files with real credentials or webhook URLs to version control
