/**
 * Tenant branding utilities
 */

import type { TenantBranding } from '@/types/tenant'
import { api } from '../api-client'

export async function getBranding(tenantId: string): Promise<TenantBranding> {
  const response = await api.get(`/api/tenant/${tenantId}/branding`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to get branding')
  return data.data
}

export async function updateLogo(tenantId: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('logo', file)

  const response = await fetch(`/api/tenant/${tenantId}/branding/logo`, {
    method: 'PUT',
    body: formData,
    credentials: 'same-origin',
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to update logo')
  return data.data.logoUrl
}

export async function updateColors(
  tenantId: string,
  colors: Partial<Pick<TenantBranding, 'primaryColor' | 'secondaryColor' | 'accentColor'>>
): Promise<TenantBranding> {
  const response = await api.put(`/api/tenant/${tenantId}/branding/colors`, colors)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to update colors')
  return data.data
}

export async function previewBranding(tenantId: string): Promise<{ previewUrl: string }> {
  const response = await api.get(`/api/tenant/${tenantId}/branding/preview`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to get preview')
  return data.data
}

export async function resetBranding(tenantId: string): Promise<TenantBranding> {
  const response = await api.post(`/api/tenant/${tenantId}/branding/reset`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to reset branding')
  return data.data
}

export const brandingApi = {
  get: getBranding,
  updateLogo,
  updateColors,
  preview: previewBranding,
  reset: resetBranding,
}
