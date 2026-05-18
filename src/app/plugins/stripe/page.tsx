'use client'

import { CardGridSkeleton } from '@/components/skeletons'
import type { StripeStats } from '@/types/stripe'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  ExternalLink,
  Package,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Webhook,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

// Metric Card Component
function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
}: {
  title: string
  value: string
  change?: number
  changeLabel?: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  const isPositive = change !== undefined && change >= 0

  return (
    <div
      onMouseMove={onMouseMove}
      className="group relative rounded-2xl bg-zinc-50/90 p-6 transition-colors duration-300 hover:bg-purple-50/80 dark:bg-white/5 dark:hover:bg-purple-950/40"
    >
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-200 to-purple-100 opacity-0 transition duration-300 group-hover:opacity-100 dark:from-purple-500/40 dark:to-purple-400/30"
        style={{
          maskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
          WebkitMaskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
        }}
      />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/10 transition-colors duration-300 ring-inset group-hover:ring-purple-500/50 dark:ring-white/20 dark:group-hover:ring-purple-400/60" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 transition-colors duration-300 group-hover:bg-purple-500/40 dark:bg-purple-400/20 dark:group-hover:bg-purple-400/40">
            <Icon className="h-4 w-4 text-purple-600 group-hover:text-purple-500 dark:text-purple-400 dark:group-hover:text-purple-300" />
          </div>
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</div>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  isPositive ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {isPositive ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              {changeLabel && <span className="text-sm text-zinc-500">{changeLabel}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Quick Link Card
function QuickLinkCard({
  title,
  description,
  href,
  icon: Icon,
  count,
}: {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 transition-all hover:border-purple-500/50 hover:bg-zinc-800"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50">
          <Icon className="h-5 w-5 text-zinc-300" />
        </div>
        <div>
          <h3 className="font-medium text-white">{title}</h3>
          <p className="text-sm text-zinc-400">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-sm text-zinc-300">
            {count.toLocaleString()}
          </span>
        )}
        <ArrowUpRight className="h-5 w-5 text-zinc-500 transition-colors group-hover:text-purple-400" />
      </div>
    </Link>
  )
}

function StripeDashboardContent() {
  const [syncing, setSyncing] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<{
    stats: StripeStats
    counts: {
      customers: number
      subscriptions: number
      invoices: number
      products: number
    }
    recentTransactions: Array<{
      id: string
      amount: number
      currency: string
      customer: string
      status: string
      created: string
    }>
    revenueChart: Array<{
      month: string
      revenue: number
    }>
  }>('/api/plugins/stripe', fetcher, {
    refreshInterval: 60000,
  })

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch('/api/plugins/stripe/sync', { method: 'POST' })
      mutate()
    } finally {
      setSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/plugins"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plugins
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Stripe Dashboard</h1>
          <p className="text-sm text-zinc-400">Revenue metrics and customer insights</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-zinc-800/50" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/plugins"
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Plugins
          </Link>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">Failed to load Stripe data</p>
          </div>
        </div>
      </div>
    )
  }

  const stats = data?.stats
  const counts = data?.counts || {
    customers: 0,
    subscriptions: 0,
    invoices: 0,
    products: 0,
  }
  const recentTransactions = data?.recentTransactions || []
  const revenueChart = data?.revenueChart || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/plugins"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plugins
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Stripe Dashboard</h1>
          <p className="text-sm text-zinc-400">Revenue metrics and customer insights</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Data'}
        </button>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={stats ? formatCurrency(stats.mrr, stats.currency) : '$0'}
          change={stats?.revenueGrowth}
          changeLabel="vs last month"
          icon={DollarSign}
        />
        <MetricCard
          title="Annual Recurring Revenue"
          value={stats ? formatCurrency(stats.arr, stats.currency) : '$0'}
          icon={TrendingUp}
        />
        <MetricCard
          title="Total Revenue"
          value={stats ? formatCurrency(stats.totalRevenue, stats.currency) : '$0'}
          icon={CreditCard}
        />
        <MetricCard
          title="Churn Rate"
          value={stats ? `${stats.churnRate.toFixed(1)}%` : '0%'}
          change={stats ? -stats.churnRate : undefined}
          icon={Users}
        />
      </div>

      {/* Subscription Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Active Subscriptions</h3>
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {stats?.activeSubscriptions.toLocaleString() || 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Total Customers</h3>
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {stats?.totalCustomers.toLocaleString() || 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Last Updated</h3>
            <RefreshCw className="h-5 w-5 text-zinc-400" />
          </div>
          <p className="mt-2 text-lg font-medium text-white">
            {stats?.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Revenue Trend (Last 12 Months)</h2>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-6">
          <div className="flex h-64 items-end justify-between gap-2">
            {revenueChart.map((item, i) => {
              const maxRevenue = Math.max(...revenueChart.map((r) => r.revenue), 1)
              const height = (item.revenue / maxRevenue) * 100
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative w-full">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-purple-600 to-purple-400 transition-all hover:from-purple-500 hover:to-purple-300"
                      style={{ height: `${height}%`, minHeight: '8px' }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">{item.month}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Recent Transactions</h2>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          <table className="w-full">
            <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.slice(0, 20).map((tx) => (
                <tr key={tx.id} className="border-b border-zinc-700/50">
                  <td className="px-4 py-3 font-mono text-sm text-zinc-400">{tx.id}</td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{tx.customer}</td>
                  <td className="px-4 py-3 text-sm font-medium text-white">
                    {formatCurrency(tx.amount, tx.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        tx.status === 'succeeded'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-500/20 text-zinc-400'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {new Date(tx.created).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Quick Access</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <QuickLinkCard
            title="Customers"
            description="View and manage customer records"
            href="/plugins/stripe/customers"
            icon={Users}
            count={counts.customers}
          />
          <QuickLinkCard
            title="Subscriptions"
            description="Active and past subscriptions"
            href="/plugins/stripe/subscriptions"
            icon={CreditCard}
            count={counts.subscriptions}
          />
          <QuickLinkCard
            title="Invoices"
            description="Invoice history and payments"
            href="/plugins/stripe/invoices"
            icon={Receipt}
            count={counts.invoices}
          />
          <QuickLinkCard
            title="Products"
            description="Product catalog and pricing"
            href="/plugins/stripe/products"
            icon={Package}
            count={counts.products}
          />
          <QuickLinkCard
            title="Webhooks"
            description="Event logs and webhook status"
            href="/plugins/stripe/webhooks"
            icon={Webhook}
          />
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 transition-all hover:border-purple-500/50 hover:bg-zinc-800"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50">
                <ExternalLink className="h-5 w-5 text-zinc-300" />
              </div>
              <div>
                <h3 className="font-medium text-white">Stripe Dashboard</h3>
                <p className="text-sm text-zinc-400">Open in Stripe.com</p>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-zinc-500 transition-colors group-hover:text-purple-400" />
          </a>
        </div>
      </div>
    </div>
  )
}

export default function StripeDashboardPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <StripeDashboardContent />
    </Suspense>
  )
}
