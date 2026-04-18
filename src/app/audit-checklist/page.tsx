'use client'

import { CheckCircle2, Circle, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface AuditItem {
  id: string
  category: string
  title: string
  description: string
  status: 'pass' | 'fail' | 'warn' | 'unknown'
  detail?: string
}

interface AuditReport {
  generatedAt: string
  items: AuditItem[]
  score: { pass: number; fail: number; warn: number; total: number }
}

function StatusIcon({ status }: { status: AuditItem['status'] }) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-4 w-4 text-green-400" />
    case 'fail':
      return <XCircle className="h-4 w-4 text-red-400" />
    case 'warn':
      return <Circle className="h-4 w-4 text-amber-400" />
    default:
      return <Circle className="text-nself-text-muted h-4 w-4" />
  }
}

export default function AuditChecklistPage() {
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/audit/dogfood', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Server ${res.status}`)
      const data = (await res.json()) as AuditReport
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const categories =
    report === null
      ? []
      : Array.from(new Set(report.items.map((i) => i.category)))

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="nself-gradient-text text-xl font-semibold">
            Dog-food Audit Checklist
          </h1>
          <p className="text-nself-text-muted text-xs">
            Continuous audit of nSelf-first-doctrine + doc-sync-ritual across
            the project
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="border-nself-border text-nself-text-muted hover:border-nself-primary hover:text-nself-text flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Re-run
        </button>
      </div>

      {error !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {report !== null && (
        <>
          <div className="glass-card grid grid-cols-4 gap-4 p-4 text-center">
            <div>
              <p className="text-nself-text-muted text-xs">Passed</p>
              <p className="text-2xl font-semibold text-green-400">
                {report.score.pass}
              </p>
            </div>
            <div>
              <p className="text-nself-text-muted text-xs">Warnings</p>
              <p className="text-2xl font-semibold text-amber-400">
                {report.score.warn}
              </p>
            </div>
            <div>
              <p className="text-nself-text-muted text-xs">Failures</p>
              <p className="text-2xl font-semibold text-red-400">
                {report.score.fail}
              </p>
            </div>
            <div>
              <p className="text-nself-text-muted text-xs">Total</p>
              <p className="text-nself-text text-2xl font-semibold">
                {report.score.total}
              </p>
            </div>
          </div>

          {categories.map((cat) => {
            const items = report.items.filter((i) => i.category === cat)
            return (
              <div key={cat} className="glass-card p-4">
                <h2 className="text-nself-text mb-3 text-sm font-semibold">
                  {cat}
                </h2>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="border-nself-border flex items-start gap-2 rounded-lg border px-3 py-2"
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        <StatusIcon status={item.status} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-nself-text text-sm font-medium">
                          {item.title}
                        </p>
                        <p className="text-nself-text-muted text-xs">
                          {item.description}
                        </p>
                        {item.detail !== undefined && (
                          <p className="text-nself-text-muted mt-1 font-mono text-xs">
                            {item.detail}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
