import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(): Promise<NextResponse> {
  try {
    const nselfCommand = await findNselfPath()

    // Get version from nself CLI
    const { stdout } = await execAsync(`${nselfCommand} --version`, {
      env: {
        ...process.env,
        PATH: getEnhancedPath(),
      },
      timeout: 5000,
    })

    // Parse version from output (e.g., "nself version 0.4.4")
    const versionMatch = stdout.match(/version\s+([\d.]+)/)
    const version = versionMatch ? versionMatch[1] : stdout.trim()

    return NextResponse.json({
      version,
      path: nselfCommand,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'nself CLI not found',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 404 },
    )
  }
}
