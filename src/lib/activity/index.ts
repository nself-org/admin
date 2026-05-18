// Activity library for nself-admin
// Real-time event aggregation from audit logs, sessions, and system operations

import { addAuditLog, getAllSessions, getAuditLogs, type AuditLogItem } from '@/lib/database'
import type {
  Activity,
  ActivityAction,
  ActivityActor,
  ActivityFeedOptions,
  ActivityFilter,
  ActivityResourceType,
  ActivityStats,
} from '@/types/activity'

// =============================================================================
// Activity Event Tracking
// =============================================================================

/**
 * Log an activity event to the audit log
 */
export async function logActivity(
  actor: ActivityActor,
  action: ActivityAction,
  resourceType: ActivityResourceType,
  resourceId: string,
  resourceName: string,
  metadata?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await addAuditLog(
    action,
    {
      actor,
      resourceType,
      resourceId,
      resourceName,
      metadata,
      ipAddress,
      userAgent,
    },
    true,
    actor.id
  )
}

/**
 * Log a service action (start, stop, restart)
 */
export async function logServiceAction(
  action: 'started' | 'stopped' | 'restarted',
  serviceName: string,
  userId: string = 'admin',
  metadata?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await logActivity(
    {
      id: userId,
      type: 'user',
      name: 'Admin User',
    },
    action,
    'service',
    `svc-${serviceName}`,
    serviceName,
    metadata,
    ipAddress
  )
}

/**
 * Log a deployment action
 */
export async function logDeployment(
  environment: string,
  version: string,
  userId: string = 'admin',
  metadata?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await logActivity(
    {
      id: userId,
      type: 'user',
      name: 'Admin User',
    },
    'deployed',
    'deployment',
    `deploy-${environment}-${Date.now()}`,
    `${environment} Deployment`,
    {
      version,
      environment,
      ...metadata,
    },
    ipAddress
  )
}

/**
 * Log a configuration change
 */
export async function logConfigChange(
  configName: string,
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>,
  userId: string = 'admin',
  ipAddress?: string
): Promise<void> {
  await addAuditLog(
    'config_changed',
    {
      actor: {
        id: userId,
        type: 'user',
        name: 'Admin User',
      },
      resourceType: 'config',
      resourceId: `config-${configName}`,
      resourceName: configName,
      changes,
      ipAddress,
    },
    true,
    userId
  )
}

/**
 * Log a backup action
 */
export async function logBackupAction(
  action: 'backup_created' | 'backup_restored',
  backupId: string,
  backupName: string,
  metadata?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  const actor: ActivityActor = userId
    ? {
        id: userId,
        type: 'user',
        name: 'Admin User',
      }
    : {
        id: 'system',
        type: 'system',
        name: 'nself System',
      }

  await logActivity(actor, action, 'backup', backupId, backupName, metadata)
}

/**
 * Log a database operation
 */
export async function logDatabaseAction(
  action: ActivityAction,
  operation: string,
  userId: string = 'admin',
  metadata?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await logActivity(
    {
      id: userId,
      type: 'user',
      name: 'Admin User',
    },
    action,
    'database',
    `db-${operation}`,
    operation,
    metadata,
    ipAddress
  )
}

// =============================================================================
// Audit Log to Activity Conversion
// =============================================================================

/**
 * Convert audit log entry to Activity format
 */
function auditLogToActivity(log: AuditLogItem): Activity | null {
  const details = log.details || {}

  // Extract actor information
  const actor: ActivityActor = details.actor || {
    id: log.userId || 'system',
    type: details.actor?.type || (log.userId ? 'user' : 'system'),
    name: details.actor?.name || (log.userId === 'admin' ? 'Admin User' : 'System'),
    email: details.actor?.email,
  }

  // Determine resource type and action from audit log action
  let resourceType: ActivityResourceType = 'service'
  let action: ActivityAction = log.action as ActivityAction
  let resourceId = details.resourceId || log.action
  let resourceName = details.resourceName || log.action

  // Map audit log actions to activity actions and resources
  switch (log.action) {
    case 'login_attempt':
    case 'login_success':
      action = 'login'
      resourceType = 'user'
      resourceId = log.userId || 'admin'
      resourceName = actor.name
      break

    case 'session_created':
      action = 'login'
      resourceType = 'user'
      resourceId = log.userId || details.userId || 'admin'
      resourceName = actor.name
      break

    case 'session_deleted':
    case 'session_revoked':
      action = 'logout'
      resourceType = 'user'
      resourceId = log.userId || details.userId || 'admin'
      resourceName = actor.name
      break

    case 'password_set':
    case 'password_changed':
      action = 'password_changed'
      resourceType = 'user'
      resourceId = log.userId || 'admin'
      resourceName = actor.name
      break

    case 'sessions_revoked':
      action = 'logout'
      resourceType = 'user'
      resourceId = details.userId || 'admin'
      resourceName = `${details.count || 0} sessions`
      break

    case 'notification_created':
      action = 'created'
      resourceType = 'notification'
      resourceId = details.notificationId || `notification-${log.timestamp}`
      resourceName = details.title || 'Notification'
      break

    case 'notification_read':
      action = 'viewed'
      resourceType = 'notification'
      resourceId = details.notificationId || 'notification'
      resourceName = 'Notification'
      break

    case 'notification_deleted':
      action = 'deleted'
      resourceType = 'notification'
      resourceId = details.notificationId || 'notification'
      resourceName = 'Notification'
      break

    case 'config_changed':
      action = 'config_changed'
      resourceType = 'config'
      resourceId = details.resourceId || 'config'
      resourceName = details.resourceName || 'Configuration'
      break

    case 'started':
    case 'stopped':
    case 'restarted':
      action = log.action as ActivityAction
      resourceType = details.resourceType || 'service'
      resourceId = details.resourceId || `svc-${resourceName}`
      resourceName = details.resourceName || 'Service'
      break

    case 'deployed':
      action = 'deployed'
      resourceType = 'deployment'
      resourceId = details.resourceId || `deploy-${Date.now()}`
      resourceName = details.resourceName || 'Deployment'
      break

    case 'backup_created':
    case 'backup_restored':
      action = log.action as ActivityAction
      resourceType = 'backup'
      resourceId = details.resourceId || `backup-${Date.now()}`
      resourceName = details.resourceName || 'Backup'
      break

    default:
      // Check if it's a standard CRUD action
      if (['created', 'updated', 'deleted', 'viewed'].includes(log.action)) {
        action = log.action as ActivityAction
        resourceType = details.resourceType || 'service'
        resourceId = details.resourceId || log.action
        resourceName = details.resourceName || log.action
      } else {
        // Unknown action type, skip
        return null
      }
  }

  const activity: Activity = {
    id: `act-${log.timestamp.getTime()}`,
    actor,
    action,
    resource: {
      id: resourceId,
      type: resourceType,
      name: resourceName,
    },
    timestamp: log.timestamp.toISOString(),
    ipAddress: details.ipAddress,
    userAgent: details.userAgent,
    metadata: details.metadata,
  }

  // Add changes if available
  if (details.changes) {
    activity.changes = details.changes
  }

  // Add target if available
  if (details.target) {
    activity.target = details.target
  }

  return activity
}

// =============================================================================
// Activity Feed Query Functions
// =============================================================================

/**
 * Check if activity matches filter criteria
 */
function matchesFilter(activity: Activity, filter: ActivityFilter): boolean {
  if (filter.actorId && activity.actor.id !== filter.actorId) {
    return false
  }

  if (filter.actorType && activity.actor.type !== filter.actorType) {
    return false
  }

  if (filter.action) {
    const actions = Array.isArray(filter.action) ? filter.action : [filter.action]
    if (!actions.includes(activity.action)) {
      return false
    }
  }

  if (filter.resourceType) {
    const types = Array.isArray(filter.resourceType) ? filter.resourceType : [filter.resourceType]
    if (!types.includes(activity.resource.type)) {
      return false
    }
  }

  if (filter.resourceId && activity.resource.id !== filter.resourceId) {
    return false
  }

  if (filter.tenantId && activity.tenantId !== filter.tenantId) {
    return false
  }

  if (filter.startDate) {
    const startDate = new Date(filter.startDate)
    const activityDate = new Date(activity.timestamp)
    if (activityDate < startDate) {
      return false
    }
  }

  if (filter.endDate) {
    const endDate = new Date(filter.endDate)
    const activityDate = new Date(activity.timestamp)
    if (activityDate > endDate) {
      return false
    }
  }

  if (filter.search) {
    const searchLower = filter.search.toLowerCase()
    const matchesSearch =
      activity.actor.name.toLowerCase().includes(searchLower) ||
      activity.resource.name.toLowerCase().includes(searchLower) ||
      activity.action.toLowerCase().includes(searchLower) ||
      (activity.actor.email && activity.actor.email.toLowerCase().includes(searchLower))
    if (!matchesSearch) {
      return false
    }
  }

  return true
}

/**
 * Generate timeline for activity stats
 */
function generateTimeline(activities: Activity[], days: number): { date: string; count: number }[] {
  const timeline: { date: string; count: number }[] = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const count = activities.filter((a) => {
      const activityDate = new Date(a.timestamp).toISOString().split('T')[0]
      return activityDate === dateStr
    }).length

    timeline.push({ date: dateStr, count })
  }

  return timeline
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get activity feed with filtering and pagination
 */
export async function getActivityFeed(options: ActivityFeedOptions = {}): Promise<{
  activities: Activity[]
  total: number
  hasMore: boolean
  nextCursor?: string
}> {
  const { filter = {}, limit = 20, offset = 0, includeChanges = true } = options

  // Fetch audit logs from database
  // Get extra logs for filtering (fetch more than needed)
  const auditLogs = await getAuditLogs(1000, 0)

  // Convert audit logs to activities
  const allActivities = auditLogs
    .map((log) => auditLogToActivity(log))
    .filter((activity): activity is Activity => activity !== null)

  // Filter activities
  let filtered = allActivities.filter((activity) => matchesFilter(activity, filter))

  // Sort by timestamp (newest first)
  filtered = filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const total = filtered.length
  const paginated = filtered.slice(offset, offset + limit)

  // Optionally remove changes for smaller payload
  const activities = includeChanges
    ? paginated
    : paginated.map(({ changes: _changes, ...rest }) => rest)

  return {
    activities,
    total,
    hasMore: offset + limit < total,
    nextCursor: offset + limit < total ? String(offset + limit) : undefined,
  }
}

/**
 * Get a single activity by ID
 */
export async function getActivityById(id: string): Promise<Activity | null> {
  // Fetch audit logs and find matching activity
  const auditLogs = await getAuditLogs(1000, 0)
  const activities = auditLogs
    .map((log) => auditLogToActivity(log))
    .filter((activity): activity is Activity => activity !== null)

  return activities.find((a) => a.id === id) || null
}

/**
 * Get activity statistics
 */
export async function getActivityStats(tenantId?: string): Promise<ActivityStats> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(todayStart)
  monthStart.setMonth(monthStart.getMonth() - 1)

  // Fetch all audit logs
  const auditLogs = await getAuditLogs(1000, 0)

  // Convert to activities
  let activities = auditLogs
    .map((log) => auditLogToActivity(log))
    .filter((activity): activity is Activity => activity !== null)

  // Filter by tenant if provided
  if (tenantId) {
    activities = activities.filter((a) => a.tenantId === tenantId)
  }

  // Count activities by time period
  const totalToday = activities.filter((a) => new Date(a.timestamp) >= todayStart).length
  const totalWeek = activities.filter((a) => new Date(a.timestamp) >= weekStart).length
  const totalMonth = activities.filter((a) => new Date(a.timestamp) >= monthStart).length

  // Count by action
  const byAction = {} as Record<ActivityAction, number>
  activities.forEach((a) => {
    byAction[a.action] = (byAction[a.action] || 0) + 1
  })

  // Count by resource type
  const byResource = {} as Record<ActivityResourceType, number>
  activities.forEach((a) => {
    byResource[a.resource.type] = (byResource[a.resource.type] || 0) + 1
  })

  // Get top actors
  const actorCounts = new Map<string, { actor: ActivityActor; count: number }>()
  activities.forEach((a) => {
    const existing = actorCounts.get(a.actor.id)
    if (existing) {
      existing.count++
    } else {
      actorCounts.set(a.actor.id, { actor: a.actor, count: 1 })
    }
  })
  const topActors = Array.from(actorCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Generate timeline for last 7 days
  const timeline = generateTimeline(activities, 7)

  return {
    totalToday,
    totalWeek,
    totalMonth,
    byAction,
    byResource,
    topActors,
    timeline,
  }
}

/**
 * Get activities for a specific resource
 */
export async function getActivityForResource(
  resourceType: ActivityResourceType,
  resourceId: string
): Promise<Activity[]> {
  const auditLogs = await getAuditLogs(1000, 0)

  return auditLogs
    .map((log) => auditLogToActivity(log))
    .filter((activity): activity is Activity => activity !== null)
    .filter((a) => a.resource.type === resourceType && a.resource.id === resourceId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * Get activities by a specific actor
 */
export async function getActivityByActor(actorId: string): Promise<Activity[]> {
  const auditLogs = await getAuditLogs(1000, 0)

  return auditLogs
    .map((log) => auditLogToActivity(log))
    .filter((activity): activity is Activity => activity !== null)
    .filter((a) => a.actor.id === actorId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * Search activities by query string
 */
export async function searchActivity(query: string): Promise<Activity[]> {
  const queryLower = query.toLowerCase()
  const auditLogs = await getAuditLogs(1000, 0)

  return auditLogs
    .map((log) => auditLogToActivity(log))
    .filter((activity): activity is Activity => activity !== null)
    .filter((a) => {
      return (
        a.actor.name.toLowerCase().includes(queryLower) ||
        a.resource.name.toLowerCase().includes(queryLower) ||
        a.action.toLowerCase().includes(queryLower) ||
        (a.actor.email && a.actor.email.toLowerCase().includes(queryLower)) ||
        (a.metadata && JSON.stringify(a.metadata).toLowerCase().includes(queryLower))
      )
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * Export activities in specified format
 */
export async function exportActivity(
  filter: ActivityFilter,
  format: 'json' | 'csv'
): Promise<string> {
  const auditLogs = await getAuditLogs(1000, 0)

  const filtered = auditLogs
    .map((log) => auditLogToActivity(log))
    .filter((activity): activity is Activity => activity !== null)
    .filter((activity) => matchesFilter(activity, filter))

  const sorted = filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  if (format === 'json') {
    return JSON.stringify(sorted, null, 2)
  }

  // CSV format
  const headers = [
    'ID',
    'Timestamp',
    'Actor ID',
    'Actor Name',
    'Actor Type',
    'Action',
    'Resource ID',
    'Resource Name',
    'Resource Type',
    'IP Address',
  ]

  const rows = sorted.map((a) => [
    a.id,
    a.timestamp,
    a.actor.id,
    a.actor.name,
    a.actor.type,
    a.action,
    a.resource.id,
    a.resource.name,
    a.resource.type,
    a.ipAddress || '',
  ])

  const csvContent = [headers.join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join(
    '\n'
  )

  return csvContent
}

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Get recent sessions as activities
 */
export async function getSessionActivities(userId: string = 'admin'): Promise<Activity[]> {
  const sessions = await getAllSessions(userId)

  return sessions.map((session) => ({
    id: `act-session-${session.createdAt.getTime()}`,
    actor: {
      id: session.userId,
      type: 'user' as const,
      name: 'Admin User',
    },
    action: 'login' as ActivityAction,
    resource: {
      id: session.userId,
      type: 'user' as ActivityResourceType,
      name: 'Admin User',
    },
    timestamp: session.createdAt.toISOString(),
    ipAddress: session.ip,
    userAgent: session.userAgent,
    metadata: {
      rememberMe: session.rememberMe,
      lastActive: session.lastActive.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    },
  }))
}

// =============================================================================
// Exports
// =============================================================================

export {
  type Activity,
  type ActivityAction,
  type ActivityActor,
  type ActivityFeedOptions,
  type ActivityFilter,
  type ActivityResourceType,
  type ActivityStats,
}
