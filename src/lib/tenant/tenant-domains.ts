/**
 * Tenant domain management utilities
 */

import type { TenantDomain } from '@/types/tenant'
import { api } from '../api-client'

export async function listDomains(tenantId: string): Promise<TenantDomain[]> {
  const response = await api.get(`/api/tenant/${tenantId}/domains`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to list domains')
  return data.data.domains
}

export async function addDomain(tenantId: string, domain: string): Promise<TenantDomain> {
  const response = await api.post(`/api/tenant/${tenantId}/domains`, { domain })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to add domain')
  return data.data
}

export async function removeDomain(tenantId: string, domain: string): Promise<void> {
  const response = await api.delete(`/api/tenant/${tenantId}/domains/${encodeURIComponent(domain)}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to remove domain')
}

export async function verifyDomain(
  tenantId: string,
  domain: string
): Promise<{ verified: boolean; dnsRecords: TenantDomain['dnsRecords'] }> {
  const response = await api.post(
    `/api/tenant/${tenantId}/domains/${encodeURIComponent(domain)}/verify`
  )
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to verify domain')
  return data.data
}

export async function generateSSL(
  tenantId: string,
  domain: string
): Promise<{ ssl: boolean; expiresAt?: string }> {
  const response = await api.post(
    `/api/tenant/${tenantId}/domains/${encodeURIComponent(domain)}/ssl`
  )
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to generate SSL')
  return data.data
}

export async function setPrimaryDomain(tenantId: string, domain: string): Promise<void> {
  const response = await api.put(
    `/api/tenant/${tenantId}/domains/${encodeURIComponent(domain)}/primary`
  )
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to set primary domain')
}

export const domainsApi = {
  list: listDomains,
  add: addDomain,
  remove: removeDomain,
  verify: verifyDomain,
  generateSSL,
  setPrimary: setPrimaryDomain,
}
