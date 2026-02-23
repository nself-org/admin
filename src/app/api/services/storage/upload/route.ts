import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { filePath, bucket, destination } = body as {
      filePath?: string
      bucket?: string
      destination?: string
    }

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: 'File path is required' },
        { status: 400 },
      )
    }

    if (!bucket) {
      return NextResponse.json(
        { success: false, error: 'Bucket name is required' },
        { status: 400 },
      )
    }

    // Validate bucket name format
    if (!/^[a-zA-Z0-9._-]+$/.test(bucket)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid bucket name. Only letters, numbers, dots, hyphens, and underscores are allowed.',
        },
        { status: 400 },
      )
    }

    const args = [
      'storage',
      'upload',
      `--file=${filePath}`,
      `--bucket=${bucket}`,
    ]
    if (destination) {
      args.push(`--destination=${destination}`)
    }

    const result = await executeNselfCommand('service', args)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to upload file',
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
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
