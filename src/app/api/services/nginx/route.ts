import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface NginxRoute {
  server: string
  upstream: string
  ssl: boolean
}

export interface NginxSSLCert {
  domain: string
  expiry: string
  issuer: string
  daysRemaining: number
}

export interface NginxServiceData {
  status: 'healthy' | 'unhealthy' | 'offline' | 'unknown'
  version: string
  routes: NginxRoute[]
  sslCerts: NginxSSLCert[]
  confDFiles: string[]
  error?: string
}

async function runCLI(args: string[]): Promise<string> {
  const { stdout } = await execAsync(['nself', ...args].join(' '), {
    timeout: 10_000,
  })
  return stdout.trim()
}

export async function GET(): Promise<NextResponse> {
  try {
    // Parallel: fetch URLs (routes) + SSL status.
    const [urlsRaw, sslRaw] = await Promise.allSettled([
      runCLI(['urls', '--json']),
      runCLI(['ssl', 'status', '--json']),
    ])

    let routes: NginxRoute[] = []
    if (urlsRaw.status === 'fulfilled') {
      try {
        const parsed = JSON.parse(urlsRaw.value)
        const entries = Array.isArray(parsed) ? parsed : parsed?.urls ?? []
        routes = entries.map(
          (e: { domain?: string; upstream?: string; ssl?: boolean }) => ({
            server: e.domain ?? '',
            upstream: e.upstream ?? '',
            ssl: e.ssl ?? false,
          }),
        )
      } catch {
        // Non-fatal — empty routes is acceptable.
      }
    }

    let sslCerts: NginxSSLCert[] = []
    if (sslRaw.status === 'fulfilled') {
      try {
        const parsed = JSON.parse(sslRaw.value)
        const certs = Array.isArray(parsed) ? parsed : parsed?.certs ?? []
        sslCerts = certs.map(
          (c: {
            domain?: string
            expiry?: string
            issuer?: string
            days_remaining?: number
          }) => ({
            domain: c.domain ?? '',
            expiry: c.expiry ?? '',
            issuer: c.issuer ?? '',
            daysRemaining: c.days_remaining ?? 0,
          }),
        )
      } catch {
        // Non-fatal.
      }
    }

    // Fetch conf.d file list (best-effort).
    let confDFiles: string[] = []
    try {
      const { stdout } = await execAsync(
        'ls ./nginx/conf.d/ 2>/dev/null || true',
        { timeout: 5_000 },
      )
      confDFiles = stdout
        .trim()
        .split('\n')
        .filter((f) => f.endsWith('.conf'))
    } catch {
      // Non-fatal.
    }

    const data: NginxServiceData = {
      status: routes.length > 0 ? 'healthy' : 'unknown',
      version: 'latest',
      routes,
      sslCerts,
      confDFiles,
    }

    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const data: NginxServiceData = {
      status: 'offline',
      version: '',
      routes: [],
      sslCerts: [],
      confDFiles: [],
      error: message,
    }
    return NextResponse.json(data, { status: 503 })
  }
}
