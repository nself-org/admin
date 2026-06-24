import { envToWizardConfig, readEnvFile } from '@/lib/env-handler'
import { executeNselfCommand } from '@/lib/nselfCLI'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { mode } = await request.json() // mode can be 'edit' or 'reset'
    const projectPath = getProjectPath()

    // If mode is 'edit', save current .env.local BEFORE reset
    const envPath = path.join(projectPath, '.env.local')
    const tempBackupPath = path.join(projectPath, '.env.local.temp')
    let savedConfig = null

    if (mode === 'edit') {
      try {
        // Save current .env.local to temp location before reset
        await fs.copyFile(envPath, tempBackupPath)

        // Read the config now before reset
        const env = await readEnvFile()
        if (env) {
          savedConfig = envToWizardConfig(env)
        }
      } catch {
        // Ignore load error — proceed with defaults
      }
    }

    // Run nself reset with --yes to stop containers, remove volumes, and clean
    // generated files non-interactively. executeNselfCommand uses execFile with
    // array args (no shell), so there is no shell-interpolation surface, and the
    // nSelf CLI owns the docker-compose teardown (nSelf-First doctrine: no compose
    // outside nself build/start).
    let stdout = ''

    const result = await executeNselfCommand('reset', ['--yes'], {
      cwd: projectPath,
      timeout: 60000, // reset tears down containers + volumes; allow time
    })

    if (result.success) {
      stdout = result.stdout || 'Reset complete'
    } else if (mode === 'edit') {
      // Edit mode only needs the config preserved/restored below, so a failed
      // reset is non-fatal here.
      stdout = 'Reset skipped for edit mode'
    } else {
      // Full reset failed and there is no side-channel fallback by design.
      console.error('Reset failed:', result.stderr || result.error)
      return NextResponse.json(
        {
          error: 'Failed to reset project',
          details: 'Reset failed. Check server logs for details.',
        },
        { status: 500 }
      )
    }

    if (result.stderr && !result.stderr.includes('warning')) {
      console.error('Reset stderr:', result.stderr)
    }

    // If mode is 'edit', restore the saved config
    if (mode === 'edit') {
      const envBackupPath = path.join(projectPath, '.env.local.old')

      try {
        // First try to restore from our temp backup
        try {
          await fs.access(tempBackupPath)
          await fs.copyFile(tempBackupPath, envPath)
          // Clean up temp file
          await fs.unlink(tempBackupPath).catch(() => {})
        } catch {
          // If no temp backup, try .env.local.old from nself reset
          await fs.access(envBackupPath)
          await fs.copyFile(envBackupPath, envPath)
        }

        // Return the saved config we read before reset
        if (savedConfig) {
          return NextResponse.json({
            success: true,
            message: 'Project reset for editing',
            config: savedConfig,
          })
        }

        // If no saved config, read from restored file
        const env = await readEnvFile()
        if (env) {
          const config = envToWizardConfig(env)

          return NextResponse.json({
            success: true,
            message: 'Project reset for editing',
            config,
          })
        }
      } catch (_err) {
        return NextResponse.json({
          success: true,
          message: 'Project reset',
          config: null,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Project reset successfully',
      output: stdout,
    })
  } catch (error) {
    console.error('Error resetting project:', error)
    return NextResponse.json(
      {
        error: 'Failed to reset project',
        details: 'Reset failed. Check server logs for details.',
      },
      { status: 500 }
    )
  }
}
