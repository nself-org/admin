import { requireAuth } from '@/lib/require-auth'
import { execSync } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/backups/create — create a new backup
 *
 * Calls `nself backup create` synchronously (may take 30–120 s for large DBs).
 * Returns the created filename on success.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const output = execSync('nself backup create', {
      timeout: 180_000, // 3 min ceiling
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    // Try to extract the backup filename from CLI output
    // Common patterns: "Created: backup-2026-03-16.sql.gz" or just the filename line
    const filenameMatch = output.match(/(?:Created|backup)[:\s]+([^\s]+\.(?:sql|dump)(?:\.gz)?)/i)
    const filename = filenameMatch?.[1]?.trim() ?? extractLastLine(output)

    return NextResponse.json({ filename, output: output.trim() })
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'stderr' in err
          ? String((err as { stderr: unknown }).stderr)
          : 'nself backup create failed'

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function extractLastLine(output: string): string {
  const lines = output.trim().split('\n').filter(Boolean)
  return lines[lines.length - 1] ?? ''
}
