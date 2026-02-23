import * as reports from '@/lib/reports'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/reports/schedules - List all report schedules
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json(
        { success: false, error: 'reportId is required' },
        { status: 400 },
      )
    }

    const schedules = await reports.getSchedules(reportId)

    return NextResponse.json({
      success: true,
      data: schedules,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to list schedules',
      },
      { status: 500 },
    )
  }
}

// POST /api/reports/schedules - Create a new schedule
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.reportId) {
      return NextResponse.json(
        { success: false, error: 'reportId is required' },
        { status: 400 },
      )
    }
    if (!body.frequency) {
      return NextResponse.json(
        { success: false, error: 'frequency is required' },
        { status: 400 },
      )
    }
    if (!body.time) {
      return NextResponse.json(
        { success: false, error: 'time is required' },
        { status: 400 },
      )
    }
    if (!body.timezone) {
      return NextResponse.json(
        { success: false, error: 'timezone is required' },
        { status: 400 },
      )
    }
    if (!body.format) {
      return NextResponse.json(
        { success: false, error: 'format is required' },
        { status: 400 },
      )
    }
    if (!body.recipients || !Array.isArray(body.recipients)) {
      return NextResponse.json(
        { success: false, error: 'recipients array is required' },
        { status: 400 },
      )
    }

    // Validate frequency
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

    // Validate format
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

    // Validate weekly schedule has dayOfWeek
    if (body.frequency === 'weekly' && body.dayOfWeek === undefined) {
      return NextResponse.json(
        { success: false, error: 'dayOfWeek is required for weekly schedules' },
        { status: 400 },
      )
    }

    // Validate monthly schedule has dayOfMonth
    if (body.frequency === 'monthly' && body.dayOfMonth === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'dayOfMonth is required for monthly schedules',
        },
        { status: 400 },
      )
    }

    const schedule = await reports.createSchedule(body.reportId, {
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      time: body.time,
      timezone: body.timezone,
      format: body.format,
      recipients: body.recipients,
      enabled: body.enabled !== false, // Default to enabled
    })

    return NextResponse.json(
      {
        success: true,
        data: schedule,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create schedule',
      },
      { status: 500 },
    )
  }
}
