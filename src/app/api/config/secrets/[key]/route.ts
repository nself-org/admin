import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/config/secrets/[key]
 * Get a specific secret by wrapping `nself config secrets get [key]`
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  try {
    const { key } = await params

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key is required' },
        { status: 400 },
      )
    }

    // Validate key format to prevent CLI flag injection
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) {
      return NextResponse.json(
        { success: false, error: 'Invalid key format' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('config', ['secrets', 'get', key])

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          key,
          value: result.stdout?.trim() || '',
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: `Secret '${key}' not found`,
        details: result.stderr || result.error || 'Unknown error',
      },
      { status: 404 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get secret',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/config/secrets/[key]
 * Delete a secret by wrapping `nself config secrets delete [key]`
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
): Promise<NextResponse> {
  try {
    const { key } = await params

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Key is required' },
        { status: 400 },
      )
    }

    // Validate key format to prevent CLI flag injection
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key)) {
      return NextResponse.json(
        { success: false, error: 'Invalid key format' },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('config', [
      'secrets',
      'delete',
      key,
    ])

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          message: `Secret '${key}' deleted successfully`,
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: `Failed to delete secret '${key}'`,
        details: result.stderr || result.error || 'Unknown error',
      },
      { status: 500 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete secret',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
