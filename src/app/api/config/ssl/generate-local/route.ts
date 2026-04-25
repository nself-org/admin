import { findNselfPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile, spawn } from 'child_process'
import { promises as fs } from 'fs'
import { NextResponse, NextRequest } from 'next/server'
import path from 'path'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execFileAsync = promisify(execFile)

/**
 * POST /api/config/ssl/generate-local
 * Generates local SSL certificates using mkcert
 *
 * Delegates to: nself ssl bootstrap (if available) or runs mkcert directly
 */
export async function POST(request: NextRequest): Promise<Response | NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const projectPath = getProjectPath()

    // Check if mkcert is installed
    try {
      await execFileAsync('which', ['mkcert'])
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'mkcert is not installed',
          instructions: [
            'Install mkcert to generate local SSL certificates:',
            '',
            'macOS: brew install mkcert',
            'Linux: sudo apt install mkcert (or use brew)',
            'Windows: choco install mkcert',
            '',
            'After installing, run: mkcert -install',
          ],
        },
        { status: 400 },
      )
    }

    // Try nself ssl bootstrap first
    try {
      const nselfPath = await findNselfPath()
      await fs.access(nselfPath)

      const { stdout, stderr } = await execFileAsync(
        nselfPath,
        ['ssl', 'bootstrap'],
        {
          cwd: projectPath,
          timeout: 60000,
        },
      )

      return NextResponse.json({
        success: true,
        data: {
          method: 'nself',
          output: stdout,
          warnings: stderr || undefined,
        },
      })
    } catch {
      // nself not available, use mkcert directly
    }

    // Read domain from .env
    let baseDomain = 'localhost'
    try {
      const envPath = path.join(projectPath, '.env')
      const envContent = await fs.readFile(envPath, 'utf-8')
      const domainMatch = envContent.match(/^BASE_DOMAIN=(.+)$/m)
      if (domainMatch) {
        baseDomain = domainMatch[1].trim()
      }
    } catch {
      // Use default
    }

    // Create SSL directory
    const sslDir = path.join(projectPath, 'nginx', 'ssl', 'localhost')
    await fs.mkdir(sslDir, { recursive: true })

    // Generate certificates with mkcert
    const domains = [
      'localhost',
      '*.localhost',
      baseDomain,
      `*.${baseDomain}`,
      '127.0.0.1',
      '::1',
    ]

    const certPath = path.join(sslDir, 'fullchain.pem')
    const keyPath = path.join(sslDir, 'privkey.pem')

    return new Promise<Response>((resolve) => {
      const mkcert = spawn(
        'mkcert',
        ['-cert-file', certPath, '-key-file', keyPath, ...domains],
        { cwd: projectPath },
      )

      let stdout = ''
      let stderr = ''

      mkcert.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      mkcert.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      mkcert.on('close', async (code) => {
        if (code === 0) {
          // Update .env to set SSL_MODE=local
          try {
            const envPath = path.join(projectPath, '.env')
            let envContent = await fs.readFile(envPath, 'utf-8')

            if (envContent.match(/^SSL_MODE=/m)) {
              envContent = envContent.replace(
                /^SSL_MODE=.+$/m,
                'SSL_MODE=local',
              )
            } else {
              envContent += '\nSSL_MODE=local\n'
            }

            await fs.writeFile(envPath, envContent)
          } catch {
            // .env update failed, but certs were generated
          }

          resolve(
            NextResponse.json({
              success: true,
              data: {
                method: 'mkcert',
                certPath,
                keyPath,
                domains,
                output: stdout || stderr,
                message: 'SSL certificates generated successfully',
              },
            }),
          )
        } else {
          resolve(
            NextResponse.json(
              {
                success: false,
                error: 'Failed to generate certificates',
                details: stderr || stdout,
              },
              { status: 500 },
            ),
          )
        }
      })

      mkcert.on('error', (err) => {
        resolve(
          NextResponse.json(
            {
              success: false,
              error: `mkcert execution failed: ${err.message}`,
            },
            { status: 500 },
          ),
        )
      })
    })
  } catch (error) {
    console.error('SSL generate error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate SSL certificates',
      },
      { status: 500 },
    )
  }
}
