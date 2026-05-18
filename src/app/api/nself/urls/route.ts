import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface ServiceUrl {
  name: string
  url: string
  reachable?: boolean
  latencyMs?: number
  error?: string
}

interface UrlsResult {
  urls: ServiceUrl[]
  projectPath: string
  rawOutput?: string
}

async function checkReachability(
  url: string
): Promise<{ reachable: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now()
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000),
    })
    const latencyMs = Date.now() - start
    return { reachable: response.ok || response.status < 500, latencyMs }
  } catch (err) {
    return {
      reachable: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unreachable',
    }
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const nselfCommand = await findNselfPath()
    const projectPath = await getProjectPath()

    const { stdout, stderr } = await execAsync(`${nselfCommand} urls --json`, {
      cwd: projectPath,
      env: { ...process.env, PATH: getEnhancedPath() },
      timeout: 10000,
    })

    const raw = stdout || stderr

    // Try JSON parse first
    let parsedUrls: ServiceUrl[] = []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        parsedUrls = parsed.map((item: Record<string, unknown>) => ({
          name: String(item.name ?? item.service ?? 'Unknown'),
          url: String(item.url ?? item.endpoint ?? ''),
        }))
      } else if (parsed && typeof parsed === 'object') {
        parsedUrls = Object.entries(parsed).map(([name, url]) => ({
          name,
          url: String(url),
        }))
      }
    } catch {
      // Parse line-by-line: "name: url" or "url" patterns
      parsedUrls = raw
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const colonIdx = line.indexOf(':')
          if (colonIdx > 0 && !line.startsWith('http')) {
            const name = line.slice(0, colonIdx).trim()
            const url = line.slice(colonIdx + 1).trim()
            return { name, url }
          }
          const urlMatch = line.match(/(https?:\/\/\S+)/)
          if (urlMatch) {
            return { name: line.replace(urlMatch[0], '').trim() || 'Service', url: urlMatch[0] }
          }
          return null
        })
        .filter((u): u is ServiceUrl => u !== null && Boolean(u.url))
    }

    // Check reachability in parallel (max 10)
    const toCheck = parsedUrls.slice(0, 10)
    const reachabilityResults = await Promise.all(
      toCheck.map((u) => (u.url ? checkReachability(u.url) : Promise.resolve({ reachable: false })))
    )

    const urls: ServiceUrl[] = parsedUrls.map((u, i) => ({
      ...u,
      ...(i < reachabilityResults.length ? reachabilityResults[i] : {}),
    }))

    const result: UrlsResult = { urls, projectPath, rawOutput: raw }
    return NextResponse.json(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to retrieve URLs', details: msg }, { status: 500 })
  }
}
