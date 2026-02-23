import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function POST(_request: NextRequest): Promise<NextResponse> {
  try {
    const projectPath = getProjectPath()

    // Check if docker-compose.yml exists
    const dockerComposePath = path.join(projectPath, 'docker-compose.yml')
    if (!fs.existsSync(dockerComposePath)) {
      return NextResponse.json(
        {
          success: false,
          message: 'No docker-compose.yml found in project directory',
          error:
            'Project not initialized. Run nself init and nself build first.',
        },
        { status: 400 },
      )
    }

    // Find nself CLI using the centralized utility
    const nselfPath = await findNselfPath()

    // Use nself CLI to start services
    const { stdout, stderr } = await execFileAsync(nselfPath, ['start'], {
      cwd: projectPath,
      env: {
        ...process.env,
        PATH: getEnhancedPath(),
        COMPOSE_PARALLEL_LIMIT: '4',
      },
      timeout: 120000, // 2 minute timeout for pulling images
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
    })

    // Parse the output
    const lines = stdout.split('\n').filter((line) => line.trim())
    const services: any[] = []

    lines.forEach((line) => {
      if (
        line.includes('Creating') ||
        line.includes('Starting') ||
        line.includes('Running')
      ) {
        const match = line.match(
          /(Creating|Starting|Running)\s+(.+?)(?:\s+\.\.\.|$)/,
        )
        if (match) {
          services.push({
            name: match[2],
            status: 'starting',
            message: line.trim(),
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Services started successfully',
      services,
      output: {
        stdout: lines,
        stderr: stderr ? stderr.split('\n').filter((line) => line.trim()) : [],
      },
    })
  } catch (error) {
    const execError = error as {
      message?: string
      stdout?: string
      stderr?: string
    }
    console.error('docker-compose start error:', error)

    const errorMessage = execError.message || 'Start failed'
    const isDockerNotRunning = errorMessage.includes(
      'Cannot connect to the Docker daemon',
    )
    const isComposeNotFound = errorMessage.includes(
      'docker-compose: command not found',
    )

    let userMessage = 'Failed to start services'
    if (isDockerNotRunning) {
      userMessage = 'Docker is not running. Please start Docker Desktop.'
    } else if (isComposeNotFound) {
      userMessage = 'docker-compose not found. Please install Docker Desktop.'
    }

    return NextResponse.json(
      {
        success: false,
        message: userMessage,
        error: errorMessage,
        output: {
          stdout: execError.stdout ? execError.stdout.split('\n') : [],
          stderr: execError.stderr ? execError.stderr.split('\n') : [],
        },
      },
      { status: 500 },
    )
  }
}
