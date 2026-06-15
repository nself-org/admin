'use client'

import { Button } from '@/components/Button'
import * as Icons from '@/lib/icons'
import { useRef, useState } from 'react'
import { EnvVariable } from './types'

interface EnvImportExportProps {
  environment: string
  variables: EnvVariable[]
  onImport: (vars: Record<string, string>) => void
  onExport: () => void
  onCopyFrom: (sourceEnv: string) => void
  onFindReplace: (find: string, replace: string) => void
}

export function EnvImportExport({
  environment,
  variables: _variables,
  onImport,
  onExport,
  onCopyFrom,
  onFindReplace,
}: EnvImportExportProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [showCopyFrom, setShowCopyFrom] = useState(false)
  const [importText, setImportText] = useState('')
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [sourceEnv, setSourceEnv] = useState('local')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setImportText(content)
      setShowImport(true)
    }
    reader.readAsText(file)
  }

  const handleTextImport = () => {
    const vars: Record<string, string> = {}
    const lines = importText.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = (match[1] ?? '').trim()
        const value = (match[2] ?? '').trim().replace(/^["']|["']$/g, '')
        vars[key] = value
      }
    }

    onImport(vars)
    setImportText('')
    setShowImport(false)
    setShowMenu(false)
  }

  const handleFindReplace = () => {
    if (!findText) return
    onFindReplace(findText, replaceText)
    setFindText('')
    setReplaceText('')
    setShowFindReplace(false)
    setShowMenu(false)
  }

  const handleCopyFrom = () => {
    onCopyFrom(sourceEnv)
    setShowCopyFrom(false)
    setShowMenu(false)
  }

  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setShowMenu(!showMenu)} title="Bulk operations">
        <Icons.MoreVertical className="h-3 w-3" />
      </Button>

      {showMenu && (
        <div className="absolute top-full right-0 z-10 mt-1 w-48 rounded-lg bg-white shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
          <div className="p-1">
            <button
              onClick={() => {
                setShowImport(true)
                setShowMenu(false)
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <Icons.Upload className="h-4 w-4" />
              Import from text
            </button>
            <button
              onClick={() => {
                fileInputRef.current?.click()
                setShowMenu(false)
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <Icons.FileText className="h-4 w-4" />
              Import from file
            </button>
            <button
              onClick={() => {
                onExport()
                setShowMenu(false)
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <Icons.Download className="h-4 w-4" />
              Export to file
            </button>
            <button
              onClick={() => {
                setShowCopyFrom(true)
                setShowMenu(false)
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <Icons.Copy className="h-4 w-4" />
              Copy from environment
            </button>
            <button
              onClick={() => {
                setShowFindReplace(true)
                setShowMenu(false)
              }}
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <Icons.Search className="h-4 w-4" />
              Find & replace
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".env,.txt"
        onChange={handleFileImport}
        className="hidden"
      />

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold">Import Variables</h3>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste .env content here..."
              className="h-64 w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowImport(false)
                  setImportText('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleTextImport}>Import</Button>
            </div>
          </div>
        </div>
      )}

      {showFindReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold">Find & Replace</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Find</label>
                <input
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="Text to find..."
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Replace with</label>
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Replacement text..."
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900"
                />
              </div>
              <p className="text-xs text-zinc-500">
                This will replace all occurrences in variable values.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowFindReplace(false)
                  setFindText('')
                  setReplaceText('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleFindReplace} disabled={!findText}>
                Replace
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCopyFrom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold">Copy from Environment</h3>
            <div className="space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Copy all variables from another environment to{' '}
                <span className="font-mono">.env.{environment}</span>. This will overwrite existing
                values.
              </p>
              <select
                value={sourceEnv}
                onChange={(e) => setSourceEnv(e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900"
              >
                <option value="local">Local (.env.local)</option>
                <option value="dev">Dev (.env.dev)</option>
                <option value="stage">Stage (.env.stage)</option>
                <option value="prod">Prod (.env.prod)</option>
                <option value="secrets">Secrets (.env.secrets)</option>
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCopyFrom(false)
                  setSourceEnv('local')
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCopyFrom}>Copy Variables</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
