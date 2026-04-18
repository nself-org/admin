'use client'

import type { MarketplacePlugin } from '@/types/plugins'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export interface InstallModalProps {
  plugin: MarketplacePlugin
  onClose: () => void
  onInstalled: (name: string) => void
}

type LicenseState = 'checking' | 'valid' | 'invalid' | 'not-required'
type InstallState = 'idle' | 'installing' | 'success' | 'error'

interface LicenseStatus {
  valid: boolean
  tier: string | null
  expiresAt: string | null
  pluginsAllowed: string[] | null
}

export function InstallModal({
  plugin,
  onClose,
  onInstalled,
}: InstallModalProps) {
  const isPro = plugin.tier === 'pro' || plugin.licenseRequired

  const [licenseState, setLicenseState] = useState<LicenseState>(
    isPro ? 'checking' : 'not-required',
  )
  const [installState, setInstallState] = useState<InstallState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Check license status for pro plugins on mount
  useEffect(() => {
    if (!isPro) return

    let cancelled = false

    fetch('/api/license')
      .then((res) => res.json())
      .then((data: LicenseStatus) => {
        if (cancelled) return
        setLicenseState(data.valid ? 'valid' : 'invalid')
      })
      .catch(() => {
        if (!cancelled) setLicenseState('invalid')
      })

    return () => {
      cancelled = true
    }
  }, [isPro])

  // Auto-close after success
  useEffect(() => {
    if (installState !== 'success') return
    const timer = setTimeout(() => {
      onInstalled(plugin.name)
      onClose()
    }, 1500)
    return () => clearTimeout(timer)
  }, [installState, plugin.name, onInstalled, onClose])

  const licenseReady =
    licenseState === 'not-required' || licenseState === 'valid'
  const canInstall = installState === 'idle' && licenseReady

  async function handleInstall() {
    if (!canInstall) return
    setInstallState('installing')
    setErrorMessage(null)

    try {
      const res = await fetch(`/api/plugins/${plugin.name}/install`, {
        method: 'POST',
      })
      const data = (await res.json()) as {
        success?: boolean
        error?: string
        licenseRequired?: boolean
        upgradeUrl?: string
      }

      if (res.status === 402 || data.licenseRequired) {
        setInstallState('idle')
        setLicenseState('invalid')
        return
      }

      if (!res.ok || data.success === false) {
        setInstallState('error')
        setErrorMessage(data.error ?? 'Installation failed. Please try again.')
        return
      }

      setInstallState('success')
    } catch {
      setInstallState('error')
      setErrorMessage('Network error. Please check your connection and retry.')
    }
  }

  const displayName = plugin.displayName || plugin.name
  const price = plugin.price ?? (isPro ? '$0.99/mo' : 'Free')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md rounded-xl border border-zinc-700/50 bg-zinc-900 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-700/50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800 text-2xl">
                {plugin.icon || '🔌'}
              </div>
              <div>
                <h2 className="font-semibold text-white">{displayName}</h2>
                <p className="text-sm text-zinc-400">by {plugin.author}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-500 transition-colors hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 p-5">
            {/* Description */}
            <p className="text-sm text-zinc-400">{plugin.description}</p>

            {/* Tier + Price */}
            <div className="flex items-center gap-3">
              {isPro ? (
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                  Pro
                </span>
              ) : (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  Free
                </span>
              )}
              <span className="text-sm font-medium text-white">{price}</span>
              {plugin.bundle && (
                <span className="rounded-full border border-zinc-600/50 bg-zinc-700/40 px-2.5 py-0.5 text-xs text-zinc-300">
                  {plugin.bundleName ?? plugin.bundle}
                </span>
              )}
            </div>

            {/* License status for pro plugins */}
            {isPro && (
              <div
                className={`flex items-start gap-3 rounded-lg p-3 ${
                  licenseState === 'checking'
                    ? 'bg-zinc-800/60'
                    : licenseState === 'valid'
                      ? 'border border-emerald-500/30 bg-emerald-900/30'
                      : 'border border-amber-500/30 bg-amber-900/20'
                }`}
              >
                {licenseState === 'checking' && (
                  <>
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-zinc-400" />
                    <p className="text-sm text-zinc-400">
                      Checking license status…
                    </p>
                  </>
                )}
                {licenseState === 'valid' && (
                  <>
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <p className="text-sm text-emerald-300">License verified</p>
                  </>
                )}
                {licenseState === 'invalid' && (
                  <>
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-300">
                        This plugin requires a Pro license.
                      </p>
                      <a
                        href="https://nself.org/pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-indigo-400 hover:text-indigo-300"
                      >
                        Upgrade
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Install error */}
            {installState === 'error' && errorMessage && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-900/20 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
            )}

            {/* Success */}
            {installState === 'success' && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-900/30 p-3">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                <p className="text-sm text-emerald-300">
                  Plugin installed successfully.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-700/50 px-5 py-4">
            <button
              onClick={onClose}
              disabled={installState === 'installing'}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleInstall}
              disabled={!canInstall}
              className="flex min-w-[110px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {installState === 'installing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Installing…
                </>
              ) : installState === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Installed
                </>
              ) : (
                'Install'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
