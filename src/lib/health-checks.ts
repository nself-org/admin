import { exec } from 'child_process'
import { promisify } from 'util'
import { readNselfConfig } from './nself-config'
import { getEnhancedPath } from './nself-path'
import { getProjectPath } from './paths'

const execAsync = promisify(exec)

/**
 * A single installed plugin as reported by `nself plugin list --json`.
 */
export interface PluginStatus {
  name: string
  version: string
  status: 'active' | 'inactive'
  enabled: boolean
  tier: string
}

/**
 * Connected project info exposed in the health response.
 */
export interface ConnectedProject {
  name: string
  path: string
  hasuraUrl?: string
  authUrl?: string
}

/**
 * Resolve the connected project.
 *
 * Resolution order:
 * 1. NSELF_PROJECT_PATH env var — treat the basename as the project name.
 *    Attempt to enrich with hasuraUrl / authUrl from ~/.nself/config.json.
 * 2. ~/.nself/config.json activeProject entry.
 * 3. null when neither source is available.
 */
export async function getConnectedProject(): Promise<ConnectedProject | null> {
  const envPath = process.env.NSELF_PROJECT_PATH

  // Try to load config regardless so we can merge URL details when env path is set.
  const config = await readNselfConfig()

  if (envPath) {
    // Resolve tilde just in case the env var contains '~'
    const resolvedPath = envPath.startsWith('~/')
      ? envPath.replace(/^~/, process.env.HOME ?? '')
      : envPath

    const name = resolvedPath.split('/').filter(Boolean).pop() ?? resolvedPath

    // Look for matching entry in config to pick up hasuraUrl / authUrl.
    const configEntry = config?.projects.find(
      (p) => p.path === resolvedPath || p.name === name,
    )

    return {
      name: configEntry?.name ?? name,
      path: resolvedPath,
      hasuraUrl: configEntry?.hasuraUrl,
      authUrl: configEntry?.authUrl,
    }
  }

  if (!config) return null

  const { activeProject, projects } = config

  // Find the active project entry.
  const entry = activeProject
    ? projects.find((p) => p.name === activeProject)
    : projects[0]

  if (!entry) return null

  return {
    name: entry.name,
    path: entry.path,
    hasuraUrl: entry.hasuraUrl,
    authUrl: entry.authUrl,
  }
}

/**
 * Determine the active environment.
 *
 * Resolution order:
 * 1. NSELF_ENV env var (must be 'local' | 'staging' | 'prod').
 * 2. ~/.nself/config.json activeEnv field.
 * 3. Default: 'local'.
 */
export async function getActiveEnv(): Promise<'local' | 'staging' | 'prod'> {
  const validEnvs: ReadonlyArray<'local' | 'staging' | 'prod'> = [
    'local',
    'staging',
    'prod',
  ]

  const envVar = process.env.NSELF_ENV
  if (envVar && (validEnvs as ReadonlyArray<string>).includes(envVar)) {
    return envVar as 'local' | 'staging' | 'prod'
  }

  const config = await readNselfConfig()
  if (
    config?.activeEnv &&
    (validEnvs as ReadonlyArray<string>).includes(config.activeEnv)
  ) {
    return config.activeEnv as 'local' | 'staging' | 'prod'
  }

  return 'local'
}

/**
 * Raw shape returned by `nself plugin list --json`.
 * We accept an array of objects with at least name/version and optionally
 * enabled/tier fields to guard against CLI version differences.
 */
interface RawPluginEntry {
  name: string
  version?: string
  enabled?: boolean
  tier?: string
  [key: string]: unknown
}

function isRawPluginEntry(value: unknown): value is RawPluginEntry {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return typeof obj.name === 'string'
}

/**
 * Run `nself plugin list --json` and return normalised plugin status array.
 * Returns an empty array if the CLI is unavailable or returns unparseable output.
 */
export async function getPluginStatus(): Promise<PluginStatus[]> {
  try {
    const projectPath = getProjectPath()

    const { stdout } = await execAsync('nself plugin list --json', {
      env: { ...process.env, PATH: getEnhancedPath() },
      cwd: projectPath,
      timeout: 10_000,
    })

    const trimmed = stdout.trim()
    if (!trimmed) return []

    const parsed: unknown = JSON.parse(trimmed)

    // Accept either a top-level array or an object with a `plugins` key.
    let entries: unknown[]
    if (Array.isArray(parsed)) {
      entries = parsed
    } else if (
      typeof parsed === 'object' &&
      parsed !== null &&
      Array.isArray((parsed as Record<string, unknown>).plugins)
    ) {
      entries = (parsed as Record<string, unknown>).plugins as unknown[]
    } else {
      return []
    }

    return entries.filter(isRawPluginEntry).map((entry) => {
      const enabled = entry.enabled !== false // default true when field absent
      return {
        name: entry.name,
        version: typeof entry.version === 'string' ? entry.version : '0.0.0',
        status: (enabled ? 'active' : 'inactive') as 'active' | 'inactive',
        enabled,
        tier: typeof entry.tier === 'string' ? entry.tier : 'free',
      }
    })
  } catch {
    return []
  }
}
