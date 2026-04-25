'use client'

import { Check, Link } from 'lucide-react'
import { useState } from 'react'

/**
 * CopyLinkButton — copies the current URL to clipboard.
 *
 * Shows a success state for 2 seconds after copy.
 * Toast message: "Link copied. Recipient must be signed in to view."
 */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      // Fallback for browsers without clipboard API
      const input = document.createElement('input')
      input.value = window.location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)

    // Show toast notification
    showToast('Link copied. Recipient must be signed in to view.')
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy link to this page"
      aria-label="Copy link to this page"
      className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 print:hidden"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Link className="h-3.5 w-3.5" />
      )}
      <span>{copied ? 'Copied!' : 'Copy link'}</span>
    </button>
  )
}

// Lightweight toast — avoids pulling in a full toast library
function showToast(message: string) {
  const existing = document.getElementById('nself-copy-toast')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = 'nself-copy-toast'
  toast.setAttribute('role', 'status')
  toast.setAttribute('aria-live', 'polite')
  toast.style.cssText = [
    'position:fixed',
    'bottom:1.5rem',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:9999',
    'background:#18181b',
    'color:#fff',
    'padding:0.625rem 1rem',
    'border-radius:0.5rem',
    'font-size:0.875rem',
    'box-shadow:0 4px 12px rgba(0,0,0,0.3)',
    'pointer-events:none',
    'white-space:nowrap',
  ].join(';')
  toast.textContent = message

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s'
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 2700)
}
