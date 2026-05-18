import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface HelpCommand {
  name: string
  description: string
  usage?: string
}

interface HelpResult {
  commands: HelpCommand[]
  rawOutput: string
}

function parseCommands(stdout: string): HelpCommand[] {
  const commands: HelpCommand[] = []
  const lines = stdout.split('\n')
  let inCommandsSection = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect start of commands section
    if (/^(available )?commands?:?$/i.test(trimmed) || /^usage:/i.test(trimmed)) {
      inCommandsSection = true
      continue
    }

    if (!inCommandsSection) continue

    // Stop at flags/options section
    if (/^(flags?|options?|global flags?):?$/i.test(trimmed)) break

    // Match "  command    description" pattern (2+ space indent)
    const match = line.match(/^\s{2,}(\S+)\s{2,}(.+)$/)
    if (match) {
      commands.push({
        name: match[1],
        description: match[2].trim(),
      })
    }
  }

  return commands
}

export async function GET(): Promise<NextResponse> {
  try {
    const nselfCommand = await findNselfPath()

    const { stdout, stderr } = await execAsync(`${nselfCommand} --help`, {
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 10000,
    })

    const raw = stdout || stderr
    const commands = parseCommands(raw)

    const result: HelpResult = { commands, rawOutput: raw }
    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to retrieve help', details: msg }, { status: 500 })
  }
}
