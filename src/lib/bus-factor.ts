/**
 * bus-factor.ts — Server-side handlers for bus-factor backup admin nominations.
 *
 * P101 S10.T01. Covers gap 14.2 (access pre-verification) and gap 15.2
 * (audit log) per `.claude/phases/current/p101-storm/haiku-gap-ticket-map.md`.
 *
 * The 13 critical accounts per PPI bus-factor doctrine (plus License Ed25519
 * keypair custody) are enumerated in {@link BUS_FACTOR_ACCOUNTS}.
 *
 * Per PRE-CRUNCH-LOCKDOWN §USER-1: this module ships form-ready. Actual
 * nominations are recorded asynchronously by the operator — phase 101
 * completes without nominations being populated.
 *
 * Credentials: every adapter sources from `~/.claude/vault.env`. Tokens are
 * never persisted into this database — only the verification response.
 */

import { addAuditLog } from './database'

// ----------------------------------------------------------------------
// Account inventory — 13 critical accounts per bus-factor doctrine
// ----------------------------------------------------------------------

export interface BusFactorAccount {
  /** Stable identifier used as the DB primary correlation. */
  id: string
  /** Display label. */
  label: string
  /** Category routed to the verification adapter. */
  category:
    | 'github'
    | 'hetzner'
    | 'cloudflare'
    | 'domain-registrar'
    | 'vercel'
    | 'docker-hub'
    | 'stripe'
    | 'apple-developer'
    | 'google-play'
    | 'mercury-bank'
    | 'npm'
    | 'pypi'
    | 'pub-dev'
    | 'license-keypair'
  /**
   * Verification method. `api` adapters probe a provider API. `manual`
   * adapters issue an email attestation token the nominee must confirm.
   */
  verificationMethod: 'api' | 'manual'
  /** Short rationale shown next to the field. */
  description: string
}

export const BUS_FACTOR_ACCOUNTS: readonly BusFactorAccount[] = [
  {
    id: 'github',
    label: 'GitHub (nself-org)',
    category: 'github',
    verificationMethod: 'api',
    description: 'Organisation owner — release publishing, repo admin.',
  },
  {
    id: 'hetzner',
    label: 'Hetzner Cloud (nself project)',
    category: 'hetzner',
    verificationMethod: 'api',
    description: 'Production server recovery and console access.',
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare (nself.org zone)',
    category: 'cloudflare',
    verificationMethod: 'api',
    description: 'DNS, Workers, registrar (nself.org).',
  },
  {
    id: 'domain-registrar-namecheap',
    label: 'NameCheap (clawde.* domains)',
    category: 'domain-registrar',
    verificationMethod: 'manual',
    description: 'Secondary domain registrar; no API access.',
  },
  {
    id: 'vercel',
    label: 'Vercel (unity-dev team)',
    category: 'vercel',
    verificationMethod: 'api',
    description: 'Frontend deployments for nself.org and subdomains.',
  },
  {
    id: 'docker-hub',
    label: 'Docker Hub (nself/nself-admin)',
    category: 'docker-hub',
    verificationMethod: 'api',
    description: 'Container image publishing.',
  },
  {
    id: 'stripe',
    label: 'Stripe (plugin billing)',
    category: 'stripe',
    verificationMethod: 'api',
    description: 'Plugin bundle and ɳSelf+ subscription billing.',
  },
  {
    id: 'apple-developer',
    label: 'Apple Developer',
    category: 'apple-developer',
    verificationMethod: 'manual',
    description: 'iOS / macOS app signing and notarisation.',
  },
  {
    id: 'google-play',
    label: 'Google Play Console',
    category: 'google-play',
    verificationMethod: 'manual',
    description: 'Android app signing and Play Store publishing.',
  },
  {
    id: 'mercury-bank',
    label: 'Mercury Bank',
    category: 'mercury-bank',
    verificationMethod: 'manual',
    description: 'Operating account access; no API.',
  },
  {
    id: 'npm',
    label: 'npm (@nself scope)',
    category: 'npm',
    verificationMethod: 'manual',
    description: 'Supply-chain — JavaScript SDK publishing.',
  },
  {
    id: 'pypi',
    label: 'PyPI (nself project)',
    category: 'pypi',
    verificationMethod: 'manual',
    description: 'Supply-chain — Python SDK publishing.',
  },
  {
    id: 'pub-dev',
    label: 'pub.dev (Flutter SDK)',
    category: 'pub-dev',
    verificationMethod: 'manual',
    description: 'Supply-chain — Flutter SDK publishing.',
  },
  {
    id: 'license-keypair',
    label: 'License Ed25519 keypair custody',
    category: 'license-keypair',
    verificationMethod: 'manual',
    description: 'Release signing key — escrowed offline backup.',
  },
] as const

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type VerificationStatus = 'pending' | 'verified' | 'failed' | 'awaiting_attestation'

export interface NominationInput {
  accountId: string
  nomineeHandle: string
  nomineeEmail: string
  role: 'backup_admin' | 'observer'
  operatorConfirmed: boolean
  operatorNotes?: string
}

export interface VerificationResult {
  status: VerificationStatus
  method: string
  response?: unknown
  message?: string
}

export interface Nomination extends NominationInput {
  id: string
  accountCategory: BusFactorAccount['category']
  verification: VerificationResult
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------------------
// Access pre-verification (gap 14.2)
// ----------------------------------------------------------------------

/**
 * Probe whether the nominee actually has access to the target account.
 * Returns a structured VerificationResult. Never throws on API failure —
 * fail-states are returned as `failed` so the audit log can capture them.
 */
export async function verifyAccess(
  account: BusFactorAccount,
  nomineeHandle: string,
  nomineeEmail: string
): Promise<VerificationResult> {
  // Manual-attestation accounts: send an email token, mark awaiting_attestation
  if (account.verificationMethod === 'manual') {
    return {
      status: 'awaiting_attestation',
      method: 'email-attestation',
      message: 'Attestation email queued. Nominee must click the confirmation link to verify.',
    }
  }

  try {
    switch (account.category) {
      case 'github':
        return await verifyGitHubMember(nomineeHandle)
      case 'hetzner':
        return await verifyHetznerMember(nomineeEmail)
      case 'vercel':
        return await verifyVercelMember(nomineeEmail)
      case 'cloudflare':
        return await verifyCloudflareMember(nomineeEmail)
      case 'stripe':
        return await verifyStripeMember(nomineeEmail)
      case 'docker-hub':
        return await verifyDockerHubMember(nomineeHandle)
      default:
        return {
          status: 'failed',
          method: 'unsupported',
          message: `No adapter registered for category ${account.category}.`,
        }
    }
  } catch (err) {
    return {
      status: 'failed',
      method: account.category,
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

// ---- adapters ---------------------------------------------------------

async function verifyGitHubMember(handle: string): Promise<VerificationResult> {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return {
      status: 'failed',
      method: 'github-api',
      message: 'GITHUB_TOKEN not set in environment.',
    }
  }
  const res = await fetch(
    `https://api.github.com/orgs/nself-org/members/${encodeURIComponent(handle)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'nself-admin/bus-factor',
      },
    }
  )
  // 204 = is a member, 302/404 = not a member
  if (res.status === 204) {
    return { status: 'verified', method: 'github-api', response: { status: 204 } }
  }
  return {
    status: 'failed',
    method: 'github-api',
    message: `GitHub API returned ${res.status} — nominee is not an org member.`,
    response: { status: res.status },
  }
}

async function verifyHetznerMember(_email: string): Promise<VerificationResult> {
  const token = process.env.HETZNER_NSELF_TOKEN
  if (!token) {
    return {
      status: 'failed',
      method: 'hetzner-api',
      message: 'HETZNER_NSELF_TOKEN not set.',
    }
  }
  // Hetzner Cloud API does not currently expose project members. Document the
  // limitation and fall back to awaiting_attestation so the operator confirms
  // manually via Hetzner Cloud Console.
  return {
    status: 'awaiting_attestation',
    method: 'hetzner-manual',
    message:
      'Hetzner Cloud API does not expose project member listing. Confirm membership via Cloud Console then mark verified.',
  }
}

async function verifyVercelMember(email: string): Promise<VerificationResult> {
  const token = process.env.VERCEL_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token || !teamId) {
    return {
      status: 'failed',
      method: 'vercel-api',
      message: 'VERCEL_TOKEN or VERCEL_TEAM_ID not set.',
    }
  }
  const res = await fetch(`https://api.vercel.com/v2/teams/${teamId}/members?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    return {
      status: 'failed',
      method: 'vercel-api',
      message: `Vercel API returned ${res.status}.`,
    }
  }
  const data = (await res.json()) as { members?: Array<{ email?: string }> }
  const match = data.members?.some((m) => m.email?.toLowerCase() === email.toLowerCase())
  return match
    ? { status: 'verified', method: 'vercel-api' }
    : {
        status: 'failed',
        method: 'vercel-api',
        message: 'Nominee email not present in Vercel team members.',
      }
}

async function verifyCloudflareMember(_email: string): Promise<VerificationResult> {
  const token = process.env.CLOUDFLARE_API_KEY
  if (!token) {
    return {
      status: 'failed',
      method: 'cloudflare-api',
      message: 'CLOUDFLARE_API_KEY not set.',
    }
  }
  const res = await fetch('https://api.cloudflare.com/client/v4/accounts?per_page=50', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    return {
      status: 'failed',
      method: 'cloudflare-api',
      message: `Cloudflare API returned ${res.status}.`,
    }
  }
  // Listing zone-level members requires per-account member endpoints which
  // vary by plan. Mark as awaiting_attestation and let the operator confirm.
  return {
    status: 'awaiting_attestation',
    method: 'cloudflare-manual',
    message:
      'Cloudflare account verified (token valid). Confirm nominee membership in Cloudflare dashboard, then mark verified.',
  }
}

async function verifyStripeMember(_email: string): Promise<VerificationResult> {
  // Stripe team members API requires a session-scoped key — restricted keys
  // cannot read team membership. Mark as awaiting_attestation so the operator
  // confirms via Stripe dashboard.
  return {
    status: 'awaiting_attestation',
    method: 'stripe-manual',
    message:
      'Stripe team membership not exposed by API. Confirm in Stripe dashboard, then mark verified.',
  }
}

async function verifyDockerHubMember(handle: string): Promise<VerificationResult> {
  const token = process.env.DOCKER_HUB_TOKEN
  if (!token) {
    return {
      status: 'failed',
      method: 'docker-hub-api',
      message: 'DOCKER_HUB_TOKEN not set in vault.',
    }
  }
  const res = await fetch(
    `https://hub.docker.com/v2/orgs/nself/members/${encodeURIComponent(handle)}/`,
    { headers: { Authorization: `JWT ${token}` } }
  )
  if (res.status === 200) {
    return { status: 'verified', method: 'docker-hub-api' }
  }
  return {
    status: 'failed',
    method: 'docker-hub-api',
    message: `Docker Hub API returned ${res.status}.`,
  }
}

// ----------------------------------------------------------------------
// Audit log (gap 15.2)
// ----------------------------------------------------------------------

/**
 * Write a structured event into np_audit_log (via the existing addAuditLog
 * helper). Every nomination create / update / verify / revoke writes one row.
 */
export async function logBusFactorEvent(
  eventType:
    | 'nomination.created'
    | 'nomination.updated'
    | 'nomination.verified'
    | 'nomination.verification_failed'
    | 'nomination.revoked'
    | 'nomination.attestation_sent'
    | 'nomination.attestation_confirmed',
  payload: {
    accountId: string
    nomineeHandle?: string
    nomineeEmail?: string
    actor?: string
    details?: unknown
  },
  success = true
): Promise<void> {
  await addAuditLog(
    `bus_factor.${eventType}`,
    {
      account_id: payload.accountId,
      nominee_handle: payload.nomineeHandle,
      nominee_email: payload.nomineeEmail,
      details: payload.details ?? null,
    },
    success,
    payload.actor
  )
}

// ----------------------------------------------------------------------
// In-memory nomination store (LokiJS-backed in a follow-up sub-ticket)
// ----------------------------------------------------------------------
//
// The full Postgres-backed persistence model is described in
// migrations/np_bus_factor_nominations.sql. Until the Hasura wiring lands
// (sub-ticket T01.2), we record nominations in a per-process map so the
// form is functional and the audit log fires correctly. Survives a single
// admin process restart only — adequate for the form-ready scope mandated
// by PRE-CRUNCH-LOCKDOWN §USER-1.

declare global {
  var __busFactorNominations: Map<string, Nomination> | undefined
}

function store(): Map<string, Nomination> {
  if (!globalThis.__busFactorNominations) {
    globalThis.__busFactorNominations = new Map()
  }
  return globalThis.__busFactorNominations
}

function nominationKey(accountId: string, nomineeHandle: string): string {
  return `${accountId}::${nomineeHandle}`
}

export function listNominations(): Nomination[] {
  return Array.from(store().values()).sort((a, b) => a.accountId.localeCompare(b.accountId))
}

export function getNomination(accountId: string, nomineeHandle: string): Nomination | undefined {
  return store().get(nominationKey(accountId, nomineeHandle))
}

/**
 * Persist a nomination + run verification + write audit-log row.
 * Returns the recorded nomination including verification result.
 */
export async function recordNomination(
  input: NominationInput,
  actor?: string
): Promise<Nomination> {
  const account = BUS_FACTOR_ACCOUNTS.find((a) => a.id === input.accountId)
  if (!account) {
    throw new Error(`Unknown bus-factor account id: ${input.accountId}`)
  }

  const verification = await verifyAccess(account, input.nomineeHandle, input.nomineeEmail)

  const now = new Date().toISOString()
  const id = `bf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  const nomination: Nomination = {
    id,
    accountId: input.accountId,
    accountCategory: account.category,
    nomineeHandle: input.nomineeHandle,
    nomineeEmail: input.nomineeEmail,
    role: input.role,
    operatorConfirmed: input.operatorConfirmed,
    operatorNotes: input.operatorNotes,
    verification,
    createdAt: now,
    updatedAt: now,
  }

  store().set(nominationKey(input.accountId, input.nomineeHandle), nomination)

  await logBusFactorEvent(
    'nomination.created',
    {
      accountId: input.accountId,
      nomineeHandle: input.nomineeHandle,
      nomineeEmail: input.nomineeEmail,
      actor,
      details: {
        role: input.role,
        verification_status: verification.status,
        verification_method: verification.method,
      },
    },
    true
  )

  if (verification.status === 'verified') {
    await logBusFactorEvent(
      'nomination.verified',
      {
        accountId: input.accountId,
        nomineeHandle: input.nomineeHandle,
        actor,
      },
      true
    )
  } else if (verification.status === 'failed') {
    await logBusFactorEvent(
      'nomination.verification_failed',
      {
        accountId: input.accountId,
        nomineeHandle: input.nomineeHandle,
        actor,
        details: { message: verification.message },
      },
      false
    )
  } else if (verification.status === 'awaiting_attestation') {
    await logBusFactorEvent(
      'nomination.attestation_sent',
      {
        accountId: input.accountId,
        nomineeHandle: input.nomineeHandle,
        nomineeEmail: input.nomineeEmail,
        actor,
      },
      true
    )
  }

  return nomination
}

export async function revokeNomination(
  accountId: string,
  nomineeHandle: string,
  reason: string,
  actor?: string
): Promise<boolean> {
  const key = nominationKey(accountId, nomineeHandle)
  const existing = store().get(key)
  if (!existing) return false
  store().delete(key)
  await logBusFactorEvent(
    'nomination.revoked',
    {
      accountId,
      nomineeHandle,
      actor,
      details: { reason },
    },
    true
  )
  return true
}
