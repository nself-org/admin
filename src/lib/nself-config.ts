import fs from 'fs/promises'
import os from 'os'
import path from 'path'

/**
 * Represents a single nself project entry in config.json
 */
export interface ProjectEntry {
  name: string
  path: string
  hasuraUrl?: string
  authUrl?: string
}

/**
 * Shape of ~/.nself/config.json
 */
export interface NselfConfig {
  projects: ProjectEntry[]
  activeProject?: string
  activeEnv?: string
}

/**
 * Read and parse ~/.nself/config.json.
 * Returns null if the file does not exist, cannot be read, or is malformed.
 */
export async function readNselfConfig(): Promise<NselfConfig | null> {
  const configPath = path.join(os.homedir(), '.nself', 'config.json')

  try {
    const raw = await fs.readFile(configPath, 'utf-8')
    const parsed: unknown = JSON.parse(raw)

    if (!isNselfConfig(parsed)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

/**
 * Type guard: verify the parsed JSON conforms to NselfConfig.
 */
function isNselfConfig(value: unknown): value is NselfConfig {
  if (typeof value !== 'object' || value === null) return false

  const obj = value as Record<string, unknown>

  if (!Array.isArray(obj.projects)) return false

  for (const entry of obj.projects) {
    if (!isProjectEntry(entry)) return false
  }

  if (obj.activeProject !== undefined && typeof obj.activeProject !== 'string')
    return false

  if (obj.activeEnv !== undefined && typeof obj.activeEnv !== 'string')
    return false

  return true
}

/**
 * Type guard for a single ProjectEntry.
 */
function isProjectEntry(value: unknown): value is ProjectEntry {
  if (typeof value !== 'object' || value === null) return false

  const obj = value as Record<string, unknown>

  if (typeof obj.name !== 'string' || typeof obj.path !== 'string') return false

  if (obj.hasuraUrl !== undefined && typeof obj.hasuraUrl !== 'string')
    return false

  if (obj.authUrl !== undefined && typeof obj.authUrl !== 'string') return false

  return true
}
