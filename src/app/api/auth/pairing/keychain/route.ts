/**
 * OS keychain route (server-side only).
 *
 * GET    → Retrieve AuthToken from the OS keychain.
 * POST   → Store AuthToken in the OS keychain.
 * DELETE → Clear the stored token from the OS keychain.
 *
 * Token values are base64-encoded before passing to shell commands to avoid
 * any shell-escaping issues with embedded quotes or special characters.
 *
 * macOS:  uses `security` (Keychain Services CLI)
 * Linux:  uses `secret-tool` (libsecret / GNOME Keyring)
 */

import type { AuthToken } from '@/features/auth/types'
import { execFile, spawn } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const KEYCHAIN_SERVICE = 'nself-admin'
const KEYCHAIN_ACCOUNT = 'nself-auth-token'
const KEYCHAIN_LABEL = 'nSelf Admin Auth'

function detectPlatform(): 'macos' | 'linux' | 'unsupported' {
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'linux') return 'linux'
  return 'unsupported'
}

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

async function retrieveFromKeychain(): Promise<AuthToken | null> {
  const platform = detectPlatform()

  try {
    let raw: string

    if (platform === 'macos') {
      const { stdout } = await execFileAsync('security', [
        'find-generic-password',
        '-s',
        KEYCHAIN_SERVICE,
        '-a',
        KEYCHAIN_ACCOUNT,
        '-w',
      ])
      raw = stdout.trim()
    } else if (platform === 'linux') {
      const { stdout } = await execFileAsync('secret-tool', [
        'lookup',
        'service',
        KEYCHAIN_SERVICE,
        'account',
        KEYCHAIN_ACCOUNT,
      ])
      raw = stdout.trim()
    } else {
      return null
    }

    if (!raw) return null

    // Decode from base64 then parse JSON
    const json = Buffer.from(raw, 'base64').toString('utf8')
    return JSON.parse(json) as AuthToken
  } catch {
    // Not found or parse error — treat as no token stored
    return null
  }
}

async function storeInKeychain(token: AuthToken): Promise<void> {
  const platform = detectPlatform()
  // Base64-encode to avoid shell-escaping issues with embedded quotes / special chars
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

async function clearFromKeychain(): Promise<void> {
  const platform = detectPlatform()

  try {
    if (platform === 'macos') {
      await execFileAsync('security', [
        'delete-generic-password',
        '-s',
        KEYCHAIN_SERVICE,
        '-a',
        KEYCHAIN_ACCOUNT,
      ])
    } else if (platform === 'linux') {
      await execFileAsync('secret-tool', [
        'clear',
        'service',
        KEYCHAIN_SERVICE,
        'account',
        KEYCHAIN_ACCOUNT,
      ])
    }
    // Unsupported platform: no-op — nothing to clear
  } catch {
    // Item may not exist; ignore deletion errors
  }
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const token = await retrieveFromKeychain()
    return NextResponse.json({ token })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve token from keychain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json().catch(() => null)) as {
      token?: AuthToken
    } | null

    if (!body?.token) {
      return NextResponse.json(
        { success: false, error: 'Request body must include a token object' },
        { status: 400 },
      )
    }

    await storeInKeychain(body.token)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to store token in keychain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: NextRequest): Promise<NextResponse> {
  try {
    await clearFromKeychain()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear keychain',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
