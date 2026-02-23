import type {
  Organization,
  OrgMember,
  Team,
  Tenant,
  TenantDomain,
  TenantMember,
} from '@/types/tenant'
import crypto from 'crypto'
import fs from 'fs'
import Loki from 'lokijs'
import path from 'path'
import { getProjectPath } from './paths'

// Use Node.js global to share the Loki instance across all route bundles in
// Next.js dev mode. Each API route compiles as its own Webpack bundle with its
// own module instance — module-level variables are per-bundle and NOT shared.
// The Node.js `global` object IS shared across all bundles in the same process.
declare global {
  var __lokiDb: Loki | null | undefined
  var __lokiIsInitialized: boolean | undefined
  var __lokiInitPromise: Promise<void> | null | undefined
}

// Database configuration
const isDevelopment = process.env.NODE_ENV === 'development'
const DB_NAME = 'nadmin.db'
const DB_PATH = isDevelopment
  ? path.join(process.cwd(), 'data', DB_NAME) // Local dev path
  : '/app/data/nadmin.db' // Container path

// Ensure data directory exists (only at runtime, not build time)
function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true })
    } catch (error) {
      console.warn('Could not create data directory:', error)
    }
  }
}

// Initialize database
let db: Loki | null = null
let isInitialized = false
let initializationPromise: Promise<void> | null = null

// Collection references
let configCollection: Collection<ConfigItem> | null = null
let sessionsCollection: Collection<SessionItem> | null = null
let projectCacheCollection: Collection<ProjectCacheItem> | null = null
let auditLogCollection: Collection<AuditLogItem> | null = null
let tenantsCollection: Collection<Tenant> | null = null
let organizationsCollection: Collection<Organization> | null = null
let tenantMembersCollection: Collection<TenantMember> | null = null
let orgMembersCollection: Collection<OrgMember> | null = null
let teamsCollection: Collection<Team> | null = null
let tenantDomainsCollection: Collection<TenantDomain> | null = null
// Collaboration collections (v0.7.0)
let userPresenceCollection: Collection<UserPresenceItem> | null = null
let documentStateCollection: Collection<DocumentStateItem> | null = null
let collaborationCursorCollection: Collection<CollaborationCursorItem> | null =
  null

// Type definitions
export interface ConfigItem {
  key: string
  value: any
  updatedAt?: Date
}

export interface SessionItem {
  token: string
  userId: string
  createdAt: Date
  expiresAt: Date
  lastActive: Date
  ip?: string
  userAgent?: string
  rememberMe: boolean
  csrfToken: string
}

export interface ProjectCacheItem {
  key: string
  value: any
  cachedAt: Date
}

export interface AuditLogItem {
  action: string
  details?: any
  timestamp: Date
  success: boolean
  userId?: string
}

// Collaboration types (v0.7.0)
export interface UserPresenceItem {
  userId: string
  userName: string
  status: 'online' | 'away' | 'offline'
  currentPage?: string
  currentDocument?: string
  lastSeen: Date
  metadata?: {
    avatarUrl?: string
    color?: string
  }
}

export interface DocumentStateItem {
  documentId: string
  content: string
  version: number
  lockedBy?: string
  lastModified: Date
  operations: Array<{
    operationId: string
    userId: string
    type: 'insert' | 'delete' | 'replace'
    position: { line: number; column: number }
    text?: string
    length?: number
    version: number
    timestamp: Date
  }>
}

export interface CollaborationCursorItem {
  userId: string
  userName: string
  documentId: string
  position: {
    line: number
    column: number
  }
  selection?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  }
  color: string
  lastUpdated: Date
}

/** Refresh all collection references from the shared db instance. */
function syncCollectionsFromDb(): void {
  if (!db) return
  configCollection = db.getCollection('config')
  sessionsCollection = db.getCollection('sessions')
  projectCacheCollection = db.getCollection('projectCache')
  auditLogCollection = db.getCollection('auditLog')
  tenantsCollection = db.getCollection('tenants')
  organizationsCollection = db.getCollection('organizations')
  tenantMembersCollection = db.getCollection('tenantMembers')
  orgMembersCollection = db.getCollection('orgMembers')
  teamsCollection = db.getCollection('teams')
  tenantDomainsCollection = db.getCollection('tenantDomains')
  userPresenceCollection = db.getCollection('userPresence')
  documentStateCollection = db.getCollection('documentState')
  collaborationCursorCollection = db.getCollection('collaborationCursor')
}

// Initialize database with race condition protection
export async function initDatabase(): Promise<void> {
  // Sync state from Node.js global so all route bundles share one Loki instance.
  // In Next.js dev mode each API route is compiled as its own Webpack bundle
  // with an independent module instance; global is shared across all bundles.
  //
  // CRITICAL: do NOT guard with `db == null`. A bundle may have already initialized
  // its own separate Loki instance (before global was set by the first initializer).
  // If the global now points to a different (authoritative) instance — e.g. the login
  // bundle just created a session in it — we must switch to that instance here so that
  // session is visible in this bundle's collection references too.
  if (global.__lokiDb != null && db !== global.__lokiDb) {
    // Switch to the shared global Loki instance and reset collection refs so they
    // get re-synced from the authoritative db below.
    db = global.__lokiDb
    configCollection = null
    sessionsCollection = null
    projectCacheCollection = null
    auditLogCollection = null
    tenantsCollection = null
    organizationsCollection = null
    tenantMembersCollection = null
    orgMembersCollection = null
    teamsCollection = null
    tenantDomainsCollection = null
    userPresenceCollection = null
    documentStateCollection = null
    collaborationCursorCollection = null
  }
  if (global.__lokiIsInitialized === true) isInitialized = true
  if (global.__lokiInitPromise !== undefined)
    initializationPromise = global.__lokiInitPromise

  // If already initialized (possibly by another bundle), wire up collections
  if (isInitialized && db && !configCollection) {
    syncCollectionsFromDb()
    return
  }

  // If already initialized and collections are set, return immediately
  if (isInitialized && db && configCollection) return

  // Reset initialization flag if db is null
  if (!db) {
    isInitialized = false
  }

  // Ensure directory exists before initializing database
  ensureDataDir()

  // If initialization is in progress (in this or another bundle), wait for it
  if (initializationPromise) {
    await initializationPromise
    // After another bundle's init completes, sync db and collection references
    if (global.__lokiDb != null && db !== global.__lokiDb) db = global.__lokiDb
    if (db && !configCollection) syncCollectionsFromDb()
    return
  }

  // Create and store the initialization promise to prevent race conditions
  initializationPromise = new Promise<void>((resolve, reject) => {
    db = new Loki(DB_PATH, {
      autoload: true,
      autosave: true,
      autosaveInterval: 4000, // Save every 4 seconds
      persistenceMethod: 'fs',
      autoloadCallback: () => {
        try {
          // Initialize collections
          configCollection =
            db!.getCollection('config') ||
            db!.addCollection('config', {
              unique: ['key'],
              indices: ['key'],
            })

          sessionsCollection =
            db!.getCollection('sessions') ||
            db!.addCollection('sessions', {
              unique: ['token'],
              indices: ['token', 'userId'],
              ttl: 7 * 24 * 60 * 60 * 1000, // 7 days TTL to match SESSION_DURATION_HOURS
              ttlInterval: 60000, // Check every minute
            })

          projectCacheCollection =
            db!.getCollection('projectCache') ||
            db!.addCollection('projectCache', {
              unique: ['key'],
              indices: ['key'],
            })

          auditLogCollection =
            db!.getCollection('auditLog') ||
            db!.addCollection('auditLog', {
              indices: ['action', 'timestamp'],
              ttl: 30 * 24 * 60 * 60 * 1000, // 30 days TTL
              ttlInterval: 60 * 60 * 1000, // Check every hour
            })

          // Multi-tenancy collections
          tenantsCollection =
            db!.getCollection('tenants') ||
            db!.addCollection('tenants', {
              unique: ['id', 'slug'],
              indices: ['id', 'slug', 'status', 'ownerId'],
            })

          organizationsCollection =
            db!.getCollection('organizations') ||
            db!.addCollection('organizations', {
              unique: ['id'],
              indices: ['id', 'tenantId', 'slug', 'parentId'],
            })

          tenantMembersCollection =
            db!.getCollection('tenantMembers') ||
            db!.addCollection('tenantMembers', {
              unique: ['id'],
              indices: ['id', 'tenantId', 'userId', 'email'],
            })

          orgMembersCollection =
            db!.getCollection('orgMembers') ||
            db!.addCollection('orgMembers', {
              unique: ['id'],
              indices: ['id', 'orgId', 'userId', 'email'],
            })

          teamsCollection =
            db!.getCollection('teams') ||
            db!.addCollection('teams', {
              unique: ['id'],
              indices: ['id', 'orgId'],
            })

          tenantDomainsCollection =
            db!.getCollection('tenantDomains') ||
            db!.addCollection('tenantDomains', {
              unique: ['id', 'domain'],
              indices: ['id', 'tenantId', 'domain', 'verified'],
            })

          // Collaboration collections (v0.7.0)
          userPresenceCollection =
            db!.getCollection('userPresence') ||
            db!.addCollection('userPresence', {
              unique: ['userId'],
              indices: ['userId', 'status'],
              ttl: 5 * 60 * 1000, // 5 minutes TTL for presence
              ttlInterval: 60000, // Check every minute
            })

          documentStateCollection =
            db!.getCollection('documentState') ||
            db!.addCollection('documentState', {
              unique: ['documentId'],
              indices: ['documentId', 'version'],
              ttl: 24 * 60 * 60 * 1000, // 24 hours TTL
              ttlInterval: 60 * 60 * 1000, // Check every hour
            })

          collaborationCursorCollection =
            db!.getCollection('collaborationCursor') ||
            db!.addCollection('collaborationCursor', {
              indices: ['userId', 'documentId'],
              ttl: 30000, // 30 seconds TTL for cursors
              ttlInterval: 10000, // Check every 10 seconds
            })

          isInitialized = true
          global.__lokiIsInitialized = true
          global.__lokiDb = db
          initializationPromise = null // Clear the promise after successful init
          global.__lokiInitPromise = null
          console.log('Database initialized at:', DB_PATH)
          resolve()
        } catch (error) {
          initializationPromise = null // Clear the promise on error to allow retry
          global.__lokiInitPromise = null
          reject(error)
        }
      },
    })
  })

  // Publish the promise to global so other route bundles can wait on it
  global.__lokiInitPromise = initializationPromise

  return initializationPromise
}

// Config operations
export async function getConfig(key: string): Promise<any> {
  await initDatabase()
  const item = configCollection?.findOne({ key })
  return item?.value
}

export async function setConfig(key: string, value: any): Promise<void> {
  await initDatabase()
  const existing = configCollection?.findOne({ key })

  if (existing) {
    existing.value = value
    existing.updatedAt = new Date()
    configCollection?.update(existing)
  } else {
    configCollection?.insert({
      key,
      value,
      updatedAt: new Date(),
    })
  }

  // Force save to disk (await so caller can rely on data being persisted)
  await new Promise<void>((resolve) => {
    if (!db) {
      resolve()
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(db as any).saveDatabase((err: unknown) => {
      if (err) console.warn('Failed to persist config to disk:', err)
      resolve()
    })
  })
}

export async function deleteConfig(key: string): Promise<void> {
  await initDatabase()
  const item = configCollection?.findOne({ key })
  if (item) {
    configCollection?.remove(item)
  }
}

// Password operations
export async function hasAdminPassword(): Promise<boolean> {
  const passwordHash = await getConfig('admin_password_hash')
  return !!passwordHash
}

export async function getAdminPasswordHash(): Promise<string | null> {
  return await getConfig('admin_password_hash')
}

export async function setAdminPassword(passwordHash: string): Promise<void> {
  await setConfig('admin_password_hash', passwordHash)
  await addAuditLog('password_set', { method: 'initial_setup' }, true)
}

// Session configuration - can be customized
const SESSION_DURATION_HOURS = 7 * 24 // 7 days by default
const SESSION_EXTEND_ON_ACTIVITY = true // Extend session on each request

// Session operations
export async function createSession(
  userId: string,
  ip?: string,
  userAgent?: string,
  rememberMe: boolean = false,
): Promise<string> {
  await initDatabase()

  // Get custom session duration if configured
  const customDuration = await getConfig('SESSION_DURATION_HOURS')
  const durationHours = customDuration || SESSION_DURATION_HOURS

  // Remember me extends session to 30 days
  const sessionDuration = rememberMe
    ? 30 * 24 * 60 * 60 * 1000
    : durationHours * 60 * 60 * 1000

  const token = crypto.randomBytes(32).toString('hex')
  const csrfToken = crypto.randomBytes(32).toString('hex')

  const now = new Date()
  const session: SessionItem = {
    token,
    userId,
    createdAt: now,
    expiresAt: new Date(Date.now() + sessionDuration),
    lastActive: now,
    ip,
    userAgent,
    rememberMe,
    csrfToken,
  }

  sessionsCollection?.insert(session)
  await addAuditLog('session_created', { userId, ip, rememberMe }, true)

  // Persist the new session to disk immediately.  In Next.js dev mode with
  // Turbopack, API routes may execute in separate worker threads that do NOT
  // share the Node.js `global` object, so the validate-session route cannot
  // see an in-memory-only session.  Flushing to disk here ensures the session
  // is available to any thread that loads LokiJS from the file on its first
  // request (before the 4-second autosave would have fired).
  await new Promise<void>((resolve) => {
    if (!db) {
      resolve()
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(db as any).saveDatabase((err: unknown) => {
      if (err) console.warn('Failed to persist session to disk:', err)
      resolve()
    })
  })

  return token
}

export async function getSession(token: string): Promise<SessionItem | null> {
  await initDatabase()
  const session = sessionsCollection?.findOne({ token })

  if (!session) return null

  // Check if expired
  if (new Date() > new Date(session.expiresAt)) {
    sessionsCollection?.remove(session)
    return null
  }

  // Update lastActive on every request
  const now = new Date()
  const timeSinceLastActivity = session.lastActive
    ? (now.getTime() - new Date(session.lastActive).getTime()) /
      (1000 * 60 * 60) // hours
    : 24

  // Update lastActive if it's been more than 1 minute
  if (timeSinceLastActivity > 1 / 60) {
    session.lastActive = now
    sessionsCollection?.update(session)
  }

  // Extend session on activity if enabled
  if (SESSION_EXTEND_ON_ACTIVITY && timeSinceLastActivity > 1) {
    const customDuration = await getConfig('SESSION_DURATION_HOURS')
    const durationHours = customDuration || SESSION_DURATION_HOURS

    // Remember me extends to 30 days, otherwise use configured duration
    const sessionDuration = session.rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : durationHours * 60 * 60 * 1000

    session.expiresAt = new Date(Date.now() + sessionDuration)
    sessionsCollection?.update(session)
  }

  return session
}

export async function deleteSession(token: string): Promise<void> {
  await initDatabase()
  const session = sessionsCollection?.findOne({ token })
  if (session) {
    sessionsCollection?.remove(session)
    await addAuditLog('session_deleted', { userId: session.userId }, true)
  }
}

export async function cleanupExpiredSessions(): Promise<number> {
  await initDatabase()
  const now = new Date()
  const expired =
    sessionsCollection?.find({
      expiresAt: { $lt: now },
    }) || []

  expired.forEach((session) => {
    sessionsCollection?.remove(session)
  })

  return expired.length
}

export async function getAllSessions(userId: string): Promise<SessionItem[]> {
  await initDatabase()
  const sessions =
    sessionsCollection
      ?.chain()
      .find({ userId })
      .simplesort('lastActive', true) // Sort by lastActive descending
      .data() || []

  return sessions
}

export async function revokeSession(token: string): Promise<void> {
  await deleteSession(token)
}

export async function revokeAllSessionsExcept(
  userId: string,
  exceptToken: string,
): Promise<number> {
  await initDatabase()
  const sessions =
    sessionsCollection?.find({
      userId,
      token: { $ne: exceptToken },
    }) || []

  sessions.forEach((session) => {
    sessionsCollection?.remove(session)
  })

  await addAuditLog(
    'sessions_revoked',
    { userId, count: sessions.length },
    true,
  )

  return sessions.length
}

export async function refreshSession(
  token: string,
): Promise<SessionItem | null> {
  await initDatabase()
  const session = sessionsCollection?.findOne({ token })

  if (!session) return null

  // Check if expired
  if (new Date() > new Date(session.expiresAt)) {
    sessionsCollection?.remove(session)
    return null
  }

  // Extend session
  const customDuration = await getConfig('SESSION_DURATION_HOURS')
  const durationHours = customDuration || SESSION_DURATION_HOURS

  // Remember me extends to 30 days, otherwise use configured duration
  const sessionDuration = session.rememberMe
    ? 30 * 24 * 60 * 60 * 1000
    : durationHours * 60 * 60 * 1000

  const now = new Date()
  session.expiresAt = new Date(Date.now() + sessionDuration)
  session.lastActive = now

  // Regenerate CSRF token on refresh for security
  session.csrfToken = crypto.randomBytes(32).toString('hex')

  sessionsCollection?.update(session)

  await addAuditLog('session_refreshed', { userId: session.userId }, true)

  return session
}

// Project cache operations
export async function getCachedProjectInfo(key: string): Promise<any> {
  await initDatabase()
  const item = projectCacheCollection?.findOne({ key })

  // Check if cache is older than 5 minutes
  if (
    item &&
    new Date().getTime() - new Date(item.cachedAt).getTime() > 5 * 60 * 1000
  ) {
    projectCacheCollection?.remove(item)
    return null
  }

  return item?.value
}

export async function setCachedProjectInfo(
  key: string,
  value: any,
): Promise<void> {
  await initDatabase()
  const existing = projectCacheCollection?.findOne({ key })

  if (existing) {
    existing.value = value
    existing.cachedAt = new Date()
    projectCacheCollection?.update(existing)
  } else {
    projectCacheCollection?.insert({
      key,
      value,
      cachedAt: new Date(),
    })
  }
}

// Audit log operations
export async function addAuditLog(
  action: string,
  details: any = {},
  success: boolean = true,
  userId?: string,
): Promise<void> {
  await initDatabase()

  auditLogCollection?.insert({
    action,
    details,
    timestamp: new Date(),
    success,
    userId,
  })
}

export async function getAuditLogs(
  limit: number = 100,
  offset: number = 0,
  filter?: { action?: string; userId?: string },
): Promise<AuditLogItem[]> {
  await initDatabase()

  let query: any = {}
  if (filter?.action) query.action = filter.action
  if (filter?.userId) query.userId = filter.userId

  const logs =
    auditLogCollection
      ?.chain()
      .find(query)
      .simplesort('timestamp', true) // Sort by timestamp descending
      .offset(offset)
      .limit(limit)
      .data() || []

  return logs
}

// Development helpers
export async function isDevelopmentMode(): Promise<boolean> {
  const devMode = await getConfig('development_mode')
  return devMode !== false // Default to true if not set
}

export async function getNselfInstallPath(): Promise<string> {
  // In development, use sibling directory for nself CLI installation
  if (isDevelopment) {
    return path.join(process.cwd(), '..', 'nself')
  }

  // In production, use the centralized project path resolution
  return getProjectPath()
}

// Export the database instance for advanced operations
export function getDatabase(): Loki | null {
  return db
}

// =============================================================================
// Tenant Operations
// =============================================================================

export async function createTenant(tenant: Tenant): Promise<Tenant> {
  await initDatabase()
  const inserted = tenantsCollection?.insert(tenant)
  if (!inserted) throw new Error('Failed to create tenant')
  await addAuditLog('tenant_created', { tenantId: tenant.id }, true)
  return inserted
}

export async function getTenant(id: string): Promise<Tenant | null> {
  await initDatabase()
  return tenantsCollection?.findOne({ id }) || null
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  await initDatabase()
  return tenantsCollection?.findOne({ slug }) || null
}

export async function listTenants(): Promise<Tenant[]> {
  await initDatabase()
  return tenantsCollection?.find() || []
}

export async function updateTenant(
  id: string,
  updates: Partial<Tenant>,
): Promise<Tenant | null> {
  await initDatabase()
  const tenant = tenantsCollection?.findOne({ id })
  if (!tenant) return null

  Object.assign(tenant, updates, { updatedAt: new Date().toISOString() })
  tenantsCollection?.update(tenant)
  await addAuditLog('tenant_updated', { tenantId: id }, true)
  return tenant
}

export async function deleteTenant(id: string): Promise<void> {
  await initDatabase()
  const tenant = tenantsCollection?.findOne({ id })
  if (tenant) {
    tenantsCollection?.remove(tenant)
    await addAuditLog('tenant_deleted', { tenantId: id }, true)
  }
}

// =============================================================================
// Organization Operations (with tenant isolation)
// =============================================================================

export async function createOrganization(
  org: Organization,
): Promise<Organization> {
  await initDatabase()
  const inserted = organizationsCollection?.insert(org)
  if (!inserted) throw new Error('Failed to create organization')
  await addAuditLog(
    'organization_created',
    { tenantId: org.tenantId, orgId: org.id },
    true,
  )
  return inserted
}

export async function getOrganization(
  id: string,
  tenantId?: string,
): Promise<Organization | null> {
  await initDatabase()
  const query: any = { id }
  if (tenantId) query.tenantId = tenantId
  return organizationsCollection?.findOne(query) || null
}

export async function listOrganizations(
  tenantId?: string,
): Promise<Organization[]> {
  await initDatabase()
  const query = tenantId ? { tenantId } : {}
  return organizationsCollection?.find(query) || []
}

export async function listOrganizationsByParent(
  parentId: string,
  tenantId?: string,
): Promise<Organization[]> {
  await initDatabase()
  const query: any = { parentId }
  if (tenantId) query.tenantId = tenantId
  return organizationsCollection?.find(query) || []
}

export async function updateOrganization(
  id: string,
  updates: Partial<Organization>,
  tenantId?: string,
): Promise<Organization | null> {
  await initDatabase()
  const query: any = { id }
  if (tenantId) query.tenantId = tenantId

  const org = organizationsCollection?.findOne(query)
  if (!org) return null

  Object.assign(org, updates, { updatedAt: new Date().toISOString() })
  organizationsCollection?.update(org)
  await addAuditLog(
    'organization_updated',
    { tenantId: org.tenantId, orgId: id },
    true,
  )
  return org
}

export async function deleteOrganization(
  id: string,
  tenantId?: string,
): Promise<void> {
  await initDatabase()
  const query: any = { id }
  if (tenantId) query.tenantId = tenantId

  const org = organizationsCollection?.findOne(query)
  if (org) {
    organizationsCollection?.remove(org)
    await addAuditLog(
      'organization_deleted',
      { tenantId: org.tenantId, orgId: id },
      true,
    )
  }
}

// =============================================================================
// Tenant Member Operations
// =============================================================================

export async function createTenantMember(
  member: TenantMember,
): Promise<TenantMember> {
  await initDatabase()
  const inserted = tenantMembersCollection?.insert(member)
  if (!inserted) throw new Error('Failed to add tenant member')
  await addAuditLog(
    'tenant_member_added',
    { tenantId: member.tenantId, userId: member.userId },
    true,
  )
  return inserted
}

export async function getTenantMember(
  id: string,
  tenantId: string,
): Promise<TenantMember | null> {
  await initDatabase()
  return tenantMembersCollection?.findOne({ id, tenantId }) || null
}

export async function listTenantMembers(
  tenantId: string,
): Promise<TenantMember[]> {
  await initDatabase()
  return tenantMembersCollection?.find({ tenantId }) || []
}

export async function updateTenantMember(
  id: string,
  tenantId: string,
  updates: Partial<TenantMember>,
): Promise<TenantMember | null> {
  await initDatabase()
  const member = tenantMembersCollection?.findOne({ id, tenantId })
  if (!member) return null

  Object.assign(member, updates)
  tenantMembersCollection?.update(member)
  await addAuditLog(
    'tenant_member_updated',
    { tenantId, userId: member.userId },
    true,
  )
  return member
}

export async function deleteTenantMember(
  id: string,
  tenantId: string,
): Promise<void> {
  await initDatabase()
  const member = tenantMembersCollection?.findOne({ id, tenantId })
  if (member) {
    tenantMembersCollection?.remove(member)
    await addAuditLog(
      'tenant_member_removed',
      { tenantId, userId: member.userId },
      true,
    )
  }
}

// =============================================================================
// Organization Member Operations
// =============================================================================

export async function createOrgMember(member: OrgMember): Promise<OrgMember> {
  await initDatabase()
  const inserted = orgMembersCollection?.insert(member)
  if (!inserted) throw new Error('Failed to add org member')
  await addAuditLog(
    'org_member_added',
    { orgId: member.orgId, userId: member.userId },
    true,
  )
  return inserted
}

export async function getOrgMember(
  id: string,
  orgId: string,
): Promise<OrgMember | null> {
  await initDatabase()
  return orgMembersCollection?.findOne({ id, orgId }) || null
}

export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  await initDatabase()
  return orgMembersCollection?.find({ orgId }) || []
}

export async function updateOrgMember(
  id: string,
  orgId: string,
  updates: Partial<OrgMember>,
): Promise<OrgMember | null> {
  await initDatabase()
  const member = orgMembersCollection?.findOne({ id, orgId })
  if (!member) return null

  Object.assign(member, updates)
  orgMembersCollection?.update(member)
  await addAuditLog(
    'org_member_updated',
    { orgId, userId: member.userId },
    true,
  )
  return member
}

export async function deleteOrgMember(
  id: string,
  orgId: string,
): Promise<void> {
  await initDatabase()
  const member = orgMembersCollection?.findOne({ id, orgId })
  if (member) {
    orgMembersCollection?.remove(member)
    await addAuditLog(
      'org_member_removed',
      { orgId, userId: member.userId },
      true,
    )
  }
}

// =============================================================================
// Team Operations
// =============================================================================

export async function createTeam(team: Team): Promise<Team> {
  await initDatabase()
  const inserted = teamsCollection?.insert(team)
  if (!inserted) throw new Error('Failed to create team')
  await addAuditLog(
    'team_created',
    { orgId: team.orgId, teamId: team.id },
    true,
  )
  return inserted
}

export async function getTeam(id: string, orgId: string): Promise<Team | null> {
  await initDatabase()
  return teamsCollection?.findOne({ id, orgId }) || null
}

export async function listTeams(orgId: string): Promise<Team[]> {
  await initDatabase()
  return teamsCollection?.find({ orgId }) || []
}

export async function updateTeam(
  id: string,
  orgId: string,
  updates: Partial<Team>,
): Promise<Team | null> {
  await initDatabase()
  const team = teamsCollection?.findOne({ id, orgId })
  if (!team) return null

  Object.assign(team, updates)
  teamsCollection?.update(team)
  await addAuditLog('team_updated', { orgId, teamId: id }, true)
  return team
}

export async function deleteTeam(id: string, orgId: string): Promise<void> {
  await initDatabase()
  const team = teamsCollection?.findOne({ id, orgId })
  if (team) {
    teamsCollection?.remove(team)
    await addAuditLog('team_deleted', { orgId, teamId: id }, true)
  }
}

// =============================================================================
// Tenant Domain Operations
// =============================================================================

export async function createTenantDomain(
  domain: TenantDomain,
): Promise<TenantDomain> {
  await initDatabase()
  const inserted = tenantDomainsCollection?.insert(domain)
  if (!inserted) throw new Error('Failed to add domain')
  await addAuditLog(
    'domain_added',
    { tenantId: domain.tenantId, domain: domain.domain },
    true,
  )
  return inserted
}

export async function getTenantDomain(
  domain: string,
  tenantId: string,
): Promise<TenantDomain | null> {
  await initDatabase()
  return tenantDomainsCollection?.findOne({ domain, tenantId }) || null
}

export async function listTenantDomains(
  tenantId: string,
): Promise<TenantDomain[]> {
  await initDatabase()
  return tenantDomainsCollection?.find({ tenantId }) || []
}

export async function updateTenantDomain(
  domain: string,
  tenantId: string,
  updates: Partial<TenantDomain>,
): Promise<TenantDomain | null> {
  await initDatabase()
  const domainRecord = tenantDomainsCollection?.findOne({ domain, tenantId })
  if (!domainRecord) return null

  Object.assign(domainRecord, updates)
  tenantDomainsCollection?.update(domainRecord)
  await addAuditLog('domain_updated', { tenantId, domain }, true)
  return domainRecord
}

export async function deleteTenantDomain(
  domain: string,
  tenantId: string,
): Promise<void> {
  await initDatabase()
  const domainRecord = tenantDomainsCollection?.findOne({ domain, tenantId })
  if (domainRecord) {
    tenantDomainsCollection?.remove(domainRecord)
    await addAuditLog('domain_removed', { tenantId, domain }, true)
  }
}

// =============================================================================
// Collaboration Operations (v0.7.0)
// =============================================================================

/**
 * Update or create user presence
 */
export async function updateUserPresence(
  presence: UserPresenceItem,
): Promise<void> {
  await initDatabase()
  const existing = userPresenceCollection?.findOne({ userId: presence.userId })

  if (existing) {
    Object.assign(existing, presence, { lastSeen: new Date() })
    userPresenceCollection?.update(existing)
  } else {
    userPresenceCollection?.insert({ ...presence, lastSeen: new Date() })
  }
}

/**
 * Get all online users
 */
export async function getOnlineUsers(): Promise<UserPresenceItem[]> {
  await initDatabase()
  return (
    userPresenceCollection?.find({
      status: { $in: ['online', 'away'] },
    }) || []
  )
}

/**
 * Get presence for specific user
 */
export async function getUserPresence(
  userId: string,
): Promise<UserPresenceItem | null> {
  await initDatabase()
  return userPresenceCollection?.findOne({ userId }) || null
}

/**
 * Remove user presence (on disconnect)
 */
export async function removeUserPresence(userId: string): Promise<void> {
  await initDatabase()
  const presence = userPresenceCollection?.findOne({ userId })
  if (presence) {
    presence.status = 'offline'
    presence.lastSeen = new Date()
    userPresenceCollection?.update(presence)
  }
}

/**
 * Get or create document state
 */
export async function getDocumentState(
  documentId: string,
): Promise<DocumentStateItem | null> {
  await initDatabase()
  return documentStateCollection?.findOne({ documentId }) || null
}

/**
 * Create new document state
 */
export async function createDocumentState(
  documentId: string,
  content: string,
): Promise<DocumentStateItem> {
  await initDatabase()
  const docState: DocumentStateItem = {
    documentId,
    content,
    version: 0,
    lastModified: new Date(),
    operations: [],
  }
  const inserted = documentStateCollection?.insert(docState)
  if (!inserted) throw new Error('Failed to create document state')
  return inserted
}

/**
 * Apply operation to document (Operational Transformation)
 */
export async function applyDocumentOperation(
  documentId: string,
  operation: {
    operationId: string
    userId: string
    type: 'insert' | 'delete' | 'replace'
    position: { line: number; column: number }
    text?: string
    length?: number
    version: number
  },
): Promise<DocumentStateItem | null> {
  await initDatabase()
  const docState = documentStateCollection?.findOne({ documentId })
  if (!docState) return null

  // Add operation to history
  docState.operations.push({
    ...operation,
    timestamp: new Date(),
  })

  // Increment version
  docState.version += 1
  docState.lastModified = new Date()

  // Apply operation to content (simplified OT)
  docState.content = applyOperationToContent(
    docState.content,
    operation.type,
    operation.position,
    operation.text,
    operation.length,
  )

  documentStateCollection?.update(docState)
  return docState
}

/**
 * Helper function to apply operation to content
 * This is a simplified Operational Transformation implementation
 */
function applyOperationToContent(
  content: string,
  type: 'insert' | 'delete' | 'replace',
  position: { line: number; column: number },
  text?: string,
  length?: number,
): string {
  const lines = content.split('\n')

  if (position.line >= lines.length) {
    // Extend lines if necessary
    while (lines.length <= position.line) {
      lines.push('')
    }
  }

  const line = lines[position.line]
  const before = line.substring(0, position.column)
  const after = line.substring(position.column)

  switch (type) {
    case 'insert':
      lines[position.line] = before + (text || '') + after
      break
    case 'delete':
      lines[position.line] = before + after.substring(length || 0)
      break
    case 'replace':
      lines[position.line] =
        before + (text || '') + after.substring(length || 0)
      break
  }

  return lines.join('\n')
}

/**
 * Lock document for editing
 */
export async function lockDocument(
  documentId: string,
  userId: string,
): Promise<boolean> {
  await initDatabase()
  const docState = documentStateCollection?.findOne({ documentId })
  if (!docState) return false

  if (docState.lockedBy && docState.lockedBy !== userId) {
    return false // Already locked by another user
  }

  docState.lockedBy = userId
  documentStateCollection?.update(docState)
  return true
}

/**
 * Unlock document
 */
export async function unlockDocument(
  documentId: string,
  userId: string,
): Promise<boolean> {
  await initDatabase()
  const docState = documentStateCollection?.findOne({ documentId })
  if (!docState) return false

  if (docState.lockedBy !== userId) {
    return false // Can't unlock if you don't own the lock
  }

  docState.lockedBy = undefined
  documentStateCollection?.update(docState)
  return true
}

/**
 * Update cursor position for user
 */
export async function updateCursorPosition(
  cursor: CollaborationCursorItem,
): Promise<void> {
  await initDatabase()
  const existing = collaborationCursorCollection
    ?.chain()
    .find({ userId: cursor.userId, documentId: cursor.documentId })
    .data()[0]

  if (existing) {
    Object.assign(existing, cursor, { lastUpdated: new Date() })
    collaborationCursorCollection?.update(existing)
  } else {
    collaborationCursorCollection?.insert({
      ...cursor,
      lastUpdated: new Date(),
    })
  }
}

/**
 * Get all cursors for a document
 */
export async function getDocumentCursors(
  documentId: string,
): Promise<CollaborationCursorItem[]> {
  await initDatabase()
  return collaborationCursorCollection?.find({ documentId }) || []
}

/**
 * Remove cursor (on user disconnect or leave document)
 */
export async function removeCursor(
  userId: string,
  documentId: string,
): Promise<void> {
  await initDatabase()
  const cursor = collaborationCursorCollection
    ?.chain()
    .find({ userId, documentId })
    .data()[0]
  if (cursor) {
    collaborationCursorCollection?.remove(cursor)
  }
}

// Initialize on module load
if (typeof window === 'undefined') {
  // Only initialize on server side
  initDatabase().catch(console.error)
}
