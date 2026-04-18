'use client'

import {
  Activity,
  BarChart3,
  ExternalLink,
  FileText,
  Loader2,
  Server,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface ObservabilityLink {
  id: string
  label: string
  description: string
  url: string
  icon: React.ComponentType<{ className?: string }>
  port: number
  supportsIframe: boolean
}

const LINKS: ObservabilityLink[] = [
  {
    id: 'grafana',
    label: 'Grafana',
    description: 'Dashboards for metrics, logs, and traces',
    url: 'http://localhost:3000',
    icon: BarChart3,
    port: 3000,
    supportsIframe: true,
  },
  {
    id: 'prometheus',
    label: 'Prometheus',
    description: 'Metrics scraping and alerting rules',
    url: 'http://localhost:9090',
    icon: Activity,
    port: 9090,
    supportsIframe: true,
  },
  {
    id: 'loki',
    label: 'Loki',
    description: 'Log aggregation (read-only via Grafana)',
    url: 'http://localhost:3100',
    icon: FileText,
    port: 3100,
    supportsIframe: false,
  },
  {
    id: 'tempo',
    label: 'Tempo',
    description: 'Distributed traces',
    url: 'http://localhost:3200',
    icon: Server,
    port: 3200,
    supportsIframe: false,
  },
  {
    id: 'alertmanager',
    label: 'Alertmanager',
    description: 'Alert routing and silences',
    url: 'http://localhost:9093',
    icon: Activity,
    port: 9093,
    supportsIframe: true,
  },
]

function LinkCard({
  link,
  onPreview,
  reachable,
  probing,
}: {
  link: ObservabilityLink
  onPreview: (link: ObservabilityLink) => void
  reachable: boolean | null
  probing: boolean
}) {
  const Icon = link.icon
  return (
    <div className="glass-card space-y-3 p-4">
      <div className="flex items-center gap-3">
        <div className="bg-nself-primary/15 flex h-9 w-9 items-center justify-center rounded-lg">
          <Icon className="text-nself-primary h-4 w-4" />
        </div>
        <div className="flex-1">
          <h3 className="text-nself-text text-sm font-semibold">
            {link.label}
          </h3>
          <p className="text-nself-text-muted text-xs">{link.description}</p>
        </div>
        {probing ? (
          <Loader2 className="text-nself-text-muted h-4 w-4 animate-spin" />
        ) : reachable === null ? (
          <span className="bg-nself-text-muted h-2 w-2 rounded-full" />
        ) : reachable ? (
          <span
            className="h-2 w-2 rounded-full bg-green-400"
            title="Reachable"
          />
        ) : (
          <span
            className="h-2 w-2 rounded-full bg-red-400"
            title="Unreachable"
          />
        )}
      </div>
      <p className="text-nself-text-muted font-mono text-xs">{link.url}</p>
      <div className="flex gap-2">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </a>
        {link.supportsIframe && (
          <button
            type="button"
            onClick={() => onPreview(link)}
            className="bg-nself-primary/20 border-nself-primary/40 text-nself-primary hover:bg-nself-primary/30 flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Preview
          </button>
        )}
      </div>
    </div>
  )
}

export default function ObservabilityPage() {
  const [active, setActive] = useState<ObservabilityLink | null>(null)
  const [reach, setReach] = useState<Record<string, boolean>>({})
  const [probing, setProbing] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function probe(link: ObservabilityLink) {
      setProbing((p) => ({ ...p, [link.id]: true }))
      try {
        await fetch(link.url, { mode: 'no-cors', cache: 'no-store' })
        setReach((r) => ({ ...r, [link.id]: true }))
      } catch {
        setReach((r) => ({ ...r, [link.id]: false }))
      } finally {
        setProbing((p) => ({ ...p, [link.id]: false }))
      }
    }
    for (const link of LINKS) {
      probe(link)
    }
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <div>
        <h1 className="nself-gradient-text text-xl font-semibold">
          Observability
        </h1>
        <p className="text-nself-text-muted text-xs">
          Passthrough links to the monitoring bundle. Each tool runs locally in
          your nself stack.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((link) => (
          <LinkCard
            key={link.id}
            link={link}
            onPreview={setActive}
            reachable={reach[link.id] ?? null}
            probing={probing[link.id] ?? false}
          />
        ))}
      </div>

      {active !== null && (
        <div className="glass-card overflow-hidden p-0">
          <div className="border-nself-border flex items-center justify-between border-b px-4 py-2">
            <div className="flex items-center gap-2">
              <active.icon className="text-nself-primary h-4 w-4" />
              <span className="text-nself-text text-sm font-semibold">
                {active.label} Preview
              </span>
              <span className="text-nself-text-muted font-mono text-xs">
                {active.url}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text rounded-lg border px-3 py-1 text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
          <iframe
            title={`${active.label} embedded view`}
            src={active.url}
            className="bg-nself-bg h-[70vh] w-full"
          />
        </div>
      )}
    </div>
  )
}
