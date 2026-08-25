import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { execFile, spawn } from 'child_process'
import { promises as fs } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'

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
        { status: 400 }
      )
    }

    // This used to try `nself ssl bootstrap` first and fall back to mkcert when
    // that failed. The fallback never ran, because the attempt never failed:
    // `bootstrap` has never been a subcommand of `nself ssl`, and cobra answers
    // an unknown subcommand by printing help and exiting 0. So this endpoint
    // reported { success: true, method: 'nself' } while generating no
    // certificates at all, and the working path below was unreachable.
    //
    // There is no nself command to call here. `nself trust ssl` provisions via
    // certbot with DNS-01, which needs a public domain; local development certs
    // are mkcert's job, which is what the rest of this handler does. So the
    // attempt is gone rather than repointed.

    // Read domain from .env
    let baseDomain = 'localhost'
    try {
      const envPath = path.join(projectPath, '.env')
      const envContent = await fs.readFile(envPath, 'utf-8')
      const domainMatch = envContent.match(/^BASE_DOMAIN=(.+)$/m)
      if (domainMatch) {
        baseDomain = (domainMatch[1] ?? '').trim()
      }
    } catch {
      // Use default
    }

    // Create SSL directory
    const sslDir = path.join(projectPath, 'nginx', 'ssl', 'localhost')
    await fs.mkdir(sslDir, { recursive: true })

    // Generate certificates with mkcert
    const domains = ['localhost', '*.localhost', baseDomain, `*.${baseDomain}`, '127.0.0.1', '::1']

    const certPath = path.join(sslDir, 'fullchain.pem')
    const keyPath = path.join(sslDir, 'privkey.pem')

    return new Promise<Response>((resolve) => {
      const mkcert = spawn('mkcert', ['-cert-file', certPath, '-key-file', keyPath, ...domains], {
        cwd: projectPath,
      })

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
              envContent = envContent.replace(/^SSL_MODE=.+$/m, 'SSL_MODE=local')
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
            })
          )
        } else {
          resolve(
            NextResponse.json(
              {
                success: false,
                error: 'Failed to generate certificates',
                details: stderr || stdout,
              },
              { status: 500 }
            )
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
            { status: 500 }
          )
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
      { status: 500 }
    )
  }
}
