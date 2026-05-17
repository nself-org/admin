'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, CheckCircle, Gauge, Loader2, Save, WifiOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { FormSkeleton } from '@/components/skeletons'

interface RateLimits {
  apiEnabled: string
  apiRequests: string
  apiWindow: string
  globalEnabled: string
  globalMaxRequests: string
  globalWindowSeconds: string
  globalBurst: string
}

type PageState = 'loading' | 'empty' | 'error' | 'partial' | 'success' | 'offline' | 'unauth'

function RateLimitsContent() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [config, setConfig] = useState<RateLimits>({
    apiEnabled: 'true',
    apiRequests: '100',
    apiWindow: '60',
    globalEnabled: 'true',
    globalMaxRequests: '100',
    globalWindowSeconds: '60',
    globalBurst: '20',
  })
  const [form, setForm] = useState<RateLimits>({
    apiEnabled: 'true',
    apiRequests: '100',
    apiWindow: '60',
    globalEnabled: 'true',
    globalMaxRequests: '100',
    globalWindowSeconds: '60',
    globalBurst: '20',
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
      const res = await fetch('/api/config/rate-limits')
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
        setErrorMessage(data.error || 'Failed to load rate limit configuration')
        return
      }
      const rl: RateLimits = data.rateLimits
      setConfig(rl)
      setForm(rl)
      setPageState('success')
    } catch (_err) {
      setPageState('offline')
      setErrorMessage('Cannot reach admin API. Check your network connection.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const markDirty = (updated: RateLimits) => {
    setIsDirty(
      updated.apiEnabled !== config.apiEnabled ||
      updated.apiRequests !== config.apiRequests ||
      updated.apiWindow !== config.apiWindow ||
      updated.globalEnabled !== config.globalEnabled ||
      updated.globalMaxRequests !== config.globalMaxRequests ||
      updated.globalWindowSeconds !== config.globalWindowSeconds ||
      updated.globalBurst !== config.globalBurst
    )
  }

  const handleField = (field: keyof RateLimits, value: string) => {
    const updated = { ...form, [field]: value }
    setForm(updated)
    markDirty(updated)
    setSaveError(null)
    setSaveSuccess(false)
    setBuildStatus(null)
  }

  const handleToggle = (field: 'apiEnabled' | 'globalEnabled', checked: boolean) => {
    handleField(field, checked ? 'true' : 'false')
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    setBuildStatus(null)
    try {
      const res = await fetch('/api/config/rate-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiEnabled: form.apiEnabled,
          apiRequests: form.apiRequests,
          apiWindow: form.apiWindow,
          globalEnabled: form.globalEnabled,
          globalMaxRequests: form.globalMaxRequests,
          globalWindowSeconds: form.globalWindowSeconds,
          globalBurst: form.globalBurst,
        }),
      })
      if (res.status === 401) {
        setPageState('unauth')
        return
      }
      const data = await res.json()
      if (!data.success) {
        setSaveError(data.error || 'Failed to save rate limit configuration')
        return
      }
      setConfig(form)
      setIsDirty(false)
      setSaveSuccess(true)
      if (data.buildTriggered) {
        setBuildStatus('nself build triggered — Nginx rate limit config updated.')
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
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">Not authenticated</p>
        <p className="text-sm text-muted-foreground">Please log in to manage rate limit configuration.</p>
        <Button variant="outline" onClick={() => { window.location.href = '/login' }}>Go to Login</Button>
      </div>
    )
  }

  // ── State: offline ─────────────────────────────────────────────────────────
  if (pageState === 'offline') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">Cannot connect to admin API</p>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button variant="outline" onClick={load}>Retry</Button>
      </div>
    )
  }

  // ── State: error ───────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">Failed to load rate limit configuration</p>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button variant="outline" onClick={load}>Retry</Button>
      </div>
    )
  }

  // ── State: loading ─────────────────────────────────────────────────────────
  if (pageState === 'loading') {
    return <FormSkeleton />
  }

  // ── States: empty / partial / success ─────────────────────────────────────
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gauge className="h-6 w-6" />
          Rate Limits
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure request rate limiting for the API and global Nginx traffic.
          Changes trigger <code className="text-xs bg-muted px-1 rounded">nself build</code> to apply.
        </p>
      </div>

      {saveSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            Rate limit configuration saved.
            {buildStatus && <span className="block text-xs mt-1">{buildStatus}</span>}
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {/* API Rate Limits */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">API Rate Limits</CardTitle>
              <CardDescription className="mt-1">
                Per-client request limits applied by the application middleware.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Label htmlFor="api-enabled" className="text-sm text-muted-foreground">Enabled</Label>
              <Switch
                id="api-enabled"
                checked={form.apiEnabled === 'true'}
                onCheckedChange={(c) => handleToggle('apiEnabled', c)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="api-requests">API_RATE_LIMIT_REQUESTS</Label>
              <Input
                id="api-requests"
                className="mt-1 font-mono text-sm"
                type="number"
                min="1"
                placeholder="100"
                disabled={form.apiEnabled !== 'true'}
                value={form.apiRequests}
                onChange={(e) => handleField('apiRequests', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Max requests per window</p>
            </div>
            <div>
              <Label htmlFor="api-window">API_RATE_LIMIT_WINDOW</Label>
              <Input
                id="api-window"
                className="mt-1 font-mono text-sm"
                type="number"
                min="1"
                placeholder="60"
                disabled={form.apiEnabled !== 'true'}
                value={form.apiWindow}
                onChange={(e) => handleField('apiWindow', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Window duration in seconds</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nginx / Global Rate Limits */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Nginx Rate Limits</CardTitle>
              <CardDescription className="mt-1">
                Global rate limiting applied at the Nginx reverse-proxy level. Applies to all traffic.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Label htmlFor="global-enabled" className="text-sm text-muted-foreground">Enabled</Label>
              <Switch
                id="global-enabled"
                checked={form.globalEnabled === 'true'}
                onCheckedChange={(c) => handleToggle('globalEnabled', c)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="global-max">RATE_LIMIT_MAX_REQUESTS</Label>
              <Input
                id="global-max"
                className="mt-1 font-mono text-sm"
                type="number"
                min="1"
                placeholder="100"
                disabled={form.globalEnabled !== 'true'}
                value={form.globalMaxRequests}
                onChange={(e) => handleField('globalMaxRequests', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Max requests/window</p>
            </div>
            <div>
              <Label htmlFor="global-window">RATE_LIMIT_WINDOW_SECONDS</Label>
              <Input
                id="global-window"
                className="mt-1 font-mono text-sm"
                type="number"
                min="1"
                placeholder="60"
                disabled={form.globalEnabled !== 'true'}
                value={form.globalWindowSeconds}
                onChange={(e) => handleField('globalWindowSeconds', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Window in seconds</p>
            </div>
            <div>
              <Label htmlFor="global-burst">RATE_LIMIT_BURST</Label>
              <Input
                id="global-burst"
                className="mt-1 font-mono text-sm"
                type="number"
                min="1"
                placeholder="20"
                disabled={form.globalEnabled !== 'true'}
                value={form.globalBurst}
                onChange={(e) => handleField('globalBurst', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Burst allowance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save & Apply'}
        </Button>
        {isDirty && (
          <span className="text-xs text-muted-foreground">You have unsaved changes</span>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return <RateLimitsContent />
}
