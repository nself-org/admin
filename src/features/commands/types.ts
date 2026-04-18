/**
 * Types for the commands feature.
 * Mirrors the CLI command registry shape returned by GET /api/commands/registry.
 */

/** A single flag definition parsed from `nself <cmd> --help` output. */
export interface FlagDef {
  /** Full flag name without leading dashes, e.g. "env" */
  name: string
  /** Single-character shorthand without leading dash, e.g. "e" */
  shorthand?: string
  /** Human-readable description from --help output */
  description: string
  /** Inferred type from help output */
  type: 'string' | 'bool' | 'int' | 'stringSlice'
  /** Default value as a string if present in help output */
  defaultValue?: string
  /** Whether the flag is marked as required */
  required: boolean
}

/** A top-level or sub-command definition. */
export interface CommandDef {
  /** Command name, e.g. "start" */
  name: string
  /** Short description from --help output */
  description: string
  /** Usage line, e.g. "nself start [flags]" */
  usage: string
  /** Parsed flags for this command */
  flags: FlagDef[]
  /** Nested subcommands if any */
  subcommands: CommandDef[]
}

/** Payload for POST /api/commands/run */
export interface RunCommandRequest {
  /** Top-level command, e.g. "start" */
  command: string
  /** Optional subcommand tokens joined by spaces, e.g. "plugin install" */
  subcommand?: string
  /** Flag values keyed by full flag name without dashes */
  flags: Record<string, string | boolean>
  /** Absolute path to the nself project directory */
  projectPath?: string
}

/** Response from POST /api/commands/run */
export interface RunCommandResult {
  success: boolean
  output: string
  exitCode: number
  duration: number
}
