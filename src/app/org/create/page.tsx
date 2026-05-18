'use client'

import { useOrganization } from '@/hooks/useOrganization'
import { ArrowLeft, Building } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CreateOrgPage() {
  const router = useRouter()
  const { create, isLoading } = useOrganization()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Organization name is required')
      return
    }

    try {
      const org = await create({ name, description })
      router.push(`/org/${org.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/org"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Organizations
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Create Organization</h1>
        <p className="text-sm text-zinc-400">Set up a new organization for your team</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border border-zinc-700 bg-zinc-800/50 p-6"
      >
        <div>
          <label className="mb-2 block text-sm text-zinc-400">Organization Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
            placeholder="Acme Engineering"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-400">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
            placeholder="A brief description of your organization"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          <Building className="h-4 w-4" />
          {isLoading ? 'Creating...' : 'Create Organization'}
        </button>
      </form>
    </div>
  )
}
