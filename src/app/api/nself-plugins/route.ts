import { NextResponse } from 'next/server'

/**
 * List available nSelf plugins for the active project.
 *
 * For P93 this route returns the curated default plugin inventory from a
 * static list. A future sprint will wire this to the plugins.nself.org
 * registry via `nself plugin list --json`.
 */

interface NselfPlugin {
  name: string
  version: string
  tier:
    | 'free'
    | 'basic'
    | 'pro'
    | 'elite'
    | 'business'
    | 'business-plus'
    | 'enterprise'
  installed: boolean
  enabled: boolean
  bundle: string | null
  description: string
  requiresLicense: boolean
  hasUpdate: boolean
  availableVersion: string | null
  status: 'active' | 'dormant' | 'revoked' | 'error'
  statusDetail?: string
}

const CATALOG: NselfPlugin[] = [
  {
    name: 'notify',
    version: '1.0.0',
    tier: 'basic',
    installed: false,
    enabled: false,
    bundle: 'nChat',
    description: 'Push, email, SMS, webhook notifications',
    requiresLicense: true,
    hasUpdate: false,
    availableVersion: null,
    status: 'active',
  },
  {
    name: 'cron',
    version: '1.0.0',
    tier: 'basic',
    installed: true,
    enabled: true,
    bundle: null,
    description: 'Scheduled jobs and recurring tasks',
    requiresLicense: true,
    hasUpdate: false,
    availableVersion: null,
    status: 'active',
  },
  {
    name: 'ai',
    version: '1.0.0',
    tier: 'pro',
    installed: true,
    enabled: true,
    bundle: 'ɳClaw',
    description: 'AI inference service, Claude + OpenAI',
    requiresLicense: true,
    hasUpdate: true,
    availableVersion: '1.1.0',
    status: 'active',
  },
  {
    name: 'mux',
    version: '1.0.0',
    tier: 'pro',
    installed: true,
    enabled: true,
    bundle: 'ɳClaw',
    description: 'Message multiplexer, email pipeline',
    requiresLicense: true,
    hasUpdate: false,
    availableVersion: null,
    status: 'active',
  },
  {
    name: 'claw',
    version: '1.0.0',
    tier: 'pro',
    installed: false,
    enabled: false,
    bundle: 'ɳClaw',
    description: 'AI assistant core (memory, topics, reasoning)',
    requiresLicense: true,
    hasUpdate: false,
    availableVersion: null,
    status: 'active',
  },
  {
    name: 'chat',
    version: '1.0.0',
    tier: 'basic',
    installed: false,
    enabled: false,
    bundle: 'nChat',
    description: 'Realtime messaging core',
    requiresLicense: true,
    hasUpdate: false,
    availableVersion: null,
    status: 'active',
  },
  {
    name: 'livekit',
    version: '1.0.0',
    tier: 'basic',
    installed: false,
    enabled: false,
    bundle: 'nChat',
    description: 'Video and voice calls',
    requiresLicense: true,
    hasUpdate: false,
    availableVersion: null,
    status: 'active',
  },
  {
    name: 'media-processing',
    version: '1.0.0',
    tier: 'basic',
    installed: false,
    enabled: false,
    bundle: 'nMedia',
    description: 'Transcoding, thumbnails, metadata extraction',
    requiresLicense: true,
    hasUpdate: false,
    availableVersion: null,
    status: 'active',
  },
  {
    name: 'torrent-manager',
    version: '1.0.0',
    tier: 'free',
    installed: false,
    enabled: false,
    bundle: 'nMedia',
    description: 'Torrent acquisition queue',
    requiresLicense: false,
    hasUpdate: false,
    availableVersion: null,
    status: 'active',
  },
  {
    name: 'meilisearch',
    version: '1.14.0',
    tier: 'free',
    installed: true,
    enabled: true,
    bundle: null,
    description: 'Full-text search engine',
    requiresLicense: false,
    hasUpdate: false,
    availableVersion: null,
    status: 'active',
  },
]

export async function GET() {
  return NextResponse.json({
    plugins: CATALOG,
    licenseTier: 'pro',
    licenseValid: true,
  })
}
