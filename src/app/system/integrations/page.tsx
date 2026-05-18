'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { ListSkeleton } from '@/components/skeletons'
import { Check, ExternalLink, GitBranch, Github, Loader2, Puzzle, Settings, X } from 'lucide-react'
import { Suspense, useState } from 'react'

interface Integration {
  id: string
  name: string
  description: string
  icon: any
  connected: boolean
  config?: Record<string, any>
}

function SystemIntegrationsContent() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'github',
      name: 'GitHub',
      description: 'Connect to GitHub repositories',
      icon: Github,
      connected: false,
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      description: 'Connect to GitLab projects',
      icon: GitBranch,
      connected: false,
    },
  ])

  const [connecting, setConnecting] = useState<string | null>(null)

  const connectIntegration = async (id: string) => {
    setConnecting(id)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIntegrations((prev) => prev.map((i) => (i.id === id ? { ...i, connected: true } : i)))
    setConnecting(null)
  }

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-zinc-900 dark:text-white">
            <Puzzle className="h-8 w-8 text-blue-500" />
            Integrations
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Connect external services and tools
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            const Icon = integration.icon
            return (
              <div
                key={integration.id}
                className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
                    <div>
                      <h3 className="font-semibold">{integration.name}</h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  {integration.connected ? (
                    <span className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      <Check className="h-3 w-3" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      <X className="h-3 w-3" />
                      Not Connected
                    </span>
                  )}
                </div>

                <Button
                  onClick={() => connectIntegration(integration.id)}
                  disabled={integration.connected || connecting === integration.id}
                  className="w-full text-sm"
                  variant={integration.connected ? 'outline' : 'primary'}
                >
                  {connecting === integration.id ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Connecting...
                    </>
                  ) : integration.connected ? (
                    <>
                      <Settings className="mr-2 h-3 w-3" />
                      Configure
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-3 w-3" />
                      Connect
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default function SystemIntegrationsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <SystemIntegrationsContent />
    </Suspense>
  )
}
