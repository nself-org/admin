'use client'

import { ApiKeyForm, ApiKeySecretDisplay } from '@/components/api-keys'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { useCreateApiKey } from '@/hooks/useApiKeys'
import type { CreateApiKeyInput, CreateApiKeyResult } from '@/types/api-key'
import { ArrowLeft, Key, Shield } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewApiKeyPage() {
  const router = useRouter()
  const { createApiKey, isCreating, error } = useCreateApiKey()
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResult | null>(null)

  const handleSubmit = async (data: CreateApiKeyInput) => {
    try {
      const result = await createApiKey(data)
      if (result) {
        setCreatedKey(result)
      }
    } catch (_err) {
      // Error is handled by the hook
    }
  }

  const handleDismiss = () => {
    // Navigate to the newly created key's detail page
    if (createdKey) {
      router.push(`/settings/api-keys/${createdKey.key.id}`)
    } else {
      router.push('/settings/api-keys')
    }
  }

  // Show the secret display after successful creation
  if (createdKey) {
    return (
      <>
        <PageHeader
          title="API Key Created"
          description="Your new API key has been created successfully"
          breadcrumbs={[
            { label: 'Settings', href: '/settings' },
            { label: 'API Keys', href: '/settings/api-keys' },
            { label: 'New Key' },
          ]}
        />
        <PageContent>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Key className="h-5 w-5" />
                API Key Created Successfully
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ApiKeySecretDisplay
                secretKey={createdKey.secretKey}
                keyName={createdKey.key.name}
                onDismiss={handleDismiss}
                onCopy={() => {
                  // Optional: Track copy event
                }}
              />
            </CardContent>
          </Card>
        </PageContent>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Create API Key"
        description="Create a new API key for programmatic access"
        breadcrumbs={[
          { label: 'Settings', href: '/settings' },
          { label: 'API Keys', href: '/settings/api-keys' },
          { label: 'Create New' },
        ]}
        actions={
          <Link href="/settings/api-keys">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />
      <PageContent>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form Card - Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Key Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
                    {error}
                  </div>
                )}
                <ApiKeyForm
                  onSubmit={handleSubmit}
                  onCancel={() => router.push('/settings/api-keys')}
                  isLoading={isCreating}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Help & Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-5 w-5" />
                  Security Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                <p>
                  <strong>Name your keys descriptively</strong> so you can
                  easily identify what each key is used for.
                </p>
                <p>
                  <strong>Use the minimum required scope.</strong> Only grant
                  the permissions your application actually needs.
                </p>
                <p>
                  <strong>Set an expiration date</strong> for keys that are only
                  needed temporarily.
                </p>
                <p>
                  <strong>Use IP whitelisting</strong> when possible to restrict
                  which IP addresses can use the key.
                </p>
                <p>
                  <strong>Rotate keys regularly</strong> and revoke any keys
                  that are no longer in use.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scope Descriptions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    Read Only
                  </span>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    Can only read data. Cannot create, update, or delete
                    resources.
                  </p>
                </div>
                <div>
                  <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                    Read & Write
                  </span>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    Can read and modify data. Can create, update, and delete
                    resources.
                  </p>
                </div>
                <div>
                  <span className="inline-block rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-600 dark:bg-sky-900 dark:text-sky-300">
                    Admin
                  </span>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    Full administrative access. Can manage settings and other
                    API keys.
                  </p>
                </div>
                <div>
                  <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    Custom
                  </span>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                    Custom permissions. Define exactly which resources and
                    actions are allowed.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rate Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <p>
                  Rate limits protect your API from abuse. Choose a limit that
                  matches your expected usage:
                </p>
                <ul className="list-inside list-disc space-y-1">
                  <li>
                    <strong>100/min</strong> - Good for low-traffic applications
                  </li>
                  <li>
                    <strong>1000/min</strong> - Standard for most applications
                  </li>
                  <li>
                    <strong>10000/hour</strong> - For batch processing
                  </li>
                  <li>
                    <strong>Unlimited</strong> - No rate limiting (use with
                    caution)
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  )
}
