# lastTimestamp Parameter Guide

## Overview

The `lasttimestamp` parameter has been added to the `getShiftBookLogsPaginated` action to enable incremental log fetching. This parameter allows clients to retrieve only new logs created after a specific timestamp.

## Purpose

This parameter is designed for polling scenarios where clients need to:
- Fetch only new logs since the last check
- Reduce data transfer by excluding already retrieved logs
- Implement real-time or near-real-time log monitoring

## Usage

### Parameter Details

- **Name**: `lasttimestamp`
- **Type**: `Timestamp`
- **Optional**: Yes
- **Behavior**: Returns only logs where `log_dt > lasttimestamp` (not included)

### When to Use

1. **Initial Load**: Call without `lasttimestamp` to get the latest logs
   ```json
   {
     "werks": "1000",
     "page": 1,
     "pageSize": 20
   }
   ```
   - Save the `lastChangeTimestamp` from the response

2. **Subsequent Polls**: Use the saved `lastChangeTimestamp` as `lasttimestamp`
   ```json
   {
     "werks": "1000",
     "page": 1,
     "pageSize": 20,
     "lasttimestamp": "2025-10-16T10:00:00.000Z"
   }
   ```
   - Only returns logs created after this timestamp

## Examples

### Example 1: Basic Polling Pattern

```bash
# First call - get initial logs
curl -X POST http://localhost:4004/shiftbook/ShiftBookService/getShiftBookLogsPaginated \
  -H "Content-Type: application/json" \
  -u "operator:" \
  -d '{
    "werks": "1000",
    "page": 1,
    "pageSize": 20
  }'
```

**Response:**
```json
{
  "logs": [...],
  "total": 15,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1,
  "lastChangeTimestamp": "2025-10-16T10:30:45.123Z",
  "readCount": 5,
  "unreadCount": 10
}
```

```bash
# Second call - get only new logs after the lastChangeTimestamp
curl -X POST http://localhost:4004/shiftbook/ShiftBookService/getShiftBookLogsPaginated \
  -H "Content-Type: application/json" \
  -u "operator:" \
  -d '{
    "werks": "1000",
    "page": 1,
    "pageSize": 20,
    "lasttimestamp": "2025-10-16T10:30:45.123Z"
  }'
```

**Response (only new logs):**
```json
{
  "logs": [
    {
      "guid": "...",
      "log_dt": "2025-10-16T10:31:00.000Z",
      ...
    },
    {
      "guid": "...",
      "log_dt": "2025-10-16T10:32:15.000Z",
      ...
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1,
  "lastChangeTimestamp": "2025-10-16T10:32:15.000Z",
  "readCount": 0,
  "unreadCount": 2
}
```

### Example 2: Polling with Workcenter Filter

```bash
curl -X POST http://localhost:4004/shiftbook/ShiftBookService/getShiftBookLogsPaginated \
  -H "Content-Type: application/json" \
  -u "operator:" \
  -d '{
    "werks": "1000",
    "workcenter": "ASSEMBLY01",
    "page": 1,
    "pageSize": 20,
    "lasttimestamp": "2025-10-16T10:30:45.123Z",
    "include_dest_work_center": true,
    "include_orig_work_center": true
  }'
```

### Example 3: Polling with Category Filter

```bash
curl -X POST http://localhost:4004/shiftbook/ShiftBookService/getShiftBookLogsPaginated \
  -H "Content-Type: application/json" \
  -u "operator:" \
  -d '{
    "werks": "1000",
    "category": "11111111-1111-1111-1111-111111111111",
    "page": 1,
    "pageSize": 20,
    "lasttimestamp": "2025-10-16T10:30:45.123Z"
  }'
```

### Example 4: JavaScript Polling Implementation

```javascript
class LogPoller {
  constructor(werks, workcenter, pollInterval = 5000) {
    this.werks = werks;
    this.workcenter = workcenter;
    this.pollInterval = pollInterval;
    this.lastTimestamp = null;
    this.isPolling = false;
  }

  async fetchLogs() {
    const params = {
      werks: this.werks,
      workcenter: this.workcenter,
      page: 1,
      pageSize: 20,
      include_dest_work_center: true,
      include_orig_work_center: true
    };

    // Add lasttimestamp if we have one
    if (this.lastTimestamp) {
      params.lasttimestamp = this.lastTimestamp;
    }

    try {
      const response = await fetch(
        'http://localhost:4004/shiftbook/ShiftBookService/getShiftBookLogsPaginated',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa('operator:')
          },
          body: JSON.stringify(params)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update lastTimestamp for next poll
      if (data.lastChangeTimestamp) {
        this.lastTimestamp = data.lastChangeTimestamp;
      }

      return data;
    } catch (error) {
      console.error('Error fetching logs:', error);
      throw error;
    }
  }

  async poll() {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;

    while (this.isPolling) {
      try {
        const data = await this.fetchLogs();
        
        if (data.logs && data.logs.length > 0) {
          console.log(`Received ${data.logs.length} new logs`);
          // Process new logs
          this.onNewLogs(data.logs);
        } else {
          console.log('No new logs');
        }
      } catch (error) {
        console.error('Polling error:', error);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    }
  }

  stop() {
    this.isPolling = false;
  }

  onNewLogs(logs) {
    // Override this method to handle new logs
    logs.forEach(log => {
      console.log(`New log: ${log.subject}`);
    });
  }
}

// Usage
const poller = new LogPoller('1000', 'ASSEMBLY01', 5000);

// Custom handler for new logs
poller.onNewLogs = (logs) => {
  logs.forEach(log => {
    console.log(`[${log.log_dt}] ${log.subject}: ${log.message}`);
    // Update UI, show notifications, etc.
  });
};

// Start polling
poller.poll();

// Stop polling when needed
// poller.stop();
```

## Important Notes

### Timestamp Exclusion

The `lasttimestamp` parameter uses **greater than** (`>`) comparison, not **greater than or equal to** (`>=`). This means:
- The log at exactly `lasttimestamp` is **NOT included** in results
- Only logs created **after** this timestamp are returned
- This prevents duplicate retrieval of the same log

### Timestamp Format

- The timestamp must be in ISO 8601 format
- Example: `"2025-10-16T10:30:45.123Z"`
- The format should match the `lastChangeTimestamp` returned in responses

### Performance Considerations

1. **Reduced Data Transfer**: Using `lasttimestamp` significantly reduces the amount of data transferred
2. **Database Efficiency**: The timestamp filter is applied at the database level for optimal performance
3. **No Pagination Needed**: Often, new logs fit in a single page, reducing the need for pagination

### Combining with Other Filters

The `lasttimestamp` parameter works seamlessly with all other filters:
- `workcenter` - Filter by specific workcenter
- `category` - Filter by category
- `include_dest_work_center` - Include destination workcenters
- `include_orig_work_center` - Include origin workcenters
- `language` - Get category descriptions in specific language

All filters are applied together, so you get only new logs that match all criteria.

## Use Cases

### 1. Real-Time Dashboard

```javascript
// Poll every 3 seconds for new critical issues
const criticalPoller = new LogPoller('1000', null, 3000);
criticalPoller.category = 'critical-issues-uuid';
criticalPoller.onNewLogs = (logs) => {
  logs.forEach(log => {
    showNotification(`CRITICAL: ${log.subject}`);
  });
};
```

### 2. Workcenter Monitor

```javascript
// Monitor specific workcenter for new messages
const wcMonitor = new LogPoller('1000', 'ASSEMBLY01', 5000);
wcMonitor.onNewLogs = (logs) => {
  updateWorkCenterPanel(logs);
  playNotificationSound();
};
```

### 3. Audit Trail

```javascript
// Collect all new logs for audit purposes
const auditCollector = new LogPoller('1000', null, 10000);
auditCollector.onNewLogs = (logs) => {
  logs.forEach(log => {
    saveToAuditDatabase(log);
  });
};
```

## Testing

### Test Script

Save this as `test-lasttimestamp.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:4004/shiftbook/ShiftBookService"
AUTH="operator:"

echo "Testing lasttimestamp parameter..."
echo ""

# Test 1: Get initial logs
echo "1. Initial fetch (no lasttimestamp):"
RESPONSE1=$(curl -s -X POST "$BASE_URL/getShiftBookLogsPaginated" \
  -H "Content-Type: application/json" \
  -u "$AUTH" \
  -d '{"werks":"1000","page":1,"pageSize":5}')

echo "$RESPONSE1" | json_pp
TIMESTAMP=$(echo "$RESPONSE1" | grep -o '"lastChangeTimestamp":"[^"]*"' | cut -d'"' -f4)
echo ""
echo "Saved timestamp: $TIMESTAMP"
echo ""

# Wait a bit
sleep 2

# Test 2: Fetch with lasttimestamp
echo "2. Fetch with lasttimestamp (should return only newer logs):"
curl -s -X POST "$BASE_URL/getShiftBookLogsPaginated" \
  -H "Content-Type: application/json" \
  -u "$AUTH" \
  -d "{\"werks\":\"1000\",\"page\":1,\"pageSize\":5,\"lasttimestamp\":\"$TIMESTAMP\"}" | json_pp
echo ""

echo "Tests completed!"
```

## Backward Compatibility

The `lasttimestamp` parameter is **optional**, so existing clients will continue to work without modification:
- If `lasttimestamp` is not provided, all matching logs are returned (existing behavior)
- If `lasttimestamp` is provided, only logs after that timestamp are returned (new behavior)

## Summary

The `lasttimestamp` parameter enables efficient incremental log fetching by:
- ✅ Filtering logs at the database level
- ✅ Reducing data transfer
- ✅ Enabling real-time monitoring
- ✅ Supporting all existing filters
- ✅ Maintaining backward compatibility
- ✅ Providing precise timestamp-based filtering

This parameter is ideal for polling scenarios, real-time dashboards, and applications that need to track new log entries efficiently.

