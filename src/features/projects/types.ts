/**
 * Types for the multi-project dashboard feature.
 * Surfaces a cross-project status snapshot derived from registered projects.
 */

import type { ProjectEntry } from '../project-picker/types'

export type ProjectHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown'

export interface ProjectSummary {
  project: ProjectEntry
  health: ProjectHealthStatus
  runningServices: number
  totalServices: number
  cpuPct: number | null
  memPct: number | null
  diskPct: number | null
  lastCheckedAt: string
  errorMessage: string | null
}

export interface ProjectsDashboardResponse {
  summaries: ProjectSummary[]
  activeProjectId: string | null
  generatedAt: string
}
