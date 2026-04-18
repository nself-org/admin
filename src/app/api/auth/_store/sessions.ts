/**
 * In-memory pairing session store.
 *
 * Module-level singleton: shared across all requests within the same
 * Next.js server process. Entries expire after SESSION_TTL_MS.
 *
 * This is intentionally simple — the admin app runs locally on the user's
 * machine, so a single-process in-memory store is appropriate.
 */

import type { AuthToken } from '@/features/auth/types'

export type SessionStatus = 'pending' | 'paired' | 'expired'

export interface SessionEntry {
  state: string
  status: SessionStatus
  createdAt: number
  token?: AuthToken
}

/** Sessions older than 3 minutes are treated as expired. */
const SESSION_TTL_MS = 3 * 60 * 1000

const store = new Map<string, SessionEntry>()

function prune(): void {
  const now = Date.now()
  for (const [id, entry] of store) {
    if (now - entry.createdAt > SESSION_TTL_MS) {
      store.delete(id)
    }
  }
}

export const sessionStore = {
  set(id: string, entry: SessionEntry): void {
    prune()
    store.set(id, entry)
  },

  get(id: string): SessionEntry | undefined {
    const entry = store.get(id)
    if (!entry) return undefined

    // Mark expired if TTL exceeded
    if (Date.now() - entry.createdAt > SESSION_TTL_MS) {
      store.set(id, { ...entry, status: 'expired' })
      return store.get(id)
    }

    return entry
  },

  delete(id: string): void {
    store.delete(id)
  },

  markPaired(id: string, token: AuthToken): boolean {
    const entry = store.get(id)
    if (!entry) return false
    store.set(id, { ...entry, status: 'paired', token })
    return true
  },
}
