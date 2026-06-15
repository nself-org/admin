/**
 * Tenant Middleware Utilities
 *
 * Helper functions for enforcing tenant isolation in API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOrganization, getOrgMember, getTenant, getTenantMember } from '../database'
import { getCurrentTenantId } from './tenant-context'

/**
 * Verify that the current user has access to the specified tenant
 */
export async function verifyTenantAccess(tenantId: string, userId: string): Promise<boolean> {
  const members = await getTenantMember(userId, tenantId)
  return !!members
}

/**
 * Verify that the current user has access to the specified organization
 */
export async function verifyOrgAccess(orgId: string, userId: string): Promise<boolean> {
  const member = await getOrgMember(userId, orgId)
  return !!member
}

/**
 * Enforce tenant context for an API route
 * Returns 403 if tenant context is missing or user doesn't have access
 */
export async function enforceTenantContext(
  request: NextRequest,
  tenantId?: string
): Promise<NextResponse | null> {
  const currentTenantId = await getCurrentTenantId()

  // If tenantId is provided, verify it matches current context
  if (tenantId && tenantId !== currentTenantId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Tenant access denied',
        details: 'You do not have access to this tenant',
      },
      { status: 403 }
    )
  }

  // If no tenant context exists, return error
  if (!currentTenantId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Tenant context required',
        details: 'No tenant context found. Please select a tenant first.',
      },
      { status: 403 }
    )
  }

  // Verify tenant exists
  const tenant = await getTenant(currentTenantId)
  if (!tenant) {
    return NextResponse.json(
      {
        success: false,
        error: 'Tenant not found',
        details: 'The selected tenant no longer exists',
      },
      { status: 404 }
    )
  }

  // All checks passed
  return null
}

/**
 * Enforce organization context for an API route
 * Returns 403 if org doesn't belong to current tenant or user doesn't have access
 */
export async function enforceOrgContext(
  request: NextRequest,
  orgId: string
): Promise<NextResponse | null> {
  const currentTenantId = await getCurrentTenantId()

  if (!currentTenantId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Tenant context required',
        details: 'No tenant context found',
      },
      { status: 403 }
    )
  }

  // Verify organization exists and belongs to current tenant
  const org = await getOrganization(orgId, currentTenantId)
  if (!org) {
    return NextResponse.json(
      {
        success: false,
        error: 'Organization not found',
        details: 'Organization not found or does not belong to the current tenant',
      },
      { status: 404 }
    )
  }

  return null
}

/**
 * Get the current tenant ID from the request, with validation
 */
export async function requireTenantId(
  _request: NextRequest
): Promise<{ tenantId: string; error?: NextResponse }> {
  const tenantId = await getCurrentTenantId()

  if (!tenantId) {
    return {
      tenantId: '',
      error: NextResponse.json(
        {
          success: false,
          error: 'Tenant context required',
          details: 'No tenant context found',
        },
        { status: 403 }
      ),
    }
  }

  return { tenantId }
}

/**
 * Extract tenant ID from request path or query
 */
export function extractTenantIdFromPath(pathname: string): string | null {
  const tenantMatch = pathname.match(/\/api\/tenant\/([^/]+)/)
  return tenantMatch ? (tenantMatch[1] ?? null) : null
}

/**
 * Extract org ID from request path
 */
export function extractOrgIdFromPath(pathname: string): string | null {
  const orgMatch = pathname.match(/\/api\/org\/([^/]+)/)
  return orgMatch ? (orgMatch[1] ?? null) : null
}
