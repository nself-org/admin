# Activity Tracking System

Real-time activity tracking and audit logging for nself-admin.

## Overview

The activity tracking system aggregates events from multiple sources to provide a comprehensive view of all system activities:

- **Audit Logs**: Core database tracking (login attempts, sessions, configuration changes)
- **User Actions**: Tracked via sessions and authentication events
- **System Events**: Service operations, deployments, backups, database operations
- **Real-time Events**: All activities logged to LokiJS database with TTL

## Architecture

```
┌─────────────────────────────────────────────────┐
│            Activity Tracking Layer              │
├─────────────────────────────────────────────────┤
│  - logActivity()                                │
│  - logServiceAction()                           │
│  - logDeployment()                              │
│  - logConfigChange()                            │
│  - logBackupAction()                            │
│  - logDatabaseAction()                          │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│        Audit Log (LokiJS Database)              │
│  - 30 day TTL                                   │
│  - Indexed by action, timestamp, userId         │
│  - Supports filtering and pagination            │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│         Activity Feed API                       │
│  - GET /api/activity                            │
│  - GET /api/activity/:id                        │
│  - GET /api/activity/stats                      │
│  - GET /api/activity/search                     │
│  - POST /api/activity/export                    │
└─────────────────────────────────────────────────┘
```

## Usage

### Logging Activities

#### From API Routes

```typescript
import { logApiActivity, extractRequestInfo } from '@/lib/activity/logger'

export async function POST(request: Request) {
  // Perform operation
  const result = await startService('postgres')

  // Log the activity
  await logApiActivity(request, 'started', 'service', 'svc-postgres', 'postgres', 'admin', {
    status: 'success',
  })

  return NextResponse.json({ success: true })
}
```

#### Service Operations

```typescript
import { logServiceStart, logServiceStop, logServiceRestart } from '@/lib/activity/logger'

// Log service start
await logServiceStart(request, 'postgres', 'admin', {
  version: '15.2',
  startupTime: '2.3s',
})

// Log service stop
await logServiceStop(request, 'postgres', 'admin', {
  gracefulShutdown: true,
})

// Log service restart
await logServiceRestart(request, 'hasura', 'admin', {
  reason: 'Configuration change',
})
```

#### Deployments

```typescript
import { logDeploymentEvent } from '@/lib/activity/logger'

await logDeploymentEvent(request, 'staging', 'v0.4.4', 'admin', {
  duration: '45s',
  services: ['postgres', 'hasura', 'nginx'],
})
```

#### Configuration Changes

```typescript
import { logConfigurationChange } from '@/lib/activity/logger'

await logConfigurationChange(
  request,
  'Development Environment',
  [
    { field: 'POSTGRES_PORT', oldValue: '5432', newValue: '5433' },
    { field: 'REDIS_ENABLED', oldValue: false, newValue: true },
  ],
  'admin'
)
```

#### Backups

```typescript
import { logBackupCreation, logBackupRestore } from '@/lib/activity/logger'

// Backup created
await logBackupCreation(
  'backup-20260201-1234',
  'Auto Backup - postgres',
  {
    size: '256MB',
    database: 'postgres',
    type: 'scheduled',
  },
  'system' // or undefined for system actor
)

// Backup restored
await logBackupRestore(
  'backup-20260201-1234',
  'Manual Backup - postgres',
  {
    backupDate: '2026-02-01T10:00:00Z',
    restorePoint: 'before-migration',
  },
  'admin'
)
```

#### Database Operations

```typescript
import { logDatabaseOperation } from '@/lib/activity/logger'

await logDatabaseOperation(request, 'sync', 'updated', 'admin', {
  tables: 12,
  duration: '1.2s',
})
```

#### Secrets

```typescript
import { logSecretAccess, logSecretCreation, logSecretDeletion } from '@/lib/activity/logger'

// Secret accessed
await logSecretAccess(request, 'secret-db-pass', 'Database Password', 'admin', {
  accessType: 'view',
  reason: 'Manual verification',
})

// Secret created
await logSecretCreation(request, 'secret-api-key', 'External API Key', 'admin')

// Secret deleted
await logSecretDeletion(request, 'secret-old-key', 'Old API Key', 'admin')
```

### Querying Activities

#### Get Activity Feed

```typescript
import { getActivityFeed } from '@/lib/activity'

const result = await getActivityFeed({
  filter: {
    actorId: 'admin',
    action: 'started',
    resourceType: 'service',
    startDate: '2026-02-01T00:00:00Z',
    endDate: '2026-02-02T00:00:00Z',
    search: 'postgres',
  },
  limit: 20,
  offset: 0,
  includeChanges: true,
})

// Returns:
// {
//   activities: Activity[],
//   total: number,
//   hasMore: boolean,
//   nextCursor?: string
// }
```

#### Get Single Activity

```typescript
import { getActivityById } from '@/lib/activity'

const activity = await getActivityById('act-1738425600000')
```

#### Get Activity Statistics

```typescript
import { getActivityStats } from '@/lib/activity'

const stats = await getActivityStats()

// Returns:
// {
//   totalToday: 15,
//   totalWeek: 87,
//   totalMonth: 324,
//   byAction: { started: 12, stopped: 8, ... },
//   byResource: { service: 25, database: 10, ... },
//   topActors: [{ actor: {...}, count: 45 }, ...],
//   timeline: [{ date: '2026-02-01', count: 12 }, ...]
// }
```

#### Search Activities

```typescript
import { searchActivity } from '@/lib/activity'

const results = await searchActivity('postgres')
```

#### Export Activities

```typescript
import { exportActivity } from '@/lib/activity'

// Export as JSON
const jsonData = await exportActivity({ startDate: '2026-02-01T00:00:00Z' }, 'json')

// Export as CSV
const csvData = await exportActivity({ resourceType: 'service' }, 'csv')
```

## Activity Types

### Actions

- `created` - Resource created
- `updated` - Resource updated
- `deleted` - Resource deleted
- `viewed` - Resource viewed
- `started` - Service/system started
- `stopped` - Service/system stopped
- `restarted` - Service/system restarted
- `deployed` - Application deployed
- `rollback` - Deployment rolled back
- `login` - User logged in
- `logout` - User logged out
- `password_changed` - Password updated
- `invited` - User invited
- `removed` - User/resource removed
- `role_changed` - User role changed
- `backup_created` - Backup created
- `backup_restored` - Backup restored
- `config_changed` - Configuration modified
- `secret_accessed` - Secret viewed/accessed

### Resource Types

- `service` - Docker service
- `database` - Database system
- `user` - User account
- `tenant` - Tenant organization
- `organization` - Organization entity
- `backup` - Backup file
- `deployment` - Deployment operation
- `config` - Configuration settings
- `secret` - Secret value
- `api_key` - API key
- `workflow` - Automated workflow
- `report` - Report/analytics
- `dashboard` - Dashboard view
- `notification` - Notification message

### Actor Types

- `user` - Human user
- `system` - System-generated
- `api` - API/programmatic
- `workflow` - Automated workflow

## Activity Structure

```typescript
interface Activity {
  id: string // Unique ID (act-{timestamp})
  tenantId?: string // Multi-tenancy support
  actor: ActivityActor // Who performed the action
  action: ActivityAction // What action was performed
  resource: ActivityResource // What resource was affected
  target?: ActivityResource // Optional target resource
  changes?: ActivityChange[] // Field-level changes
  metadata?: Record<string, unknown> // Additional context
  ipAddress?: string // IP address
  userAgent?: string // User agent
  timestamp: string // ISO timestamp
}
```

## API Routes

### GET /api/activity

Get paginated activity feed.

**Query Parameters:**

- `actorId` - Filter by actor ID
- `action` - Filter by action type
- `resourceType` - Filter by resource type
- `resourceId` - Filter by resource ID
- `tenantId` - Filter by tenant ID
- `startDate` - Start date (ISO string)
- `endDate` - End date (ISO string)
- `search` - Search query
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)
- `includeChanges` - Include change details (default: false)

**Response:**

```json
{
  "success": true,
  "activities": [...],
  "total": 100,
  "hasMore": true,
  "nextCursor": "20"
}
```

### GET /api/activity/:id

Get single activity by ID.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "act-1738425600000",
    "actor": {...},
    "action": "started",
    "resource": {...},
    "timestamp": "2026-02-01T12:00:00Z"
  }
}
```

### GET /api/activity/stats

Get activity statistics.

**Query Parameters:**

- `tenantId` - Optional tenant ID filter

**Response:**

```json
{
  "success": true,
  "data": {
    "totalToday": 15,
    "totalWeek": 87,
    "totalMonth": 324,
    "byAction": {...},
    "byResource": {...},
    "topActors": [...],
    "timeline": [...]
  }
}
```

### GET /api/activity/search

Search activities.

**Query Parameters:**

- `q` - Search query (required, min 2 chars)
- `limit` - Max results (default: 50)

**Response:**

```json
{
  "success": true,
  "data": {
    "activities": [...],
    "total": 12,
    "query": "postgres"
  }
}
```

### POST /api/activity/export

Export activities to JSON or CSV.

**Request Body:**

```json
{
  "format": "json", // or "csv"
  "filter": {
    "startDate": "2026-02-01T00:00:00Z",
    "resourceType": "service"
  }
}
```

**Response:**
Downloads file with appropriate content type.

## Data Retention

- **Audit Logs**: 30 days TTL (automatically cleaned up)
- **Sessions**: 7 days TTL (or 30 days with "remember me")
- **Activity Cache**: No caching, real-time queries

## Performance Considerations

- Audit logs are indexed by `action`, `timestamp`, and `userId`
- Maximum 1000 audit log entries fetched per query
- Filtering and pagination applied after conversion to Activity format
- Consider implementing pagination for large datasets

## Testing

Activities are automatically logged for:

- Login/logout events (via auth system)
- Session creation/deletion
- Password changes
- Configuration updates
- Notification actions

To test activity logging:

1. Log in to nself-admin
2. Perform various operations (start service, change config, etc.)
3. Check `/api/activity` to see logged activities
4. View activity feed in the UI

## Future Enhancements

- [ ] Real-time activity streaming (WebSocket)
- [ ] Activity filtering by tenant/organization
- [ ] Advanced search with full-text indexing
- [ ] Activity replay/rollback functionality
- [ ] Webhook notifications for specific activities
- [ ] Activity retention policies per tenant
- [ ] Activity compression for long-term storage
- [ ] Integration with external SIEM systems

## Related Files

- `/src/lib/activity/index.ts` - Core activity tracking functions
- `/src/lib/activity/logger.ts` - Convenient logging utilities
- `/src/lib/database.ts` - Audit log database operations
- `/src/types/activity.ts` - TypeScript type definitions
- `/src/app/api/activity/**/*.ts` - Activity API routes
