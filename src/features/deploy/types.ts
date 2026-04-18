/**
 * Types for the deploy feature.
 * Covers all deploy targets, strategies, runtime state, and results.
 */

/** The three canonical deployment targets supported by nself. */
export type DeployTarget = 'local' | 'staging' | 'prod'

/** Deployment strategy options. */
export type DeployStrategy = 'rolling' | 'blue-green' | 'canary' | 'preview'

/** Configuration passed to a deploy operation. */
export interface DeployConfig {
  target: DeployTarget
  strategy: DeployStrategy
  projectPath?: string
  dryRun?: boolean
}

/** A single step in the deploy pipeline. */
export interface DeployStep {
  name: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
  duration?: number
  output?: string
}

/** Runtime state managed by DeployPanel. */
export interface DeployState {
  status: 'idle' | 'running' | 'success' | 'failed'
  target: DeployTarget | null
  strategy: DeployStrategy | null
  steps: DeployStep[]
  startedAt: string | null
  duration: number | null
  error: string | null
  output: string
}

/** Returned by runDeploy() after a deploy completes or fails. */
export interface DeployResult {
  success: boolean
  target: DeployTarget
  strategy: DeployStrategy
  steps: DeployStep[]
  duration: number
  output: string
  error?: string
}

/** Structured error thrown by runDeploy() on failure. */
export interface DeployError extends Error {
  code:
    | 'CLI_NOT_FOUND'
    | 'DEPLOY_FAILED'
    | 'DRY_RUN_ONLY'
    | 'INVALID_TARGET'
    | 'UNAUTHORIZED'
  details?: string
}
