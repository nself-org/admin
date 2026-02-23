import { logger } from '@/lib/logger'
import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()

    const { stdout } = await execAsync(
      `${nselfPath} monitor alerts rules list --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('GET', '/api/monitor/alerts/rules', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      rules: result.rules ?? [],
      total: result.total ?? 0,
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to get alert rules', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get alert rules',
        details: err.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  try {
    const projectPath = getProjectPath()
    const nselfPath = await findNselfPath()
    const body = await request.json()

    const { name, expression, duration, severity, labels, annotations } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Rule name is required' },
        { status: 400 },
      )
    }

    if (!expression) {
      return NextResponse.json(
        { success: false, error: 'Expression is required' },
        { status: 400 },
      )
    }

    const args: string[] = ['monitor', 'alerts', 'rules', 'create', name]
    args.push(`--expression=${expression}`)
    if (duration) args.push(`--duration=${duration}`)
    if (severity) args.push(`--severity=${severity}`)
    if (labels && typeof labels === 'object') {
      Object.entries(labels).forEach(([key, value]) => {
        args.push(`--label=${key}=${value}`)
      })
    }
    if (annotations && typeof annotations === 'object') {
      Object.entries(annotations).forEach(([key, value]) => {
        args.push(`--annotation=${key}=${value}`)
      })
    }

    const { stdout } = await execAsync(
      `${nselfPath} ${args.join(' ')} --json`,
      {
        cwd: projectPath,
        env: { ...process.env, PATH: getEnhancedPath() },
        timeout: 60000,
      },
    )

    const result = JSON.parse(stdout)

    logger.api('POST', '/api/monitor/alerts/rules', 200, Date.now() - startTime)
    return NextResponse.json({
      success: true,
      message: result.message ?? `Alert rule ${name} created`,
      rule: {
        name,
        expression,
        severity: severity ?? 'warning',
      },
    })
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string }
    logger.error('Failed to create alert rule', { error: err.message })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create alert rule',
        details: err.message,
      },
      { status: 500 },
    )
  }
}
