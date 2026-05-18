/**
 * Client-side Tenant Context Management
 *
 * Provides tenant context access from client components
 */

const TENANT_COOKIE_NAME = 'nself_current_tenant'

/**
 * Get current tenant ID from client-side cookies
 */
export function getCurrentTenantId(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  const tenantCookie = cookies.find((cookie) => cookie.trim().startsWith(`${TENANT_COOKIE_NAME}=`))

  if (!tenantCookie) {
    return null
  }

  return tenantCookie.split('=')[1] || null
}

/**
 * Switch tenant via API call (client-side)
 */
export async function switchTenant(tenantId: string): Promise<void> {
  const response = await fetch('/api/tenant/switch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tenantId }),
  })

  if (!response.ok) {
    throw new Error('Failed to switch tenant')
  }
}
