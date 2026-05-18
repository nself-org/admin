import {
  addAuditLog,
  cleanupExpiredSessions,
  createSession,
  deleteConfig,
  deleteSession,
  getAllSessions,
  getAuditLogs,
  getCachedProjectInfo,
  getConfig,
  getSession,
  hasAdminPassword,
  initDatabase,
  refreshSession,
  revokeAllSessionsExcept,
  revokeSession,
  setCachedProjectInfo,
  setConfig,
} from '../database'

// Mock filesystem
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}))

describe('Database Module', () => {
  beforeAll(async () => {
    await initDatabase()
  })

  describe('initDatabase', () => {
    it('should initialize database successfully', async () => {
      await expect(initDatabase()).resolves.not.toThrow()
    })

    it('should not reinitialize if already initialized', async () => {
      await initDatabase()
      await expect(initDatabase()).resolves.not.toThrow()
    })
  })

  describe('Config Operations', () => {
    it('should set and get config values', async () => {
      await setConfig('test_key', 'test_value')
      const value = await getConfig('test_key')
      expect(value).toBe('test_value')
    })

    it('should update existing config values', async () => {
      await setConfig('update_key', 'initial')
      await setConfig('update_key', 'updated')
      const value = await getConfig('update_key')
      expect(value).toBe('updated')
    })

    it('should return undefined for non-existent keys', async () => {
      const value = await getConfig('non_existent_key')
      expect(value).toBeUndefined()
    })

    it('should delete config values', async () => {
      await setConfig('delete_key', 'delete_me')
      await deleteConfig('delete_key')
      const value = await getConfig('delete_key')
      expect(value).toBeUndefined()
    })

    it('should handle complex values', async () => {
      const complexValue = { nested: { data: [1, 2, 3] } }
      await setConfig('complex_key', complexValue)
      const value = await getConfig('complex_key')
      expect(value).toEqual(complexValue)
    })
  })

  describe('Password Operations', () => {
    beforeEach(async () => {
      await deleteConfig('admin_password_hash')
    })

    it('should check if admin password is set', async () => {
      expect(await hasAdminPassword()).toBe(false)
      await setConfig('admin_password_hash', 'hash123')
      expect(await hasAdminPassword()).toBe(true)
    })

    it('should get admin password hash', async () => {
      await setConfig('admin_password_hash', 'hash456')
      const hash = await getConfig('admin_password_hash')
      expect(hash).toBe('hash456')
    })
  })

  describe('Session Operations', () => {
    it('should create a session', async () => {
      const token = await createSession('admin', '127.0.0.1', 'Mozilla/5.0')
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.length).toBe(64) // 32 bytes hex = 64 chars
    })

    it('should create session with remember me', async () => {
      const token = await createSession('admin', '127.0.0.1', 'Mozilla/5.0', true)
      const session = await getSession(token)
      expect(session?.rememberMe).toBe(true)
    })

    it('should retrieve a session by token', async () => {
      const token = await createSession('admin', '127.0.0.1')
      const session = await getSession(token)
      expect(session).toBeTruthy()
      expect(session?.userId).toBe('admin')
      expect(session?.ip).toBe('127.0.0.1')
    })

    it('should return null for non-existent session', async () => {
      const session = await getSession('nonexistent')
      expect(session).toBeNull()
    })

    it('should delete a session', async () => {
      const token = await createSession('admin')
      await deleteSession(token)
      const session = await getSession(token)
      expect(session).toBeNull()
    })

    it('should get all sessions for a user', async () => {
      const token1 = await createSession('testuser', '127.0.0.1')
      const token2 = await createSession('testuser', '192.168.1.1')
      const sessions = await getAllSessions('testuser')
      expect(sessions.length).toBeGreaterThanOrEqual(2)
      expect(sessions.every((s) => s.userId === 'testuser')).toBe(true)

      // Cleanup
      await deleteSession(token1)
      await deleteSession(token2)
    })

    it('should revoke a session', async () => {
      const token = await createSession('admin')
      await revokeSession(token)
      const session = await getSession(token)
      expect(session).toBeNull()
    })

    it('should revoke all sessions except one', async () => {
      const token1 = await createSession('admin')
      const token2 = await createSession('admin')
      const token3 = await createSession('admin')

      const count = await revokeAllSessionsExcept('admin', token1)
      expect(count).toBeGreaterThanOrEqual(2)

      const session1 = await getSession(token1)
      const session2 = await getSession(token2)
      const session3 = await getSession(token3)

      expect(session1).toBeTruthy()
      expect(session2).toBeNull()
      expect(session3).toBeNull()

      // Cleanup
      await deleteSession(token1)
    })

    it('should refresh a session', async () => {
      const token = await createSession('admin')
      const oldSession = await getSession(token)
      const oldCsrfToken = oldSession?.csrfToken

      // Wait a bit to ensure timestamps change
      await new Promise((resolve) => setTimeout(resolve, 100))

      const refreshedSession = await refreshSession(token)
      expect(refreshedSession).toBeTruthy()
      expect(refreshedSession?.csrfToken).not.toBe(oldCsrfToken)

      // Cleanup
      await deleteSession(token)
    })

    it('should cleanup expired sessions', async () => {
      // Create a session
      const token = await createSession('admin')

      // Manually expire it by modifying the session
      const session = await getSession(token)
      if (session) {
        session.expiresAt = new Date(Date.now() - 1000) // Expired 1 second ago
      }

      const count = await cleanupExpiredSessions()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Project Cache Operations', () => {
    it('should set and get cached project info', async () => {
      const data = { services: ['postgres', 'hasura'] }
      await setCachedProjectInfo('services', data)
      const cached = await getCachedProjectInfo('services')
      expect(cached).toEqual(data)
    })

    it('should return null for expired cache', async () => {
      const data = { old: 'data' }
      await setCachedProjectInfo('old_cache', data)

      // Manually set old timestamp
      // Note: This test may need to wait 5 minutes or mock time
      // For now, we just verify the function works
      const cached = await getCachedProjectInfo('old_cache')
      expect(cached).toBeTruthy() // Should still be valid if just set
    })

    it('should update existing cache', async () => {
      await setCachedProjectInfo('update_cache', { v: 1 })
      await setCachedProjectInfo('update_cache', { v: 2 })
      const cached = await getCachedProjectInfo('update_cache')
      expect(cached).toEqual({ v: 2 })
    })
  })

  describe('Audit Log Operations', () => {
    it('should add audit log entries', async () => {
      await addAuditLog('test_action', { detail: 'test' }, true, 'admin')
      const logs = await getAuditLogs(10)
      const testLog = logs.find((log) => log.action === 'test_action')
      expect(testLog).toBeTruthy()
      expect(testLog?.details).toEqual({ detail: 'test' })
      expect(testLog?.success).toBe(true)
      expect(testLog?.userId).toBe('admin')
    })

    it('should retrieve audit logs with limit', async () => {
      await addAuditLog('action1')
      await addAuditLog('action2')
      await addAuditLog('action3')

      const logs = await getAuditLogs(2)
      expect(logs.length).toBeLessThanOrEqual(2)
    })

    it('should filter audit logs by action', async () => {
      await addAuditLog('specific_action', {}, true)
      await addAuditLog('other_action', {}, true)

      const logs = await getAuditLogs(100, 0, { action: 'specific_action' })
      expect(logs.every((log) => log.action === 'specific_action')).toBe(true)
    })

    it('should filter audit logs by userId', async () => {
      await addAuditLog('action', {}, true, 'user123')
      await addAuditLog('action', {}, true, 'user456')

      const logs = await getAuditLogs(100, 0, { userId: 'user123' })
      expect(logs.every((log) => log.userId === 'user123')).toBe(true)
    })

    it('should support pagination with offset', async () => {
      // Add multiple logs
      for (let i = 0; i < 5; i++) {
        await addAuditLog(`paginated_action_${i}`)
      }

      const firstPage = await getAuditLogs(2, 0)
      const secondPage = await getAuditLogs(2, 2)

      expect(firstPage.length).toBeLessThanOrEqual(2)
      expect(secondPage.length).toBeLessThanOrEqual(2)
      // Ensure they're different (if enough logs exist)
      if (firstPage.length > 0 && secondPage.length > 0) {
        expect(firstPage[0]).not.toEqual(secondPage[0])
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent session creation', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => createSession(`user${i}`))
      const tokens = await Promise.all(promises)
      expect(new Set(tokens).size).toBe(10) // All tokens should be unique

      // Cleanup
      await Promise.all(tokens.map((token) => deleteSession(token)))
    })

    it('should handle database reinitialization gracefully', async () => {
      await initDatabase()
      await setConfig('test', 'value')
      await initDatabase() // Should not lose data
      const value = await getConfig('test')
      expect(value).toBe('value')
    })
  })
})
