'use client'

import { Loader2, Power, PowerOff } from 'lucide-react'
import { useRef, useState } from 'react'
import type { License } from './LicenseRow'

interface LicenseActivateButtonProps {
  licenseId: string
  keyPrefix: string
  status: License['status']
  onActivate: (id: string) => Promise<void>
  onDeactivate: (id: string) => Promise<void>
}

export function LicenseActivateButton({
  licenseId,
  keyPrefix,
  status,
  onActivate,
  onDeactivate,
}: LicenseActivateButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const isActive = status === 'active'

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    try {
      if (isActive) {
        await onDeactivate(licenseId)
      } else {
        await onActivate(licenseId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setLoading(false)
      // Return focus to this button after async action (WCAG 2.1 AA focus management)
      setTimeout(() => buttonRef.current?.focus(), 50)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        ref={buttonRef}
        onClick={handleClick}
        disabled={loading || status === 'expired'}
        aria-label={
          isActive
            ? `Deactivate license ${keyPrefix}`
            : `Activate license ${keyPrefix}`
        }
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          isActive
            ? 'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-red-500 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 focus-visible:outline-blue-500 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40'
        }`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : isActive ? (
          <PowerOff className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Power className="h-3 w-3" aria-hidden="true" />
        )}
        {loading ? 'Working…' : isActive ? 'Deactivate' : 'Activate'}
      </button>

      {error && (
        <span
          role="alert"
          aria-live="assertive"
          className="text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </span>
      )}
    </div>
  )
}
