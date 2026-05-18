'use client'

import type { TenantDomain } from '@/types/tenant'
import { CheckCircle, Globe, Plus, Shield, Star, Trash2, XCircle } from 'lucide-react'
import { useState } from 'react'

interface TenantDomainManagerProps {
  domains: TenantDomain[]
  onAdd: (domain: string) => Promise<void>
  onRemove: (domain: string) => Promise<void>
  onVerify: (domain: string) => Promise<void>
  onGenerateSSL: (domain: string) => Promise<void>
  onSetPrimary: (domain: string) => Promise<void>
  isLoading?: boolean
}

export function TenantDomainManager({
  domains,
  onAdd,
  onRemove,
  onVerify,
  onGenerateSSL,
  onSetPrimary,
  isLoading,
}: TenantDomainManagerProps) {
  const [newDomain, setNewDomain] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newDomain.trim()) return
    setAddError(null)
    try {
      await onAdd(newDomain.trim())
      setNewDomain('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain')
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Domain */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <h3 className="mb-3 text-sm font-medium text-white">Add Custom Domain</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="example.com"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={isLoading || !newDomain.trim()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {addError && <p className="mt-2 text-xs text-red-400">{addError}</p>}
      </div>

      {/* Domain List */}
      <div className="space-y-3">
        {domains.length === 0 ? (
          <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-8 text-center">
            <Globe className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-400">No custom domains configured</p>
          </div>
        ) : (
          domains.map((domain) => (
            <div
              key={domain.id}
              className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-4"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-zinc-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{domain.domain}</span>
                    {domain.primary && (
                      <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <span
                      className={`flex items-center gap-1 ${domain.verified ? 'text-emerald-400' : 'text-zinc-500'}`}
                    >
                      {domain.verified ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {domain.verified ? 'Verified' : 'Unverified'}
                    </span>
                    <span
                      className={`flex items-center gap-1 ${domain.ssl ? 'text-emerald-400' : 'text-zinc-500'}`}
                    >
                      <Shield className="h-3 w-3" />
                      {domain.ssl ? 'SSL Active' : 'No SSL'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!domain.verified && (
                  <button
                    onClick={() => onVerify(domain.domain)}
                    disabled={isLoading}
                    className="rounded px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/20"
                  >
                    Verify
                  </button>
                )}
                {domain.verified && !domain.ssl && (
                  <button
                    onClick={() => onGenerateSSL(domain.domain)}
                    disabled={isLoading}
                    className="rounded px-3 py-1 text-xs text-blue-400 hover:bg-blue-500/20"
                  >
                    Enable SSL
                  </button>
                )}
                {!domain.primary && domain.verified && (
                  <button
                    onClick={() => onSetPrimary(domain.domain)}
                    disabled={isLoading}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-yellow-400"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => onRemove(domain.domain)}
                  disabled={isLoading || domain.primary}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-red-400 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DNS Instructions */}
      {domains.some((d) => !d.verified) && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <h4 className="mb-2 text-sm font-medium text-yellow-400">DNS Configuration Required</h4>
          <p className="text-xs text-yellow-300/80">
            Add the following DNS records to verify your domain ownership:
          </p>
          <div className="mt-3 space-y-2">
            {domains
              .filter((d) => !d.verified)
              .map((domain) => (
                <div
                  key={domain.id}
                  className="rounded bg-zinc-900/50 p-2 font-mono text-xs text-zinc-300"
                >
                  {domain.dnsRecords.map((record, i) => (
                    <div key={i}>
                      {record.type} {record.name} → {record.value}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
