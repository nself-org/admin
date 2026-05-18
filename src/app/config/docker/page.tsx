'use client'

import { FormSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertCircle,
  CheckCircle,
  Container,
  Loader2,
  Pencil,
  Save,
  WifiOff,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface DockerService {
  version: string
  port?: string
  sslPort?: string
  uiPort?: string
  smtpPort?: string
}

interface DockerServices {
  postgres: DockerService
  hasura: DockerService
  auth: DockerService
  storage: DockerService
  nginx: DockerService
  redis: DockerService
  mailpit: DockerService
}

interface DockerConfig {
  services: DockerServices
  raw: Record<string, string>
}

type PageState = 'loading' | 'empty' | 'error' | 'partial' | 'success' | 'offline' | 'unauth'
type EditingService = keyof DockerServices | null

const SERVICE_LABELS: Record<keyof DockerServices, string> = {
  postgres: 'PostgreSQL',
  hasura: 'Hasura',
  auth: 'Auth (nHost)',
  storage: 'Storage',
  nginx: 'Nginx',
  redis: 'Redis',
  mailpit: 'Mailpit',
}

const SERVICE_ENV_MAP: Record<
  keyof DockerServices,
  { version: string; port?: string; sslPort?: string; uiPort?: string; smtpPort?: string }
> = {
  postgres: { version: 'POSTGRES_VERSION', port: 'POSTGRES_PORT' },
  hasura: { version: 'HASURA_VERSION' },
  auth: { version: 'AUTH_VERSION', port: 'AUTH_PORT' },
  storage: { version: 'STORAGE_VERSION' },
  nginx: { version: 'NGINX_VERSION', port: 'NGINX_PORT', sslPort: 'NGINX_SSL_PORT' },
  redis: { version: 'REDIS_VERSION', port: 'REDIS_PORT' },
  mailpit: { version: 'MAILPIT_VERSION', uiPort: 'MAILPIT_UI_PORT', smtpPort: 'MAILPIT_SMTP_PORT' },
}

function ServiceCard({
  name,
  label,
  service,
  onEdit,
}: {
  name: keyof DockerServices
  label: string
  service: DockerService
  onEdit: (name: keyof DockerServices) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{label}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(name)}
            aria-label={`Edit ${label} configuration`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Version</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {service.version}
          </Badge>
        </div>
        {service.port && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Port</span>
            <Badge variant="outline" className="font-mono text-xs">
              {service.port}
            </Badge>
          </div>
        )}
        {service.sslPort && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">SSL Port</span>
            <Badge variant="outline" className="font-mono text-xs">
              {service.sslPort}
            </Badge>
          </div>
        )}
        {service.uiPort && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">UI Port</span>
            <Badge variant="outline" className="font-mono text-xs">
              {service.uiPort}
            </Badge>
          </div>
        )}
        {service.smtpPort && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">SMTP Port</span>
            <Badge variant="outline" className="font-mono text-xs">
              {service.smtpPort}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DockerContent() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [dockerConfig, setDockerConfig] = useState<DockerConfig | null>(null)
  const [editingService, setEditingService] = useState<EditingService>(null)
  const [editForm, setEditForm] = useState<DockerService>({ version: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const load = useCallback(async () => {
    setPageState('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/config/docker')
      if (res.status === 401) {
        setPageState('unauth')
        return
      }
      if (!res.ok) {
        setPageState('error')
        setErrorMessage(`Server returned ${res.status}`)
        return
      }
      const data = await res.json()
      if (!data.success) {
        setPageState('error')
        setErrorMessage(data.error || 'Failed to load Docker configuration')
        return
      }
      setDockerConfig(data.docker)
      setPageState('success')
    } catch (_err) {
      setPageState('offline')
      setErrorMessage('Cannot reach admin API. Check your network connection.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const startEdit = (name: keyof DockerServices) => {
    if (!dockerConfig) return
    setEditingService(name)
    setEditForm({ ...dockerConfig.services[name] })
    setSaveError(null)
    setSaveSuccess(null)
  }

  const cancelEdit = () => {
    setEditingService(null)
    setEditForm({ version: '' })
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!editingService || !dockerConfig) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      // Build updates map from env key names
      const envMap = SERVICE_ENV_MAP[editingService]
      const updates: Record<string, string> = {}
      if (editForm.version) updates[envMap.version] = editForm.version
      if (envMap.port && editForm.port) updates[envMap.port] = editForm.port
      if (envMap.sslPort && editForm.sslPort) updates[envMap.sslPort] = editForm.sslPort
      if (envMap.uiPort && editForm.uiPort) updates[envMap.uiPort] = editForm.uiPort
      if (envMap.smtpPort && editForm.smtpPort) updates[envMap.smtpPort] = editForm.smtpPort

      const res = await fetch('/api/config/docker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      if (res.status === 401) {
        setPageState('unauth')
        return
      }
      const data = await res.json()
      if (!data.success) {
        setSaveError(data.error || 'Failed to save Docker configuration')
        return
      }
      setEditingService(null)
      setSaveSuccess(data.message || 'Saved. Run nself build to apply changes.')
      await load()
    } catch (_err) {
      setSaveError('Network error — could not save configuration')
    } finally {
      setSaving(false)
    }
  }

  // ── State: unauth ──────────────────────────────────────────────────────────
  if (pageState === 'unauth') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="text-destructive h-10 w-10" />
        <p className="text-lg font-medium">Not authenticated</p>
        <p className="text-muted-foreground text-sm">
          Please log in to manage Docker configuration.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = '/login'
          }}
        >
          Go to Login
        </Button>
      </div>
    )
  }

  // ── State: offline ─────────────────────────────────────────────────────────
  if (pageState === 'offline') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <WifiOff className="text-muted-foreground h-10 w-10" />
        <p className="text-lg font-medium">Cannot connect to admin API</p>
        <p className="text-muted-foreground text-sm">{errorMessage}</p>
        <Button variant="outline" onClick={load}>
          Retry
        </Button>
      </div>
    )
  }

  // ── State: error ───────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="text-destructive h-10 w-10" />
        <p className="text-lg font-medium">Failed to load Docker configuration</p>
        <p className="text-muted-foreground text-sm">{errorMessage}</p>
        <Button variant="outline" onClick={load}>
          Retry
        </Button>
      </div>
    )
  }

  // ── State: loading ─────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return <FormSkeleton />
  }

  if (!dockerConfig) return null

  const services = dockerConfig.services

  // ── States: empty / partial / success ─────────────────────────────────────
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Container className="h-6 w-6" />
          Docker Configuration
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          View and edit service image versions and port mappings. Changes are saved to{' '}
          <code className="bg-muted rounded px-1 text-xs">.env.dev</code> — run{' '}
          <code className="bg-muted rounded px-1 text-xs">nself build</code> to apply.
        </p>
      </div>

      {saveSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            {saveSuccess}
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Edit panel */}
      {editingService && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Edit {SERVICE_LABELS[editingService]}</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Edit image version and port mappings for {SERVICE_LABELS[editingService]}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="edit-version">{SERVICE_ENV_MAP[editingService].version}</Label>
              <Input
                id="edit-version"
                className="mt-1 font-mono text-sm"
                placeholder="e.g. 15, latest, alpine"
                value={editForm.version}
                onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
              />
            </div>
            {SERVICE_ENV_MAP[editingService].port !== undefined && (
              <div>
                <Label htmlFor="edit-port">{SERVICE_ENV_MAP[editingService].port}</Label>
                <Input
                  id="edit-port"
                  className="mt-1 font-mono text-sm"
                  placeholder="Port number"
                  value={editForm.port ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, port: e.target.value })}
                />
              </div>
            )}
            {SERVICE_ENV_MAP[editingService].sslPort !== undefined && (
              <div>
                <Label htmlFor="edit-sslport">{SERVICE_ENV_MAP[editingService].sslPort}</Label>
                <Input
                  id="edit-sslport"
                  className="mt-1 font-mono text-sm"
                  placeholder="SSL port number"
                  value={editForm.sslPort ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, sslPort: e.target.value })}
                />
              </div>
            )}
            {SERVICE_ENV_MAP[editingService].uiPort !== undefined && (
              <div>
                <Label htmlFor="edit-uiport">{SERVICE_ENV_MAP[editingService].uiPort}</Label>
                <Input
                  id="edit-uiport"
                  className="mt-1 font-mono text-sm"
                  placeholder="UI port number"
                  value={editForm.uiPort ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, uiPort: e.target.value })}
                />
              </div>
            )}
            {SERVICE_ENV_MAP[editingService].smtpPort !== undefined && (
              <div>
                <Label htmlFor="edit-smtpport">{SERVICE_ENV_MAP[editingService].smtpPort}</Label>
                <Input
                  id="edit-smtpport"
                  className="mt-1 font-mono text-sm"
                  placeholder="SMTP port number"
                  value={editForm.smtpPort ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, smtpPort: e.target.value })}
                />
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(services) as Array<keyof DockerServices>).map((name) => (
          <ServiceCard
            key={name}
            name={name}
            label={SERVICE_LABELS[name]}
            service={services[name]}
            onEdit={startEdit}
          />
        ))}
      </div>

      {/* Raw vars (advanced) */}
      {Object.keys(dockerConfig.raw).length > 0 && (
        <details className="group">
          <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 text-sm">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:inline">▼</span>
            Advanced — raw env vars
          </summary>
          <div className="bg-muted/50 mt-3 rounded-md border p-3">
            <dl className="space-y-1">
              {Object.entries(dockerConfig.raw).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 font-mono text-xs">
                  <dt className="text-muted-foreground shrink-0">{key}</dt>
                  <dd className="text-foreground">{val}</dd>
                </div>
              ))}
            </dl>
          </div>
        </details>
      )}
    </div>
  )
}

export default function Page() {
  return <DockerContent />
}
