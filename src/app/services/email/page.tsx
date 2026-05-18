'use client'

import { PageShell } from '@/components/PageShell'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  CheckCircle,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Settings,
  Terminal,
  TestTube,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailTemplate {
  name: string
  description: string
  subject: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTemplatesFromOutput(output: string): EmailTemplate[] {
  try {
    const parsed = JSON.parse(output)
    if (Array.isArray(parsed)) return parsed
    if (parsed.templates && Array.isArray(parsed.templates)) return parsed.templates
  } catch {
    // Not JSON, return empty
  }
  return []
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function EmailContent() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const [lastCommand, setLastCommand] = useState('')

  // Send form state
  const [sendTo, setSendTo] = useState('')
  const [sendFrom, setSendFrom] = useState('')
  const [sendSubject, setSendSubject] = useState('')
  const [sendBody, setSendBody] = useState('')
  const [sendTemplate, setSendTemplate] = useState('')
  const [sendLoading, setSendLoading] = useState(false)

  // Test state
  const [testTo, setTestTo] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<'pass' | 'fail' | null>(null)

  // ---------------------------------------------------------------------------
  // Fetch templates
  // ---------------------------------------------------------------------------

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself service email template')

    try {
      const res = await fetch('/api/services/email/templates')
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to list templates')
        setOutput(data.details || data.error || '')
        return
      }

      const rawOutput = data.data?.output || ''
      setOutput(rawOutput)
      setTemplates(parseTemplatesFromOutput(rawOutput))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Fetch config
  // ---------------------------------------------------------------------------

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself service email config')

    try {
      const res = await fetch('/api/services/email/config')
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to get email configuration')
        setOutput(data.details || data.error || '')
        return
      }

      setOutput(data.data?.output || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Send email
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    if (!sendTo.trim() || !sendSubject.trim()) return

    setSendLoading(true)
    setError(null)
    const templateArg = sendTemplate ? ` --template=${sendTemplate}` : ''
    const fromArg = sendFrom ? ` --from=${sendFrom}` : ''
    setLastCommand(
      `nself service email send --to=${sendTo} --subject="${sendSubject}"${fromArg}${templateArg}`
    )

    try {
      const res = await fetch('/api/services/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: sendTo,
          subject: sendSubject,
          body: sendBody || undefined,
          template: sendTemplate || undefined,
          from: sendFrom || undefined,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to send email')
        setOutput(data.details || data.error || '')
        return
      }

      setOutput(data.data?.output || 'Email sent successfully')
      setSendTo('')
      setSendSubject('')
      setSendBody('')
      setSendTemplate('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSendLoading(false)
    }
  }, [sendTo, sendFrom, sendSubject, sendBody, sendTemplate])

  // ---------------------------------------------------------------------------
  // Test email
  // ---------------------------------------------------------------------------

  const handleTest = useCallback(async () => {
    setTestLoading(true)
    setTestResult(null)
    setError(null)
    const toArg = testTo ? ` --to=${testTo}` : ''
    setLastCommand(`nself service email test${toArg}`)

    try {
      const res = await fetch('/api/services/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo || undefined }),
      })
      const data = await res.json()

      if (!data.success) {
        setTestResult('fail')
        setError(data.details || data.error || 'Email test failed')
        setOutput(data.details || data.error || '')
        return
      }

      setTestResult('pass')
      setOutput(data.data?.output || 'Email test passed')
    } catch (err) {
      setTestResult('fail')
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setTestLoading(false)
    }
  }, [testTo])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageShell
      title="Email Service"
      description="Manage email templates, send emails, and test delivery via Mailpit."
    >
      <div className="space-y-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Provider</p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-white">Mailpit</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                  <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Templates</p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {templates.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                  <TestTube className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Delivery</p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {testResult === 'pass' ? (
                      <span className="text-green-600 dark:text-green-400">Healthy</span>
                    ) : testResult === 'fail' ? (
                      <span className="text-red-600 dark:text-red-400">Failed</span>
                    ) : (
                      'Untested'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Load Templates
          </Button>
          <Button variant="outline" size="sm" onClick={fetchConfig} disabled={loading}>
            <Settings className="mr-2 h-4 w-4" />
            View Config
          </Button>
          <Button variant="outline" size="sm" onClick={handleTest} disabled={testLoading}>
            {testLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="mr-2 h-4 w-4" />
            )}
            Test Delivery
          </Button>
        </div>

        {/* Send Email Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Send Email
            </CardTitle>
            <CardDescription>
              Compose and send an email through the configured email service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="send-to">To</Label>
                  <Input
                    id="send-to"
                    type="email"
                    placeholder="recipient@example.com"
                    value={sendTo}
                    onChange={(e) => setSendTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="send-from">From (optional)</Label>
                  <Input
                    id="send-from"
                    type="email"
                    placeholder="sender@example.com"
                    value={sendFrom}
                    onChange={(e) => setSendFrom(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="send-subject">Subject</Label>
                  <Input
                    id="send-subject"
                    placeholder="Email subject"
                    value={sendSubject}
                    onChange={(e) => setSendSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="send-template">Template (optional)</Label>
                  <Input
                    id="send-template"
                    placeholder="welcome, reset-password, etc."
                    value={sendTemplate}
                    onChange={(e) => setSendTemplate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-body">Body (optional)</Label>
                <Textarea
                  id="send-body"
                  placeholder="Email body content..."
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  rows={6}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={sendLoading || !sendTo.trim() || !sendSubject.trim()}
              >
                {sendLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Email
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Email Templates
                </CardTitle>
                <CardDescription>
                  Available email templates for sending formatted emails.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            )}

            {templates.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.name}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      {template.subject && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Subject: {template.subject}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setSendTemplate(template.name)}
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                <FileText className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm">No templates loaded.</p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Click Refresh to load available email templates.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Email Delivery */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Email Delivery
            </CardTitle>
            <CardDescription>
              Send a test email to verify the email service is working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="test-to">Test Recipient (optional)</Label>
                <Input
                  id="test-to"
                  type="email"
                  placeholder="test@example.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
              </div>
              <Button onClick={handleTest} disabled={testLoading}>
                {testLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Run Test
              </Button>
            </div>
            {testResult && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                  testResult === 'pass'
                    ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200'
                    : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200'
                }`}
              >
                {testResult === 'pass' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResult === 'pass'
                  ? 'Email delivery test passed successfully.'
                  : 'Email delivery test failed. Check your configuration.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CLI Output */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              CLI Output
            </CardTitle>
            <CardDescription>
              Command preview and execution output from the nself CLI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastCommand && (
              <div className="mb-3 rounded-md bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                $ {lastCommand}
              </div>
            )}
            <ScrollArea className="h-48 w-full rounded-md border border-zinc-200 bg-zinc-950 p-4 dark:border-zinc-700">
              <pre className="font-mono text-sm text-green-400">
                {output || 'No output yet. Run a command to see results.'}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

export default function EmailPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <EmailContent />
    </Suspense>
  )
}
