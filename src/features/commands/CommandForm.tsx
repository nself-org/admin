'use client'

import { useCallback, useId, useState } from 'react'

import type { CommandDef, FlagDef, RunCommandResult } from './types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CommandFormProps {
  command: CommandDef
  onRun: (result: RunCommandResult) => void
}

// ---------------------------------------------------------------------------
// Flag field components
// ---------------------------------------------------------------------------

interface FlagFieldProps {
  flag: FlagDef
  value: string | boolean
  onChange: (value: string | boolean) => void
}

function FlagField({ flag, value, onChange }: FlagFieldProps) {
  const id = useId()

  if (flag.type === 'bool') {
    return (
      <label
        htmlFor={id}
        className="border-nself-border hover:border-nself-primary/50 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors"
      >
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="border-nself-border accent-nself-primary h-4 w-4 rounded"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-nself-text font-mono text-sm">
            --{flag.name}
          </span>
          {flag.description && (
            <span className="text-nself-text-muted text-xs">
              {flag.description}
            </span>
          )}
        </span>
      </label>
    )
  }

  if (flag.type === 'int') {
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-nself-text font-mono text-sm">
          --{flag.name}
          {flag.shorthand && (
            <span className="text-nself-text-muted ml-1 text-xs">
              (-{flag.shorthand})
            </span>
          )}
        </label>
        {flag.description && (
          <p className="text-nself-text-muted text-xs">{flag.description}</p>
        )}
        <input
          id={id}
          type="number"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={flag.defaultValue ?? ''}
          className="border-nself-border bg-nself-bg-card text-nself-text placeholder-nself-text-muted/60 focus:border-nself-primary focus:ring-nself-primary/40 w-full rounded-lg border px-3 py-2 font-mono text-sm transition-colors outline-none focus:ring-1"
        />
      </div>
    )
  }

  // string and stringSlice both render as text input
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-nself-text font-mono text-sm">
        --{flag.name}
        {flag.shorthand && (
          <span className="text-nself-text-muted ml-1 text-xs">
            (-{flag.shorthand})
          </span>
        )}
        {flag.type === 'stringSlice' && (
          <span className="text-nself-text-muted ml-1 text-xs">
            (comma-separated)
          </span>
        )}
      </label>
      {flag.description && (
        <p className="text-nself-text-muted text-xs">{flag.description}</p>
      )}
      <input
        id={id}
        type="text"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={flag.defaultValue ?? ''}
        className="border-nself-border bg-nself-bg-card text-nself-text placeholder-nself-text-muted/60 focus:border-nself-primary focus:ring-nself-primary/40 w-full rounded-lg border px-3 py-2 font-mono text-sm transition-colors outline-none focus:ring-1"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Output panel
// ---------------------------------------------------------------------------

interface OutputPanelProps {
  result: RunCommandResult
}

function OutputPanel({ result }: OutputPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-nself-text-muted text-xs font-semibold tracking-wide uppercase">
          Output
        </span>
        <span
          className={[
            'rounded px-2 py-0.5 font-mono text-xs font-semibold',
            result.success
              ? 'bg-green-500/10 text-green-400'
              : 'bg-red-500/10 text-red-400',
          ].join(' ')}
        >
          exit {result.exitCode} &middot; {result.duration}ms
        </span>
      </div>
      <pre className="border-nself-border text-nself-text min-h-[6rem] overflow-x-auto rounded-lg border bg-[#0a0a0f] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {result.output || '(no output)'}
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CommandForm({ command, onRun }: CommandFormProps) {
  // Initialise flag state: booleans default to false, strings to ''
  const initialValues = useCallback((): Record<string, string | boolean> => {
    const vals: Record<string, string | boolean> = {}
    for (const flag of command.flags) {
      if (flag.type === 'bool') {
        vals[flag.name] = false
      } else {
        vals[flag.name] = flag.defaultValue ?? ''
      }
    }
    return vals
  }, [command.flags])

  const [flagValues, setFlagValues] =
    useState<Record<string, string | boolean>>(initialValues)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RunCommandResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFlagChange = useCallback(
    (name: string, value: string | boolean) => {
      setFlagValues((prev) => ({ ...prev, [name]: value }))
    },
    [],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const response = await fetch('/api/commands/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: command.name,
            flags: flagValues,
          }),
        })

        type ApiResponse = RunCommandResult & { error?: string }
        const data = (await response.json()) as ApiResponse

        if (!response.ok && typeof data.exitCode === 'undefined') {
          setError(data.error ?? `HTTP ${response.status}`)
          return
        }

        const runResult: RunCommandResult = {
          success: data.success,
          output: data.output,
          exitCode: data.exitCode,
          duration: data.duration,
        }
        setResult(runResult)
        onRun(runResult)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error')
      } finally {
        setLoading(false)
      }
    },
    [command.name, flagValues, onRun],
  )

  return (
    <div className="glass-card flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-nself-text font-mono text-lg font-bold">
          nself {command.name}
        </h2>
        {command.description && (
          <p className="text-nself-text-muted text-sm">{command.description}</p>
        )}
        <p className="text-nself-text-muted/70 mt-1 font-mono text-xs">
          {command.usage}
        </p>
      </div>

      {/* Flag form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {command.flags.length > 0 ? (
          <div className="flex flex-col gap-3">
            {command.flags.map((flag) => (
              <FlagField
                key={flag.name}
                flag={flag}
                value={
                  flagValues[flag.name] ?? (flag.type === 'bool' ? false : '')
                }
                onChange={(v) => handleFlagChange(flag.name, v)}
              />
            ))}
          </div>
        ) : (
          <p className="text-nself-text-muted text-xs italic">
            No flags for this command.
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="nself-btn-primary mt-2 flex items-center justify-center gap-2 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Running...
            </>
          ) : (
            'Run Command'
          )}
        </button>
      </form>

      {/* Error */}
      {error !== null && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Output */}
      {result !== null && <OutputPanel result={result} />}
    </div>
  )
}
