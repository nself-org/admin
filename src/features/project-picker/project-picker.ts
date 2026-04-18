/**
 * Core logic for the project-picker feature.
 * Manages ~/.nself/projects.json — stores, reads, and mutates registered project entries.
 *
 * SERVER-SIDE ONLY. Never import from client components — import from API routes only.
 */

import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type { ProjectEntry, ProjectPickerError, ProjectsStore } from './types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PROJECTS = 20

const EMPTY_STORE: ProjectsStore = {
  version: 1,
  activeProjectId: null,
  projects: [],
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function makeProjectPickerError(
  message: string,
  code: ProjectPickerError['code'],
  details?: string,
): ProjectPickerError {
  const err = new Error(message) as ProjectPickerError
  err.code = code
  if (details !== undefined) {
    err.details = details
  }
  return err
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path to the projects store file.
 * Always ~/.nself/projects.json regardless of runtime environment.
 */
export function getProjectsStorePath(): string {
  return path.join(os.homedir(), '.nself', 'projects.json')
}

/**
 * Reads and parses ~/.nself/projects.json.
 * Returns an empty store when the file does not exist yet.
 * Throws ProjectPickerError with code IO_ERROR on any other read failure.
 */
export async function loadProjects(): Promise<ProjectsStore> {
  const storePath = getProjectsStorePath()

  try {
    const raw = await fs.readFile(storePath, 'utf-8')
    const parsed = JSON.parse(raw) as ProjectsStore
    // Ensure store shape is valid before returning
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.projects)
    ) {
      throw makeProjectPickerError(
        'projects.json has an unexpected structure',
        'IO_ERROR',
        storePath,
      )
    }
    return parsed
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'ENOENT') {
      // File not yet created — return a valid empty store
      return { ...EMPTY_STORE }
    }
    if ((err as ProjectPickerError).code !== undefined) {
      // Re-throw our own errors
      throw err
    }
    throw makeProjectPickerError(
      `Failed to load projects store: ${(err as Error).message}`,
      'IO_ERROR',
      storePath,
    )
  }
}

/**
 * Persists the projects store to disk atomically:
 * writes to a temp file then renames to the final path so readers never see
 * a partial write.
 * Throws ProjectPickerError with code IO_ERROR on failure.
 */
export async function saveProjects(store: ProjectsStore): Promise<void> {
  const storePath = getProjectsStorePath()
  const dir = path.dirname(storePath)
  const tmpPath = `${storePath}.tmp.${Date.now()}`

  try {
    // Ensure ~/.nself/ exists
    await fs.mkdir(dir, { recursive: true })
    // Atomic write: write to tmp, then rename
    await fs.writeFile(tmpPath, JSON.stringify(store, null, 2), 'utf-8')
    await fs.rename(tmpPath, storePath)
  } catch (err) {
    // Clean up tmp file if rename failed
    try {
      await fs.unlink(tmpPath)
    } catch {
      // Ignore cleanup errors
    }
    throw makeProjectPickerError(
      `Failed to save projects store: ${(err as Error).message}`,
      'IO_ERROR',
      storePath,
    )
  }
}

/**
 * Registers a new project.
 *
 * Validates:
 * - path exists and is a directory
 * - no duplicate path already registered
 * - store has not reached MAX_PROJECTS
 *
 * Returns the newly created ProjectEntry.
 * Throws ProjectPickerError with code INVALID_PATH | DUPLICATE | MAX_PROJECTS.
 */
export async function addProject(
  name: string,
  projectPath: string,
): Promise<ProjectEntry> {
  // Validate the path exists and is a directory
  try {
    const stat = await fs.stat(projectPath)
    if (!stat.isDirectory()) {
      throw makeProjectPickerError(
        `Path is not a directory: ${projectPath}`,
        'INVALID_PATH',
        projectPath,
      )
    }
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException
    if (nodeErr.code === 'ENOENT') {
      throw makeProjectPickerError(
        `Path does not exist: ${projectPath}`,
        'INVALID_PATH',
        projectPath,
      )
    }
    if ((err as ProjectPickerError).code !== undefined) {
      throw err
    }
    throw makeProjectPickerError(
      `Cannot access path: ${(err as Error).message}`,
      'INVALID_PATH',
      projectPath,
    )
  }

  const store = await loadProjects()

  if (store.projects.length >= MAX_PROJECTS) {
    throw makeProjectPickerError(
      `Cannot add more than ${MAX_PROJECTS} projects`,
      'MAX_PROJECTS',
    )
  }

  // Check for duplicate path (resolve both to handle trailing-slash differences)
  const resolvedNew = path.resolve(projectPath)
  const duplicate = store.projects.find(
    (p) => path.resolve(p.path) === resolvedNew,
  )
  if (duplicate !== undefined) {
    throw makeProjectPickerError(
      `A project at path "${projectPath}" is already registered as "${duplicate.name}"`,
      'DUPLICATE',
      projectPath,
    )
  }

  const now = new Date().toISOString()
  const entry: ProjectEntry = {
    id: crypto.randomUUID(),
    name,
    path: projectPath,
    activeEnv: 'local',
    createdAt: now,
    lastUsedAt: now,
  }

  store.projects.push(entry)
  await saveProjects(store)
  return entry
}

/**
 * Removes a registered project by id.
 * If the removed project was active, activeProjectId is cleared.
 * Throws ProjectPickerError with code NOT_FOUND when id does not exist.
 */
export async function removeProject(id: string): Promise<void> {
  const store = await loadProjects()

  const index = store.projects.findIndex((p) => p.id === id)
  if (index === -1) {
    throw makeProjectPickerError(`Project not found: ${id}`, 'NOT_FOUND', id)
  }

  store.projects.splice(index, 1)

  if (store.activeProjectId === id) {
    store.activeProjectId = null
  }

  await saveProjects(store)
}

/**
 * Sets the active project and updates its lastUsedAt timestamp.
 * Returns the updated ProjectEntry.
 * Throws ProjectPickerError with code NOT_FOUND when id does not exist.
 */
export async function selectProject(id: string): Promise<ProjectEntry> {
  const store = await loadProjects()

  const entry = store.projects.find((p) => p.id === id)
  if (entry === undefined) {
    throw makeProjectPickerError(`Project not found: ${id}`, 'NOT_FOUND', id)
  }

  entry.lastUsedAt = new Date().toISOString()
  store.activeProjectId = id

  await saveProjects(store)
  return entry
}

/**
 * Returns the currently active project, or null when no project is selected.
 */
export async function getActiveProject(): Promise<ProjectEntry | null> {
  const store = await loadProjects()

  if (store.activeProjectId === null) {
    return null
  }

  return store.projects.find((p) => p.id === store.activeProjectId) ?? null
}
