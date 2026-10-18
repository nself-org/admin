/**
 * Canonical nself command spellings for the admin exec helpers.
 *
 * cli v1.5 moves several commands (ADR 0016, `Command-Canon.md` in the cli wiki)
 * and keeps the old spelling as a shim that prints a deprecation warning until
 * v1.6.0. Admin ships in lockstep with the cli (P7-SHIP-06), so every argv it
 * builds uses the canonical spelling. Callers that still build an old root
 * dynamically (workflow steps, `nself service ...` text) are rewritten here
 * before the exec, so no shim warning reaches a response.
 *
 * CANON_MOVES holds the roots admin builds or passes through (the helpers and
 * the routes that run a user-chosen command: cli/execute, commands/run,
 * nself, ws/terminal). scripts/cli-compat.sh proves the canonical targets exist
 * and are not shims, and that those routes call canonicalizeArgs.
 *
 * Reusable by: nselfCLI.ts (executeNselfCommand, streamNselfCommand).
 */

export interface NselfArgv {
  command: string
  args: string[]
}

/** Commands executeNselfCommand accepts, canonical spellings only. */
export const ALLOWED_COMMANDS: readonly string[] = [
  // Core lifecycle
  'init',
  'build',
  'start',
  'stop',
  'restart',
  'reset',
  'status',
  'logs',
  'doctor',
  // Data management
  'backup',
  'restore',
  'db',
  // Configuration & environment (config also carries secrets, env, services, plugins)
  'config',
  'ssl',
  'apply',
  'export',
  // Deployment & infrastructure
  'deploy',
  'scale',
  'infra',
  // Monitoring & health
  'monitor',
  'metrics',
  'perf',
  // Service & container management
  'exec',
  // Plugins: add/remove are the canonical install/uninstall; functions and plugin-dev are plugins
  'add',
  'remove',
  'functions',
  'plugin-dev',
  // Multi-tenancy & auth
  'tenant',
  'auth',
  // Developer tools
  'bench',
  'completion',
  // Audit & history
  'history',
  'audit',
  // User management
  'user',
  // Info & utility
  'update',
  'version',
  'help',
]

/** Commands streamNselfCommand accepts (`status` carries `status health`). */
export const STREAM_COMMANDS: readonly string[] = [
  'logs',
  'monitor',
  'watch',
  'tail',
  'status',
  'metrics',
]

/** `migrate <sub>` was retired into db and update project (Command-Canon.md). */
const MIGRATE_UPDATE_PROJECT = ['detect', 'from-bash', 'from-v099', 'rollback', 'run']
const MIGRATE_DB_IMPORT = [
  'appwrite',
  'firebase',
  'hasura-cloud',
  'nhost',
  'nself',
  'postgres',
  'supabase',
]

const PLUGIN_DEV_SUBCOMMANDS = ['debug', 'dev', 'init', 'link', 'new', 'test', 'unlink']

/** Old root -> rewrite of that root's argv, from the cli canon table. */
const CANON_MOVES: Record<string, (args: string[]) => NselfArgv> = {
  service: (args) => ({ command: 'config', args: ['services', ...args] }),
  secrets: (args) => ({ command: 'config', args: ['secrets', ...args] }),
  dev: (args) => ({ command: 'start', args: ['dev', ...args] }),
  env: (args) => ({ command: 'config', args: ['env', ...args] }),
  trust: (args) => ({ command: 'config', args: ['trust', ...args] }),
  server: (args) => ({ command: 'infra', args: ['server', ...args] }),
  migrate: (args) => {
    const sub = args[0]
    if (sub === undefined) return { command: 'db', args }
    if (MIGRATE_UPDATE_PROJECT.includes(sub))
      return { command: 'update', args: ['project', ...args] }
    if (MIGRATE_DB_IMPORT.includes(sub)) return { command: 'db', args: ['import', ...args] }
    if (sub === 'generate' || sub === 'watch') return { command: 'db', args: ['migrate', ...args] }
    // Not a row of the canon table: leave it for the cli to refuse. Never widen it to `db <sub>`.
    return { command: 'migrate', args }
  },
  urls: (args) => ({ command: 'status', args: ['urls', ...args] }),
  health: (args) => ({ command: 'status', args: ['health', ...args] }),
  plugin: (args) => {
    // `plugin test|debug|dev|init|link|new|unlink` are breakouts to the plugin-dev plugin.
    if (args[0] !== undefined && PLUGIN_DEV_SUBCOMMANDS.includes(args[0]))
      return { command: 'plugin-dev', args }
    // `plugin install|remove` are shims for the top-level add and remove.
    if (args[0] === 'install') return { command: 'add', args: args.slice(1) }
    if (args[0] === 'remove') return { command: 'remove', args: args.slice(1) }
    return { command: 'config', args: ['plugins', ...args] }
  },
}

/** Rewrite an old-spelling argv to its canonical form; canonical argv pass through. */
export function canonicalizeArgv(command: string, args: string[] = []): NselfArgv {
  const move = Object.prototype.hasOwnProperty.call(CANON_MOVES, command)
    ? CANON_MOVES[command]
    : undefined
  return move ? move(args) : { command, args }
}

/** canonicalizeArgv for a whole argv ([command, ...args]); an empty argv is returned as is. */
export function canonicalizeArgs(argv: string[]): string[] {
  const [command, ...args] = argv
  if (command === undefined) return argv
  const out = canonicalizeArgv(command, args)
  return [out.command, ...out.args]
}
