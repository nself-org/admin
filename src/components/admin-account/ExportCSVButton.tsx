'use client'

import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface ExportCSVButtonProps {
  /** Async function that returns CSV content as a string */
  getCSV: () => Promise<string>
  filename?: string
}

export function ExportCSVButton({
  getCSV,
  filename = `export-${new Date().toISOString().split('T')[0]}.csv`,
}: ExportCSVButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setLoading(true)
    setError(null)
    try {
      const csv = await getCSV()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleExport}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        {loading ? 'Exporting…' : 'Export CSV'}
      </button>
      {error && (
        <span
          role="alert"
          aria-live="assertive"
          className="text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </span>
      )}
    </div>
  )
}
