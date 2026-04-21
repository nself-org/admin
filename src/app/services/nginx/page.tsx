'use client'

import { PageShell } from '@/components/PageShell'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Globe,
  Lock,
  RefreshCw,
  Server,
  Settings,
  ShieldOff,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NginxRoute {
  server: string
  upstream: string
  ssl: boolean
}

interface NginxSSLCert {
  domain: string
  expiry: string
  issuer: string
  daysRemaining: number
}

type ServiceStatus = 'healthy' | 'unhealthy' | 'offline' | 'unknown'

interface NginxServiceData {
  status: ServiceStatus
  version: string
  routes: NginxRoute[]
  sslCerts: NginxSSLCert[]
  confDFiles: string[]
  error?: string
}

// ---------------------------------------------------------------------------
// UI state enum
// ---------------------------------------------------------------------------

type UIState =
  | 'loading'
  | 'empty'
  | 'error'
  | 'populated'
  | 'offline'
  | 'permission-denied'
  | 'rate-limited'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: ServiceStatus) {
  switch (status) {
    case 'healthy':
      return (
        <Badge
          className="flex items-center gap-1 bg-green-100 text-green-800"
          aria-label="Status: healthy"
        >
          <CheckCircle className="h-3 w-3" aria-hidden="true" />
          Healthy
        </Badge>
      )
    case 'unhealthy':
      return (
        <Badge
          className="flex items-center gap-1 bg-red-100 text-red-800"
          aria-label="Status: unhealthy"
        >
          <XCircle className="h-3 w-3" aria-hidden="true" />
          Unhealthy
        </Badge>
      )
    case 'offline':
      return (
        <Badge
          className="flex items-center gap-1 bg-gray-100 text-gray-700"
          aria-label="Status: offline"
        >
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          Offline
        </Badge>
      )
    default:
      return (
        <Badge
          className="flex items-center gap-1 bg-yellow-100 text-yellow-800"
          aria-label="Status: unknown"
        >
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          Unknown
        </Badge>
      )
  }
}

// ---------------------------------------------------------------------------
// Content component (wrapped in Suspense)
// ---------------------------------------------------------------------------

function NginxContent() {
  const [uiState, setUIState] = useState<UIState>('loading')
  const [data, setData] = useState<NginxServiceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/services/nginx', { cache: 'no-store' })

      if (res.status === 401 || res.status === 403) {
        setUIState('permission-denied')
        setRefreshing(false)
        return
      }
      if (res.status === 429) {
        setUIState('rate-limited')
        setRefreshing(false)
        return
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        if (body?.error?.toLowerCase().includes('offline')) {
          setUIState('offline')
        } else {
          setError(body?.error ?? `HTTP ${res.status}`)
          setUIState('error')
        }
        setRefreshing(false)
        return
      }

      const json = (await res.json()) as NginxServiceData
      setData(json)

      if (json.status === 'offline') {
        setUIState('offline')
      } else if (json.routes.length === 0 && json.sslCerts.length === 0) {
        setUIState('empty')
      } else {
        setUIState('populated')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setUIState('error')
    } finally {
      setRefreshing(false)
    }
  }, [])

  // Trigger fetch on first mount.
  if (uiState === 'loading' && !refreshing) {
    fetchData()
  }

  return (
    <div className="space-y-6" role="main" aria-label="Nginx service dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-indigo-500" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold text-white">Nginx</h1>
            <p className="text-sm text-gray-400">
              Reverse proxy and SSL terminator
            </p>
          </div>
          {data && statusBadge(data.status)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
            aria-label="Refresh Nginx data"
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="ghost" size="sm" aria-label="Nginx settings">
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* ── State rendering ── */}

      {uiState === 'loading' && (
        <ServiceDetailSkeleton aria-label="Loading Nginx data" />
      )}

      {uiState === 'empty' && (
        <Card className="border-dashed border-gray-700 bg-[#0F0F1A]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe
              className="mb-4 h-12 w-12 text-gray-500"
              aria-hidden="true"
            />
            <p className="text-gray-400">No routes configured yet.</p>
            <p className="mt-1 text-sm text-gray-500">
              Add routes via <code className="text-indigo-400">nself urls</code>{' '}
              or edit <code className="text-indigo-400">nginx/conf.d/</code>.
            </p>
          </CardContent>
        </Card>
      )}

      {uiState === 'error' && (
        <Card className="border-red-800 bg-[#0F0F1A]">
          <CardContent className="flex items-center gap-3 py-6">
            <XCircle className="h-6 w-6 text-red-400" aria-hidden="true" />
            <div>
              <p className="font-medium text-red-300">
                Failed to load Nginx data
              </p>
              <p className="text-sm text-gray-400">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={fetchData}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {uiState === 'offline' && (
        <Card className="border-gray-700 bg-[#0F0F1A]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle
              className="mb-4 h-12 w-12 text-yellow-500"
              aria-hidden="true"
            />
            <p className="font-medium text-yellow-300">Nginx is offline</p>
            <p className="mt-1 text-sm text-gray-400">
              Run <code className="text-indigo-400">nself start</code> to bring
              Nginx online.
            </p>
          </CardContent>
        </Card>
      )}

      {uiState === 'permission-denied' && (
        <Card className="border-yellow-800 bg-[#0F0F1A]">
          <CardContent className="flex items-center gap-3 py-6">
            <ShieldOff className="h-6 w-6 text-yellow-400" aria-hidden="true" />
            <p className="text-yellow-300">
              Permission denied. Check your nSelf Admin session.
            </p>
          </CardContent>
        </Card>
      )}

      {uiState === 'rate-limited' && (
        <Card className="border-orange-800 bg-[#0F0F1A]">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle
              className="h-6 w-6 text-orange-400"
              aria-hidden="true"
            />
            <p className="text-orange-300">
              Rate limited. Please wait and retry.
            </p>
          </CardContent>
        </Card>
      )}

      {uiState === 'populated' && data && (
        <>
          {/* Active Routes */}
          <Card className="border-gray-700 bg-[#0F0F1A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                Active Routes
              </CardTitle>
              <CardDescription className="text-gray-400">
                {data.routes.length} route
                {data.routes.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table aria-label="Nginx active routes">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Domain</TableHead>
                    <TableHead className="text-gray-400">Upstream</TableHead>
                    <TableHead className="text-gray-400">SSL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.routes.map((r) => (
                    <TableRow key={r.server}>
                      <TableCell className="font-mono text-sm text-white">
                        {r.server}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-300">
                        {r.upstream}
                      </TableCell>
                      <TableCell>
                        {r.ssl ? (
                          <Lock
                            className="h-4 w-4 text-green-400"
                            aria-label="SSL enabled"
                          />
                        ) : (
                          <ShieldOff
                            className="h-4 w-4 text-gray-500"
                            aria-label="SSL disabled"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* SSL Certificates */}
          <Card className="border-gray-700 bg-[#0F0F1A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Lock className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                SSL Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.sslCerts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No SSL certificates found.
                </p>
              ) : (
                <Table aria-label="SSL certificates">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-400">Domain</TableHead>
                      <TableHead className="text-gray-400">Expiry</TableHead>
                      <TableHead className="text-gray-400">Issuer</TableHead>
                      <TableHead className="text-gray-400">Days Left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sslCerts.map((c) => (
                      <TableRow key={c.domain}>
                        <TableCell className="font-mono text-sm text-white">
                          {c.domain}
                        </TableCell>
                        <TableCell className="text-sm text-gray-300">
                          {c.expiry}
                        </TableCell>
                        <TableCell className="text-sm text-gray-400">
                          {c.issuer}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              c.daysRemaining < 14
                                ? 'font-semibold text-red-400'
                                : 'text-gray-300'
                            }
                          >
                            {c.daysRemaining}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* conf.d fragments */}
          <Card className="border-gray-700 bg-[#0F0F1A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText
                  className="h-5 w-5 text-indigo-400"
                  aria-hidden="true"
                />
                conf.d Files
              </CardTitle>
              <CardDescription className="text-gray-400">
                Hand-managed Nginx configuration fragments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.confDFiles.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No conf.d fragments found.
                </p>
              ) : (
                <ul className="space-y-1" aria-label="conf.d file list">
                  {data.confDFiles.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <FileText
                        className="h-4 w-4 text-gray-500"
                        aria-hidden="true"
                      />
                      <span className="font-mono text-sm text-gray-300">
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export default function NginxPage() {
  return (
    <PageShell>
      <Suspense fallback={<ServiceDetailSkeleton />}>
        <NginxContent />
      </Suspense>
    </PageShell>
  )
}
