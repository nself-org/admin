import * as reports from '@/lib/reports'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/reports/schedules/[id] - Get a single schedule
export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params
    const schedule = await reports.getScheduleById(id)
    if (!schedule) {
      return NextResponse.json(
        { success: false, error: 'Schedule not found' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      data: schedule,
    })
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get schedule',
      },
      { status: statusCode },
    )
  }
}

// PATCH /api/reports/schedules/[id] - Update a schedule
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = await request.json()

    // Validate frequency if provided
    if (body.frequency) {
      const validFrequencies = ['once', 'hourly', 'daily', 'weekly', 'monthly']
      if (!validFrequencies.includes(body.frequency)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`,
          },
          { status: 400 },
        )
      }
    }

    // Validate format if provided
    if (body.format) {
      const validFormats = ['pdf', 'excel', 'csv', 'json', 'html']
      if (!validFormats.includes(body.format)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
          },
          { status: 400 },
        )
      }
    }

    const schedule = await reports.updateSchedule(id, {
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      time: body.time,
      timezone: body.timezone,
      format: body.format,
      recipients: body.recipients,
      enabled: body.enabled,
    })

    return NextResponse.json({
      success: true,
      data: schedule,
    })
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update schedule',
      },
      { status: statusCode },
    )
  }
}

// DELETE /api/reports/schedules/[id] - Delete a schedule
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await context.params

    await reports.deleteSchedule(id)

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully',
    })
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes('not found') ? 404 : 500
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete schedule',
      },
      { status: statusCode },
    )
  }
}
