import * as dashboardsApi from '@/lib/dashboards'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string; widgetId: string }>
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id, widgetId } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dashboard ID is required',
        },
        { status: 400 },
      )
    }

    if (!widgetId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Widget ID is required',
        },
        { status: 400 },
      )
    }

    const body = await request.json()
    const widget = await dashboardsApi.updateWidget(id, widgetId, body)

    if (!widget) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dashboard or widget not found',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      widget,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update widget',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const { id, widgetId } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dashboard ID is required',
        },
        { status: 400 },
      )
    }

    if (!widgetId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Widget ID is required',
        },
        { status: 400 },
      )
    }

    const deleted = await dashboardsApi.deleteWidget(id, widgetId)

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dashboard or widget not found',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Widget deleted successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete widget',
      },
      { status: 500 },
    )
  }
}
