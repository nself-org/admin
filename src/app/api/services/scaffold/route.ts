import { executeNselfCommand } from '@/lib/nselfCLI'
import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

const VALID_TEMPLATES = [
  // JavaScript / TypeScript
  'express',
  'fastify',
  'nestjs',
  'hono',
  'bullmq',
  'koa',
  'adonis',
  'strapi',
  'keystone',
  'remix',
  'next',
  'nuxt',
  'astro',
  'sveltekit',
  // Python
  'fastapi',
  'flask',
  'django',
  'celery',
  'streamlit',
  'litestar',
  'sanic',
  'tornado',
  // Go
  'gin',
  'fiber',
  'echo',
  'grpc-go',
  'chi',
  'mux',
  'buffalo',
  // Rust
  'actix',
  'axum',
  'rocket',
  'warp',
  // Java
  'spring-boot',
  'quarkus',
  'micronaut',
  // PHP
  'laravel',
  'slim',
  'symfony',
  // Ruby
  'rails',
  'sinatra',
  'hanami',
  // C#
  'dotnet-api',
  'dotnet-grpc',
  // Elixir
  'phoenix',
  'plug',
]

/**
 * POST /api/services/scaffold
 * Scaffolds a new service from a template via nself service scaffold
 * Body: { template: string, name: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { template, name } = body

    if (!template || typeof template !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Template is required' },
        { status: 400 },
      )
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Service name is required' },
        { status: 400 },
      )
    }

    // Validate template
    if (!VALID_TEMPLATES.includes(template.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid template: ${template}. Use GET /api/services/scaffold for available templates.`,
        },
        { status: 400 },
      )
    }

    // Validate service name (alphanumeric, hyphens, underscores)
    const namePattern = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/
    if (!namePattern.test(name)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Service name must start with a letter and contain only letters, numbers, hyphens, and underscores (max 64 chars)',
        },
        { status: 400 },
      )
    }

    const result = await executeNselfCommand('service', [
      'scaffold',
      `--template=${template.toLowerCase()}`,
      `--name=${name}`,
    ])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to scaffold service',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        template: template.toLowerCase(),
        name,
        output: result.stdout?.trim(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to scaffold service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/services/scaffold
 * Lists available scaffold templates via nself service scaffold --list
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('service', ['scaffold', '--list'])

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to list scaffold templates',
          details: result.error || result.stderr || 'Unknown error',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { output: result.stdout?.trim() },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list scaffold templates',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
