'use client'

import { ApiKeyList } from '@/components/api-keys'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useApiKeys, useApiKeyStats } from '@/hooks/useApiKeys'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Key,
  Plus,
  ShieldOff,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ApiKeysPage() {
  const router = useRouter()
  const { apiKeys, isLoading: isLoadingKeys } = useApiKeys()
  const { stats, isLoading: isLoadingStats } = useApiKeyStats()

  return (
    <>
      <PageHeader
        title="API Keys"
        description="Manage API keys for programmatic access to your services"
        breadcrumbs={[
          { label: 'Settings', href: '/settings' },
          { label: 'API Keys' },
        ]}
        actions={
          <Link href="/settings/api-keys/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </Link>
        }
      />
      <PageContent>
        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                <Key className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total Keys</p>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.totalKeys ?? 0}</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Active Keys</p>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.activeKeys ?? 0}</p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Expired Keys</p>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">
                    {stats?.expiredKeys ?? 0}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900">
                <ShieldOff className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Revoked Keys</p>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">
                    {stats?.revokedKeys ?? 0}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Requests in Last 24h */}
        {!isLoadingStats && stats && (
          <Card className="mb-6 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Total API Requests (Last 24h)
                </p>
                <p className="text-2xl font-bold">
                  {stats.totalRequests24h?.toLocaleString() ?? 0}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* API Key List */}
        {isLoadingKeys ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <ApiKeyList
            onCreateClick={() => router.push('/settings/api-keys/new')}
            onKeySelect={(id) => router.push(`/settings/api-keys/${id}`)}
            onEditClick={(id) =>
              router.push(`/settings/api-keys/${id}?edit=true`)
            }
            onRevokeClick={(id) => {
              if (
                confirm(
                  'Are you sure you want to revoke this API key? This action cannot be undone.',
                )
              ) {
                // Handle revoke - would typically call the API
                router.push(`/settings/api-keys/${id}`)
              }
            }}
            onDeleteClick={(_id) => {
              if (
                confirm(
                  'Are you sure you want to delete this API key? This action cannot be undone.',
                )
              ) {
                // Handle delete - would typically call the API
                router.refresh()
              }
            }}
          />
        )}

        {/* Empty State */}
        {!isLoadingKeys && apiKeys.length === 0 && (
          <Card className="border-dashed p-8 text-center">
            <Key className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              No API Keys Yet
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Create your first API key to enable programmatic access to your
              services.
            </p>
            <Link href="/settings/api-keys/new" className="mt-4 inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First API Key
              </Button>
            </Link>
          </Card>
        )}
      </PageContent>
    </>
  )
}
