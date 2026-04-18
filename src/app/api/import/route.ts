import { getEnhancedPath, findNselfPathSync } from '@/lib/nself-path'
import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'

const execAsync = promisify(exec)

/**
 * POST /api/import
 *
 * Accepts a multipart form upload with:
 *   source  — "chatgpt" or "claude"
 *   file    — the export JSON file
 *
 * Writes the file to a temp path, runs `nself claw import --from <source> --file <path>`,
 * then returns the result and cleans up the temp file.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let tmpPath: string | null = null

  try {
    const formData = await request.formData()

    const source = formData.get('source')
    const file = formData.get('file')

    if (typeof source !== 'string' || !source) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: source' },
        { status: 400 },
      )
    }

    if (source !== 'chatgpt' && source !== 'claude') {
      return NextResponse.json(
        { success: false, error: 'Invalid source: must be "chatgpt" or "claude"' },
        { status: 400 },
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: file' },
        { status: 400 },
      )
    }

    // Write the uploaded file to a temp path.
    const uuid = crypto.randomUUID()
    tmpPath = path.join(os.tmpdir(), `nself-import-${uuid}.json`)
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(tmpPath, buffer)

    const nselfBin = findNselfPathSync()

    const { stdout, stderr } = await execAsync(
      `${nselfBin} claw import --from ${source} --file ${tmpPath}`,
      {
        env: {
          ...process.env,
          PATH: getEnhancedPath(),
          FORCE_COLOR: '0',
        },
        timeout: 120000,
      },
    )

    return NextResponse.json({
      success: true,
      output: stdout || stderr || 'Import completed successfully',
    })
  } catch (err) {
    const execErr = err as { message?: string; stdout?: string; stderr?: string }
    return NextResponse.json(
      {
        success: false,
        error: execErr.stdout || execErr.stderr || execErr.message || 'Import failed',
      },
      { status: 500 },
    )
  } finally {
    if (tmpPath !== null) {
      try {
        fs.unlinkSync(tmpPath)
      } catch {
        // Best-effort cleanup; ignore errors.
      }
    }
  }
}
