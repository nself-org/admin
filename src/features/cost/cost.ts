/**
 * Core logic for cost dashboards.
 *
 * SERVER-SIDE ONLY. The data source is a local JSON file at
 * ~/.nself/cost-snapshot.json that is refreshed by `nself cost sync` or by
 * the user manually. The admin GUI reads and presents the snapshot; it does
 * not call provider billing APIs itself (those are CLI-side).
 */

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type {
  CostLineItem,
  CostProvider,
  CostSnapshot,
  ProviderComparison,
  ProviderEquivalent,
} from './types'

function snapshotPath(): string {
  return path.join(os.homedir(), '.nself', 'cost-snapshot.json')
}

/**
 * Load the current cost snapshot. When no file exists (fresh install) we
 * return an empty snapshot so the UI can render an empty state gracefully.
 */
export async function loadSnapshot(): Promise<CostSnapshot> {
  try {
    const raw = await fs.readFile(snapshotPath(), 'utf-8')
    const parsed = JSON.parse(raw) as CostSnapshot
    return parsed
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'ENOENT') {
      return emptySnapshot()
    }
    throw err
  }
}

function emptySnapshot(): CostSnapshot {
  return {
    totalMonthlyUsd: 0,
    items: [],
    byProvider: {
      hetzner: 0,
      aws: 0,
      gcp: 0,
      do: 0,
      vercel: 0,
    },
    byProject: {},
    byUser: {},
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Aggregate line items into a full snapshot.
 */
export function aggregateItems(items: CostLineItem[]): CostSnapshot {
  const byProvider: Record<CostProvider, number> = {
    hetzner: 0,
    aws: 0,
    gcp: 0,
    do: 0,
    vercel: 0,
  }
  const byProject: Record<string, number> = {}
  const byUser: Record<string, number> = {}
  let total = 0

  for (const item of items) {
    total += item.monthlyUsd
    byProvider[item.provider] += item.monthlyUsd
    byProject[item.project] = (byProject[item.project] ?? 0) + item.monthlyUsd
    byUser[item.owner] = (byUser[item.owner] ?? 0) + item.monthlyUsd
  }

  return {
    totalMonthlyUsd: total,
    items,
    byProvider,
    byProject,
    byUser,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Build a provider comparison using coarse-grained markup ratios.
 * These ratios are coarse estimates — callers that care about pricing detail
 * should consult MASTER-VERSIONS.md / SPORT / provider-stack.md.
 */
export function buildComparison(
  current: CostProvider,
  currentMonthlyUsd: number,
): ProviderComparison {
  // Rough public-list-price multipliers, normalized to Hetzner = 1.0.
  const multipliers: Record<CostProvider, number> = {
    hetzner: 1.0,
    do: 2.0,
    aws: 4.5,
    gcp: 4.2,
    vercel: 6.0,
  }

  const labels: Record<CostProvider, string> = {
    hetzner: 'Hetzner',
    aws: 'AWS',
    gcp: 'GCP',
    do: 'DigitalOcean',
    vercel: 'Vercel',
  }

  const hetznerMonthly = currentMonthlyUsd / multipliers[current]
  const alternatives: ProviderEquivalent[] = (
    Object.keys(multipliers) as CostProvider[]
  )
    .filter((p) => p !== current)
    .map((p) => {
      const monthly = hetznerMonthly * multipliers[p]
      return {
        provider: p,
        label: labels[p],
        monthlyUsd: Math.round(monthly * 100) / 100,
        deltaVsCurrentUsd:
          Math.round((monthly - currentMonthlyUsd) * 100) / 100,
        notes:
          p === 'hetzner'
            ? 'Bare-metal pricing, EU-first'
            : p === 'do'
              ? 'Mid-market cloud, simpler billing'
              : p === 'aws'
                ? 'Hyperscaler, highest list price'
                : p === 'gcp'
                  ? 'Hyperscaler, sustained-use discounts'
                  : 'Frontend-only, edge-first, premium',
      }
    })

  return {
    current,
    currentMonthlyUsd,
    alternatives,
  }
}
