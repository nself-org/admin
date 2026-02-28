# Real Activity Tracking Implementation

## Summary

Replaced 200+ lines of mock activity data with real-time event aggregation from the LokiJS audit log database.

## Changes Made

### 1. Core Activity System (`src/lib/activity/index.ts`)

**Removed:**

- Mock data arrays (`mockActivities`, `mockActors`)
- Hardcoded 15 sample activities
- Simulated network delays
- Fake data generation functions

**Implemented:**

- Real-time audit log to activity conversion
- `auditLogToActivity()` - Converts database audit logs to Activity format
- `logActivity()` - Generic activity logging function
- `logServiceAction()` - Log service start/stop/restart
- `logDeployment()` - Log deployment events
- `logConfigChange()` - Log configuration changes
- `logBackupAction()` - Log backup creation/restore
- `logDatabaseAction()` - Log database operations
- Real filtering and pagination from database queries

### 2. Activity Logger Utilities (`src/lib/activity/logger.ts`)

**New file** providing convenient logging functions:

- `extractRequestInfo()` - Extract IP and User Agent from requests
- `logApiActivity()` - Generic activity logging from API routes
- `logServiceStart()`, `logServiceStop()`, `logServiceRestart()`
- `logDeploymentEvent()`
- `logConfigurationChange()`
- `logBackupCreation()`, `logBackupRestore()`
- `logDatabaseOperation()`
- `logSecretAccess()`, `logSecretCreation()`, `logSecretDeletion()`

### 3. Documentation

**Created:**

- `src/lib/activity/README.md` - Complete API documentation
- `src/lib/activity/MIGRATION.md` - Migration guide from mock to real system

### 4. Activity Sources

Activities are now aggregated from:

1. **Audit Logs** (existing)
   - Login/logout events
   - Session creation/deletion
   - Password changes
   - Configuration updates
   - Notification actions

2. **New Activity Logging** (ready for integration)
   - Service operations (start/stop/restart)
   - Deployments (staging/production)
   - Database operations (sync/seed/migrate)
   - Backup operations
   - Secret access

## Technical Details

### Database Schema

Activities are stored in the `auditLog` collection (LokiJS):

```typescript
interface AuditLogItem {
  action: string
  details?: any
  timestamp: Date
  success: boolean
  userId?: string
}
```

### Activity Conversion

The `auditLogToActivity()` function converts audit log entries to Activity format:

```typescript
AuditLogItem → Activity

{
  action: 'login_success',
  details: { userId: 'admin', ip: '...' },
  timestamp: Date,
  userId: 'admin'
}
→
{
  id: 'act-1738425600000',
  actor: { id: 'admin', type: 'user', name: 'Admin User' },
  action: 'login',
  resource: { id: 'admin', type: 'user', name: 'Admin User' },
  timestamp: '2026-02-01T12:00:00Z',
  ipAddress: '...'
}
```

### Activity Types Supported

**Actions:**

- created, updated, deleted, viewed
- started, stopped, restarted
- deployed, rollback
- login, logout, password_changed
- invited, removed, role_changed
- backup_created, backup_restored
- config_changed, secret_accessed

**Resource Types:**

- service, database, user, tenant, organization
- backup, deployment, config, secret, api_key
- workflow, report, dashboard, notification

## API Routes (Unchanged)

All existing API routes continue to work:

- `GET /api/activity` - Activity feed with filters
- `GET /api/activity/:id` - Single activity
- `GET /api/activity/stats` - Statistics
- `GET /api/activity/search` - Search activities
- `POST /api/activity/export` - Export to JSON/CSV

## Data Retention

- **Audit Logs**: 30 day TTL (configured in database.ts)
- **Sessions**: 7 day TTL (30 days with "remember me")
- **Activities**: Derived from audit logs in real-time

## Breaking Changes

### 1. Mock Data Exports Removed

```typescript
// REMOVED - No longer available
import { mockActivities, mockActors } from '@/lib/activity'

// USE INSTEAD
import { getActivityFeed, getActivityStats } from '@/lib/activity'
```

### 2. Activity IDs Changed

- **Before**: `act-1`, `act-2`, `act-3` (sequential)
- **After**: `act-1738425600000` (timestamp-based)

### 3. No Artificial Delays

Removed simulated network delays (`setTimeout`).

## Next Steps for Integration

### 1. Add Activity Logging to Service Operations

```typescript
// src/app/api/services/start/route.ts
import { logServiceStart } from '@/lib/activity/logger'

export async function POST(request: Request) {
  const { serviceName } = await request.json()

  // Start service
  await startDockerService(serviceName)

  // Log activity
  await logServiceStart(request, serviceName, 'admin')

  return NextResponse.json({ success: true })
}
```

### 2. Add Activity Logging to Deployments

```typescript
// src/app/api/deployment/deploy/route.ts
import { logDeploymentEvent } from '@/lib/activity/logger'

export async function POST(request: Request) {
  const { environment, version } = await request.json()

  // Deploy
  await deploy(environment, version)

  // Log activity
  await logDeploymentEvent(request, environment, version, 'admin', {
    duration: '45s',
  })

  return NextResponse.json({ success: true })
}
```

### 3. Add Activity Logging to Database Operations

```typescript
// src/app/api/database/sync/route.ts
import { logDatabaseOperation } from '@/lib/activity/logger'

export async function POST(request: Request) {
  // Sync database
  const result = await syncDatabase()

  // Log activity
  await logDatabaseOperation(request, 'sync', 'updated', 'admin', {
    tables: result.tablesAffected,
    duration: result.duration,
  })

  return NextResponse.json({ success: true })
}
```

## Testing

### Current Activity Sources

The system currently logs activities for:

1. User authentication (login/logout)
2. Session management
3. Password changes
4. Notification actions

### Testing Steps

1. Start nself-admin: `pnpm dev`
2. Log in to the application
3. Perform various operations
4. Check activity feed: `GET /api/activity`
5. View statistics: `GET /api/activity/stats`

### Expected Results

- Login event should be logged
- Session creation should be logged
- Any configuration changes should be logged
- Activity feed should show real events (not mock data)
- Empty state if no activities exist yet

## Performance Considerations

- Maximum 1000 audit log entries fetched per query
- Filtering and pagination applied after conversion
- Audit logs are indexed by `action`, `timestamp`, `userId`
- Consider pagination for large datasets

## Files Modified

1. `/src/lib/activity/index.ts` - Core implementation (200+ lines rewritten)
2. `/src/lib/activity/logger.ts` - New helper utilities
3. `/src/lib/activity/README.md` - API documentation
4. `/src/lib/activity/MIGRATION.md` - Migration guide

## Files Unchanged

- `/src/app/api/activity/**/*.ts` - All API routes work as-is
- `/src/types/activity.ts` - TypeScript types unchanged
- `/src/lib/database.ts` - Database schema unchanged

## Quality Checks

✅ TypeScript type check: PASS
✅ ESLint: PASS (0 errors, 0 warnings)
✅ Prettier format: PASS
✅ No mock data remaining
✅ All activity functions use real database
✅ Documentation complete
✅ Migration guide provided

## Future Enhancements

- [ ] Real-time WebSocket streaming
- [ ] Activity filtering by tenant/organization
- [ ] Full-text search indexing
- [ ] Activity replay functionality
- [ ] Webhook notifications
- [ ] Activity retention policies
- [ ] Compression for long-term storage
- [ ] SIEM integration

## References

- [Activity README](/src/lib/activity/README.md) - Full API documentation
- [Migration Guide](/src/lib/activity/MIGRATION.md) - Detailed migration steps
- [Database Schema](/src/lib/database.ts) - Audit log structure
- [Activity Types](/src/types/activity.ts) - TypeScript definitions

---

**Implementation Date**: 2026-02-01
**Status**: ✅ Complete
**Test Coverage**: Manual testing required (no automated tests yet)
**Breaking Changes**: Yes (mock data exports removed)
