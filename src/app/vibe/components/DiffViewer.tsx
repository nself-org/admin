'use client'

import type { Layer } from '@/app/vibe/components/LayerTabs'
import { LayerTabs } from '@/app/vibe/components/LayerTabs'
import type { VibeGeneration } from '@/app/vibe/hooks/useVibeSession'
import { Editor } from '@monaco-editor/react'
import { AlertCircle, Code2 } from 'lucide-react'
import { useCallback, useState } from 'react'

interface DiffViewerProps {
  generation: VibeGeneration | null
}

export function DiffViewer({ generation }: DiffViewerProps) {
  const [activeLayer, setActiveLayer] = useState<Layer>('migration')

  const hasMigration = Boolean(generation?.migration_sql)
  const hasPermissions = Boolean(generation?.permissions_json)
  const hasUI = Boolean(
    generation?.ui_files && Object.keys(generation.ui_files).length > 0,
  )

  const getLayerContent = useCallback((): {
    value: string
    language: string
  } => {
    if (!generation) return { value: '', language: 'sql' }

    switch (activeLayer) {
      case 'migration':
        return {
          value: generation.migration_sql ?? '-- No migration generated yet',
          language: 'sql',
        }
      case 'permissions':
        return {
          value: generation.permissions_json
            ? JSON.stringify(generation.permissions_json, null, 2)
            : '// No permissions generated yet',
          language: 'json',
        }
      case 'ui': {
        const files = generation.ui_files ?? {}
        const keys = Object.keys(files)
        if (keys.length === 0)
          return {
            value: '// No UI files generated yet',
            language: 'typescript',
          }
        // Show first file by default
        const firstKey = keys[0]
        return {
          value: files[firstKey] ?? '',
          language:
            firstKey.endsWith('.tsx') || firstKey.endsWith('.ts')
              ? 'typescript'
              : 'javascript',
        }
      }
      default:
        return { value: '', language: 'sql' }
    }
  }, [generation, activeLayer])

  const { value, language } = getLayerContent()

  if (!generation) {
    return (
      <section
        role="region"
        aria-label="Diff viewer"
        className="flex h-full flex-col items-center justify-center text-zinc-500"
      >
        <Code2 className="mb-2 h-8 w-8 opacity-40" aria-hidden="true" />
        <p className="text-sm">Generated code appears here</p>
        <p className="mt-1 text-xs text-zinc-600">
          Submit a feature request to generate code
        </p>
      </section>
    )
  }

  if (generation.status === 'error') {
    return (
      <section
        role="region"
        aria-label="Diff viewer"
        className="flex h-full flex-col items-center justify-center gap-2 text-red-400"
      >
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
        <p className="text-sm">Generation failed. Try again.</p>
      </section>
    )
  }

  return (
    <section
      role="region"
      aria-label="Diff viewer"
      className="flex h-full flex-col"
    >
      <h2 className="sr-only">Generated Code Diff</h2>
      <LayerTabs
        activeLayer={activeLayer}
        onChange={setActiveLayer}
        hasMigration={hasMigration}
        hasPermissions={hasPermissions}
        hasUI={hasUI}
      />

      {/* File selector for UI layer */}
      {activeLayer === 'ui' &&
        generation.ui_files &&
        Object.keys(generation.ui_files).length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-b border-zinc-800 px-3 py-1.5">
            {Object.keys(generation.ui_files).map((filename) => (
              <span
                key={filename}
                className="rounded bg-zinc-800/60 px-2 py-0.5 font-mono text-xs whitespace-nowrap text-zinc-400"
              >
                {filename}
              </span>
            ))}
          </div>
        )}

      <div
        id={`panel-${activeLayer}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeLayer}`}
        className="flex-1 overflow-hidden"
      >
        {generation.status === 'generating' && !value.trim() ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-zinc-500">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-sky-500"
              aria-hidden="true"
            />
            Generating {activeLayer}...
          </div>
        ) : (
          <Editor
            height="100%"
            language={language}
            value={value}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: 'on',
              wordWrap: 'on',
              renderLineHighlight: 'none',
              contextmenu: false,
              folding: true,
              automaticLayout: true,
            }}
            aria-label={`${activeLayer} code`}
          />
        )}
      </div>
    </section>
  )
}
