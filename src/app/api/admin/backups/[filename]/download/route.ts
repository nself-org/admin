import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/backups/[filename]/download — stream a backup file
 *
 * Resolves the file from known backup directories and streams it as a
 * Content-Disposition: attachment response.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
): Promise<NextResponse> {
  const { filename } = await params

  if (!filename || /[/\\]/.test(filename) || filename.startsWith('.')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const path = await import('path')
  const fs = await import('fs/promises')

  const candidates = [
    process.env.NSELF_BACKUP_DIR,
    '/opt/nself/backups',
    '/backups',
    './backups',
  ].filter(Boolean) as string[]

  let filePath: string | null = null

  for (const dir of candidates) {
    const candidate = path.join(dir, filename)
    try {
      await fs.access(candidate)
      filePath = candidate
      break
    } catch {
      // not in this dir — continue
    }
  }

  if (!filePath) {
    return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
  }

  try {
    const buffer = await fs.readFile(filePath)
    const contentType = filename.endsWith('.gz') ? 'application/gzip' : 'application/octet-stream'

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to read backup' },
      { status: 500 }
    )
  }
}
