import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'

interface ShortcutDefinition {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  handler: () => void
  description: string
}

const globalShortcuts: ShortcutDefinition[] = [
  {
    key: 'k',
    meta: true,
    handler: () => {
      // Open command palette (to be implemented)
      const event = new CustomEvent('openCommandPalette')
      window.dispatchEvent(event)
    },
    description: 'Open command palette',
  },
  {
    key: '/',
    ctrl: true,
    handler: () => {
      // Focus search
      const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement
      searchInput?.focus()
    },
    description: 'Focus search',
  },
  {
    key: 'Escape',
    handler: () => {
      // Close modals
      const event = new CustomEvent('closeModal')
      window.dispatchEvent(event)
    },
    description: 'Close modal/dialog',
  },
]

export function useKeyboardShortcuts(shortcuts: ShortcutDefinition[] = []) {
  const router = useRouter()

  // Navigation shortcuts
  const navigationShortcuts: ShortcutDefinition[] = useMemo(
    () => [
      {
        key: 'g',
        shift: true,
        handler: () => router.push('/'),
        description: 'Go to dashboard',
      },
      {
        key: 'd',
        shift: true,
        handler: () => router.push('/docker'),
        description: 'Go to Docker',
      },
      {
        key: 's',
        shift: true,
        handler: () => router.push('/services'),
        description: 'Go to Services',
      },
      {
        key: 'c',
        shift: true,
        handler: () => router.push('/config'),
        description: 'Go to Config',
      },
      {
        key: 'l',
        shift: true,
        handler: () => router.push('/logs'),
        description: 'Go to Logs',
      },
    ],
    [router]
  )

  const allShortcuts = useMemo(
    () => [...globalShortcuts, ...navigationShortcuts, ...shortcuts],
    [shortcuts, navigationShortcuts]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow Escape key even in inputs
        if (event.key !== 'Escape') {
          return
        }
      }

      const matchingShortcut = allShortcuts.find((shortcut) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = !shortcut.ctrl || event.ctrlKey === shortcut.ctrl
        const metaMatch = !shortcut.meta || event.metaKey === shortcut.meta
        const shiftMatch = !shortcut.shift || event.shiftKey === shortcut.shift
        const altMatch = !shortcut.alt || event.altKey === shortcut.alt

        return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch
      })

      if (matchingShortcut) {
        event.preventDefault()
        matchingShortcut.handler()
      }
    },
    [allShortcuts]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return allShortcuts
}

// Hook to display shortcuts
export function useShortcutsList() {
  const shortcuts = useKeyboardShortcuts()

  const formatShortcut = (shortcut: ShortcutDefinition): string => {
    const keys = []
    if (shortcut.meta) keys.push('⌘')
    if (shortcut.ctrl) keys.push('Ctrl')
    if (shortcut.alt) keys.push('Alt')
    if (shortcut.shift) keys.push('Shift')
    keys.push(shortcut.key.toUpperCase())

    return keys.join('+')
  }

  return shortcuts.map((s) => ({
    keys: formatShortcut(s),
    description: s.description,
  }))
}
