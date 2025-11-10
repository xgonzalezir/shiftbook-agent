# Search Logs by String - Implementation Summary

## Feature: MSB-216 - Search Logs by Generic String

### Overview
A new action has been added to the ShiftBook service to search logs using a generic string across multiple fields. The search supports both plain text and regular expressions.

### Implementation Details

#### 1. Service Definition (CDS)
**File**: `srv/shiftbook-service.cds`

```cds
@requires: ['operator', 'admin']
action searchShiftBookLogsByString(
  werks: String(4),
  searchString: String(1024),
  workcenter: String(36),
  category: UUID,
  language: String(2),
  include_dest_work_center: Boolean,
  include_orig_work_center: Boolean
) returns many ShiftBookLogResult;
```

#### 2. Service Implementation (TypeScript)
**File**: `srv/shiftbook-service.ts`

**Location**: Lines 3348-3637 (after `getShiftBookLogsPaginated` handler)

**Search Fields**:
- User (`user_id`)
- Subject (`subject`)
- Message (`message`)
- Origin Workcenter (`workcenter`)
- Recipient (destination workcenters from `ShiftBookLogWC`)

**Parameters**:
- `werks` (required): 4-character plant identifier
- `searchString` (required): String to search for (supports regex)
- `workcenter` (optional): Filter by specific workcenter
- `category` (optional): Filter by specific category
- `language` (optional): Language for category descriptions
- `include_dest_work_center` (optional, default: true): Include destination workcenters
- `include_orig_work_center` (optional, default: true): Include origin workcenters

**Features**:
1. **Plain Text Search**: Case-insensitive string matching
2. **Regular Expression Support**: Automatically detects regex patterns (strings with special characters: `.*+?^${}()|[]\\`)
3. **Performance Optimization**: 
   - Pre-filters logs using database queries
   - Fetches all destination workcenters in a single query
   - Uses Map for O(1) lookup
4. **Language Support**: Returns category descriptions in requested language with fallback to English
5. **Role-Based Access**: Same roles as `getShiftBookLogsPaginated` (`operator` and `admin`)
6. **Audit Logging**: Comprehensive logging of all search operations

#### 3. Test Coverage
**File**: `test/unit/actions/search-logs-by-string.test.ts`

**Test Suites** (900 total tests passed):
- Basic Search Functionality (8 tests)
  - Search by user_id
  - Search by subject
  - Search by message
  - Search by origin workcenter
  - Search by destination workcenter
  - Case-insensitive search
  - Multiple matching logs
  - Empty results

- Regular Expression Search (4 tests)
  - Regex patterns for subjects
  - Regex with OR operator
  - Invalid regex handling

- Optional Filters (6 tests)
  - Category filtering
  - Workcenter filtering with origin/destination flags
  - Combined filters

- Language Support (3 tests)
  - English descriptions
  - German descriptions
  - Fallback to English

- Validation (6 tests)
  - Invalid werks
  - Empty/whitespace search string
  - Missing parameters
  - Unsupported language

- Performance and Edge Cases (4 tests)
  - Null/undefined fields
  - Special characters
  - Result ordering
  - Multi-field matching

- Combined Filters (2 tests)
  - Category + workcenter
  - All filters with language

### Usage Examples

#### 1. Simple Text Search
```http
POST /shiftbook/ShiftBookService/searchShiftBookLogsByString
Content-Type: application/json

{
  "werks": "1000",
  "searchString": "conveyor belt"
}
```

#### 2. Regular Expression Search
```http
POST /shiftbook/ShiftBookService/searchShiftBookLogsByString
Content-Type: application/json

{
  "werks": "1000",
  "searchString": "john\\.doe.*@.*\\.com"
}
```

#### 3. Search with Filters
```http
POST /shiftbook/ShiftBookService/searchShiftBookLogsByString
Content-Type: application/json

{
  "werks": "1000",
  "searchString": "breakdown",
  "category": "11111111-1111-1111-1111-111111111111",
  "workcenter": "ASSEMBLY01",
  "language": "de",
  "include_dest_work_center": true,
  "include_orig_work_center": true
}
```

#### 4. Search Only Origin Workcenters
```http
POST /shiftbook/ShiftBookService/searchShiftBookLogsByString
Content-Type: application/json

{
  "werks": "1000",
  "searchString": "quality",
  "workcenter": "QUALITY01",
  "include_dest_work_center": false,
  "include_orig_work_center": true
}
```

### Performance Considerations

1. **Database Pre-filtering**: The function first filters logs by `werks`, `category`, and `workcenter` at the database level before applying string search
2. **Bulk Fetch**: All destination workcenters are fetched in a single query, not per-log
3. **Map-based Lookup**: Destination workcenters are stored in a Map for O(1) lookup efficiency
4. **Regex Detection**: Regex mode is only enabled when special characters are detected
5. **Short-circuit Evaluation**: String matching stops at first match per log

### Limitations

1. **Fields Searched**: Only searches specific fields (User, Subject, Message, Origin Workcenter, Recipients). Does not search shoporder, stepid, split, createdAt, etc.
2. **No Pagination**: Returns all matching results (not paginated). For large result sets, consider adding filters.
3. **Regex Complexity**: Very complex regex patterns may impact performance on large datasets.

### Testing

Run the unit tests:
```bash
npm run test:unit -- test/unit/actions/search-logs-by-string.test.ts
```

Run all unit tests:
```bash
npm run test:unit
```

### Changes Summary

**Files Modified**:
1. `srv/shiftbook-service.cds` - Added action definition
2. `srv/shiftbook-service.ts` - Added implementation (lines 3348-3637)

**Files Created**:
1. `test/unit/actions/search-logs-by-string.test.ts` - Comprehensive unit tests (33 test cases)

**Branch**: `feature/MSB-216-feature-search-logs-by-generic-string`

### Next Steps

1. ✅ Implementation complete
2. ✅ Unit tests complete (900/900 passing)
3. ⏳ Integration testing with frontend
4. ⏳ Performance testing with large datasets
5. ⏳ User acceptance testing

