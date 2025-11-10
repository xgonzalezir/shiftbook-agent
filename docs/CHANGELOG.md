# MSB-38: Message Read Status Management

## Overview
This branch implements a comprehensive message read/unread status tracking system for ShiftBook logs, allowing work centers to track which messages they have read. This feature enables better notification management and provides visibility into which operators have acknowledged specific shift book entries.

## Database Schema Changes

### New Field: `ShiftBookLogWC.isRead`
- **Type**: `Timestamp` (nullable)
- **Purpose**: Tracks when a log was marked as read by a specific work center
- **Default**: `null` (unread state)
- **File**: `db/schema.cds:99`

## Service API Changes

### New Type Definitions (`srv/shiftbook-service.cds`)

#### `LogWorkCenterInput`
```typescript
{
  log_id: UUID;
  workcenter: String(36);
}
```
Used for individual and batch mark operations.

#### `BatchMarkResult`
```typescript
{
  success: Boolean;
  totalCount: Integer;
  successCount: Integer;
  failedCount: Integer;
  errors: String[];
}
```
Provides detailed results for batch operations.

### New Actions

#### 1. `markLogAsRead`
- **Parameters**: `log_id: UUID`, `workcenter: String(36)`
- **Returns**: `Timestamp` - The timestamp when marked as read
- **Description**: Marks a single log as read for a specific work center
- **Implementation**: `srv/ShiftBookService.ts:2051-2095`
- **Behavior**:
  - Updates timestamp each time called (not idempotent)
  - Returns 404 if log-workcenter pair doesn't exist
  - Returns 400 for invalid input

#### 2. `markLogAsUnread`
- **Parameters**: `log_id: UUID`, `workcenter: String(36)`
- **Returns**: `Boolean` - Success status
- **Description**: Marks a single log as unread (sets `isRead` to `null`)
- **Implementation**: `srv/ShiftBookService.ts:2097-2141`
- **Behavior**:
  - Sets `isRead` field to `null`
  - Returns 404 if log-workcenter pair doesn't exist
  - Returns 400 for invalid input

#### 3. `batchMarkLogsAsRead`
- **Parameters**: `logs: LogWorkCenterInput[]` (max 100 entries)
- **Returns**: `BatchMarkResult`
- **Description**: Marks multiple logs as read in a single transaction
- **Implementation**: `srv/ShiftBookService.ts:2143-2242`
- **Features**:
  - All entries marked with same timestamp (batch consistency)
  - Partial success support - continues processing even if some entries fail
  - Returns detailed error messages for failed entries
  - Maximum 100 entries per batch
  - Validates all entries before processing

#### 4. `batchMarkLogsAsUnread`
- **Parameters**: `logs: LogWorkCenterInput[]` (max 100 entries)
- **Returns**: `BatchMarkResult`
- **Description**: Marks multiple logs as unread in a single transaction
- **Implementation**: `srv/ShiftBookService.ts:2244-2337`
- **Features**:
  - Same batch processing capabilities as `batchMarkLogsAsRead`
  - Partial success support
  - Detailed error reporting

## Key Features

### 1. **Timestamp-based Read Tracking**
- Each work center's read status is tracked independently
- Timestamps show exactly when a message was marked as read
- Re-marking as read updates the timestamp (allows tracking re-reads)

### 2. **Batch Processing**
- Efficient handling of multiple mark operations
- Single timestamp for all entries in a batch (consistency)
- Graceful handling of partial failures
- Performance optimized for up to 100 entries per batch

### 3. **Robust Error Handling**
- Input validation for all parameters
- Detailed error messages for debugging
- Partial success support in batch operations
- Proper HTTP status codes (400 for bad input, 404 for not found)

### 4. **Work Center Integration**
- Seamlessly integrated with existing work center functionality
- Supports the `destinationWorkcenters` relationship
- Automatically created when logs are distributed to work centers
- Initially `null` (unread) when log is created

## Bug Fixes

### 1. **Empty Array Issue in Log Creation** (commit `11e9a30`)
- **Problem**: `destinationWorkcenters` was sometimes empty when creating logs
- **Solution**: Fixed validation and creation logic in `addShiftBookEntry`
- **Impact**: Ensures all destination work centers are properly linked to logs

### 2. **Query Chaining Error** (commit `b61fe3f`)
- **Problem**: `.expand()` method call failing in `sendMailByCategory`
- **Solution**: Separated expand query from main query
- **Files**: `srv/ShiftBookService.ts:359-385`

### 3. **Field Name Correction** (commit `9ecae5b`)
- **Problem**: Using incorrect field name `category` instead of `category_id` in ShiftBookCategoryWC operations
- **Solution**: Updated all references to use correct field name
- **Impact**: Fixed work center-category associations

## Test Coverage

### Integration Tests (`test/integration/shiftbook-isread.integration.test.ts`)

#### Test Suites:
1. **Log Creation with isRead Field** (lines 47-87)
   - Verifies logs created with `isRead=null` for all work centers
   - Tests with category containing 6 work centers

2. **Individual Mark as Read/Unread** (lines 89-178)
   - Mark single work center as read
   - Mark single work center as unread
   - 404 error for non-existent pairs
   - 400 error for invalid input

3. **Batch Mark as Read** (lines 180-277)
   - Batch marking multiple work centers
   - Timestamp consistency across batch
   - Partial success handling
   - 100-entry limit validation
   - Empty batch rejection

4. **Batch Mark as Unread** (lines 279-316)
   - Batch unmarking functionality
   - Success tracking

5. **Performance Tests** (lines 318-376)
   - 50-entry batch completion under 5 seconds
   - Concurrent batch operations

6. **Timestamp Consistency** (lines 378-437)
   - Re-marking updates timestamp
   - Timestamp ordering validation

## Other Changes

### Category Work Center Management
- **Updated Actions**: `createCategoryWithDetails`, `updateCategoryWithDetails`, `deleteCategoryWithDetails`
- **New Field**: `sendworkcenters` flag for categories
- **Purpose**: Enhanced work center assignment and management for categories
- **Files**: `srv/ShiftBookService.ts:1081-1490`

### Teams Integration Refactoring
- Separated Teams channel configuration query
- Improved error handling for Teams notifications
- Files: `srv/ShiftBookService.ts:359-385`

### Test Infrastructure
- Enhanced test server setup for integration tests
- Better authentication handling in tests
- File: `test/utils/test-server.ts`

## Data Migration

### Sample Data
New CSV files added for testing:
- `db/data/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookCategory.csv`
- `db/data/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookCategoryLng.csv`
- `db/data/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookCategoryMail.csv`
- `db/data/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookCategoryWC.csv`
- `db/data/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookLog.csv`
- `db/data/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookLogWC.csv`
- `db/data/syntax.gbi.sap.dme.plugins.shiftbook-ShiftBookTeamsChannel.csv`

### Existing Data
- Existing `ShiftBookLogWC` records will have `isRead=null` (unread state)
- No migration script needed - nullable field is backward compatible

## API Usage Examples

### Mark Single Log as Read
```typescript
POST /shiftbook/ShiftBookService/markLogAsRead
{
  "log_id": "123e4567-e89b-12d3-a456-426614174000",
  "workcenter": "WC_ASSEMBLY_01"
}

// Response: "2025-10-01T10:30:45.123Z"
```

### Mark Single Log as Unread
```typescript
POST /shiftbook/ShiftBookService/markLogAsUnread
{
  "log_id": "123e4567-e89b-12d3-a456-426614174000",
  "workcenter": "WC_ASSEMBLY_01"
}

// Response: { "value": true }
```

### Batch Mark as Read
```typescript
POST /shiftbook/ShiftBookService/batchMarkLogsAsRead
{
  "logs": [
    { "log_id": "123e4567-e89b-12d3-a456-426614174000", "workcenter": "WC_ASSEMBLY_01" },
    { "log_id": "123e4567-e89b-12d3-a456-426614174001", "workcenter": "WC_ASSEMBLY_02" },
    { "log_id": "123e4567-e89b-12d3-a456-426614174002", "workcenter": "WC_WELDING" }
  ]
}

// Response:
{
  "success": true,
  "totalCount": 3,
  "successCount": 3,
  "failedCount": 0,
  "errors": []
}
```

### Query Logs with Read Status
```typescript
GET /shiftbook/ShiftBookService/ShiftBookLog(123e4567-e89b-12d3-a456-426614174000)?$expand=destinationWorkcenters

// Response includes:
{
  "ID": "123e4567-e89b-12d3-a456-426614174000",
  "destinationWorkcenters": [
    {
      "log_id": "123e4567-e89b-12d3-a456-426614174000",
      "workcenter": "WC_ASSEMBLY_01",
      "isRead": "2025-10-01T10:30:45.123Z"
    },
    {
      "log_id": "123e4567-e89b-12d3-a456-426614174000",
      "workcenter": "WC_ASSEMBLY_02",
      "isRead": null
    }
  ]
}
```

## Authorization
All new actions require `shiftbook.operator` or `shiftbook.admin` roles.

## Performance Considerations

1. **Batch Operations**: Use batch actions for marking multiple logs to reduce HTTP overhead
2. **Batch Size Limit**: Maximum 100 entries per batch operation
3. **Timestamp Consistency**: All entries in a batch share the same timestamp
4. **Performance Target**: Batch operations complete within 5 seconds for typical workloads

## Breaking Changes
None - all changes are backward compatible. Existing code continues to work without modification.

## Future Enhancements
- Potential for read status notifications
- Analytics on read/unread rates by work center
- Automatic mark-as-read on UI view
- Bulk operations for entire categories or date ranges
