import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const {
      to,
      subject,
      body: emailBody,
      template,
      from,
    } = body as {
      to?: string
      subject?: string
      body?: string
      template?: string
      from?: string
    }

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Recipient email address is required' },
        { status: 400 },
      )
    }

    if (!subject) {
      return NextResponse.json(
        { success: false, error: 'Email subject is required' },
        { status: 400 },
      )
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address format' },
        { status: 400 },
      )
    }

    const args = ['email', 'send', `--to=${to}`, `--subject=${subject}`]
    if (emailBody) {
      args.push(`--body=${emailBody}`)
    }
    if (template) {
      args.push(`--template=${template}`)
    }
    if (from) {
      args.push(`--from=${from}`)
    }

    const result = await executeNselfCommand('service', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
