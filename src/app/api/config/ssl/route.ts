import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { promises as fs } from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

interface SSLStatus {
  mode: 'none' | 'local' | 'letsencrypt'
  configured: boolean
  certificates: {
    exists: boolean
    domain?: string
    expiresAt?: string
    daysUntilExpiry?: number
    issuer?: string
    isValid?: boolean
  }
  mkcertInstalled: boolean
  trustInstalled: boolean
}

/**
 * GET /api/config/ssl
 * Returns the current SSL configuration status
 */
export async function GET(): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()
    const status: SSLStatus = {
      mode: 'none',
      configured: false,
      certificates: {
        exists: false,
      },
      mkcertInstalled: false,
      trustInstalled: false,
    }

    // Check if mkcert is installed
    try {
      await execFileAsync('which', ['mkcert'])
      status.mkcertInstalled = true
    } catch {
      status.mkcertInstalled = false
    }

    // Read SSL_MODE from .env file
    const envPath = path.join(projectPath, '.env')
    try {
      const envContent = await fs.readFile(envPath, 'utf-8')
      const sslModeMatch = envContent.match(/^SSL_MODE=(.+)$/m)
      if (sslModeMatch) {
        const mode = sslModeMatch[1].trim().toLowerCase()
        if (mode === 'local' || mode === 'letsencrypt') {
          status.mode = mode
          status.configured = true
        }
      }
    } catch {
      // No .env file or can't read it
    }

    // Check for certificate files
    const certPaths = [
      path.join(projectPath, 'nginx', 'ssl', 'localhost', 'fullchain.pem'),
      path.join(projectPath, 'nginx', 'ssl', 'fullchain.pem'),
      path.join(projectPath, 'certs', 'localhost', 'fullchain.pem'),
    ]

    for (const certPath of certPaths) {
      try {
        await fs.access(certPath)
        status.certificates.exists = true

        // Try to get certificate info using openssl
        try {
          const { stdout } = await execFileAsync('openssl', [
            'x509',
            '-in',
            certPath,
            '-noout',
            '-enddate',
            '-issuer',
            '-subject',
          ])

          // Parse expiry date
          const expiryMatch = stdout.match(/notAfter=(.+)/)
          if (expiryMatch) {
            const expiryDate = new Date(expiryMatch[1])
            status.certificates.expiresAt = expiryDate.toISOString()
            const now = new Date()
            const daysUntil = Math.floor(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            )
            status.certificates.daysUntilExpiry = daysUntil
            status.certificates.isValid = daysUntil > 0
          }

          // Parse issuer
          const issuerMatch = stdout.match(/issuer=(.+)/)
          if (issuerMatch) {
            status.certificates.issuer = issuerMatch[1].trim()
          }

          // Parse subject/domain
          const subjectMatch = stdout.match(/subject=.*CN\s*=\s*([^,\n]+)/)
          if (subjectMatch) {
            status.certificates.domain = subjectMatch[1].trim()
          }
        } catch {
          // openssl not available or cert parsing failed
        }

        break // Found a certificate
      } catch {
        // Certificate file doesn't exist at this path
      }
    }

    // Check if trust is installed (by looking for mkcert CAROOT)
    if (status.mkcertInstalled) {
      try {
        const { stdout } = await execFileAsync('mkcert', ['-CAROOT'])
        const caRoot = stdout.trim()
        const rootCertPath = path.join(caRoot, 'rootCA.pem')
        await fs.access(rootCertPath)
        status.trustInstalled = true
      } catch {
        status.trustInstalled = false
      }
    }

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    console.error('SSL status error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get SSL status',
      },
      { status: 500 },
    )
  }
}
