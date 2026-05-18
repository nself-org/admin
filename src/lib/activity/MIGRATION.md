# Migration Guide: Mock to Real Activity Tracking

This guide explains the changes from mock activity data to real-time event aggregation.

## What Changed

### Before (Mock System)

The previous system used hardcoded mock data:

```typescript
// Old approach - REMOVED
const mockActivities: Activity[] = [
  {
    id: 'act-1',
    actor: { id: 'user-1', type: 'user', name: 'Admin User' },
    action: 'started',
    resource: { id: 'svc-postgres', type: 'service', name: 'postgres' },
    timestamp: '...',
  },
  // 15+ hardcoded activities...
]

export async function getActivityFeed() {
  // Return filtered mock data
  return mockActivities.filter(...)
}
```

### After (Real System)

The new system aggregates from real audit logs:

```typescript
// New approach - CURRENT
export async function getActivityFeed(options) {
  // Fetch real audit logs from database
  const auditLogs = await getAuditLogs(1000, 0)

  // Convert to activities
  const activities = auditLogs
    .map((log) => auditLogToActivity(log))
    .filter((activity) => activity !== null)

  // Apply filters and pagination
  return filterAndPaginate(activities, options)
}
```

## Breaking Changes

### 1. Mock Data Exports Removed

**Removed:**

```typescript
import { mockActivities, mockActors } from '@/lib/activity'
```

**Solution:**
Use the real query functions instead:

```typescript
import { getActivityFeed, getActivityStats } from '@/lib/activity'

const { activities } = await getActivityFeed({ limit: 20 })
```

### 2. Activity IDs Changed

**Before:**

```typescript
id: 'act-1', 'act-2', 'act-3', ...
```

**After:**

```typescript
id: 'act-1738425600000' // act-{timestamp}
```

**Impact:**

- IDs are now timestamp-based and unique
- Cannot rely on sequential IDs
- Use timestamp-based filtering instead

### 3. Simulated Network Delays Removed

**Before:**

```typescript
async function getActivityFeed() {
  await new Promise((resolve) => setTimeout(resolve, 100))
  return mockData
}
```

**After:**

```typescript
async function getActivityFeed() {
  // Real database query, no artificial delay
  return await getAuditLogs(...)
}
```

## How to Add Activity Logging

### Step 1: Import Logger

```typescript
import { logServiceStart } from '@/lib/activity/logger'
```

### Step 2: Log Activity

```typescript
export async function POST(request: Request) {
  // Perform operation
  await startDockerService('postgres')

  // Log the activity
  await logServiceStart(request, 'postgres', 'admin', {
    version: '15.2',
    startupTime: '2.3s',
  })

  return NextResponse.json({ success: true })
}
```

## Common Patterns

### Pattern 1: Service Operations

```typescript
// Start service
await logServiceStart(request, serviceName, userId, metadata)

// Stop service
await logServiceStop(request, serviceName, userId, metadata)

// Restart service
await logServiceRestart(request, serviceName, userId, metadata)
```

### Pattern 2: Configuration Changes

```typescript
await logConfigurationChange(
  request,
  'Environment Config',
  [
    { field: 'PORT', oldValue: '3000', newValue: '3021' },
    { field: 'DEBUG', oldValue: false, newValue: true },
  ],
  'admin'
)
```

### Pattern 3: Database Operations

```typescript
await logDatabaseOperation(request, 'sync', 'updated', 'admin', {
  tables: 12,
  duration: '1.2s',
})
```

### Pattern 4: Custom Activities

```typescript
import { logApiActivity } from '@/lib/activity/logger'

await logApiActivity(request, 'created', 'api_key', 'key-abc123', 'Production API Key', 'admin', {
  permissions: ['read', 'write'],
})
```

## Activity Sources

Activities are now sourced from:

1. **Audit Logs** (`database.ts`)
   - Login/logout events
   - Session management
   - Password changes
   - System operations

2. **Direct Logging** (new)
   - Service operations (start/stop/restart)
   - Deployments
   - Configuration changes
   - Backup operations
   - Database operations
   - Secret access

3. **Session Activity**
   - Active sessions
   - Session expiry
   - Multi-device tracking

## Data Retention

- **Audit Logs**: 30 days TTL
- **Sessions**: 7 days TTL (30 days with "remember me")
- **Activities**: Derived from audit logs (no separate storage)

## Testing

### Before (Mock)

```typescript
// Tests used mock data
const activities = mockActivities
expect(activities).toHaveLength(15)
```

### After (Real)

```typescript
// Tests use real database
import { addAuditLog, getActivityFeed } from '@/lib/activity'

// Create test activity
await addAuditLog(
  'started',
  {
    actor: { id: 'admin', type: 'user', name: 'Admin' },
    resourceType: 'service',
    resourceId: 'svc-postgres',
    resourceName: 'postgres',
  },
  true,
  'admin'
)

// Query activities
const { activities } = await getActivityFeed({ limit: 10 })
expect(activities.length).toBeGreaterThan(0)
```

## Updating API Consumers

### Frontend Components

**Before:**

```typescript
// Component fetched mock data
const { data } = await fetch('/api/activity')
// Always returned same 15 mock activities
```

**After:**

```typescript
// Component fetches real activities
const { data } = await fetch('/api/activity?limit=20&offset=0')
// Returns real activities from database
// Empty array if no activities logged yet
```

### Empty State Handling

Add empty state handling for when no activities exist:

```typescript
const { activities, total } = await getActivityFeed()

if (total === 0) {
  return <EmptyState message="No activities yet" />
}

return <ActivityList activities={activities} />
```

## Example: Full Integration

```typescript
// src/app/api/services/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { logServiceStart } from '@/lib/activity/logger'
import { startDockerService } from '@/lib/docker'

export async function POST(request: NextRequest) {
  try {
    const { serviceName } = await request.json()

    // Start the service
    const startTime = Date.now()
    await startDockerService(serviceName)
    const duration = Date.now() - startTime

    // Log the activity
    await logServiceStart(request, serviceName, 'admin', {
      duration: `${duration}ms`,
      startedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: `${serviceName} started successfully`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
```

## Troubleshooting

### Issue: No activities showing up

**Solution:**
Ensure audit logs are being created:

```typescript
import { getAuditLogs } from '@/lib/database'

const logs = await getAuditLogs(10)
console.log('Recent audit logs:', logs)
```

### Issue: Activities not filtering correctly

**Solution:**
Check filter parameters match Activity types:

```typescript
const { activities } = await getActivityFeed({
  filter: {
    action: 'started', // Must be valid ActivityAction
    resourceType: 'service', // Must be valid ActivityResourceType
  },
})
```

### Issue: Performance slow with many activities

**Solution:**
Implement pagination:

```typescript
const { activities, hasMore, nextCursor } = await getActivityFeed({
  limit: 20,
  offset: 0,
})

// Load more
if (hasMore) {
  const next = await getActivityFeed({
    limit: 20,
    offset: parseInt(nextCursor),
  })
}
```

## Migration Checklist

- [ ] Remove any code importing `mockActivities` or `mockActors`
- [ ] Update tests to use real database queries
- [ ] Add activity logging to API routes
- [ ] Handle empty state in UI components
- [ ] Test pagination with real data
- [ ] Verify filters work correctly
- [ ] Test export functionality (JSON/CSV)
- [ ] Review activity stats dashboard
- [ ] Update documentation

## Questions?

See the main [README.md](./README.md) for full API documentation.
