'use client'

import { ApiKeyUsageChart } from '@/components/api-keys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useApiKey,
  useApiKeyRateLimit,
  useDeleteApiKey,
  useRevokeApiKey,
} from '@/hooks/useApiKeys'
import type { ApiKeyScope, ApiKeyStatus } from '@/types/api-key'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  Key,
  Loader2,
  Pencil,
  Shield,
  ShieldOff,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const statusConfig: Record<
  ApiKeyStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
    className?: string
  }
> = {
  active: {
    label: 'Active',
    variant: 'default',
    className: 'bg-green-500 hover:bg-green-500/80',
  },
  inactive: { label: 'Inactive', variant: 'secondary' },
  expired: {
    label: 'Expired',
    variant: 'outline',
    className: 'border-amber-500 text-amber-600',
  },
  revoked: { label: 'Revoked', variant: 'destructive' },
}

const scopeConfig: Record<ApiKeyScope, { label: string; className: string }> = {
  read: {
    label: 'Read Only',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  write: {
    label: 'Read & Write',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
  admin: {
    label: 'Admin',
    className:
      'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  },
  custom: {
    label: 'Custom',
    className: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
}

export default function ApiKeyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const keyId = params.id as string

  const { apiKey, isLoading, isError, error, refresh } = useApiKey(keyId)
  const { rateLimit } = useApiKeyRateLimit(keyId)
  const { revokeApiKey, isRevoking } = useRevokeApiKey(keyId)
  const { deleteApiKey, isDeleting } = useDeleteApiKey(keyId)

  const [isEditing, setIsEditing] = useState(false)

  // Check if we should start in edit mode
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true)
    }
  }, [searchParams])

  const handleRevoke = async () => {
    if (
      !confirm(
        'Are you sure you want to revoke this API key? This action cannot be undone.',
      )
    ) {
      return
    }

    try {
      await revokeApiKey()
      refresh()
    } catch (_err) {
      alert('Failed to revoke API key')
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to permanently delete this API key? This action cannot be undone.',
      )
    ) {
      return
    }

    try {
      await deleteApiKey()
      router.push('/settings/api-keys')
    } catch (_err) {
      alert('Failed to delete API key')
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="API Key Details"
          breadcrumbs={[
            { label: 'Settings', href: '/settings' },
            { label: 'API Keys', href: '/settings/api-keys' },
            { label: 'Loading...' },
          ]}
        />
        <PageContent>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </PageContent>
      </>
    )
  }

  if (isError || !apiKey) {
    return (
      <>
        <PageHeader
          title="API Key Not Found"
          breadcrumbs={[
            { label: 'Settings', href: '/settings' },
            { label: 'API Keys', href: '/settings/api-keys' },
            { label: 'Error' },
          ]}
        />
        <PageContent>
          <Card className="border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-4 text-lg font-semibold text-red-600 dark:text-red-400">
              {error || 'API Key Not Found'}
            </h3>
            <p className="mt-2 text-sm text-red-500 dark:text-red-400">
              The API key you are looking for does not exist or you do not have
              permission to view it.
            </p>
            <Link href="/settings/api-keys" className="mt-4 inline-block">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to API Keys
              </Button>
            </Link>
          </Card>
        </PageContent>
      </>
    )
  }

  const statusStyle = statusConfig[apiKey.status]
  const scopeStyle = scopeConfig[apiKey.scope]
  const maskedKey = `nself_pk_${apiKey.keyPrefix}****`
  const isDisabled = apiKey.status === 'revoked' || apiKey.status === 'expired'

  return (
    <>
      <PageHeader
        title={apiKey.name}
        description={apiKey.description || 'API key for programmatic access'}
        breadcrumbs={[
          { label: 'Settings', href: '/settings' },
          { label: 'API Keys', href: '/settings/api-keys' },
          { label: apiKey.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {!isDisabled && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                  onClick={handleRevoke}
                  disabled={isRevoking}
                >
                  {isRevoking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldOff className="mr-2 h-4 w-4" />
                  )}
                  Revoke
                </Button>
              </>
            )}
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </div>
        }
      />
      <PageContent>
        {/* Key Overview Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Key Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Status
                  </p>
                  <Badge
                    variant={statusStyle.variant}
                    className={statusStyle.className}
                  >
                    {statusStyle.label}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Scope
                  </p>
                  <Badge variant="outline" className={scopeStyle.className}>
                    {scopeStyle.label}
                  </Badge>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Key Prefix
                  </p>
                  <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-sm dark:bg-zinc-800">
                    {maskedKey}
                  </code>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Created
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-zinc-400" />
                    {format(new Date(apiKey.createdAt), 'PPp')}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Total Requests
                  </p>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-zinc-400" />
                    <span className="text-lg font-semibold">
                      {apiKey.usageCount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Last Used
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-zinc-400" />
                    {apiKey.lastUsedAt ? (
                      formatDistanceToNow(new Date(apiKey.lastUsedAt), {
                        addSuffix: true,
                      })
                    ) : (
                      <span className="text-zinc-400">Never used</span>
                    )}
                  </div>
                </div>

                {apiKey.expiresAt && (
                  <div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Expires
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-zinc-400" />
                      {format(new Date(apiKey.expiresAt), 'PPp')}
                    </div>
                  </div>
                )}

                {apiKey.lastUsedIp && (
                  <div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Last Used From
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-zinc-400" />
                      <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                        {apiKey.lastUsedIp}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rate Limit Status */}
        {apiKey.rateLimit && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Rate Limit Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Configured Limit
                  </p>
                  <p className="text-lg font-semibold">
                    {apiKey.rateLimit.requests.toLocaleString()} requests /{' '}
                    {apiKey.rateLimit.window}s
                  </p>
                </div>

                {rateLimit && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Current Usage
                      </p>
                      <p className="text-lg font-semibold">
                        {rateLimit.currentRequests.toLocaleString()} /{' '}
                        {rateLimit.limit.toLocaleString()}
                      </p>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <div
                          className={`h-full transition-all ${
                            rateLimit.isLimited
                              ? 'bg-red-500'
                              : rateLimit.currentRequests / rateLimit.limit >
                                  0.8
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min((rateLimit.currentRequests / rateLimit.limit) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        Resets In
                      </p>
                      <p className="text-lg font-semibold">
                        {formatDistanceToNow(new Date(rateLimit.resetAt))}
                      </p>
                      {rateLimit.isLimited && (
                        <Badge variant="destructive" className="mt-1">
                          Rate Limited
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* IP Whitelist */}
        {apiKey.allowedIps && apiKey.allowedIps.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                IP Whitelist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {apiKey.allowedIps.map((ip) => (
                  <code
                    key={ip}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
                  >
                    {ip}
                  </code>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Usage Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApiKeyUsageChart keyId={keyId} />
          </CardContent>
        </Card>
      </PageContent>
    </>
  )
}
