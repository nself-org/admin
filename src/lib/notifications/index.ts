/**
 * Notifications Library — re-exports the LokiJS-backed implementation.
 *
 * All notification state is persisted to nadmin.db via the real implementation
 * in ../notifications.ts. This module exists as a convenience re-export.
 */

export {
  createNotification,
  createSystemNotification,
  getNotification,
  getNotifications,
  markAsRead,
  updateNotification,
  deleteNotification,
  getNotificationStats,
  getPreferences,
  updatePreferences,
} from '../notifications'

export type {
  Notification,
  NotificationPreferences,
  NotificationStats,
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  CreateNotificationInput,
  GetNotificationsOptions,
  GetNotificationsResult,
} from '../notifications'
