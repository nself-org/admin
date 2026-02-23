import * as reports from '@/lib/reports'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/reports/executions/[id]/download - Download report file
export async function GET(_request: NextRequest, context: RouteContext): Promise<Response | NextResponse> {
  try {
    const { id } = await context.params

    // Get execution to verify it exists and is completed
    const execution = await reports.getExecutionById(id)
    if (!execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 },
      )
    }

    if (execution.status !== 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: `Report is not ready for download. Current status: ${execution.status}`,
        },
        { status: 400 },
      )
    }

    // Check if report has expired
    if (execution.expiresAt && new Date(execution.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Report has expired' },
        { status: 410 },
      )
    }

    // Get the file data
    const file = await reports.getExecutionFile(id)

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 },
      )
    }

    // Return the file with proper headers
    // Create a ReadableStream from the Uint8Array for Response compatibility
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(file.data)
        controller.close()
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Content-Length': file.data.byteLength.toString(),
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to download report',
      },
      { status: 500 },
    )
  }
}
