/**
 * Tenant API client for interacting with tenant endpoints
 */

import type {
  CreateTenantInput,
  Tenant,
  TenantDetailResponse,
  TenantListResponse,
  TenantStatsResponse,
  UpdateTenantInput,
} from '@/types/tenant'
import { api } from '../api-client'

const BASE_URL = '/api/tenant'

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const response = await api.post(BASE_URL, input)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to create tenant')
  return data.data
}

export async function listTenants(): Promise<TenantListResponse> {
  const response = await api.get(BASE_URL)
  return response.json()
}

export async function getTenant(id: string): Promise<TenantDetailResponse> {
  const response = await api.get(`${BASE_URL}/${id}`)
  return response.json()
}

export async function updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
  const response = await api.put(`${BASE_URL}/${id}`, input)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to update tenant')
  return data.data
}

export async function deleteTenant(id: string): Promise<void> {
  const response = await api.delete(`${BASE_URL}/${id}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to delete tenant')
}

export async function suspendTenant(id: string): Promise<void> {
  const response = await api.post(`${BASE_URL}/${id}/suspend`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to suspend tenant')
}

export async function activateTenant(id: string): Promise<void> {
  const response = await api.post(`${BASE_URL}/${id}/activate`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to activate tenant')
}

export async function getTenantStats(id: string): Promise<TenantStatsResponse> {
  const response = await api.get(`${BASE_URL}/${id}/stats`)
  return response.json()
}

// Re-export for convenience
export const tenantApi = {
  create: createTenant,
  list: listTenants,
  get: getTenant,
  update: updateTenant,
  delete: deleteTenant,
  suspend: suspendTenant,
  activate: activateTenant,
  getStats: getTenantStats,
}
