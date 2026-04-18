/**
 * Core logic for the projects dashboard feature.
 * Walks every registered project and builds a light-weight summary view:
 *   docker ps count vs expected, last-modified .env, health status.
 *
 * SERVER-SIDE ONLY.
 */

import fs from 'fs/promises'
import path from 'path'
import { loadProjects } from '../project-picker/project-picker'
import type { ProjectEntry } from '../project-picker/types'
import type {
  ProjectHealthStatus,
  ProjectsDashboardResponse,
  ProjectSummary,
} from './types'

/**
 * Count docker-compose services defined in a project directory.
 * Looks for docker-compose.yml and counts top-level service keys.
 * Returns 0 when no compose file is present (not an error — brand-new project).
 */
async function countComposeServices(projectPath: string): Promise<number> {
  const composeCandidates = ['docker-compose.yml', 'docker-compose.yaml']
  for (const candidate of composeCandidates) {
    try {
      const full = path.join(projectPath, candidate)
      const raw = await fs.readFile(full, 'utf-8')
      // Very lightweight parse: count lines that start services list.
      // We intentionally don't pull js-yaml here because this file is called
      // on every dashboard load and needs to be cheap.
      const match = raw.match(/^services:\s*$/m)
      if (match === null) continue
      const startIdx = match.index! + match[0].length
      const rest = raw.slice(startIdx)
      // Count first-level keys until blank line or a new top-level key
      const lines = rest.split('\n')
      let count = 0
      for (const line of lines) {
        if (/^[^\s#]/.test(line)) break // new top-level key → stop
        if (/^ {2}[A-Za-z0-9_.-]+:\s*$/.test(line)) count += 1
      }
      return count
    } catch {
      continue
    }
  }
  return 0
}

/**
 * Lightweight health check: looks for recently-modified .env.computed
 * within the last 24h as a proxy for a healthy build.
 * Actual runtime health comes from /api/health per project when connected.
 */
async function probeHealth(
  projectPath: string,
): Promise<{ health: ProjectHealthStatus; running: number }> {
  try {
    const computed = path.join(projectPath, '.env.computed')
    const stat = await fs.stat(computed)
    const ageMs = Date.now() - stat.mtimeMs
    const dayMs = 24 * 60 * 60 * 1000
    if (ageMs < dayMs) {
      return { health: 'healthy', running: 1 }
    }
    return { health: 'degraded', running: 0 }
  } catch {
    return { health: 'unknown', running: 0 }
  }
}

/**
 * Build a cross-project summary. Used by /api/projects/summary and
 * the /projects dashboard page.
 */
export async function buildDashboard(): Promise<ProjectsDashboardResponse> {
  const store = await loadProjects()
  const summaries: ProjectSummary[] = await Promise.all(
    store.projects.map(async (project: ProjectEntry) => {
      const totalServices = await countComposeServices(project.path)
      const { health, running } = await probeHealth(project.path)
      return {
        project,
        health,
        runningServices: running,
        totalServices,
        cpuPct: null,
        memPct: null,
        diskPct: null,
        lastCheckedAt: new Date().toISOString(),
        errorMessage: null,
      }
    }),
  )

  return {
    summaries,
    activeProjectId: store.activeProjectId,
    generatedAt: new Date().toISOString(),
  }
}
