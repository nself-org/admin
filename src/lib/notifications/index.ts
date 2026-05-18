/**
 * Notifications Library — re-exports the LokiJS-backed implementation.
 *
 * All notification state is persisted to nadmin.db via the real implementation
 * in ../notifications.ts. This module exists as a convenience re-export.
 */

export {
  createNotification,
  createSystemNotification,
  deleteNotification,
  getNotification,
  getNotificationStats,
  getNotifications,
  getPreferences,
  markAsRead,
  updateNotification,
  updatePreferences,
} from '../notifications'

export type {
  CreateNotificationInput,
  GetNotificationsOptions,
  GetNotificationsResult,
  Notification,
  NotificationCategory,
  NotificationPreferences,
  NotificationPriority,
  NotificationStats,
  NotificationType,
} from '../notifications'
