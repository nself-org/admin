'use client'

import { FormSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, CheckCircle, Loader2, Mail, Save, Send, WifiOff } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface SmtpConfig {
  host: string
  port: string
  secure: string
  user: string
  pass: string
  sender: string
  hasPass: boolean
}

type PageState = 'loading' | 'empty' | 'error' | 'partial' | 'success' | 'offline' | 'unauth'

const MASK = '••••••••'

function EmailContent() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [config, setConfig] = useState<SmtpConfig>({
    host: 'mailpit',
    port: '1025',
    secure: 'false',
    user: '',
    pass: '',
    sender: 'noreply@nself.local',
    hasPass: false,
  })
  const [form, setForm] = useState<SmtpConfig>({
    host: 'mailpit',
    port: '1025',
    secure: 'false',
    user: '',
    pass: '',
    sender: 'noreply@nself.local',
    hasPass: false,
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isDirty, setIsDirty] = useState(false)

  const load = useCallback(async () => {
    setPageState('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/config/email')
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
        setErrorMessage(data.error || 'Failed to load email configuration')
        return
      }
      const smtp: SmtpConfig = data.smtp
      setConfig(smtp)
      setForm(smtp)
      // Partial: local mailpit defaults, not configured for external delivery
      const isDefault =
        smtp.host === 'mailpit' &&
        smtp.port === '1025' &&
        smtp.secure === 'false' &&
        !smtp.user &&
        !smtp.hasPass
      setPageState(isDefault ? 'partial' : 'success')
    } catch (_err) {
      setPageState('offline')
      setErrorMessage('Cannot reach admin API. Check your network connection.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleFormChange = (field: keyof SmtpConfig, value: string) => {
    const updated = { ...form, [field]: value }
    setForm(updated)
    setIsDirty(
      updated.host !== config.host ||
        updated.port !== config.port ||
        updated.secure !== config.secure ||
        updated.user !== config.user ||
        (updated.pass !== '' && updated.pass !== MASK) ||
        updated.sender !== config.sender
    )
    setSaveError(null)
    setSaveSuccess(false)
    setTestResult(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    setTestResult(null)
    try {
      const body: Record<string, string> = {
        host: form.host,
        port: form.port,
        secure: form.secure,
        user: form.user,
        sender: form.sender,
      }
      // Only send pass if user has entered a new value (not the mask)
      if (form.pass && form.pass !== MASK) {
        body.pass = form.pass
      }
      const res = await fetch('/api/config/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.status === 401) {
        setPageState('unauth')
        return
      }
      const data = await res.json()
      if (!data.success) {
        setSaveError(data.error || 'Failed to save email configuration')
        return
      }
      await load()
      setIsDirty(false)
      setSaveSuccess(true)
    } catch (_err) {
      setSaveError('Network error — could not save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    setSaveError(null)
    try {
      const res = await fetch('/api/config/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      })
      const data = await res.json()
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Test email sent' : 'Test failed'),
      })
    } catch (_err) {
      setTestResult({ success: false, message: 'Network error — could not send test email' })
    } finally {
      setTesting(false)
    }
  }

  // ── State: unauth ──────────────────────────────────────────────────────────
  if (pageState === 'unauth') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="text-destructive h-10 w-10" />
        <p className="text-lg font-medium">Not authenticated</p>
        <p className="text-muted-foreground text-sm">
          Please log in to manage email configuration.
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
        <p className="text-lg font-medium">Failed to load email configuration</p>
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
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Mail className="h-6 w-6" />
          Email Configuration
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure the SMTP server used by the Auth service to send transactional emails
          (verification, password reset, invitations).
        </p>
      </div>

      {pageState === 'partial' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Using local Mailpit defaults — emails are captured locally and not delivered externally.
            Configure an external SMTP server for production.
          </AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-300">
            Email configuration saved.
          </AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      {testResult && (
        <Alert
          className={
            testResult.success ? 'border-green-500 bg-green-50 dark:bg-green-950' : undefined
          }
          variant={testResult.success ? 'default' : 'destructive'}
        >
          {testResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription
            className={testResult.success ? 'text-green-700 dark:text-green-300' : undefined}
          >
            {testResult.message}
          </AlertDescription>
        </Alert>
      )}

      {/* SMTP Server */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SMTP Server</CardTitle>
          <CardDescription>Connection settings for the outbound mail server.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="smtp-host">AUTH_SMTP_HOST</Label>
              <Input
                id="smtp-host"
                className="mt-1 font-mono text-sm"
                placeholder="smtp.example.com"
                value={form.host}
                onChange={(e) => handleFormChange('host', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="smtp-port">AUTH_SMTP_PORT</Label>
              <Input
                id="smtp-port"
                className="mt-1 font-mono text-sm"
                placeholder="587"
                value={form.port}
                onChange={(e) => handleFormChange('port', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="smtp-secure">AUTH_SMTP_SECURE</Label>
            <Select value={form.secure} onValueChange={(v) => handleFormChange('secure', v)}>
              <SelectTrigger id="smtp-secure" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">false — STARTTLS (port 587)</SelectItem>
                <SelectItem value="true">true — TLS/SSL (port 465)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Authentication</CardTitle>
          <CardDescription>
            SMTP credentials. Leave blank for servers that require no authentication (e.g., local
            Mailpit).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="smtp-user">AUTH_SMTP_USER</Label>
            <Input
              id="smtp-user"
              className="mt-1 font-mono text-sm"
              placeholder="user@example.com"
              autoComplete="off"
              value={form.user}
              onChange={(e) => handleFormChange('user', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="smtp-pass">
              AUTH_SMTP_PASS
              {config.hasPass && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  saved
                </Badge>
              )}
            </Label>
            <Input
              id="smtp-pass"
              type="password"
              className="mt-1 font-mono text-sm"
              placeholder={config.hasPass ? MASK : 'Enter password'}
              autoComplete="new-password"
              value={form.pass}
              onChange={(e) => handleFormChange('pass', e.target.value)}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Leave blank to keep the existing password. The current value is never displayed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sender */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sender Address</CardTitle>
          <CardDescription>
            The <code className="bg-muted rounded px-1 text-xs">From:</code> address used for all
            transactional emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="smtp-sender">AUTH_SMTP_SENDER</Label>
          <Input
            id="smtp-sender"
            className="mt-1 font-mono text-sm"
            placeholder="noreply@example.com"
            value={form.sender}
            onChange={(e) => handleFormChange('sender', e.target.value)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={saving || !isDirty} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Configuration'}
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {testing ? 'Sending…' : 'Send Test Email'}
        </Button>
        {isDirty && (
          <span className="text-muted-foreground ml-auto text-xs">You have unsaved changes</span>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return <EmailContent />
}
