/**
 * org-permissions.test.ts — Unit tests for pure permission helper functions
 * S88b.T03 — admin coverage push to ≥70% branch
 *
 * Tests the pure utility functions: hasPermission, hasAnyPermission,
 * hasAllPermissions, getRolePermissions, and STANDARD_PERMISSIONS constants.
 * No network calls are made — all API functions are excluded from these tests.
 */

import {
  DEFAULT_ROLE_PERMISSIONS,
  getRolePermissions,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  STANDARD_PERMISSIONS,
} from '../org-permissions'

describe('STANDARD_PERMISSIONS', () => {
  it('is non-empty', () => {
    expect(STANDARD_PERMISSIONS.length).toBeGreaterThan(0)
  })

  it('every permission has an id, name, description, and category', () => {
    for (const p of STANDARD_PERMISSIONS) {
      expect(typeof p.id).toBe('string')
      expect(p.id.length).toBeGreaterThan(0)
      expect(typeof p.name).toBe('string')
      expect(p.name.length).toBeGreaterThan(0)
      expect(typeof p.description).toBe('string')
      expect(typeof p.category).toBe('string')
    }
  })

  it('ids are unique', () => {
    const ids = STANDARD_PERMISSIONS.map((p) => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('includes view:dashboard permission', () => {
    const ids = STANDARD_PERMISSIONS.map((p) => p.id)
    expect(ids).toContain('view:dashboard')
  })

  it('includes manage:billing permission', () => {
    const ids = STANDARD_PERMISSIONS.map((p) => p.id)
    expect(ids).toContain('manage:billing')
  })
})

describe('DEFAULT_ROLE_PERMISSIONS', () => {
  it('has entries for all four roles', () => {
    expect(Array.isArray(DEFAULT_ROLE_PERMISSIONS['owner'])).toBe(true)
    expect(Array.isArray(DEFAULT_ROLE_PERMISSIONS['admin'])).toBe(true)
    expect(Array.isArray(DEFAULT_ROLE_PERMISSIONS['member'])).toBe(true)
    expect(Array.isArray(DEFAULT_ROLE_PERMISSIONS['viewer'])).toBe(true)
  })

  it('owner has all standard permissions', () => {
    const ownerPerms = DEFAULT_ROLE_PERMISSIONS['owner']
    const standardIds = STANDARD_PERMISSIONS.map((p) => p.id)
    for (const id of standardIds) {
      expect(ownerPerms).toContain(id)
    }
  })

  it('viewer has fewer permissions than member', () => {
    expect(DEFAULT_ROLE_PERMISSIONS['viewer'].length).toBeLessThan(
      DEFAULT_ROLE_PERMISSIONS['member'].length,
    )
  })

  it('member has fewer permissions than admin', () => {
    expect(DEFAULT_ROLE_PERMISSIONS['member'].length).toBeLessThan(
      DEFAULT_ROLE_PERMISSIONS['admin'].length,
    )
  })
})

describe('hasPermission', () => {
  it('owner has view:dashboard', () => {
    expect(hasPermission('owner', 'view:dashboard')).toBe(true)
  })

  it('viewer has view:dashboard', () => {
    expect(hasPermission('viewer', 'view:dashboard')).toBe(true)
  })

  it('viewer does not have manage:billing', () => {
    expect(hasPermission('viewer', 'manage:billing')).toBe(false)
  })

  it('member does not have manage:billing', () => {
    expect(hasPermission('member', 'manage:billing')).toBe(false)
  })

  it('admin has manage:members', () => {
    expect(hasPermission('admin', 'manage:members')).toBe(true)
  })

  it('member does not have manage:members', () => {
    expect(hasPermission('member', 'manage:members')).toBe(false)
  })

  it('returns false for unknown permission', () => {
    expect(hasPermission('owner', 'nonexistent:permission')).toBe(false)
  })

  it('returns false for empty permission string', () => {
    expect(hasPermission('admin', '')).toBe(false)
  })

  it('owner has delete:org', () => {
    expect(hasPermission('owner', 'delete:org')).toBe(true)
  })

  it('admin does not have delete:org', () => {
    expect(hasPermission('admin', 'delete:org')).toBe(false)
  })
})

describe('hasAnyPermission', () => {
  it('returns true when role has at least one of the permissions', () => {
    expect(hasAnyPermission('viewer', ['view:dashboard', 'manage:billing'])).toBe(true)
  })

  it('returns false when role has none of the permissions', () => {
    expect(hasAnyPermission('viewer', ['manage:billing', 'delete:org'])).toBe(false)
  })

  it('returns false for empty permissions array', () => {
    expect(hasAnyPermission('owner', [])).toBe(false)
  })

  it('returns true when role has all of the listed permissions', () => {
    expect(hasAnyPermission('admin', ['view:dashboard', 'manage:members'])).toBe(true)
  })

  it('viewer has any of view:dashboard, manage:billing', () => {
    expect(hasAnyPermission('viewer', ['view:dashboard', 'manage:billing'])).toBe(true)
  })
})

describe('hasAllPermissions', () => {
  it('owner has all standard permissions', () => {
    const allIds = STANDARD_PERMISSIONS.map((p) => p.id)
    expect(hasAllPermissions('owner', allIds)).toBe(true)
  })

  it('viewer does not have all standard permissions', () => {
    const allIds = STANDARD_PERMISSIONS.map((p) => p.id)
    expect(hasAllPermissions('viewer', allIds)).toBe(false)
  })

  it('returns true for empty permissions array (trivially true)', () => {
    expect(hasAllPermissions('viewer', [])).toBe(true)
  })

  it('returns false when role is missing one permission', () => {
    expect(hasAllPermissions('member', ['view:dashboard', 'manage:billing'])).toBe(false)
  })

  it('admin has all of view:dashboard and manage:members', () => {
    expect(hasAllPermissions('admin', ['view:dashboard', 'manage:members'])).toBe(true)
  })
})

describe('getRolePermissions', () => {
  it('returns array for owner', () => {
    const perms = getRolePermissions('owner')
    expect(Array.isArray(perms)).toBe(true)
    expect(perms.length).toBeGreaterThan(0)
  })

  it('returns array for viewer', () => {
    const perms = getRolePermissions('viewer')
    expect(Array.isArray(perms)).toBe(true)
    expect(perms.length).toBeGreaterThan(0)
  })

  it('owner has more permissions than viewer', () => {
    expect(getRolePermissions('owner').length).toBeGreaterThan(
      getRolePermissions('viewer').length,
    )
  })

  it('viewer permissions include view:dashboard', () => {
    const viewerPerms = getRolePermissions('viewer')
    expect(viewerPerms).toContain('view:dashboard')
  })

  it('owner permissions include manage:billing', () => {
    const ownerPerms = getRolePermissions('owner')
    expect(ownerPerms).toContain('manage:billing')
  })

  it('member permissions do not include manage:billing', () => {
    const memberPerms = getRolePermissions('member')
    expect(memberPerms).not.toContain('manage:billing')
  })
})
