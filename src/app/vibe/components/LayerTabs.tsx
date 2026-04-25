'use client'

import { useCallback, useRef } from 'react'

export type Layer = 'migration' | 'permissions' | 'ui'

interface LayerTabsProps {
  activeLayer: Layer
  onChange: (layer: Layer) => void
  hasMigration: boolean
  hasPermissions: boolean
  hasUI: boolean
}

const LAYERS: Array<{ id: Layer; label: string }> = [
  { id: 'migration', label: 'Migration SQL' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'ui', label: 'UI Files' },
]

export function LayerTabs({
  activeLayer,
  onChange,
  hasMigration,
  hasPermissions,
  hasUI,
}: LayerTabsProps) {
  const tabListRef = useRef<HTMLDivElement>(null)

  const availabilityMap: Record<Layer, boolean> = {
    migration: hasMigration,
    permissions: hasPermissions,
    ui: hasUI,
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, current: Layer) => {
      const layers = LAYERS.map((l) => l.id)
      const idx = layers.indexOf(current)
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const next = layers[(idx + 1) % layers.length]
        onChange(next)
        // Focus next tab button
        const buttons =
          tabListRef.current?.querySelectorAll<HTMLButtonElement>(
            '[role="tab"]',
          )
        if (buttons) buttons[(idx + 1) % layers.length].focus()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prev = layers[(idx - 1 + layers.length) % layers.length]
        onChange(prev)
        const buttons =
          tabListRef.current?.querySelectorAll<HTMLButtonElement>(
            '[role="tab"]',
          )
        if (buttons) buttons[(idx - 1 + layers.length) % layers.length].focus()
      }
    },
    [onChange],
  )

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="Generated layer tabs"
      className="flex border-b border-zinc-800"
    >
      {LAYERS.map((layer) => {
        const isActive = activeLayer === layer.id
        const hasContent = availabilityMap[layer.id]

        return (
          <button
            key={layer.id}
            id={`tab-${layer.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${layer.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(layer.id)}
            onKeyDown={(e) => handleKeyDown(e, layer.id)}
            className={[
              'relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
              isActive
                ? 'border-b-2 border-sky-500 text-sky-400'
                : 'text-zinc-400 hover:text-zinc-200',
            ].join(' ')}
          >
            {layer.label}
            {hasContent && (
              <span
                aria-label="has content"
                className={[
                  'h-1.5 w-1.5 rounded-full',
                  isActive ? 'bg-sky-400' : 'bg-zinc-500',
                ].join(' ')}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
