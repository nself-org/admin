/**
 * SSLPanel — admin panel for SSL certificate management.
 *
 * Purpose: Display SSL certificate status for all configured domains.
 *   All 7 AsyncScreen states handled.
 * Inputs: /api/ssl/status endpoint
 * Outputs: list of domain certificates with expiry status
 * Constraints:
 *   - Offline = stack not running (nginx/cert-manager unavailable)
 *   - Empty = no SSL certificates configured
 *   - Error = fetch failure or SSL service error
 * SPORT: REGISTRY-WEB-SURFACES.md — admin: SSLPanel 7-state
 */

'use client'

import { AdminLoginOverlay } from '@/components/AdminLoginOverlay'
import { AsyncScreen, type AsyncScreenState } from '@/components/AsyncScreen'
import { err, ok, toAdminError, type Result } from '@/lib/result'
import { AlertTriangle, CheckCircle2, Globe, Lock, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useStackStatus } from '@/hooks/useStackStatus'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CertStatus {
  domain: string
  status: 'valid' | 'expiring' | 'expired' | 'missing'
  expiresAt?: string
  daysUntilExpiry?: number
  issuer?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function certStatusIcon(status: CertStatus['status']) {
  switch (status) {
    case 'valid':    return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'expiring': return <AlertTriangle className="h-4 w-4 text-amber-500" />
    case 'expired':  return <XCircle className="h-4 w-4 text-red-500" />
    case 'missing':  return <Lock className="h-4 w-4 text-zinc-400" />
  }
}

function certStatusLabel(status: CertStatus['status']): string {
  return { valid: 'Valid', expiring: 'Expiring soon', expired: 'Expired', missing: 'Missing' }[status]
}

function certStatusClass(status: CertStatus['status']): string {
  return {
    valid:    'text-green-600 dark:text-green-400',
    expiring: 'text-amber-600 dark:text-amber-400',
    expired:  'text-red-600 dark:text-red-400',
    missing:  'text-zinc-400',
  }[status]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SSLPanel() {
  const { stackIsDown, retry } = useStackStatus()
  const [result, setResult] = useState<Result<CertStatus[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  const fetchCerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ssl/status')
      if (res.status === 401) { setSessionExpired(true); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: { certs: CertStatus[] } = await res.json()
      setResult(ok(data.certs))
    } catch (e) {
      setResult(err(toAdminError(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!stackIsDown) fetchCerts()
  }, [fetchCerts, stackIsDown])

  const screenState: AsyncScreenState = (() => {
    if (stackIsDown) return 'offline'
    if (sessionExpired) return 'auth-expired'
    if (loading) return 'loading'
    if (!result) return 'loading'
    if (!result.ok) return 'error'
    if (result.value.length === 0) return 'empty'
    return 'ready'
  })()

  const certs = result?.ok ? result.value : []

  return (
    <section aria-label="SSL Management" className="space-y-4">
      {sessionExpired && (
        <AdminLoginOverlay
          onSuccess={() => {
            setSessionExpired(false)
            fetchCerts()
          }}
        />
      )}

      <AsyncScreen
        state={screenState}
        onRetry={retry}
        onReauth={() => setSessionExpired(true)}
        onErrorRetry={fetchCerts}
        errorMessage={result && !result.ok ? result.error.userMessage : undefined}
        emptyMessage="No SSL certificates configured."
      >
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {certs.map((cert) => (
            <li key={cert.domain} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                {certStatusIcon(cert.status)}
                <div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                      {cert.domain}
                    </span>
                  </div>
                  {cert.issuer && (
                    <p className="text-xs text-zinc-400">{cert.issuer}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs font-medium ${certStatusClass(cert.status)}`}>
                  {certStatusLabel(cert.status)}
                </p>
                {cert.expiresAt && (
                  <p className="text-xs text-zinc-400">
                    Expires {new Date(cert.expiresAt).toLocaleDateString()}
                    {cert.daysUntilExpiry !== undefined && ` (${cert.daysUntilExpiry}d)`}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </AsyncScreen>
    </section>
  )
}
