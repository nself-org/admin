'use client'

import type { OrgRole } from '@/types/tenant'
import { Mail, Send, X } from 'lucide-react'
import { useState } from 'react'

interface OrgInviteModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string, role: OrgRole, message?: string) => Promise<void>
  isLoading?: boolean
}

export function OrgInviteModal({ isOpen, onClose, onInvite, isLoading }: OrgInviteModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('member')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email address')
      return
    }

    try {
      await onInvite(email.trim(), role, message.trim() || undefined)
      setEmail('')
      setRole('member')
      setMessage('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Invite Member</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Email Address *</label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pr-4 pl-10 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  placeholder="colleague@company.com"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as OrgRole)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="viewer">Viewer - Read-only access</option>
                <option value="member">Member - Standard access</option>
                <option value="admin">Admin - Full access</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Personal Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Add a personal note to your invite..."
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isLoading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
