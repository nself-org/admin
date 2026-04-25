import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'
import { z } from 'zod'

const execFileAsync = promisify(execFile)

const letsEncryptSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  email: z.string().email('Valid email is required'),
  staging: z.boolean().optional().default(false),
})

/**
 * GET /api/config/ssl/letsencrypt
 * Check Let's Encrypt configuration status
 */
export async function GET(): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()

    const status = {
      configured: false,
      domain: null as string | null,
      email: null as string | null,
      staging: false,
      certificateExists: false,
      autoRenewal: false,
    }

    // Read configuration from .env
    try {
      const envPath = path.join(projectPath, '.env')
      const envContent = await fs.readFile(envPath, 'utf-8')

      const sslModeMatch = envContent.match(/^SSL_MODE=(.+)$/m)
      if (sslModeMatch && sslModeMatch[1].trim() === 'letsencrypt') {
        status.configured = true
      }

      const domainMatch = envContent.match(/^LETSENCRYPT_DOMAIN=(.+)$/m)
      if (domainMatch) {
        status.domain = domainMatch[1].trim()
      }

      const emailMatch = envContent.match(/^LETSENCRYPT_EMAIL=(.+)$/m)
      if (emailMatch) {
        status.email = emailMatch[1].trim()
      }

      const stagingMatch = envContent.match(/^LETSENCRYPT_STAGING=(.+)$/m)
      if (stagingMatch) {
        status.staging = stagingMatch[1].trim().toLowerCase() === 'true'
      }
    } catch {
      // No .env or can't read
    }

    // Check for existing Let's Encrypt certificates
    const certPaths = [
      path.join(
        projectPath,
        'certbot',
        'live',
        status.domain || '',
        'fullchain.pem',
      ),
      path.join(
        projectPath,
        'letsencrypt',
        'live',
        status.domain || '',
        'fullchain.pem',
      ),
    ]

    for (const certPath of certPaths) {
      try {
        await fs.access(certPath)
        status.certificateExists = true
        break
      } catch {
        // Not found
      }
    }

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    console.error("Let's Encrypt status error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get Let's Encrypt status",
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/config/ssl/letsencrypt
 * Configure Let's Encrypt for the project
 *
 * Note: This only updates configuration. Actual certificate issuance
 * happens when services are started with SSL_MODE=letsencrypt
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const validation = letsEncryptSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 },
      )
    }

    const { domain, email, staging } = validation.data
    const projectPath = getProjectPath()

    // Update .env file with Let's Encrypt configuration
    const envPath = path.join(projectPath, '.env')
    let envContent = ''

    try {
      envContent = await fs.readFile(envPath, 'utf-8')
    } catch {
      // .env doesn't exist, create it
      envContent = ''
    }

    // Update or add SSL configuration
    const updates: Record<string, string> = {
      SSL_MODE: 'letsencrypt',
      LETSENCRYPT_DOMAIN: domain,
      LETSENCRYPT_EMAIL: email,
      LETSENCRYPT_STAGING: staging ? 'true' : 'false',
    }

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.+$`, 'm')
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`)
      } else {
        envContent += `\n${key}=${value}`
      }
    }

    // Clean up multiple newlines
    envContent = envContent.replace(/\n{3,}/g, '\n\n').trim() + '\n'

    await fs.writeFile(envPath, envContent)

    // Try to run nself ssl letsencrypt if available
    let nselfOutput = null
    try {
      const nselfPath = await findNselfPath()
      await fs.access(nselfPath)

      const args = ['ssl', 'letsencrypt', '--domain', domain, '--email', email]
      if (staging) {
        args.push('--staging')
      }

      const { stdout } = await execFileAsync(nselfPath, args, {
        cwd: projectPath,
        timeout: 120000, // 2 minutes
        env: { ...process.env, PATH: getEnhancedPath() },
      })
      nselfOutput = stdout
    } catch {
      // nself not available, configuration was saved to .env
    }

    return NextResponse.json({
      success: true,
      data: {
        message: "Let's Encrypt configuration saved",
        domain,
        email,
        staging,
        note: staging
          ? 'Staging mode enabled - certificates will not be trusted by browsers'
          : "Production mode - certificates will be issued by Let's Encrypt",
        nextSteps: [
          '1. Ensure your domain points to this server',
          '2. Run "nself build" to regenerate configuration',
          '3. Run "nself start" to start services and obtain certificate',
        ],
        nselfOutput,
      },
    })
  } catch (error) {
    console.error("Let's Encrypt config error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to configure Let's Encrypt",
      },
      { status: 500 },
    )
  }
}
