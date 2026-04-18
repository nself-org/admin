/**
 * Token refresh route.
 *
 * POST { refreshToken: string } → forwards to nself.org, stores the new
 * token in the OS keychain server-side, returns { token: AuthToken }.
 */

import type { AuthToken } from '@/features/auth/types'
import { execFile, spawn } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Runs a command and pipes `stdinData` to its stdin.
 * Used for `secret-tool store` which reads the password from stdin.
 */
function spawnWithStdin(
  cmd: string,
  args: string[],
  stdinData: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args)
    let stderr = ''

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('error', (err) => reject(err))
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(`${cmd} exited with code ${code ?? 'null'}: ${stderr}`),
        )
      } else {
        resolve()
      }
    })

    proc.stdin?.write(stdinData)
    proc.stdin?.end()
  })
}

const NSELF_ORG_REFRESH = 'https://nself.org/api/auth/refresh'
const KEYCHAIN_SERVICE = 'nself-admin'
const KEYCHAIN_ACCOUNT = 'nself-auth-token'
const KEYCHAIN_LABEL = 'nSelf Admin Auth'

function detectPlatform(): 'macos' | 'linux' | 'unsupported' {
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'linux') return 'linux'
  return 'unsupported'
}

async function storeInKeychain(token: AuthToken): Promise<void> {
  const platform = detectPlatform()
  // Base64-encode to avoid shell-escaping issues
  const encoded = Buffer.from(JSON.stringify(token)).toString('base64')

  if (platform === 'macos') {
    // Delete any existing entry first (ignore errors if not found)
    try {
      await execFileAsync('security', [
        'delete-generic-password',
        '-s',
        KEYCHAIN_SERVICE,
        '-a',
        KEYCHAIN_ACCOUNT,
      ])
    } catch {
      // Not found — that's fine
    }
    await execFileAsync('security', [
      'add-generic-password',
      '-s',
      KEYCHAIN_SERVICE,
      '-a',
      KEYCHAIN_ACCOUNT,
      '-l',
      KEYCHAIN_LABEL,
      '-w',
      encoded,
    ])
  } else if (platform === 'linux') {
    // secret-tool reads the password from stdin
    await spawnWithStdin(
      'secret-tool',
      [
        'store',
        '--label',
        KEYCHAIN_LABEL,
        'service',
        KEYCHAIN_SERVICE,
        'account',
        KEYCHAIN_ACCOUNT,
      ],
      encoded,
    )
  } else {
    throw new Error(
      `Keychain storage not supported on this platform: ${process.platform}`,
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => null)) as {
      refreshToken?: string
    } | null

    if (!body?.refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Request body must include refreshToken' },
        { status: 400 },
      )
    }

    let refreshResponse: Response
    try {
      refreshResponse = await fetch(NSELF_ORG_REFRESH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: body.refreshToken }),
      })
    } catch (err) {
      return NextResponse.json(
        {
          success: false,
          error: 'Network error contacting nself.org',
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 502 },
      )
    }

    if (!refreshResponse.ok) {
      const text = await refreshResponse.text().catch(() => '')
      return NextResponse.json(
        {
          success: false,
          error: `nself.org refresh returned ${refreshResponse.status}`,
          details: text,
        },
        { status: refreshResponse.status },
      )
    }

    const data = (await refreshResponse.json()) as { token: AuthToken }
    const newToken = data.token

    await storeInKeychain(newToken)

    return NextResponse.json({ token: newToken })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Token refresh failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
