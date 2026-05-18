import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface DiagnosticCheck {
  name: string
  status: 'pass' | 'fail' | 'warning' | 'info'
  message: string
  detail?: string
}

interface DiagnosticsResult {
  overall: 'healthy' | 'warning' | 'critical'
  checks: DiagnosticCheck[]
  rawOutput: string
  projectPath: string
  runAt: string
}

function parseChecks(stdout: string): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = []
  const lines = stdout.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (
      trimmed.includes('✓') ||
      trimmed.toLowerCase().includes('[ok]') ||
      trimmed.toLowerCase().includes('[pass]')
    ) {
      const msg = trimmed
        .replace(/[✓\[\]]/g, '')
        .replace(/ok|pass/i, '')
        .trim()
      if (msg) {
        const [name, ...rest] = msg.split(':')
        checks.push({
          name: name.trim() || msg,
          status: 'pass',
          message: rest.join(':').trim() || 'OK',
        })
      }
    } else if (
      trimmed.includes('✗') ||
      trimmed.toLowerCase().includes('[fail]') ||
      trimmed.toLowerCase().includes('[error]') ||
      trimmed.toLowerCase().includes('error:')
    ) {
      const msg = trimmed
        .replace(/[✗\[\]]/g, '')
        .replace(/fail|error/i, '')
        .trim()
      if (msg) {
        const [name, ...rest] = msg.split(':')
        checks.push({
          name: name.trim() || msg,
          status: 'fail',
          message: rest.join(':').trim() || 'Failed',
        })
      }
    } else if (
      trimmed.includes('⚠') ||
      trimmed.toLowerCase().includes('[warn]') ||
      trimmed.toLowerCase().includes('warning:')
    ) {
      const msg = trimmed
        .replace(/[⚠\[\]]/g, '')
        .replace(/warn(ing)?/i, '')
        .trim()
      if (msg) {
        const [name, ...rest] = msg.split(':')
        checks.push({
          name: name.trim() || msg,
          status: 'warning',
          message: rest.join(':').trim() || 'Warning',
        })
      }
    }
  }

  return checks
}

export async function GET(): Promise<NextResponse> {
  try {
    const nselfCommand = await findNselfPath()
    const projectPath = await getProjectPath()

    const { stdout, stderr } = await execAsync(`${nselfCommand} doctor --deep`, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 60000,
    }).catch(async (_err) => {
      // doctor may exit non-zero on issues — capture output anyway
      return execAsync(`${nselfCommand} doctor`, {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 30000,
      })
    })

    const raw = stdout || stderr
    const checks = parseChecks(raw)

    const hasFailures = checks.some((c) => c.status === 'fail')
    const hasWarnings = checks.some((c) => c.status === 'warning')
    const overall: DiagnosticsResult['overall'] = hasFailures
      ? 'critical'
      : hasWarnings
        ? 'warning'
        : 'healthy'

    const result: DiagnosticsResult = {
      overall,
      checks,
      rawOutput: raw,
      projectPath,
      runAt: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to run diagnostics', details: msg }, { status: 500 })
  }
}
