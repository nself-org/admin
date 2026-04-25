import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

interface DeployBody {
  /** Path to the function file or directory (relative to project root). */
  path: string
  /** Optional function name override. */
  name?: string
  /** Runtime: node | deno | python */
  runtime?: string
}

/**
 * POST /api/services/functions/deploy
 * Body: { path: string, name?: string, runtime?: string }
 * Deploys a function via `nself functions deploy <path> [--name] [--runtime]`
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<DeployBody>
    const { path, name, runtime } = body

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field: path' },
        { status: 400 },
      )
    }

    // Sanitize: reject path traversal and shell injection.
    if (path.includes('..') || /[;&|`$]/.test(path)) {
      return NextResponse.json(
        { success: false, error: 'Invalid path' },
        { status: 400 },
      )
    }

    const args: string[] = [path]
    if (name) {
      // Validate name: lowercase alphanumeric + hyphens only.
      if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
        return NextResponse.json(
          { success: false, error: 'Invalid function name' },
          { status: 400 },
        )
      }
      args.push('--name', name)
    }
    if (runtime) {
      if (!['node', 'deno', 'python'].includes(runtime)) {
        return NextResponse.json(
          { success: false, error: 'Invalid runtime (node|deno|python)' },
          { status: 400 },
        )
      }
      args.push('--runtime', runtime)
    }

    const result = await executeNselfCommand('functions', ['deploy', ...args])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to deploy function',
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
        error: 'Failed to deploy function',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
