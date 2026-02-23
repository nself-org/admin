'use client'

import {
  CommandPalette,
  CommandPaletteEmpty,
  CommandPaletteGroup,
  CommandPaletteInput,
  CommandPaletteItem,
  CommandPaletteList,
} from '@/components/ui/command-palette'
import { useRouter } from 'next/navigation'
import * as React from 'react'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Build', href: '/build' },
  { label: 'Services', href: '/services' },
  { label: 'Database', href: '/database' },
  { label: 'Config', href: '/config' },
  { label: 'Logs', href: '/logs' },
  { label: 'Backup', href: '/backup' },
  { label: 'Deploy', href: '/deploy' },
  { label: 'Help', href: '/help' },
]

export function GlobalCommandPalette() {
  const router = useRouter()
  const [query, setQuery] = React.useState('')

  const filtered = query
    ? NAV_ITEMS.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()),
      )
    : NAV_ITEMS

  return (
    <CommandPalette>
      <CommandPaletteInput
        placeholder="Search pages..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandPaletteList>
        {filtered.length === 0 ? (
          <CommandPaletteEmpty>No results found.</CommandPaletteEmpty>
        ) : (
          <CommandPaletteGroup heading="Navigation">
            {filtered.map((item) => (
              <CommandPaletteItem
                key={item.href}
                onSelect={() => {
                  router.push(item.href)
                  setQuery('')
                }}
              >
                {item.label}
              </CommandPaletteItem>
            ))}
          </CommandPaletteGroup>
        )}
      </CommandPaletteList>
    </CommandPalette>
  )
}
