/**
 * Types for the project-picker feature.
 * Manages multiple registered nSelf projects and the currently active one.
 */

/** A single registered nSelf project. */
export interface ProjectEntry {
  /** Unique identifier — crypto.randomUUID() */
  id: string
  /** Display name, e.g. "my-app" */
  name: string
  /** Absolute path to the project root on the local filesystem */
  path: string
  /** Per-project active environment context */
  activeEnv: 'local' | 'staging' | 'prod'
  /** ISO timestamp — when this entry was created */
  createdAt: string
  /** ISO timestamp — last time this project was selected */
  lastUsedAt: string
}

/** Root structure of ~/.nself/projects.json */
export interface ProjectsStore {
  version: 1
  activeProjectId: string | null
  projects: ProjectEntry[]
}

/** Runtime state held by the ProjectPicker component. */
export interface ProjectPickerState {
  projects: ProjectEntry[]
  activeProjectId: string | null
  loading: boolean
  error: string | null
}

/** Discriminated-union actions for project picker state changes. */
export type ProjectPickerAction =
  | { type: 'select'; id: string }
  | { type: 'add'; name: string; path: string }
  | { type: 'remove'; id: string }

/** Structured error thrown by project-picker core logic. */
export interface ProjectPickerError extends Error {
  code: 'NOT_FOUND' | 'INVALID_PATH' | 'DUPLICATE' | 'IO_ERROR' | 'MAX_PROJECTS'
  details?: string
}
