import * as dashboardsApi from '@/lib/dashboards'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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

    const dashboard = await dashboardsApi.getDashboard(id)

    if (!dashboard) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dashboard not found',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      dashboard,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch dashboard',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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
    const dashboard = await dashboardsApi.updateDashboard(id, body)

    if (!dashboard) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dashboard not found',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      dashboard,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update dashboard',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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

    const deleted = await dashboardsApi.deleteDashboard(id)

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dashboard not found',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Dashboard deleted successfully',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete dashboard',
      },
      { status: 500 },
    )
  }
}
