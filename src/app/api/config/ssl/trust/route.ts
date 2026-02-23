import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

interface TrustStatus {
  installed: boolean
  caRootPath?: string
  platform: string
  instructions?: string[]
}

/**
 * GET /api/config/ssl/trust
 * Check if mkcert CA is installed in system trust store
 */
export async function GET(): Promise<NextResponse> {
  try {
    const platform = process.platform
    const status: TrustStatus = {
      installed: false,
      platform,
    }

    // Check if mkcert is installed
    try {
      await execFileAsync('which', ['mkcert'])
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          ...status,
          instructions: [
            'mkcert is not installed. Install it first:',
            '',
            platform === 'darwin'
              ? 'brew install mkcert'
              : platform === 'linux'
                ? 'sudo apt install mkcert (or use brew)'
                : 'choco install mkcert',
          ],
        },
      })
    }

    // Get CA root path
    try {
      const { stdout } = await execFileAsync('mkcert', ['-CAROOT'])
      status.caRootPath = stdout.trim()

      // Check if root CA exists
      const rootCertPath = path.join(status.caRootPath, 'rootCA.pem')
      await fs.access(rootCertPath)
      status.installed = true
    } catch {
      status.installed = false
      status.instructions = [
        'mkcert CA is not installed in system trust store.',
        '',
        'Run the following command to install:',
        'mkcert -install',
        '',
        'This will add the mkcert CA to your system trust store,',
        'allowing browsers to trust locally-generated certificates.',
      ]
    }

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    console.error('Trust status error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check trust status',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/config/ssl/trust
 * Install mkcert CA to system trust store
 *
 * Note: This requires elevated permissions and may prompt for password
 */
export async function POST(): Promise<NextResponse> {
  try {
    // Check if mkcert is installed
    try {
      await execFileAsync('which', ['mkcert'])
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'mkcert is not installed',
          instructions: [
            'Install mkcert first:',
            '',
            process.platform === 'darwin'
              ? 'brew install mkcert'
              : process.platform === 'linux'
                ? 'sudo apt install mkcert (or use brew)'
                : 'choco install mkcert',
          ],
        },
        { status: 400 },
      )
    }

    // Try to install trust (this may require sudo/admin permissions)
    try {
      const { stdout, stderr } = await execFileAsync('mkcert', ['-install'], {
        timeout: 30000,
      })

      return NextResponse.json({
        success: true,
        data: {
          message: 'mkcert CA installed successfully',
          output: stdout || stderr,
          note: 'You may need to restart your browser for changes to take effect.',
        },
      })
    } catch (error: unknown) {
      const err = error as { stderr?: string; message?: string }
      // mkcert -install may fail if it needs sudo
      if (err.stderr?.includes('permission') || err.stderr?.includes('sudo')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Elevated permissions required',
            instructions: [
              'Installing the CA requires elevated permissions.',
              '',
              'Run this command manually in your terminal:',
              'sudo mkcert -install',
              '',
              'Then refresh this page.',
            ],
          },
          { status: 403 },
        )
      }

      throw error
    }
  } catch (error) {
    console.error('Trust install error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to install mkcert CA',
        instructions: [
          'Try running manually:',
          'mkcert -install',
          '',
          'If that fails, you may need sudo:',
          'sudo mkcert -install',
        ],
      },
      { status: 500 },
    )
  }
}
