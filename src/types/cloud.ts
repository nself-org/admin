/**
 * Cloud Infrastructure Types for nself-admin v0.0.8
 */

export type CloudProviderCategory = 'enterprise' | 'developer' | 'budget' | 'regional' | 'edge'

export type ServerSize = 'tiny' | 'small' | 'medium' | 'large' | 'xlarge'

export interface CloudProvider {
  id: string
  name: string
  displayName: string
  category: CloudProviderCategory
  configured: boolean
  validated: boolean
  regions: CloudRegion[]
  sizes: CloudSize[]
  features: string[]
  documentationUrl?: string
  icon?: string
}

export interface CloudRegion {
  id: string
  name: string
  displayName: string
  country: string
  available: boolean
}

export interface CloudSize {
  id: string
  name: ServerSize
  providerSize: string
  vcpu: number
  memory: string
  storage: string
  monthlyPrice: number
  hourlyPrice: number
  currency: string
}

export interface CloudServer {
  id: string
  name: string
  ip: string
  provider: string
  region: string
  size: ServerSize
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'provisioning' | 'error' | 'unknown'
  createdAt: string
  tags?: Record<string, string>
  specs?: {
    vcpu: number
    memory: string
    storage: string
  }
  sshKeyName?: string
}

export interface ServerProvisionRequest {
  provider: string
  name: string
  region: string
  size: ServerSize
  sshKeyId?: string
  image?: string
  tags?: Record<string, string>
}

export interface ProviderCredentials {
  provider: string
  configured: boolean
  lastValidated?: string
  defaultRegion?: string
  defaultSize?: ServerSize
}

export interface CostEstimate {
  provider: string
  size: ServerSize
  region: string
  monthlyPrice: number
  hourlyPrice: number
  currency: string
  specs: {
    vcpu: number
    memory: string
    storage: string
    bandwidth: string
  }
  features: string[]
}

export interface CostComparison {
  size: ServerSize
  providers: {
    provider: string
    displayName: string
    monthlyPrice: number
    specs: string
    recommended?: boolean
    badge?: string
  }[]
}

export interface ServerMetrics {
  serverId: string
  cpu: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
  network: {
    bytesIn: number
    bytesOut: number
  }
  timestamp: string
}
