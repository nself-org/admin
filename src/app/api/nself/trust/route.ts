import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface TrustStatus {
  certificateInstalled: boolean
  dnsConfigured: boolean
  portForwardingActive: boolean
  rawOutput: string
  projectPath: string
}

export async function GET(): Promise<NextResponse> {
  try {
    const nselfCommand = await findNselfPath()
    const projectPath = await getProjectPath()

    // Read-only: nself trust status (or nself ssl status)
    // Run nself trust status — may not exist on all versions; fall back to nself doctor
    let raw = ''
    try {
      const { stdout, stderr } = await execAsync(`${nselfCommand} trust status`, {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 10000,
      })
      raw = stdout || stderr
    } catch {
      // Fall back to generic nself doctor output which includes trust checks
      try {
        const { stdout, stderr } = await execAsync(`${nselfCommand} doctor`, {
          cwd: projectPath,
          env: { ...process.env, PATH: getEnhancedPath() },
          timeout: 20000,
        })
        raw = stdout || stderr
      } catch (fallbackErr) {
        raw = fallbackErr instanceof Error ? fallbackErr.message : ''
      }
    }

    const lower = raw.toLowerCase()
    const certificateInstalled =
      lower.includes('certificate') &&
      (lower.includes('trusted') || lower.includes('installed') || lower.includes('✓'))
    const dnsConfigured =
      lower.includes('dns') &&
      (lower.includes('configured') || lower.includes('ok') || lower.includes('✓'))
    const portForwardingActive =
      lower.includes('port') &&
      (lower.includes('active') || lower.includes('forwarding') || lower.includes('✓'))

    const status: TrustStatus = {
      certificateInstalled,
      dnsConfigured,
      portForwardingActive,
      rawOutput: raw,
      projectPath,
    }

    return NextResponse.json(status)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to retrieve trust status', details: msg },
      { status: 500 }
    )
  }
}
