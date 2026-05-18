'use client'

import { CardGridSkeleton } from '@/components/skeletons'
import type { ShopifyStats } from '@/types/shopify'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
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
  }).format(amount)
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
      className="group relative rounded-2xl bg-zinc-50/90 p-6 transition-colors duration-300 hover:bg-green-50/80 dark:bg-white/5 dark:hover:bg-green-950/40"
    >
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-200 to-green-100 opacity-0 transition duration-300 group-hover:opacity-100 dark:from-green-500/40 dark:to-green-400/30"
        style={{
          maskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
          WebkitMaskImage: useMotionTemplate`radial-gradient(250px at ${mouseX}px ${mouseY}px, white, transparent)`,
        }}
      />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-zinc-900/10 transition-colors duration-300 ring-inset group-hover:ring-green-500/50 dark:ring-white/20 dark:group-hover:ring-green-400/60" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h3>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 transition-colors duration-300 group-hover:bg-green-500/40 dark:bg-green-400/20 dark:group-hover:bg-green-400/40">
            <Icon className="h-4 w-4 text-green-600 group-hover:text-green-500 dark:text-green-400 dark:group-hover:text-green-300" />
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
  alert,
}: {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  alert?: boolean
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 transition-all hover:border-green-500/50 hover:bg-zinc-800"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/50">
          <Icon className="h-5 w-5 text-zinc-300" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white">{title}</h3>
            {alert && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
          </div>
          <p className="text-sm text-zinc-400">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && (
          <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-sm text-zinc-300">
            {count.toLocaleString()}
          </span>
        )}
        <ArrowUpRight className="h-5 w-5 text-zinc-500 transition-colors group-hover:text-green-400" />
      </div>
    </Link>
  )
}

function ShopifyDashboardContent() {
  const [syncing, setSyncing] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<{
    stats: ShopifyStats
    counts: {
      products: number
      orders: number
      customers: number
      lowStock: number
    }
  }>('/api/plugins/shopify', fetcher, {
    refreshInterval: 60000,
  })

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch('/api/plugins/shopify/sync', { method: 'POST' })
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
          <h1 className="text-2xl font-semibold text-white">Shopify Dashboard</h1>
          <p className="text-sm text-zinc-400">Store metrics and inventory</p>
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
            <p className="text-red-400">Failed to load Shopify data</p>
          </div>
        </div>
      </div>
    )
  }

  const stats = data?.stats
  const counts = data?.counts || {
    products: 0,
    orders: 0,
    customers: 0,
    lowStock: 0,
  }

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
          <h1 className="text-2xl font-semibold text-white">Shopify Dashboard</h1>
          <p className="text-sm text-zinc-400">Store metrics and inventory</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Data'}
        </button>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={stats ? formatCurrency(stats.totalRevenue, stats.currency) : '$0'}
          change={stats?.periodComparison?.revenueChange}
          changeLabel={
            stats?.periodComparison?.period ? `vs last ${stats.periodComparison.period}` : undefined
          }
          icon={DollarSign}
        />
        <MetricCard
          title="Total Orders"
          value={stats?.totalOrders.toLocaleString() || '0'}
          change={stats?.periodComparison?.ordersChange}
          icon={ShoppingCart}
        />
        <MetricCard
          title="Average Order Value"
          value={stats ? formatCurrency(stats.averageOrderValue, stats.currency) : '$0'}
          icon={BarChart3}
        />
        <MetricCard
          title="Total Customers"
          value={stats?.totalCustomers.toLocaleString() || '0'}
          change={stats?.periodComparison?.customersChange}
          icon={Users}
        />
      </div>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Total Products</h3>
            <Package className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {stats?.totalProducts.toLocaleString() || 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Active Products</h3>
            <Package className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {stats?.activeProducts.toLocaleString() || 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Low Stock</h3>
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-yellow-400">
            {stats?.lowStockProducts.toLocaleString() || 0}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Out of Stock</h3>
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-red-400">
            {stats?.outOfStockProducts.toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* Last Sync */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-zinc-400" />
            <span className="text-sm text-zinc-400">Last synced:</span>
            <span className="text-sm text-white">
              {stats?.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Quick Access</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <QuickLinkCard
            title="Products"
            description="Browse and manage product catalog"
            href="/plugins/shopify/products"
            icon={Package}
            count={counts.products}
          />
          <QuickLinkCard
            title="Orders"
            description="View and process orders"
            href="/plugins/shopify/orders"
            icon={ShoppingCart}
            count={counts.orders}
          />
          <QuickLinkCard
            title="Customers"
            description="Customer list and details"
            href="/plugins/shopify/customers"
            icon={Users}
            count={counts.customers}
          />
          <QuickLinkCard
            title="Inventory"
            description="Stock levels and alerts"
            href="/plugins/shopify/inventory"
            icon={BarChart3}
            alert={counts.lowStock > 0}
            count={counts.lowStock > 0 ? counts.lowStock : undefined}
          />
        </div>
      </div>
    </div>
  )
}

export default function ShopifyDashboardPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <ShopifyDashboardContent />
    </Suspense>
  )
}
