import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { requireAuth } from '@/lib/require-auth'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface GithubRelease {
  tag_name: string
  name: string
  body: string
  published_at: string
  html_url: string
}

interface UpdateInfo {
  currentVersion: string
  latestVersion: string
  upToDate: boolean
  releaseNotes?: string
  releaseUrl?: string
  publishedAt?: string
}

function normalizeVersion(v: string): string {
  return v.startsWith('v') ? v : `v${v}`
}

function compareVersions(current: string, latest: string): boolean {
  const normalize = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [ca, cb, cc] = normalize(current)
  const [la, lb, lc] = normalize(latest)
  if (ca !== la) return ca >= la
  if (cb !== lb) return cb >= lb
  return cc >= lc
}

export async function GET(): Promise<NextResponse> {
  try {
    const nselfCommand = await findNselfPath()

    // Get current version
    const { stdout: versionOut } = await execAsync(`${nselfCommand} --version`, {
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 5000,
    })

    const currentRaw = versionOut.match(/(v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*)/)
    const currentVersion = currentRaw ? normalizeVersion(currentRaw[1]) : 'unknown'

    // Fetch latest GitHub release
    let latestVersion = currentVersion
    let releaseNotes: string | undefined
    let releaseUrl: string | undefined
    let publishedAt: string | undefined

    try {
      const ghRes = await fetch(
        'https://api.github.com/repos/nself-org/cli/releases/latest',
        {
          headers: { 'User-Agent': 'nself-admin/1.0' },
          signal: AbortSignal.timeout(8000),
        },
      )
      if (ghRes.ok) {
        const release: GithubRelease = await ghRes.json()
        latestVersion = normalizeVersion(release.tag_name)
        releaseNotes = release.body
        releaseUrl = release.html_url
        publishedAt = release.published_at
      }
    } catch {
      // GitHub unreachable — report what we know
    }

    const upToDate = compareVersions(currentVersion, latestVersion)

    const info: UpdateInfo = {
      currentVersion,
      latestVersion,
      upToDate,
      releaseNotes,
      releaseUrl,
      publishedAt,
    }

    return NextResponse.json(info)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check updates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json().catch(() => ({}))
    const action: string = body?.action ?? ''

    if (action !== 'update') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const nselfCommand = await findNselfPath()

    const { stdout, stderr } = await execAsync(`${nselfCommand} update`, {
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 120000, // updates can take time
    })

    return NextResponse.json({ success: true, output: stdout || stderr })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Update failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
