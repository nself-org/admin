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
    let cmdArgs: string[] = []
    let useCompose = !service

    if (useCompose) {
      // Use docker-compose for multi-service operations
      cmdArgs = ['docker-compose']

      switch (command) {
        case 'start':
          cmdArgs.push('up', '-d')
          break
        case 'stop':
          cmdArgs.push('down')
          break
        case 'restart':
          cmdArgs.push('restart')
          break
        case 'logs':
          cmdArgs.push('logs')
          if (options?.tail) {
            cmdArgs.push('--tail', options.tail.toString())
          } else {
            cmdArgs.push('--tail', '50')
          }
          if (options?.follow) {
            cmdArgs.push('-f')
          }
          if (options?.since) {
            cmdArgs.push('--since', options.since)
          }
          break
        case 'stats':
          cmdArgs.push('ps', '--format', 'json')
          break
        case 'inspect':
          cmdArgs.push('config')
          break
      }
    } else {
      // Use docker for single service operations
      cmdArgs = ['docker', command]

      if (command === 'logs') {
        if (options?.tail) {
          cmdArgs.push('--tail', options.tail.toString())
        } else {
          cmdArgs.push('--tail', '50')
        }
        if (options?.follow) {
          cmdArgs.push('-f')
        }
        if (options?.since) {
          cmdArgs.push('--since', options.since)
        }
      }

      // Add the validated service name
      if (service) {
        cmdArgs.push(service)
      }
    }

    // Execute the command safely
    let stdout: string
    let stderr: string

    if (useCompose) {
      // Need to cd to project directory for docker-compose
      const result = await execFileAsync(
        '/bin/sh',
        [
          '-c',
          `cd "${backendPath}" && ${cmdArgs.map((arg) => `"${arg}"`).join(' ')}`,
        ],
        {
          env: {
            ...process.env,
            DOCKER_HOST: `unix://${getDockerSocketPath()}`,
          },
          timeout: command === 'logs' && options?.follow ? 300000 : 30000,
        },
      )
      stdout = result.stdout
      stderr = result.stderr
    } else {
      // Direct docker command
      const result = await execFileAsync(cmdArgs[0], cmdArgs.slice(1), {
        env: {
          ...process.env,
          DOCKER_HOST: `unix://${getDockerSocketPath()}`,
        },
        timeout: command === 'logs' && options?.follow ? 300000 : 30000,
      })
      stdout = result.stdout
      stderr = result.stderr
    }

    return NextResponse.json({
      success: true,
      data: {
        command: cmdArgs.join(' '),
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
