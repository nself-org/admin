import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

// ── Types ──────────────────────────────────────────────────────────────────────

interface User {
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'invited' | 'suspended'
  mfaEnabled: boolean
  joinedAt: string | null
}

// ── Validation helpers ─────────────────────────────────────────────────────────

const VALID_ROLES = ['owner', 'admin', 'member', 'viewer'] as const
const VALID_ACTIONS = ['role', 'mfa-reset', 'resend'] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && EMAIL_RE.test(email)
}

function isValidRole(role: unknown): role is (typeof VALID_ROLES)[number] {
  return (
    typeof role === 'string' &&
    (VALID_ROLES as readonly string[]).includes(role)
  )
}

function isValidAction(
  action: unknown,
): action is (typeof VALID_ACTIONS)[number] {
  return (
    typeof action === 'string' &&
    (VALID_ACTIONS as readonly string[]).includes(action)
  )
}

// ── GET — list users ───────────────────────────────────────────────────────────

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('user', ['list', '--json'])

    if (!result.success) {
      return NextResponse.json({
        success: true,
        data: [] as User[],
        message:
          'No user data available — nself user command may not be configured.',
      })
    }

    let users: User[] = []
    try {
      const parsed = JSON.parse(result.stdout ?? '[]')
      users = Array.isArray(parsed) ? (parsed as User[]) : []
    } catch {
      users = []
    }

    return NextResponse.json({ success: true, data: users })
  } catch {
    return NextResponse.json({
      success: true,
      data: [] as User[],
      message: 'Could not reach nself CLI.',
    })
  }
}

// ── POST — invite user ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const { email, role } = body as { email?: unknown; role?: unknown }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { success: false, error: 'A valid email address is required' },
      { status: 400 },
    )
  }

  if (!isValidRole(role)) {
    return NextResponse.json(
      {
        success: false,
        error: `Role must be one of: ${VALID_ROLES.join(', ')}`,
      },
      { status: 400 },
    )
  }

  const result = await executeNselfCommand('user', [
    'invite',
    '--email',
    email,
    '--role',
    role,
  ])

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send invite',
        details: result.error ?? result.stderr,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    data: { invited: email, role, output: result.stdout },
  })
}

// ── PATCH — update role or reset MFA or resend invite ─────────────────────────

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const { email, action, role } = body as {
    email?: unknown
    action?: unknown
    role?: unknown
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { success: false, error: 'A valid email address is required' },
      { status: 400 },
    )
  }

  if (!isValidAction(action)) {
    return NextResponse.json(
      {
        success: false,
        error: `Action must be one of: ${VALID_ACTIONS.join(', ')}`,
      },
      { status: 400 },
    )
  }

  if (action === 'role') {
    if (!isValidRole(role)) {
      return NextResponse.json(
        {
          success: false,
          error: `Role must be one of: ${VALID_ROLES.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('user', [
      'role',
      '--email',
      email,
      '--role',
      role,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update role',
          details: result.error ?? result.stderr,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { updated: email, role, output: result.stdout },
    })
  }

  if (action === 'mfa-reset') {
    const result = await executeNselfCommand('user', [
      'mfa-reset',
      '--email',
      email,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to reset MFA',
          details: result.error ?? result.stderr,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { mfaReset: email, output: result.stdout },
    })
  }

  // action === 'resend'
  const result = await executeNselfCommand('user', [
    'invite',
    '--email',
    email,
    '--resend',
  ])

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to resend invite',
        details: result.error ?? result.stderr,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    data: { resent: email, output: result.stdout },
  })
}

// ── DELETE — remove user ───────────────────────────────────────────────────────

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    )
  }

  const { email } = body as { email?: unknown }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { success: false, error: 'A valid email address is required' },
      { status: 400 },
    )
  }

  const result = await executeNselfCommand('user', ['remove', '--email', email])

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove user',
        details: result.error ?? result.stderr,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    data: { removed: email, output: result.stdout },
  })
}
