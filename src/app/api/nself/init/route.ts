import { nselfInit } from '@/lib/nselfCLI'
import { getProjectPath } from '@/lib/paths'
import { requireAuth } from '@/lib/require-auth'
import { basename } from 'path'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    // Derive projectName server-side from the actual project path (ADM-T03).
    // The client-supplied value is ignored — basename(getProjectPath()) is authoritative.
    await request.json().catch(() => ({})) // consume body to avoid connection leak
    const projectPath = getProjectPath()
    const _projectName = basename(projectPath) || 'my_project'

    // Run nself init --full using secure CLI wrapper

    const result = await nselfInit({ full: true })

    if (!result.success) {
      // Check if it's just because files already exist
      const errorMsg = result.error || result.stderr || ''
      if (errorMsg.includes('already exists') || errorMsg.includes('.env')) {
        return NextResponse.json({
          success: true,
          message: 'Project already initialized',
          output: result.stdout || '',
        })
      }

      return NextResponse.json(
        {
          error: 'Failed to initialize project',
          details: errorMsg || 'Unknown error',
          output: result.stdout,
        },
        { status: 500 },
      )
    }

    if (result.stderr && !result.stderr.includes('warning')) {
      console.error('Init stderr:', result.stderr)
    }

    return NextResponse.json({
      success: true,
      message: 'Project initialized successfully',
      output: result.stdout || '',
    })
  } catch (error) {
    console.error('Error initializing project:', error)
    return NextResponse.json(
      {
        error: 'Failed to initialize project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
