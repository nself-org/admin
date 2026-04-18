import { findNselfPathSync, getEnhancedPath } from '@/lib/nself-path'
import { execFile } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

import type { CommandDef, FlagDef } from '@/features/commands/types'

const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// Module-level cache — avoids shelling out on every request
// ---------------------------------------------------------------------------

interface RegistryCache {
  commands: CommandDef[]
  builtAt: number
}

let _cache: RegistryCache | null = null
const CACHE_TTL_MS = 60_000

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Core commands for which we fetch flag details via `nself <cmd> --help`.
 * Ordered to match the CLI's primary user surface.
 */
const CORE_COMMANDS = [
  'start',
  'stop',
  'build',
  'deploy',
  'status',
  'doctor',
  'plugin',
  'env',
  'tenant',
  'backup',
  'logs',
  'restart',
  'update',
  'config',
  'ssl',
  'db',
  'monitor',
  'clean',
  'scale',
  'webhooks',
  'alerts',
  'secrets',
]

/**
 * Parse the "Available Commands" section of `nself --help` output.
 * Each line looks like:
 *   "  cmdname     Short description text"
 */
function parseTopLevelCommands(
  helpOutput: string,
): Array<{ name: string; description: string }> {
  const commands: Array<{ name: string; description: string }> = []
  let inCommandsSection = false

  for (const rawLine of helpOutput.split('\n')) {
    const line = rawLine.trimEnd()

    // Detect section header
    if (/^Available Commands:/i.test(line) || /^Commands:/i.test(line)) {
      inCommandsSection = true
      continue
    }

    // Any non-blank line that starts with a non-space character ends the section
    if (inCommandsSection && line.length > 0 && line[0] !== ' ') {
      inCommandsSection = false
      continue
    }

    if (!inCommandsSection) continue

    // Blank line inside the section — keep going
    if (line.trim() === '') continue

    // Lines inside the section start with two or more spaces followed by the command name
    const match = /^ {2,}(\S+)\s{2,}(.+)$/.exec(line)
    if (match) {
      commands.push({ name: match[1], description: match[2].trim() })
    }
  }

  return commands
}

/**
 * Parse the "Flags" / "Global Flags" section of `nself <cmd> --help`.
 * Cobra's default flag output looks like either of:
 *   "  -e, --env string   Environment name (default "dev")"
 *   "      --force        Force overwrite"
 *   "  -n, --count int    Number of replicas (default 1)"
 */
function parseFlags(helpOutput: string): FlagDef[] {
  const flags: FlagDef[] = []
  let inFlagsSection = false

  for (const rawLine of helpOutput.split('\n')) {
    const line = rawLine.trimEnd()

    if (/^Flags:/i.test(line) || /^Local Flags:/i.test(line)) {
      inFlagsSection = true
      continue
    }

    if (/^Global Flags:/i.test(line)) {
      // Global flags are included; keep collecting
      inFlagsSection = true
      continue
    }

    // Any non-blank line that starts at column 0 ends a flags section
    if (inFlagsSection && line.length > 0 && line[0] !== ' ') {
      inFlagsSection = false
      continue
    }

    if (!inFlagsSection) continue
    if (line.trim() === '') continue

    // Pattern: optional shorthand, long flag, optional type, description, optional default
    // e.g.: "  -e, --env string   The environment (default "dev")"
    // e.g.: "      --force        Force the operation"
    const match =
      /^ {1,6}(?:-(\w),\s+)?--([a-z][a-z0-9-]*)(?:\s+(string|bool|int|stringSlice|stringArray|duration|count))?\s{2,}(.+)$/.exec(
        line,
      )
    if (!match) continue

    const shorthand = match[1] ?? undefined
    const name = match[2]
    const rawType = match[3] ?? 'bool'
    const rest = match[4] ?? ''

    // Normalize type
    let type: FlagDef['type'] = 'bool'
    if (rawType === 'string' || rawType === 'duration') type = 'string'
    else if (rawType === 'int' || rawType === 'count') type = 'int'
    else if (rawType === 'stringSlice' || rawType === 'stringArray')
      type = 'stringSlice'

    // Extract default value
    const defaultMatch = /\(default\s+"?([^")\s]+)"?\)/.exec(rest)
    const defaultValue = defaultMatch ? defaultMatch[1] : undefined

    // Strip default annotation from description
    const description = rest
      .replace(/\s*\(default\s+"?[^")]*"?\)\s*$/, '')
      .trim()

    const required = /\(required\)/.test(rest)

    flags.push({ name, shorthand, description, type, defaultValue, required })
  }

  return flags
}

/**
 * Build the usage line from the command name and its flags.
 */
function buildUsage(cmdName: string, flags: FlagDef[]): string {
  const hasFlags = flags.length > 0
  return hasFlags ? `nself ${cmdName} [flags]` : `nself ${cmdName}`
}

// ---------------------------------------------------------------------------
// Registry builder
// ---------------------------------------------------------------------------

async function buildRegistry(): Promise<CommandDef[]> {
  const nselfBin = findNselfPathSync()
  const env = { ...process.env, PATH: getEnhancedPath() }
  const execOpts = { env, timeout: 15_000 }

  // Fetch top-level help
  let topLevelOutput = ''
  try {
    const { stdout, stderr } = await execFileAsync(
      nselfBin,
      ['--help'],
      execOpts,
    )
    topLevelOutput = stdout || stderr
  } catch (err) {
    // Cobra writes help to stderr when exit code != 0; capture it
    const e = err as { stdout?: string; stderr?: string }
    topLevelOutput = e.stdout || e.stderr || ''
  }

  const discovered = parseTopLevelCommands(topLevelOutput)

  // Build registry: for CORE_COMMANDS fetch flag details, others get empty flags
  const registry: CommandDef[] = []

  for (const { name, description } of discovered) {
    if (!CORE_COMMANDS.includes(name)) {
      registry.push({
        name,
        description,
        usage: `nself ${name}`,
        flags: [],
        subcommands: [],
      })
      continue
    }

    let flags: FlagDef[] = []
    let subcommands: CommandDef[] = []

    try {
      const { stdout, stderr } = await execFileAsync(
        nselfBin,
        [name, '--help'],
        { env, timeout: 10_000 },
      ).catch((e: { stdout?: string; stderr?: string }) => ({
        stdout: e.stdout || '',
        stderr: e.stderr || '',
      }))

      const cmdHelp = stdout || stderr
      flags = parseFlags(cmdHelp)
      subcommands = parseTopLevelCommands(cmdHelp).map((sub) => ({
        name: sub.name,
        description: sub.description,
        usage: `nself ${name} ${sub.name} [flags]`,
        flags: [],
        subcommands: [],
      }))
    } catch {
      // If the command's help fails, continue with empty flags/subcommands
    }

    registry.push({
      name,
      description,
      usage: buildUsage(name, flags),
      flags,
      subcommands,
    })
  }

  // If discovery returned nothing (nself not installed / --help unavailable),
  // return a minimal hardcoded registry so the UI is still useful.
  if (registry.length === 0) {
    return CORE_COMMANDS.map((name) => ({
      name,
      description: `nself ${name} command`,
      usage: `nself ${name} [flags]`,
      flags: [],
      subcommands: [],
    }))
  }

  return registry
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  try {
    const now = Date.now()

    // Serve from cache when fresh
    if (_cache !== null && now - _cache.builtAt < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, commands: _cache.commands })
    }

    const commands = await buildRegistry()
    _cache = { commands, builtAt: now }

    return NextResponse.json({ success: true, commands })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to build command registry',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
