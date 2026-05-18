'use client'

/**
 * Tenant Switcher Component
 *
 * Allows users to switch between tenants they have access to.
 * Displays current tenant and available tenants in a dropdown.
 */

import type { Tenant } from '@/types/tenant'
import { Building2, Check, ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TenantSwitcherProps {
  currentTenantId?: string | null
  onTenantChange?: (tenantId: string) => void
  className?: string
}

export default function TenantSwitcher({
  currentTenantId,
  onTenantChange,
  className = '',
}: TenantSwitcherProps) {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTenants()
  }, [])

  useEffect(() => {
    if (currentTenantId && tenants.length > 0) {
      const tenant = tenants.find((t) => t.id === currentTenantId)
      setCurrentTenant(tenant || null)
    }
  }, [currentTenantId, tenants])

  async function fetchTenants() {
    try {
      setLoading(true)
      const response = await fetch('/api/tenant', {
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tenants')
      }

      const data = await response.json()
      if (data.success) {
        setTenants(data.data.tenants || [])
      } else {
        throw new Error(data.error || 'Failed to fetch tenants')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenants')
    } finally {
      setLoading(false)
    }
  }

  async function switchTenant(tenantId: string) {
    try {
      const response = await fetch('/api/tenant/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error('Failed to switch tenant')
      }

      const data = await response.json()
      if (data.success) {
        const tenant = tenants.find((t) => t.id === tenantId)
        setCurrentTenant(tenant || null)
        setIsOpen(false)

        // Notify parent component
        if (onTenantChange) {
          onTenantChange(tenantId)
        }

        // Reload page to refresh tenant context
        window.location.reload()
      } else {
        throw new Error(data.error || 'Failed to switch tenant')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch tenant')
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      </div>
    )
  }

  if (error) {
    return <div className={`text-sm text-red-600 ${className}`}>Error: {error}</div>
  }

  if (tenants.length === 0) {
    return <div className={`text-sm text-gray-500 ${className}`}>No tenants available</div>
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <Building2 className="h-4 w-4" />
        <span className="max-w-[150px] truncate">{currentTenant?.name || 'Select Tenant'}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-2">
              <div className="mb-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Switch Tenant
              </div>
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => switchTenant(tenant.id)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <div className="text-left">
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-xs text-gray-500">{tenant.slug}</div>
                    </div>
                  </div>
                  {currentTenant?.id === tenant.id && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-200 p-2">
              <a
                href="/tenant/create"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
              >
                <Building2 className="h-4 w-4" />
                <span>Create New Tenant</span>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
