import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Input validation patterns
const VALID_DOMAIN = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_ACTION = /^[a-z]+$/i
const VALID_SECRET_NAME = /^[A-Z][A-Z0-9_]*$/
const VALID_SSL_ACTION = /^(status|request|renew|self-signed)$/
const VALID_FIREWALL_ACTION = /^(status|configure|allow|block)$/
const VALID_SECRET_ACTION = /^(show|generate|rotate)$/
const VALID_PORT = /^\d{1,5}$/
const VALID_PROTOCOL = /^(tcp|udp)$/i

function validateInput(
  value: string | undefined,
  pattern: RegExp,
  name: string,
): string | null {
  if (!value) return null
  if (!pattern.test(value)) {
    throw new Error(`Invalid ${name}: contains disallowed characters`)
  }
  return value
}

// GET /api/deploy/production - Get production status
export async function GET(): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    if (!nselfPath) {
      return NextResponse.json(
        { success: false, error: 'nself CLI not found' },
        { status: 500 },
      )
    }

    try {
      const { stdout, stderr } = await execFileAsync(
        nselfPath,
        ['prod', 'status'],
        {
          cwd: projectPath,
          env: { ...process.env, PATH: getEnhancedPath() },
          timeout: 30000,
        },
      )

      return NextResponse.json({
        success: true,
        status: stdout.trim(),
        stderr: stderr.trim(),
      })
    } catch (error) {
      const execError = error as { stdout?: string; stderr?: string }
      return NextResponse.json({
        success: true,
        status: 'not-configured',
        output: execError.stdout || '',
        stderr: execError.stderr || '',
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get production status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// POST /api/deploy/production - Execute production commands
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action, options = {} } = body
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    if (!nselfPath) {
      return NextResponse.json(
        { success: false, error: 'nself CLI not found' },
        { status: 500 },
      )
    }

    // Validate action
    if (!action || !VALID_ACTION.test(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 },
      )
    }

    // Build args array safely
    const args: string[] = []

    switch (action) {
      case 'init': {
        // nself prod init <domain> [--email <email>]
        const domain = validateInput(options.domain, VALID_DOMAIN, 'domain')
        if (!domain) {
          return NextResponse.json(
            { success: false, error: 'Domain is required for init' },
            { status: 400 },
          )
        }
        args.push('prod', 'init', domain)
        const email = validateInput(options.email, VALID_EMAIL, 'email')
        if (email) {
          args.push('--email', email)
        }
        break
      }

      case 'check':
      case 'audit':
        // nself prod check [--verbose]
        args.push('prod', 'check')
        if (options.verbose === true) {
          args.push('--verbose')
        }
        break

      case 'secrets': {
        // nself prod secrets <action> [options]
        const secretAction = validateInput(
          options.secretAction || 'show',
          VALID_SECRET_ACTION,
          'secret action',
        )
        if (!secretAction) {
          return NextResponse.json(
            { success: false, error: 'Invalid secret action' },
            { status: 400 },
          )
        }

        args.push('prod', 'secrets', secretAction)

        if (secretAction === 'generate' && options.force === true) {
          args.push('--force')
        }
        if (secretAction === 'rotate') {
          const secretName = validateInput(
            options.secretName,
            VALID_SECRET_NAME,
            'secret name',
          )
          if (secretName) {
            args.push(secretName)
          }
        }
        if (secretAction === 'show' && options.unmask === true) {
          args.push('--unmask')
        }
        break
      }

      case 'ssl': {
        // nself prod ssl <action> [options]
        const sslAction = validateInput(
          options.sslAction || 'status',
          VALID_SSL_ACTION,
          'SSL action',
        )
        if (!sslAction) {
          return NextResponse.json(
            { success: false, error: 'Invalid SSL action' },
            { status: 400 },
          )
        }

        args.push('prod', 'ssl', sslAction)

        if (sslAction === 'request') {
          const domain = validateInput(options.domain, VALID_DOMAIN, 'domain')
          if (domain) {
            args.push(domain)
          }
          const email = validateInput(options.email, VALID_EMAIL, 'email')
          if (email) {
            args.push('--email', email)
          }
          if (options.staging === true) {
            args.push('--staging')
          }
        }
        if (sslAction === 'renew' && options.force === true) {
          args.push('--force')
        }
        if (sslAction === 'self-signed') {
          const domain = validateInput(options.domain, VALID_DOMAIN, 'domain')
          if (domain) {
            args.push(domain)
          }
        }
        break
      }

      case 'firewall': {
        // nself prod firewall <action> [options]
        const fwAction = validateInput(
          options.firewallAction || 'status',
          VALID_FIREWALL_ACTION,
          'firewall action',
        )
        if (!fwAction) {
          return NextResponse.json(
            { success: false, error: 'Invalid firewall action' },
            { status: 400 },
          )
        }

        args.push('prod', 'firewall', fwAction)

        if (fwAction === 'configure' && options.dryRun === true) {
          args.push('--dry-run')
        }
        if ((fwAction === 'allow' || fwAction === 'block') && options.port) {
          const port = validateInput(
            options.port?.toString(),
            VALID_PORT,
            'port',
          )
          if (port && parseInt(port) > 0 && parseInt(port) <= 65535) {
            args.push(port)
          }
          if (fwAction === 'allow' && options.protocol) {
            const protocol = validateInput(
              options.protocol,
              VALID_PROTOCOL,
              'protocol',
            )
            if (protocol) {
              args.push(protocol)
            }
          }
        }
        break
      }

      case 'harden':
        // nself prod harden [--dry-run] [--skip-firewall]
        args.push('prod', 'harden')
        if (options.dryRun === true) {
          args.push('--dry-run')
        }
        if (options.skipFirewall === true) {
          args.push('--skip-firewall')
        }
        break

      case 'deploy':
        // nself deploy prod [options]
        args.push('deploy', 'prod')
        if (options.dryRun === true) {
          args.push('--dry-run')
        }
        if (options.force === true) {
          args.push('--force')
        }
        if (options.rolling === true) {
          args.push('--rolling')
        }
        if (options.skipHealth === true) {
          args.push('--skip-health')
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }

    const { stdout, stderr } = await execFileAsync(nselfPath, args, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 300000, // 5 minute timeout
    })

    return NextResponse.json({
      success: true,
      action,
      output: stdout.trim(),
      stderr: stderr.trim(),
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Production action failed',
        details: execError.message || 'Unknown error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
