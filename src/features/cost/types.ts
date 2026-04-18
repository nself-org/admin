/**
 * Types for the cost dashboard feature.
 */

export type CostProvider = 'hetzner' | 'aws' | 'gcp' | 'do' | 'vercel'

export interface CostLineItem {
  resource: string
  provider: CostProvider
  unit: string
  unitCostUsd: number
  quantity: number
  monthlyUsd: number
  owner: string
  project: string
}

export interface CostSnapshot {
  totalMonthlyUsd: number
  items: CostLineItem[]
  byProvider: Record<CostProvider, number>
  byProject: Record<string, number>
  byUser: Record<string, number>
  generatedAt: string
}

export interface ProviderEquivalent {
  provider: CostProvider
  label: string
  monthlyUsd: number
  deltaVsCurrentUsd: number
  notes: string
}

export interface ProviderComparison {
  current: CostProvider
  currentMonthlyUsd: number
  alternatives: ProviderEquivalent[]
}
