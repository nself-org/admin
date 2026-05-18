'use client'

import { FormSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle, Globe, Loader2, Save, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface CorsConfig {
  allowedOrigins: string
  hasuraCors: string
  authClientUrl: string
}

type PageState = 'loading' | 'empty' | 'error' | 'partial' | 'success' | 'offline' | 'unauth'

function CorsContent() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [config, setConfig] = useState<CorsConfig>({
    allowedOrigins: '',
    hasuraCors: '*',
    authClientUrl: '',
  })
  const [form, setForm] = useState<CorsConfig>({
    allowedOrigins: '',
    hasuraCors: '*',
    authClientUrl: '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [buildStatus, setBuildStatus] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isDirty, setIsDirty] = useState(false)

  const load = useCallback(async () => {
    setPageState('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/config/cors')
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
        setErrorMessage(data.error || 'Failed to load CORS configuration')
        return
      }
      const cors: CorsConfig = data.cors
      setConfig(cors)
      setForm(cors)
      // If all values are empty/default, show empty state
      const hasAnyValue =
        cors.allowedOrigins || (cors.hasuraCors && cors.hasuraCors !== '*') || cors.authClientUrl
      setPageState(hasAnyValue ? 'success' : 'empty')
    } catch (_err) {
      // Network failure → offline
      setPageState('offline')
      setErrorMessage('Cannot reach admin API. Check your network connection.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleFormChange = (field: keyof CorsConfig, value: string) => {
    const updated = { ...form, [field]: value }
    setForm(updated)
    setIsDirty(
      updated.allowedOrigins !== config.allowedOrigins ||
        updated.hasuraCors !== config.hasuraCors ||
        updated.authClientUrl !== config.authClientUrl
    )
    setSaveError(null)
    setSaveSuccess(false)
    setBuildStatus(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    setBuildStatus(null)
    try {
      const res = await fetch('/api/config/cors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowedOrigins: form.allowedOrigins,
          hasuraCors: form.hasuraCors,
          authClientUrl: form.authClientUrl,
        }),
      })
      if (res.status === 401) {
        setPageState('unauth')
        return
      }
      const data = await res.json()
      if (!data.success) {
        setSaveError(data.error || 'Failed to save CORS configuration')
        return
      }
      setConfig(form)
      setIsDirty(false)
      setSaveSuccess(true)
      if (data.buildTriggered) {
        setBuildStatus('nself build triggered — Nginx and Hasura CORS config updated.')
      }
      setPageState('success')
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
        <p className="text-muted-foreground text-sm">Please log in to manage CORS configuration.</p>
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
        <p className="text-lg font-medium">Failed to load CORS configuration</p>
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

  // ── States: empty / partial / success ─────────────────────────────────────
  const origins = form.allowedOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Globe className="h-6 w-6" />
          CORS Configuration
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure Cross-Origin Resource Sharing for Nginx, Hasura, and the Auth service. Changes
          trigger <code className="bg-muted rounded px-1 text-xs">nself build</code> to apply.
        </p>
      </div>

      {pageState === 'empty' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No CORS configuration found. Default values are shown. Save to write initial
            configuration.
          </AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            CORS configuration saved.
            {buildStatus && <span className="mt-1 block text-xs">{buildStatus}</span>}
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* Allowed Origins */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allowed Origins</CardTitle>
          <CardDescription>
            Comma-separated list of origins permitted by Nginx CORS headers. Use{' '}
            <code className="bg-muted rounded px-1 text-xs">*</code> to allow all origins (not
            recommended for production).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="allowed-origins">CORS_ALLOWED_ORIGINS</Label>
            <Textarea
              id="allowed-origins"
              className="mt-1 font-mono text-sm"
              rows={4}
              placeholder="https://app.example.com, https://admin.example.com"
              value={form.allowedOrigins}
              onChange={(e) => handleFormChange('allowedOrigins', e.target.value)}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Each entry must be a valid http:// or https:// URL, or the wildcard *.
            </p>
          </div>

          {origins.length > 0 && (
            <div>
              <Label className="text-muted-foreground text-xs">Parsed origins</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {origins.map((origin) => (
                  <Badge key={origin} variant="secondary" className="font-mono text-xs">
                    {origin}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hasura CORS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hasura GraphQL CORS</CardTitle>
          <CardDescription>
            CORS domain allowlist passed to Hasura via{' '}
            <code className="bg-muted rounded px-1 text-xs">HASURA_GRAPHQL_CORS_DOMAIN</code>. Use{' '}
            <code className="bg-muted rounded px-1 text-xs">*</code> during development.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="hasura-cors">HASURA_GRAPHQL_CORS_DOMAIN</Label>
          <Input
            id="hasura-cors"
            className="mt-1 font-mono text-sm"
            placeholder="*"
            value={form.hasuraCors}
            onChange={(e) => handleFormChange('hasuraCors', e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Auth Client URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auth Client URL</CardTitle>
          <CardDescription>
            The client URL the Auth service will allow redirects to. Set to your frontend&apos;s
            base URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="auth-client-url">AUTH_CLIENT_URL</Label>
          <Input
            id="auth-client-url"
            className="mt-1 font-mono text-sm"
            placeholder="https://app.example.com"
            value={form.authClientUrl}
            onChange={(e) => handleFormChange('authClientUrl', e.target.value)}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Must be a valid http:// or https:// URL.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button onClick={handleSave} disabled={saving || !isDirty} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save & Apply'}
        </Button>
        {isDirty && <span className="text-muted-foreground text-xs">You have unsaved changes</span>}
      </div>
    </div>
  )
}

export default function Page() {
  return <CorsContent />
}
