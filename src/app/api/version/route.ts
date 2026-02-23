import { autoUpdater } from '@/lib/updater'
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const versionInfo = await autoUpdater.getLatestVersion()
    const githubInfo = await autoUpdater.checkGitHubReleases()

    return NextResponse.json({
      success: true,
      version: {
        ...versionInfo,
        releaseNotes: githubInfo.releaseNotes,
        githubLatest: githubInfo.latest,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { version, autoCheck } = body

    if (autoCheck !== undefined) {
      if (autoCheck) {
        autoUpdater.startAutoUpdateCheck(6) // Check every 6 hours
      } else {
        autoUpdater.stopAutoUpdateCheck()
      }

      return NextResponse.json({
        success: true,
        message: `Auto-update check ${autoCheck ? 'enabled' : 'disabled'}`,
      })
    }

    if (version) {
      const updateStatus = await autoUpdater.performUpdate(version)

      return NextResponse.json({
        success: !updateStatus.error,
        ...updateStatus,
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'No action specified',
      },
      { status: 400 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
