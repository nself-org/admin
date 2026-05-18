'use client'

import { PageShell } from '@/components/PageShell'
import { FormSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  Terminal,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

interface Finding {
  id: string
  title: string
  description: string
  severity: Severity
  remediation: string
  category: string
}

interface AuditEvent {
  timestamp: string
  action: string
  user: string
  result: 'success' | 'failure'
  details: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFindingsFromOutput(output: string): Finding[] {
  try {
    const parsed = JSON.parse(output)
    if (Array.isArray(parsed)) return parsed
    if (parsed.findings && Array.isArray(parsed.findings)) return parsed.findings
  } catch {
    // Not JSON
  }
  return []
}

function parseAuditFromOutput(output: string): AuditEvent[] {
  try {
    const parsed = JSON.parse(output)
    if (Array.isArray(parsed)) return parsed
    if (parsed.events && Array.isArray(parsed.events)) return parsed.events
  } catch {
    // Not JSON
  }
  return []
}

function getSeverityStyles(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    case 'low':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'info':
      return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
    default:
      return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
  }
}

function getSeverityIcon(severity: Severity) {
  switch (severity) {
    case 'critical':
      return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
    case 'high':
      return <ShieldAlert className="h-4 w-4 text-orange-600 dark:text-orange-400" />
    case 'medium':
      return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
    case 'low':
      return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    case 'info':
      return <Info className="h-4 w-4 text-zinc-500" />
    default:
      return <Info className="h-4 w-4 text-zinc-500" />
  }
}

function computeScore(findings: Finding[]): number {
  if (findings.length === 0) return 100
  const penalties: Record<Severity, number> = {
    critical: 25,
    high: 15,
    medium: 8,
    low: 3,
    info: 0,
  }
  let score = 100
  for (const f of findings) {
    score -= penalties[f.severity] || 0
  }
  return Math.max(0, score)
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400'
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400'
  if (score >= 50) return 'text-orange-600 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

function getProgressColor(score: number): string {
  if (score >= 90) return '[&>div]:bg-green-500'
  if (score >= 70) return '[&>div]:bg-yellow-500'
  if (score >= 50) return '[&>div]:bg-orange-500'
  return '[&>div]:bg-red-500'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SecurityContent() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [scanning, setScanning] = useState(false)
  const [fullScan, setFullScan] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const [lastCommand, setLastCommand] = useState('')

  // ---------------------------------------------------------------------------
  // Run security scan
  // ---------------------------------------------------------------------------

  const handleScan = useCallback(async () => {
    setScanning(true)
    setError(null)
    const scope = fullScan ? 'full' : 'quick'
    setLastCommand(`nself auth security scan${fullScan ? ' --full' : ''}`)

    try {
      const res = await fetch('/api/auth/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Security scan failed')
        setOutput(data.details || data.error || '')
        return
      }

      const rawOutput = data.data?.output || ''
      setOutput(rawOutput)
      setFindings(parseFindingsFromOutput(rawOutput))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setScanning(false)
    }
  }, [fullScan])

  // ---------------------------------------------------------------------------
  // Fetch audit log
  // ---------------------------------------------------------------------------

  const fetchAudit = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself auth security audit')

    try {
      const res = await fetch('/api/auth/security/audit')
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to fetch audit log')
        setOutput(data.details || data.error || '')
        return
      }

      const rawOutput = data.data?.output || ''
      setOutput(rawOutput)
      setAuditEvents(parseAuditFromOutput(rawOutput))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Fetch report
  // ---------------------------------------------------------------------------

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself auth security report')

    try {
      const res = await fetch('/api/auth/security/report')
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to generate security report')
        setOutput(data.details || data.error || '')
        return
      }

      const rawOutput = data.data?.output || ''
      setOutput(rawOutput)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const securityScore = computeScore(findings)
  const criticalCount = findings.filter((f) => f.severity === 'critical').length
  const highCount = findings.filter((f) => f.severity === 'high').length
  const mediumCount = findings.filter((f) => f.severity === 'medium').length
  const lowCount = findings.filter((f) => f.severity === 'low').length
  const infoCount = findings.filter((f) => f.severity === 'info').length

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageShell
      title="Security Scanning"
      description="Run security scans, review findings, and view audit trails."
    >
      <div className="space-y-6">
        {/* Security Score Card */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Score
              </CardTitle>
              <CardDescription>Overall security health rating</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <span className={`text-5xl font-bold ${getScoreColor(securityScore)}`}>
                  {securityScore}
                </span>
                <span className="text-2xl text-zinc-400">/100</span>
              </div>
              <Progress
                value={securityScore}
                className={`mt-4 ${getProgressColor(securityScore)}`}
              />
              {findings.length === 0 && (
                <p className="mt-3 text-center text-xs text-zinc-500">
                  Run a scan to calculate your score.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Findings Summary */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Findings Summary
              </CardTitle>
              <CardDescription>Breakdown by severity level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    Critical
                  </span>
                  <span className="font-mono text-sm font-bold">{criticalCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                    <ShieldAlert className="h-4 w-4" />
                    High
                  </span>
                  <span className="font-mono text-sm font-bold">{highCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    Medium
                  </span>
                  <span className="font-mono text-sm font-bold">{mediumCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <Info className="h-4 w-4" />
                    Low
                  </span>
                  <span className="font-mono text-sm font-bold">{lowCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-zinc-500">
                    <Info className="h-4 w-4" />
                    Info
                  </span>
                  <span className="font-mono text-sm font-bold">{infoCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scan Controls */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Scan Controls
              </CardTitle>
              <CardDescription>Configure and run security scans</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Full Scan</p>
                  <p className="text-xs text-zinc-500">Deep analysis (up to 2 min)</p>
                </div>
                <Switch checked={fullScan} onCheckedChange={setFullScan} />
              </div>
              <Button onClick={handleScan} disabled={scanning} className="w-full">
                {scanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    {fullScan ? 'Run Full Scan' : 'Run Quick Scan'}
                  </>
                )}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAudit}
                  disabled={loading}
                  className="flex-1"
                >
                  <Clock className="mr-1 h-3 w-3" />
                  Audit Log
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchReport}
                  disabled={loading}
                  className="flex-1"
                >
                  <Download className="mr-1 h-3 w-3" />
                  Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Findings Detail */}
        {findings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Scan Findings
              </CardTitle>
              <CardDescription>Detailed findings organized by severity.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(finding.severity)}
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {finding.title}
                          </h4>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {finding.description}
                          </p>
                          {finding.remediation && (
                            <div className="mt-2 rounded-md bg-blue-50 p-2 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                              <span className="font-medium">Remediation:</span>{' '}
                              {finding.remediation}
                            </div>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSeverityStyles(finding.severity)}`}
                      >
                        {finding.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit Trail */}
        {auditEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Audit Trail
              </CardTitle>
              <CardDescription>Recent security events and authentication activity.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEvents.map((event, idx) => (
                    <TableRow key={`${event.timestamp}-${idx}`}>
                      <TableCell className="font-mono text-xs">{event.timestamp}</TableCell>
                      <TableCell>{event.action}</TableCell>
                      <TableCell>{event.user}</TableCell>
                      <TableCell>
                        {event.result === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                            <XCircle className="h-3 w-3" />
                            Failure
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-zinc-500">
                        {event.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* CLI Command Preview & Output */}
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
                {output || 'No output yet. Run a scan to see results.'}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

export default function SecurityPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SecurityContent />
    </Suspense>
  )
}
