import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { projectId, serviceAccountKey } = await request.json()

    if (!projectId || !serviceAccountKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      )
    }

    // Validate JSON format
    try {
      JSON.parse(serviceAccountKey)
    } catch (_error) {
      return NextResponse.json(
        { success: false, error: 'Invalid service account key JSON' },
        { status: 400 },
      )
    }

    // Mock connection - in production, this would validate GCP credentials
    // and store them securely

    return NextResponse.json({
      success: true,
      message: 'Connected to GCP successfully',
      projectId,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to GCP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
