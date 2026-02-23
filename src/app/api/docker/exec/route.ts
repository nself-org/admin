import { getDockerSocketPath, getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'
import { z } from 'zod'

const execFileAsync = promisify(execFile)

// Schema for Docker command validation
const dockerCommandSchema = z.object({
  command: z.enum(['start', 'stop', 'restart', 'logs', 'stats', 'inspect']),
  service: z
    .string()
    .regex(/^[a-z0-9][a-z0-9_.-]*$/i)
    .optional(),
  options: z
    .object({
      tail: z.number().min(1).max(1000).optional(),
      follow: z.boolean().optional(),
      since: z
        .string()
        .regex(/^\d+[mhs]$/)
        .optional(),
    })
    .optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input with schema
    const validation = dockerCommandSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validation.error.issues,
        },
        { status: 400 },
      )
    }

    const { command, service, options } = validation.data

    // Build the Docker command arguments safely
    const backendPath = getProjectPath()
    const dockerEnv = {
      ...process.env,
      DOCKER_HOST: `unix://${getDockerSocketPath()}`,
    }
    const timeout = command === 'logs' && options?.follow ? 300000 : 30000

    let stdout: string
    let stderr: string

    if (!service) {
      // Use docker-compose for multi-service operations — pass args array directly
      // with cwd set to backendPath, no shell string interpolation needed
      const composeArgs: string[] = []

      switch (command) {
        case 'start':
          composeArgs.push('up', '-d')
          break
        case 'stop':
          composeArgs.push('down')
          break
        case 'restart':
          composeArgs.push('restart')
          break
        case 'logs':
          composeArgs.push('logs')
          if (options?.tail) {
            composeArgs.push('--tail', options.tail.toString())
          } else {
            composeArgs.push('--tail', '50')
          }
          if (options?.follow) {
            composeArgs.push('-f')
          }
          if (options?.since) {
            composeArgs.push('--since', options.since)
          }
          break
        case 'stats':
          composeArgs.push('ps', '--format', 'json')
          break
        case 'inspect':
          composeArgs.push('config')
          break
      }

      const result = await execFileAsync('docker-compose', composeArgs, {
        cwd: backendPath,
        env: dockerEnv,
        timeout,
      })
      stdout = result.stdout
      stderr = result.stderr
    } else {
      // Use docker for single service operations — service name is validated by
      // schema regex (/^[a-z0-9][a-z0-9_.-]*$/i) so it is safe to pass directly
      const dockerArgs: string[] = [command]

      if (command === 'logs') {
        if (options?.tail) {
          dockerArgs.push('--tail', options.tail.toString())
        } else {
          dockerArgs.push('--tail', '50')
        }
        if (options?.follow) {
          dockerArgs.push('-f')
        }
        if (options?.since) {
          dockerArgs.push('--since', options.since)
        }
      }

      dockerArgs.push(service)

      const result = await execFileAsync('docker', dockerArgs, {
        env: dockerEnv,
        timeout,
      })
      stdout = result.stdout
      stderr = result.stderr
    }

    return NextResponse.json({
      success: true,
      data: {
        command: service
          ? `docker ${command} ${service}`
          : `docker-compose ...`,
        output: stdout,
        error: stderr,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute Docker command',
        details:
          error instanceof Error
            ? error?.message || 'Unknown error'
            : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
