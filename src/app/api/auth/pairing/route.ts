/**
 * Main pairing API route.
 *
 * GET  → Initiates OAuth pairing: generates sessionId + state, opens the
 *         browser server-side, returns { sessionId, state, oauthUrl }.
 * DELETE → Revokes the current session: clears the OS keychain server-side.
 */

import type { PairingInitResponse } from '@/features/auth/types'
import { execFile } from 'child_process'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'
import { sessionStore } from '../_store/sessions'

const execFileAsync = promisify(execFile)

const KEYCHAIN_SERVICE = 'nself-admin'
const KEYCHAIN_ACCOUNT = 'nself-auth-token'
const NSELF_ORG_BASE = 'https://nself.org'

function detectPlatform(): 'macos' | 'linux' | 'unsupported' {
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'linux') return 'linux'
  return 'unsupported'
}

async function openBrowser(url: string): Promise<void> {
  const platform = detectPlatform()

  if (platform === 'macos') {
    await execFileAsync('open', [url])
  } else if (platform === 'linux') {
    await execFileAsync('xdg-open', [url])
  } else {
    throw new Error(
      `Unsupported platform for browser open: ${process.platform}`,
    )
  }
}

async function clearKeychainServerSide(): Promise<void> {
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
    const sessionId = crypto.randomBytes(16).toString('hex')
    const state = crypto.randomBytes(32).toString('hex')
    const oauthUrl = `${NSELF_ORG_BASE}/oauth/pair?session=${sessionId}&state=${state}`

    // Register session as pending before opening the browser
    sessionStore.set(sessionId, {
      state,
      status: 'pending',
      createdAt: Date.now(),
    })

    try {
      await openBrowser(oauthUrl)
    } catch (err) {
      sessionStore.delete(sessionId)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to open browser',
          details: err instanceof Error ? err.message : String(err),
        },
        { status: 500 },
      )
    }

    const body: PairingInitResponse = { sessionId, state, oauthUrl }
    return NextResponse.json(body)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initiate pairing',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: NextRequest): Promise<NextResponse> {
  try {
    await clearKeychainServerSide()
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
