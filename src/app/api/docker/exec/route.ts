// nSelf-First Doctrine: all Docker service ops route through `nself` CLI commands.
// Direct docker-compose invocations are forbidden.
import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

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

    // nSelf-First Doctrine: all service lifecycle ops go through `nself` CLI.
    // Never call docker-compose directly.
    const nselfArgs: string[] = []

    if (service) {
      nselfArgs.push('--service', service)
    }

    if (command === 'logs') {
      const tail = options?.tail ?? 50
      nselfArgs.push('--tail', String(tail))
      if (options?.follow) nselfArgs.push('--follow')
      if (options?.since) nselfArgs.push('--since', options.since)
    }

    const result = await executeNselfCommand(command, nselfArgs)

    return NextResponse.json({
      success: result.success,
      data: {
        command: service
          ? `nself ${command} --service ${service}`
          : `nself ${command}`,
        output: result.stdout,
        error: result.stderr ?? result.error,
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
