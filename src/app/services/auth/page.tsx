'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Shield } from 'lucide-react'
import { Suspense } from 'react'

function AuthContent() {
  // Auth service data is not exposed via the Admin API in single-operator mode (v1.x).
  // Multi-user auth management is planned for v1.2.0.
  // Use `nself auth` CLI commands to manage users and tokens directly.
  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="flex items-center gap-3 text-3xl font-bold text-zinc-900 dark:text-white">
              <Shield className="h-8 w-8 text-green-500" />
              Auth Service
            </h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              User management, authentication, and security configuration
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <Shield className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              Auth data not available
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Auth service data is not exposed via the Admin API in
              single-operator mode. Use the CLI to manage users and tokens
              directly.
            </p>
            <p className="mt-4 font-mono text-sm text-green-500">nself auth</p>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
              CLI Commands Reference
            </h3>
            <div className="space-y-2 font-mono text-sm">
              <p className="text-zinc-600 dark:text-zinc-400">
                <span className="text-green-500">nself auth status</span> -
                Show auth service status
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                <span className="text-green-500">nself auth users</span> - List
                users
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                <span className="text-green-500">
                  nself auth token --user=email@example.com
                </span>{' '}
                - Generate a token
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                <span className="text-green-500">nself auth config</span> -
                View or update auth configuration
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <AuthContent />
    </Suspense>
  )
}
