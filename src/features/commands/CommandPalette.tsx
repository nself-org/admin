'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { CommandForm } from './CommandForm'
import type { CommandDef, RunCommandResult } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegistryResponse {
  success: boolean
  commands: CommandDef[]
  error?: string
}

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

function matchesQuery(cmd: CommandDef, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    cmd.name.toLowerCase().includes(q) ||
    cmd.description.toLowerCase().includes(q)
  )
}

// ---------------------------------------------------------------------------
// Command list item
// ---------------------------------------------------------------------------

interface CommandItemProps {
  command: CommandDef
  selected: boolean
  onClick: () => void
}

function CommandItem({ command, selected, onClick }: CommandItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full rounded-lg px-4 py-3 text-left transition-colors',
        selected
          ? 'bg-nself-primary/20 border-nself-primary/60 border'
          : 'border border-transparent hover:bg-white/5',
      ].join(' ')}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-nself-text font-mono text-sm font-semibold">
          nself {command.name}
        </span>
        {command.flags.length > 0 && (
          <span className="bg-nself-primary/10 text-nself-primary shrink-0 rounded px-1.5 py-0.5 font-mono text-xs">
            {command.flags.length} flags
          </span>
        )}
      </span>
      {command.description && (
        <span className="text-nself-text-muted mt-0.5 block text-xs">
          {command.description}
        </span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Modal panel
// ---------------------------------------------------------------------------

interface CommandModalProps {
  command: CommandDef
  onClose: () => void
  onRun: (result: RunCommandResult) => void
}

function CommandModal({ command, onClose, onRun }: CommandModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) onClose()
    },
    [onClose],
  )

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="border-nself-border bg-nself-bg-elevated text-nself-text-muted hover:text-nself-text absolute -top-3 -right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
        >
          &times;
        </button>
        <CommandForm command={command} onRun={onRun} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface CommandPaletteProps {
  /** Called with each command result so the parent can react (e.g. refresh status). */
  onRun?: (command: string, result: RunCommandResult) => void
}

export function CommandPalette({ onRun }: CommandPaletteProps) {
  const [commands, setCommands] = useState<CommandDef[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<CommandDef | null>(null)

  // Fetch registry on mount
  useEffect(() => {
    let cancelled = false

    async function fetchRegistry() {
      setLoading(true)
      setFetchError(null)
      try {
        const res = await fetch('/api/commands/registry')
        const data = (await res.json()) as RegistryResponse
        if (cancelled) return
        if (!data.success) {
          setFetchError(data.error ?? 'Failed to load command registry')
          return
        }
        setCommands(data.commands)
      } catch (err) {
        if (cancelled) return
        setFetchError(err instanceof Error ? err.message : 'Network error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchRegistry()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = commands.filter((cmd) => matchesQuery(cmd, query))

  const handleRun = useCallback(
    (result: RunCommandResult) => {
      if (selected && onRun) {
        onRun(selected.name, result)
      }
    },
    [selected, onRun],
  )

  return (
    <div className="glass-card flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-nself-text text-base font-bold">Command Palette</h2>
        <p className="text-nself-text-muted text-xs">
          Run any nself CLI command through the Admin UI.
        </p>
      </div>

      {/* Search */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search commands..."
        className="border-nself-border bg-nself-bg-card text-nself-text placeholder-nself-text-muted/60 focus:border-nself-primary focus:ring-nself-primary/40 w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus:ring-1"
      />

      {/* States */}
      {loading && (
        <div className="text-nself-text-muted flex items-center gap-2 py-6 text-sm">
          <span className="border-nself-primary/30 border-t-nself-primary h-4 w-4 animate-spin rounded-full border-2" />
          Loading commands...
        </div>
      )}

      {!loading && fetchError !== null && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {fetchError}
        </div>
      )}

      {!loading && fetchError === null && filtered.length === 0 && (
        <p className="text-nself-text-muted py-4 text-center text-sm">
          No commands match &ldquo;{query}&rdquo;.
        </p>
      )}

      {!loading && fetchError === null && filtered.length > 0 && (
        <div
          className="flex flex-col gap-1 overflow-y-auto"
          style={{ maxHeight: '28rem' }}
        >
          {filtered.map((cmd) => (
            <CommandItem
              key={cmd.name}
              command={cmd}
              selected={selected?.name === cmd.name}
              onClick={() => setSelected(cmd)}
            />
          ))}
        </div>
      )}

      {/* Command modal */}
      {selected !== null && (
        <CommandModal
          command={selected}
          onClose={() => setSelected(null)}
          onRun={handleRun}
        />
      )}
    </div>
  )
}
