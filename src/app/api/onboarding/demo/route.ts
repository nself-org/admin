import { getEnhancedPath } from '@/lib/nself-path'
import { requireAuth } from '@/lib/require-auth'
import { spawn } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'

function runNselfDemo(): Promise<{
  success: boolean
  output: string
  error?: string
}> {
  return new Promise((resolve) => {
    const child = spawn('nself', ['init', '--demo'], {
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 30000,
    })

    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk.toString())
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk.toString())
    })

    child.on('error', (err) => {
      resolve({
        success: false,
        output: '',
        error: err.message.includes('ENOENT')
          ? 'nself CLI not found. Make sure it is installed and on PATH.'
          : err.message,
      })
    })

    child.on('close', (code) => {
      const output = stdoutChunks.join('')
      if (code === 0) {
        resolve({ success: true, output })
      } else {
        const errText =
          stderrChunks.join('').trim() ||
          output.trim() ||
          `Process exited with code ${code}`
        resolve({ success: false, output, error: errText })
      }
    })
  })
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const result = await runNselfDemo()
    if (result.success) {
      return NextResponse.json({ success: true, output: result.output })
    }
    return NextResponse.json({
      success: false,
      error: result.error ?? 'Demo creation failed.',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Demo creation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
