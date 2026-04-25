import { getActiveProject } from '@/features/project-picker/project-picker'
import fs from 'fs/promises'
import { NextResponse, NextRequest } from 'next/server'
import path from 'path'
import { requireAuth } from '@/lib/require-auth'

/**
 * Compute a lightweight staging-to-prod diff for the active project.
 * Compares .env.staging and .env.prod at the top level. Services/images
 * are inferred from docker-compose.yml service keys.
 */
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const project = await getActiveProject()
    if (project === null) {
      return NextResponse.json({ error: 'No active project.' }, { status: 400 })
    }

    const stagingEnv = await readEnvKeys(
      path.join(project.path, '.env.staging'),
    )
    const prodEnv = await readEnvKeys(path.join(project.path, '.env.prod'))
    const envChanged = diffSets(stagingEnv, prodEnv)

    const composePath = path.join(project.path, 'docker-compose.yml')
    let servicesChanged: string[] = []
    let imagesChanged: string[] = []
    try {
      const raw = await fs.readFile(composePath, 'utf-8')
      const { services, images } = parseCompose(raw)
      servicesChanged = services
      imagesChanged = images
    } catch {
      // compose file may not exist yet — leave empty
    }

    let lastStagingDeploy: string | null = null
    try {
      const stat = await fs.stat(path.join(project.path, '.env.staging'))
      lastStagingDeploy = stat.mtime.toISOString()
    } catch {
      // ignore
    }

    return NextResponse.json({
      filesChanged: envChanged.length + servicesChanged.length,
      servicesChanged,
      envChanged,
      imagesChanged,
      lastStagingDeploy,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to compute diff.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function readEnvKeys(file: string): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(file, 'utf-8')
    const keys = new Set<string>()
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.length === 0 || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq > 0) keys.add(trimmed.slice(0, eq))
    }
    return keys
  } catch {
    return new Set<string>()
  }
}

function diffSets(a: Set<string>, b: Set<string>): string[] {
  const out = new Set<string>()
  for (const k of a) if (!b.has(k)) out.add(k)
  for (const k of b) if (!a.has(k)) out.add(k)
  return Array.from(out).sort()
}

function parseCompose(raw: string): { services: string[]; images: string[] } {
  const services: string[] = []
  const images: string[] = []
  const match = raw.match(/^services:\s*$/m)
  if (match === null) return { services, images }
  const startIdx = match.index! + match[0].length
  const rest = raw.slice(startIdx)
  const lines = rest.split('\n')
  for (const line of lines) {
    if (/^[^\s#]/.test(line)) break
    const svcMatch = line.match(/^ {2}([A-Za-z0-9_.-]+):\s*$/)
    if (svcMatch !== null) services.push(svcMatch[1])
    const imgMatch = line.match(/^ {4}image:\s*(.+)$/)
    if (imgMatch !== null) images.push(imgMatch[1].trim())
  }
  return { services, images }
}
