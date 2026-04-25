'use client'

import { CheckCircle, Clock, XCircle } from 'lucide-react'
import { LicenseActivateButton } from './LicenseActivateButton'

export interface License {
  id: string
  keyPrefix: string
  tier: string
  status: 'active' | 'inactive' | 'expired'
  machineBound: boolean
  expiresAt?: string
}

interface LicenseRowProps {
  license: License
  onActivate: (id: string) => Promise<void>
  onDeactivate: (id: string) => Promise<void>
}

function StatusBadge({ status }: { status: License['status'] }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
        <CheckCircle className="h-3 w-3" aria-hidden="true" />
        Active
      </span>
    )
  }
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
        <Clock className="h-3 w-3" aria-hidden="true" />
        Expired
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
      <XCircle className="h-3 w-3" aria-hidden="true" />
      Inactive
    </span>
  )
}

export function LicenseRow({
  license,
  onActivate,
  onDeactivate,
}: LicenseRowProps) {
  return (
    <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/30">
      <td className="px-4 py-3 font-mono text-sm text-zinc-900 dark:text-white">
        {license.keyPrefix}…
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
        {license.tier}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge status={license.status} />
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
        {license.machineBound ? 'Yes' : 'No'}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-500">
        {license.expiresAt
          ? new Date(license.expiresAt).toLocaleDateString()
          : 'Never'}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <LicenseActivateButton
          licenseId={license.id}
          keyPrefix={license.keyPrefix}
          status={license.status}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
        />
      </td>
    </tr>
  )
}
