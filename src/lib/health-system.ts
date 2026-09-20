/**
 * Purpose: Host-level metrics for GET /api/health — memory headroom, memory
 *          and CPU usage, and uptime formatting.
 * Inputs:  /proc/meminfo and /proc/stat (Linux); process uptime in seconds.
 * Outputs: A boolean headroom check plus the numbers rendered in the health
 *          response's `resources` block.
 * Constraints: /proc does not exist on macOS/BSD. Every reader degrades to a
 *          safe fallback rather than throwing, so a developer running the admin
 *          outside a container is not reported as unhealthy.
 * SPORT: admin / api-health
 *
 * Extracted from the route so it stays under the 300-line cap (ASI Policy 3).
 */

import fs from 'fs/promises'

/** Minimum fraction of total memory that must remain available. */
const MIN_FREE_MEMORY_RATIO = 0.1

/** Render a duration in seconds as e.g. "5d 12h 34m". */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`)

  return parts.join(' ')
}

function readMemField(memInfo: string, field: string): number {
  const line = memInfo.split('\n').find((l) => l.startsWith(field))
  return parseInt(line?.split(/\s+/)[1] || '0')
}

/** True when at least 10% of memory is still available. */
export async function checkMemory(): Promise<boolean> {
  try {
    const memInfo = await fs.readFile('/proc/meminfo', 'utf-8')
    const memTotal = readMemField(memInfo, 'MemTotal')
    const memAvailable = readMemField(memInfo, 'MemAvailable')

    return memAvailable / memTotal > MIN_FREE_MEMORY_RATIO
  } catch {
    // Fallback for non-Linux systems
    return true
  }
}

export interface MemoryUsage {
  /** GiB in use. */
  used: number
  /** GiB total. */
  total: number
  /** Percentage in use, rounded. */
  percentage: number
}

/** Memory usage in GiB. Zeroes on a host without /proc. */
export async function getMemoryUsage(): Promise<MemoryUsage> {
  try {
    const memInfo = await fs.readFile('/proc/meminfo', 'utf-8')
    const memTotal = readMemField(memInfo, 'MemTotal') / 1024 / 1024
    const memAvailable = readMemField(memInfo, 'MemAvailable') / 1024 / 1024
    const memUsed = memTotal - memAvailable

    return {
      used: Math.round(memUsed * 100) / 100,
      total: Math.round(memTotal * 100) / 100,
      percentage: Math.round((memUsed / memTotal) * 100),
    }
  } catch {
    // Fallback values
    return { used: 0, total: 0, percentage: 0 }
  }
}

/** CPU usage percentage, sampled across a 100ms window. Zero without /proc. */
export async function getCpuUsage(): Promise<number> {
  try {
    const stat1 = await fs.readFile('/proc/stat', 'utf-8')
    await new Promise((resolve) => setTimeout(resolve, 100))
    const stat2 = await fs.readFile('/proc/stat', 'utf-8')

    const getCpuValues = (stat: string) => {
      const cpuLine = stat.split('\n')[0] ?? ''
      const values = cpuLine.split(/\s+/).slice(1).map(Number)
      const idle = values[3] ?? 0
      const total = values.reduce((a, b) => a + b, 0)
      return { idle, total }
    }

    const cpu1 = getCpuValues(stat1)
    const cpu2 = getCpuValues(stat2)

    const idleDiff = cpu2.idle - cpu1.idle
    const totalDiff = cpu2.total - cpu1.total

    const usage = 100 - (100 * idleDiff) / totalDiff
    return Math.round(usage * 10) / 10
  } catch {
    return 0
  }
}
