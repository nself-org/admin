'use client'

import { FormSkeleton } from '@/components/skeletons'
import { useTenant } from '@/hooks/useTenant'
import { ArrowLeft, ArrowUpRight, CreditCard, Receipt } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function TenantBillingPage() {
  const params = useParams()
  const tenantId = params.id as string
  const { tenant, isLoading, error } = useTenant(tenantId)

  if (isLoading) return <FormSkeleton />

  if (error || !tenant) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-red-400">{error || 'Failed to load billing data'}</p>
      </div>
    )
  }

  const planPrices: Record<string, string> = {
    free: '$0',
    pro: '$99',
    enterprise: '$499',
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/tenant/${tenantId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Tenant
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Billing</h1>
        <p className="text-sm text-zinc-400">Manage subscription and payments</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Current Plan */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
          <h2 className="mb-4 text-lg font-medium text-white">Current Plan</h2>
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{planPrices[tenant.plan] || '$0'}</span>
            <span className="text-zinc-500">/month</span>
          </div>
          <p className="mb-4 text-sm text-zinc-400 capitalize">{tenant.plan} Plan</p>
          <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500">
            <ArrowUpRight className="h-4 w-4" /> Upgrade Plan
          </button>
        </div>

        {/* Payment Method */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
          <h2 className="mb-4 text-lg font-medium text-white">Payment Method</h2>
          <div className="flex items-center gap-4 rounded-lg bg-zinc-900 p-4">
            <CreditCard className="h-8 w-8 text-zinc-400" />
            <div>
              <p className="text-white">No payment method</p>
              <p className="text-sm text-zinc-500">Add a payment method to upgrade</p>
            </div>
          </div>
          <button className="mt-4 rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
            Add Payment Method
          </button>
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-white">
          <Receipt className="h-5 w-5" /> Invoices
        </h2>
        <p className="text-sm text-zinc-500">No invoices yet.</p>
      </div>
    </div>
  )
}
