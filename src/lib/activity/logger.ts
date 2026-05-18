// Activity Logger - Helper utilities for logging system activities
// This module provides convenient functions to log activities from API routes

import type { ActivityAction, ActivityResourceType } from '@/types/activity'
import {
  logActivity,
  logBackupAction,
  logConfigChange,
  logDatabaseAction,
  logDeployment,
  logServiceAction,
} from './index'

/**
 * Extract IP and User Agent from Request
 */
export function extractRequestInfo(request: Request): {
  ipAddress?: string
  userAgent?: string
} {
  const ipAddress =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined

  const userAgent = request.headers.get('user-agent') || undefined

  return { ipAddress, userAgent }
}

/**
 * Log activity from an API route
 */
export async function logApiActivity(
  request: Request,
  action: ActivityAction,
  resourceType: ActivityResourceType,
  resourceId: string,
  resourceName: string,
  userId: string = 'admin',
  metadata?: Record<string, unknown>
): Promise<void> {
  const { ipAddress, userAgent } = extractRequestInfo(request)

  await logActivity(
    {
      id: userId,
      type: 'user',
      name: 'Admin User',
    },
    action,
    resourceType,
    resourceId,
    resourceName,
    metadata,
    ipAddress,
    userAgent
  )
}

/**
 * Log a service start event
 */
export async function logServiceStart(
  request: Request,
  serviceName: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { ipAddress } = extractRequestInfo(request)
  await logServiceAction('started', serviceName, userId, metadata, ipAddress)
}

/**
 * Log a service stop event
 */
export async function logServiceStop(
  request: Request,
  serviceName: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { ipAddress } = extractRequestInfo(request)
  await logServiceAction('stopped', serviceName, userId, metadata, ipAddress)
}

/**
 * Log a service restart event
 */
export async function logServiceRestart(
  request: Request,
  serviceName: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { ipAddress } = extractRequestInfo(request)
  await logServiceAction('restarted', serviceName, userId, metadata, ipAddress)
}

/**
 * Log a deployment event
 */
export async function logDeploymentEvent(
  request: Request,
  environment: string,
  version: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { ipAddress } = extractRequestInfo(request)
  await logDeployment(environment, version, userId, metadata, ipAddress)
}

/**
 * Log a configuration change event
 */
export async function logConfigurationChange(
  request: Request,
  configName: string,
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>,
  userId?: string
): Promise<void> {
  const { ipAddress } = extractRequestInfo(request)
  await logConfigChange(configName, changes, userId, ipAddress)
}

/**
 * Log a backup creation event
 */
export async function logBackupCreation(
  backupId: string,
  backupName: string,
  metadata?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  await logBackupAction('backup_created', backupId, backupName, metadata, userId)
}

/**
 * Log a backup restore event
 */
export async function logBackupRestore(
  backupId: string,
  backupName: string,
  metadata?: Record<string, unknown>,
  userId?: string
): Promise<void> {
  await logBackupAction('backup_restored', backupId, backupName, metadata, userId)
}

/**
 * Log a database operation
 */
export async function logDatabaseOperation(
  request: Request,
  operation: string,
  action: ActivityAction = 'updated',
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { ipAddress } = extractRequestInfo(request)
  await logDatabaseAction(action, operation, userId, metadata, ipAddress)
}

/**
 * Log a secret access event
 */
export async function logSecretAccess(
  request: Request,
  secretId: string,
  secretName: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logApiActivity(request, 'secret_accessed', 'secret', secretId, secretName, userId, metadata)
}

/**
 * Log a secret creation event
 */
export async function logSecretCreation(
  request: Request,
  secretId: string,
  secretName: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logApiActivity(request, 'created', 'secret', secretId, secretName, userId, metadata)
}

/**
 * Log a secret deletion event
 */
export async function logSecretDeletion(
  request: Request,
  secretId: string,
  secretName: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logApiActivity(request, 'deleted', 'secret', secretId, secretName, userId, metadata)
}

// Export all functions
export {
  logActivity,
  logBackupAction,
  logConfigChange,
  logDatabaseAction,
  logDeployment,
  logServiceAction,
}
