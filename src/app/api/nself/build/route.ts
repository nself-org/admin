import { nselfBuild } from '@/lib/nselfCLI'
import { getProjectPath } from '@/lib/paths'
import { emitBuildProgress } from '@/lib/websocket/emitters'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { requireAuth } from '@/lib/require-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    // Get the actual backend project path where we want to build
    const backendProjectPath = getProjectPath()


    // Ensure the backend project directory exists
    try {
      await fs.mkdir(backendProjectPath, { recursive: true })
    } catch (mkdirError) {
      console.error('Failed to create backend directory:', mkdirError)
    }

    // Check if env files exist - nself build expects .env or .env.dev
    const envPath = path.join(backendProjectPath, '.env')
    const envDevPath = path.join(backendProjectPath, '.env.dev')

    let envFileFound = false
    try {
      await fs.access(envPath)
      envFileFound = true
    } catch {
      // Check for .env.dev as fallback
      try {
        await fs.access(envDevPath)
        envFileFound = true
      } catch {
        console.error('Neither .env nor .env.dev found')
      }
    }

    if (!envFileFound) {
      return NextResponse.json(
        {
          error:
            'Project not initialized. Please run the setup wizard first. (No .env or .env.dev file found)',
        },
        { status: 400 },
      )
    }

    // Run nself build in the backend project directory

    // Emit build start event
    emitBuildProgress({
      step: 'build',
      status: 'in-progress',
      progress: 0,
      message: 'Starting build process...',
      currentStep: 1,
      totalSteps: 6,
      timestamp: new Date().toISOString(),
    })

    try {
      // Step 1: Validating configuration
      emitBuildProgress({
        step: 'build',
        status: 'in-progress',
        progress: 10,
        message: 'Validating configuration...',
        currentStep: 1,
        totalSteps: 6,
        timestamp: new Date().toISOString(),
      })

      // Run nself build using secure CLI wrapper
      const result = await nselfBuild({ force: true })

      if (result.stderr) {
      }

      // Check if build failed
      if (!result.success) {
        throw new Error(result.error || result.stderr || 'Build command failed')
      }

      const stdout = result.stdout || ''

      // Step 2: Generating docker-compose.yml
      emitBuildProgress({
        step: 'build',
        status: 'in-progress',
        progress: 40,
        message: 'Generating docker-compose.yml...',
        currentStep: 2,
        totalSteps: 6,
        timestamp: new Date().toISOString(),
      })

      // Check if docker-compose.yml was created
      const dockerComposePath = path.join(
        backendProjectPath,
        'docker-compose.yml',
      )
      try {
        await fs.access(dockerComposePath)

        // Count services in the generated file
        const dockerComposeContent = await fs.readFile(
          dockerComposePath,
          'utf-8',
        )
        const serviceMatches = dockerComposeContent.match(/^ {2}\w+:/gm)
        const serviceCount = serviceMatches ? serviceMatches.length : 0

        // Emit progress updates for remaining steps
        emitBuildProgress({
          step: 'build',
          status: 'in-progress',
          progress: 70,
          message: 'Creating networks and pulling images...',
          currentStep: 4,
          totalSteps: 6,
          timestamp: new Date().toISOString(),
        })

        // Final success
        emitBuildProgress({
          step: 'build',
          status: 'complete',
          progress: 100,
          message: `Build complete! ${serviceCount} services configured.`,
          currentStep: 6,
          totalSteps: 6,
          timestamp: new Date().toISOString(),
        })

        return NextResponse.json({
          success: true,
          message: 'Project built successfully',
          output:
            stdout ||
            `Build completed successfully. ${serviceCount} services configured.`,
          serviceCount,
        })
      } catch {
        console.error('docker-compose.yml not found after build')

        // Emit failure event
        emitBuildProgress({
          step: 'build',
          status: 'failed',
          progress: 40,
          message: 'Build failed: docker-compose.yml was not created',
          currentStep: 2,
          totalSteps: 6,
          timestamp: new Date().toISOString(),
        })

        return NextResponse.json(
          {
            error: 'Build failed',
            details: 'docker-compose.yml was not created',
            output: stdout,
          },
          { status: 500 },
        )
      }
    } catch (buildError) {
      const buildErr = buildError instanceof Error ? buildError : new Error(String(buildError))
      console.error('=== Build Error ===')
      console.error('Error message:', buildErr.message)

      // Check if docker-compose.yml exists despite error (sometimes nself returns non-zero but succeeds)
      const dockerComposePath = path.join(
        backendProjectPath,
        'docker-compose.yml',
      )
      try {
        await fs.access(dockerComposePath)
        const dockerComposeContent = await fs.readFile(
          dockerComposePath,
          'utf-8',
        )
        const serviceMatches = dockerComposeContent.match(/^ {2}\w+:/gm)
        const serviceCount = serviceMatches ? serviceMatches.length : 0


        // Emit success event
        emitBuildProgress({
          step: 'build',
          status: 'complete',
          progress: 100,
          message: `Build complete! ${serviceCount} services configured.`,
          currentStep: 6,
          totalSteps: 6,
          timestamp: new Date().toISOString(),
        })

        return NextResponse.json({
          success: true,
          message: 'Project built successfully',
          output: `Build completed. ${serviceCount} services configured.`,
          serviceCount,
        })
      } catch {
        // Build actually failed - emit failure event
        emitBuildProgress({
          step: 'build',
          status: 'failed',
          progress: 0,
          message: 'Build failed. Check server logs for details.',
          currentStep: 1,
          totalSteps: 6,
          timestamp: new Date().toISOString(),
        })

        console.error('Build failed:', buildError)
        return NextResponse.json(
          {
            error: 'Build failed',
            details: 'Build failed. Check server logs for details.',
          },
          { status: 500 },
        )
      }
    }
  } catch (error) {
    console.error('=== Fatal Error in build API ===')
    console.error('Error:', error)

    // Emit failure event
    emitBuildProgress({
      step: 'build',
      status: 'failed',
      progress: 0,
      message: error instanceof Error ? error.message : 'Fatal error',
      currentStep: 1,
      totalSteps: 6,
      timestamp: new Date().toISOString(),
    })

    console.error('Fatal error in build API:', error)
    return NextResponse.json(
      {
        error: 'Failed to build project',
        details: 'An unexpected error occurred. Check server logs for details.',
      },
      { status: 500 },
    )
  }
}
