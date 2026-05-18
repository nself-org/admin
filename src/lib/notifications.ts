import crypto from 'crypto'
import { addAuditLog, getDatabase, initDatabase } from './database'

// Type definitions for notifications
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
export type NotificationCategory =
  | 'service'
  | 'deployment'
  | 'database'
  | 'security'
  | 'backup'
  | 'system'
  | 'update'
  | 'general'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  priority: NotificationPriority
  category: NotificationCategory
  title: string
  message: string
  data?: Record<string, unknown>
  read: boolean
  readAt?: Date
  createdAt: Date
  expiresAt?: Date
  actionUrl?: string
  actionLabel?: string
}

export interface NotificationPreferences {
  userId: string
  enabled: boolean
  emailEnabled: boolean
  categories: {
    service: boolean
    deployment: boolean
    database: boolean
    security: boolean
    backup: boolean
    system: boolean
    update: boolean
    general: boolean
  }
  priorities: {
    low: boolean
    normal: boolean
    high: boolean
    urgent: boolean
  }
  quietHoursEnabled: boolean
  quietHoursStart?: string // HH:MM format
  quietHoursEnd?: string // HH:MM format
  updatedAt: Date
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<NotificationType, number>
  byCategory: Record<NotificationCategory, number>
  byPriority: Record<NotificationPriority, number>
  recentCount: number // Last 24 hours
}

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  priority?: NotificationPriority
  category?: NotificationCategory
  title: string
  message: string
  data?: Record<string, unknown>
  expiresAt?: Date
  actionUrl?: string
  actionLabel?: string
}

export interface GetNotificationsOptions {
  limit?: number
  offset?: number
  unreadOnly?: boolean
  type?: NotificationType
  category?: NotificationCategory
  priority?: NotificationPriority
}

export interface GetNotificationsResult {
  notifications: Notification[]
  total: number
  unreadCount: number
}

// Collection reference
let notificationsCollection: Collection<Notification> | null = null
let preferencesCollection: Collection<NotificationPreferences> | null = null

// Initialize notifications collection
async function ensureCollections(): Promise<void> {
  await initDatabase()
  const db = getDatabase()

  if (!db) {
    throw new Error('Database not initialized')
  }

  if (!notificationsCollection) {
    notificationsCollection =
      db.getCollection('notifications') ||
      db.addCollection('notifications', {
        unique: ['id'],
        indices: ['id', 'userId', 'read', 'createdAt', 'type', 'category', 'priority'],
      })
  }

  if (!preferencesCollection) {
    preferencesCollection =
      db.getCollection('notificationPreferences') ||
      db.addCollection('notificationPreferences', {
        unique: ['userId'],
        indices: ['userId'],
      })
  }
}

// Generate unique notification ID
function generateNotificationId(): string {
  return `notif_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
}

/**
 * Create a new notification
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  await ensureCollections()

  const notification: Notification = {
    id: generateNotificationId(),
    userId: input.userId,
    type: input.type,
    priority: input.priority || 'normal',
    category: input.category || 'general',
    title: input.title,
    message: input.message,
    data: input.data,
    read: false,
    createdAt: new Date(),
    expiresAt: input.expiresAt,
    actionUrl: input.actionUrl,
    actionLabel: input.actionLabel,
  }

  notificationsCollection?.insert(notification)

  await addAuditLog(
    'notification_created',
    {
      notificationId: notification.id,
      type: input.type,
      category: input.category,
    },
    true,
    input.userId
  )

  return notification
}

/**
 * Get a single notification by ID
 */
export async function getNotification(id: string, userId: string): Promise<Notification | null> {
  await ensureCollections()

  const notification = notificationsCollection?.findOne({ id, userId })
  return notification || null
}

/**
 * Get notifications for a user with filtering and pagination
 */
export async function getNotifications(
  userId: string,
  options: GetNotificationsOptions = {}
): Promise<GetNotificationsResult> {
  await ensureCollections()

  const { limit = 20, offset = 0, unreadOnly = false, type, category, priority } = options

  // Build query
  const query: Record<string, unknown> = { userId }

  if (unreadOnly) {
    query.read = false
  }

  if (type) {
    query.type = type
  }

  if (category) {
    query.category = category
  }

  if (priority) {
    query.priority = priority
  }

  // Get total count
  const total = notificationsCollection?.find(query).length || 0

  // Get unread count
  const unreadCount = notificationsCollection?.find({ userId, read: false }).length || 0

  // Get paginated results
  const notifications =
    notificationsCollection
      ?.chain()
      .find(query)
      .simplesort('createdAt', true) // Sort by createdAt descending
      .offset(offset)
      .limit(limit)
      .data() || []

  // Filter out expired notifications
  const now = new Date()
  const validNotifications = notifications.filter(
    (n) => !n.expiresAt || new Date(n.expiresAt) > now
  )

  return {
    notifications: validNotifications,
    total,
    unreadCount,
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(id: string, userId: string): Promise<Notification | null> {
  await ensureCollections()

  const notification = notificationsCollection?.findOne({ id, userId })

  if (!notification) {
    return null
  }

  notification.read = true
  notification.readAt = new Date()
  notificationsCollection?.update(notification)

  await addAuditLog('notification_read', { notificationId: id }, true, userId)

  return notification
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  await ensureCollections()

  const unreadNotifications = notificationsCollection?.find({ userId, read: false }) || []

  const now = new Date()
  let count = 0

  for (const notification of unreadNotifications) {
    notification.read = true
    notification.readAt = now
    notificationsCollection?.update(notification)
    count++
  }

  if (count > 0) {
    await addAuditLog('notifications_mark_all_read', { count }, true, userId)
  }

  return count
}

/**
 * Update a notification
 */
export async function updateNotification(
  id: string,
  userId: string,
  updates: Partial<Pick<Notification, 'read' | 'data'>>
): Promise<Notification | null> {
  await ensureCollections()

  const notification = notificationsCollection?.findOne({ id, userId })

  if (!notification) {
    return null
  }

  if (updates.read !== undefined) {
    notification.read = updates.read
    if (updates.read) {
      notification.readAt = new Date()
    } else {
      notification.readAt = undefined
    }
  }

  if (updates.data !== undefined) {
    notification.data = { ...notification.data, ...updates.data }
  }

  notificationsCollection?.update(notification)

  await addAuditLog('notification_updated', { notificationId: id }, true, userId)

  return notification
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string, userId: string): Promise<boolean> {
  await ensureCollections()

  const notification = notificationsCollection?.findOne({ id, userId })

  if (!notification) {
    return false
  }

  notificationsCollection?.remove(notification)

  await addAuditLog('notification_deleted', { notificationId: id }, true, userId)

  return true
}

/**
 * Delete all notifications for a user
 */
export async function deleteAllNotifications(userId: string): Promise<number> {
  await ensureCollections()

  const notifications = notificationsCollection?.find({ userId }) || []
  let count = 0

  for (const notification of notifications) {
    notificationsCollection?.remove(notification)
    count++
  }

  if (count > 0) {
    await addAuditLog('notifications_deleted_all', { count }, true, userId)
  }

  return count
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string): Promise<NotificationStats> {
  await ensureCollections()

  const allNotifications = notificationsCollection?.find({ userId }) || []
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Filter out expired notifications
  const validNotifications = allNotifications.filter(
    (n) => !n.expiresAt || new Date(n.expiresAt) > now
  )

  const stats: NotificationStats = {
    total: validNotifications.length,
    unread: validNotifications.filter((n) => !n.read).length,
    byType: {
      info: 0,
      success: 0,
      warning: 0,
      error: 0,
      system: 0,
    },
    byCategory: {
      service: 0,
      deployment: 0,
      database: 0,
      security: 0,
      backup: 0,
      system: 0,
      update: 0,
      general: 0,
    },
    byPriority: {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
    },
    recentCount: 0,
  }

  for (const notification of validNotifications) {
    stats.byType[notification.type]++
    stats.byCategory[notification.category]++
    stats.byPriority[notification.priority]++

    if (new Date(notification.createdAt) > twentyFourHoursAgo) {
      stats.recentCount++
    }
  }

  return stats
}

/**
 * Get notification preferences for a user
 */
export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  await ensureCollections()

  const existing = preferencesCollection?.findOne({ userId })

  if (existing) {
    return existing
  }

  // Return default preferences
  const defaults: NotificationPreferences = {
    userId,
    enabled: true,
    emailEnabled: false,
    categories: {
      service: true,
      deployment: true,
      database: true,
      security: true,
      backup: true,
      system: true,
      update: true,
      general: true,
    },
    priorities: {
      low: true,
      normal: true,
      high: true,
      urgent: true,
    },
    quietHoursEnabled: false,
    updatedAt: new Date(),
  }

  return defaults
}

/**
 * Update notification preferences for a user
 */
export async function updatePreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, 'userId' | 'updatedAt'>>
): Promise<NotificationPreferences> {
  await ensureCollections()

  const existingPreferences = preferencesCollection?.findOne({ userId })

  if (existingPreferences) {
    // Update existing preferences
    if (updates.enabled !== undefined) {
      existingPreferences.enabled = updates.enabled
    }
    if (updates.emailEnabled !== undefined) {
      existingPreferences.emailEnabled = updates.emailEnabled
    }
    if (updates.categories) {
      existingPreferences.categories = {
        ...existingPreferences.categories,
        ...updates.categories,
      }
    }
    if (updates.priorities) {
      existingPreferences.priorities = {
        ...existingPreferences.priorities,
        ...updates.priorities,
      }
    }
    if (updates.quietHoursEnabled !== undefined) {
      existingPreferences.quietHoursEnabled = updates.quietHoursEnabled
    }
    if (updates.quietHoursStart !== undefined) {
      existingPreferences.quietHoursStart = updates.quietHoursStart
    }
    if (updates.quietHoursEnd !== undefined) {
      existingPreferences.quietHoursEnd = updates.quietHoursEnd
    }
    existingPreferences.updatedAt = new Date()
    preferencesCollection?.update(existingPreferences)

    await addAuditLog('notification_preferences_updated', { userId }, true, userId)

    return existingPreferences
  }

  // Create new preferences with defaults
  const defaults = await getPreferences(userId)
  const newPreferences: NotificationPreferences = {
    ...defaults,
    ...updates,
    userId,
    updatedAt: new Date(),
  }
  preferencesCollection?.insert(newPreferences)

  await addAuditLog('notification_preferences_updated', { userId }, true, userId)

  return newPreferences
}

/**
 * Clean up expired notifications
 */
export async function cleanupExpiredNotifications(): Promise<number> {
  await ensureCollections()

  const now = new Date()
  const expired =
    notificationsCollection?.find({
      expiresAt: { $lt: now },
    }) || []

  for (const notification of expired) {
    notificationsCollection?.remove(notification)
  }

  return expired.length
}

/**
 * Create a system notification (for internal use)
 */
export async function createSystemNotification(
  userId: string,
  title: string,
  message: string,
  options: {
    type?: NotificationType
    priority?: NotificationPriority
    category?: NotificationCategory
    data?: Record<string, unknown>
    actionUrl?: string
    actionLabel?: string
  } = {}
): Promise<Notification> {
  return createNotification({
    userId,
    type: options.type || 'system',
    priority: options.priority || 'normal',
    category: options.category || 'system',
    title,
    message,
    data: options.data,
    actionUrl: options.actionUrl,
    actionLabel: options.actionLabel,
  })
}
