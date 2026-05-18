'use client'

import { DashboardSkeleton } from '@/components/skeletons'
import { TenantQuotaDisplay, TenantStatusBadge } from '@/components/tenant'
import { useTenant } from '@/hooks/useTenant'
import {
  Activity,
  ArrowLeft,
  Globe,
  Mail,
  MoreHorizontal,
  Palette,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function TenantDetailPage() {
  const params = useParams()
  const tenantId = params.id as string
  const { tenant, stats, isLoading, error, suspend, activate } = useTenant(tenantId)
  const [showActions, setShowActions] = useState(false)

  if (isLoading) return <DashboardSkeleton />

  if (error || !tenant) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-red-400">{error || 'Tenant not found'}</p>
      </div>
    )
  }

  const quickLinks = [
    {
      href: `/tenant/${tenantId}/members`,
      icon: Users,
      label: 'Members',
      count: stats?.members,
    },
    { href: `/tenant/${tenantId}/branding`, icon: Palette, label: 'Branding' },
    {
      href: `/tenant/${tenantId}/domains`,
      icon: Globe,
      label: 'Domains',
      count: stats?.domains,
    },
    {
      href: `/tenant/${tenantId}/email-templates`,
      icon: Mail,
      label: 'Email Templates',
    },
    { href: `/tenant/${tenantId}/settings`, icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/tenant"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Tenants
          </Link>
          <div className="mt-4 flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-white">{tenant.name}</h1>
            <TenantStatusBadge status={tenant.status} />
          </div>
          <p className="text-sm text-zinc-400">
            {tenant.slug} · {tenant.plan} plan
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {showActions && (
            <div className="absolute top-12 right-0 z-10 w-48 rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
              {tenant.status === 'active' ? (
                <button
                  onClick={() => {
                    suspend()
                    setShowActions(false)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-yellow-400 hover:bg-zinc-700"
                >
                  <Shield className="h-4 w-4" /> Suspend Tenant
                </button>
              ) : (
                <button
                  onClick={() => {
                    activate()
                    setShowActions(false)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-400 hover:bg-zinc-700"
                >
                  <Activity className="h-4 w-4" /> Activate Tenant
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quota Display */}
      <TenantQuotaDisplay quota={tenant.quota} />

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-col items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 transition-colors hover:border-emerald-500/50 hover:bg-zinc-800"
          >
            <link.icon className="h-6 w-6 text-zinc-400" />
            <span className="text-sm text-white">{link.label}</span>
            {link.count !== undefined && (
              <span className="text-xs text-zinc-500">{link.count}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
        <h2 className="mb-4 text-lg font-medium text-white">Recent Activity</h2>
        <p className="text-sm text-zinc-500">No recent activity to display.</p>
      </div>
    </div>
  )
}
