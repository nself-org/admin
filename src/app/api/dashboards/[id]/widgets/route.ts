import * as dashboardsApi from '@/lib/dashboards'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dashboard ID is required',
        },
        { status: 400 },
      )
    }

    const body = await request.json()

    // Validate required widget fields
    if (!body.type || typeof body.type !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Widget type is required',
        },
        { status: 400 },
      )
    }

    if (!body.position || typeof body.position !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Widget position is required',
        },
        { status: 400 },
      )
    }

    if (!body.config || typeof body.config !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Widget config is required',
        },
        { status: 400 },
      )
    }

    const widget = await dashboardsApi.addWidget(id, {
      type: body.type,
      position: body.position,
      config: body.config,
    })

    if (!widget) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dashboard not found',
        },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        widget,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add widget',
      },
      { status: 500 },
    )
  }
}
