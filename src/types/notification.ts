// Notification types for v0.7.0

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system'
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'slack' | 'webhook'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Notification {
  id: string
  userId: string
  tenantId?: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  channels: NotificationChannel[]
  read: boolean
  readAt?: string
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, unknown>
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferences {
  userId: string
  channels: {
    in_app: boolean
    email: boolean
    push: boolean
    slack: boolean
    webhook: boolean
  }
  digest: {
    enabled: boolean
    frequency: 'instant' | 'hourly' | 'daily' | 'weekly'
    time?: string // HH:mm
  }
  categories: {
    security: NotificationChannel[]
    billing: NotificationChannel[]
    system: NotificationChannel[]
    activity: NotificationChannel[]
    marketing: NotificationChannel[]
  }
  quietHours: {
    enabled: boolean
    start: string // HH:mm
    end: string // HH:mm
    timezone: string
  }
}

export interface NotificationTemplate {
  id: string
  name: string
  type: NotificationType
  subject: string
  body: string
  variables: string[]
  channels: NotificationChannel[]
  createdAt: string
  updatedAt: string
}

export interface NotificationStats {
  total: number
  unread: number
  byType: Record<NotificationType, number>
  byChannel: Record<NotificationChannel, number>
  byPriority: Record<NotificationPriority, number>
}

export interface CreateNotificationInput {
  userId?: string
  tenantId?: string
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  channels?: NotificationChannel[]
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, unknown>
  expiresAt?: string
}
