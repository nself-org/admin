import { NextResponse } from 'next/server'

type RunStatus = 'pending' | 'running' | 'passed' | 'failed' | 'timed_out' | 'error'

interface SyntheticRun {
  id: string
  status: RunStatus
  trigger: string
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  error_message: string | null
}

interface SyntheticFlow {
  id: string
  name: string
  description: string | null
  flow_type: 'playwright' | 'api_contract'
  target_url: string
  schedule_cron: string | null
  timeout_seconds: number
  enabled: boolean
  last_run: SyntheticRun | null
}

interface SyntheticFlowsResponse {
  flows: SyntheticFlow[]
  total: number
}

const SYNTHETIC_MONITOR_URL = process.env.SYNTHETIC_MONITOR_URL ?? 'http://127.0.0.1:3836'

export async function GET() {
  try {
    const res = await fetch(`${SYNTHETIC_MONITOR_URL}/flows`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `nself-synthetic-monitor upstream error: ${res.status}` },
        { status: res.status }
      )
    }

    const data = (await res.json()) as SyntheticFlowsResponse
    return NextResponse.json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to reach nself-synthetic-monitor'

    // Return empty list when the plugin is not running so the admin UI
    // renders the "no flows configured" empty state instead of an error.
    if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('timeout')) {
      const empty: SyntheticFlowsResponse = { flows: [], total: 0 }
      return NextResponse.json(empty)
    }

    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
