import { executeNselfCommand } from '@/lib/nselfCLI'
import { NextResponse } from 'next/server'

/**
 * GET /api/config/vault/status
 * Returns the current Vault status by wrapping `nself config vault status`
 */
export async function GET(): Promise<NextResponse> {
  try {
    const result = await executeNselfCommand('config', ['vault', 'status'])

    if (result.success) {
      // Try to parse JSON output from CLI
      let vaultStatus = null
      try {
        vaultStatus = JSON.parse(result.stdout || '{}')
      } catch {
        // CLI returned non-JSON output, parse it manually
        const output = result.stdout || ''
        vaultStatus = {
          connected: output.includes('connected') || output.includes('sealed'),
          sealed: output.includes('sealed'),
          initialized: !output.includes('not initialized'),
          version: extractField(output, 'version'),
          clusterName: extractField(output, 'cluster'),
          raw: output.trim(),
        }
      }

      return NextResponse.json({
        success: true,
        data: vaultStatus,
      })
    }

    return NextResponse.json({
      success: false,
      data: {
        connected: false,
        sealed: true,
        initialized: false,
        raw: result.stderr || result.stdout || 'Vault is not available',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get Vault status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

function extractField(output: string, field: string): string | null {
  const regex = new RegExp(`${field}[:\\s]+(.+)`, 'i')
  const match = output.match(regex)
  return match ? match[1].trim() : null
}
