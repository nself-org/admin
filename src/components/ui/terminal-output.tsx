'use client'

import { cn } from '@/lib/utils'
import Ansi from 'ansi-to-react'
import { Copy, Download } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from './button'
import { ScrollArea } from './scroll-area'

/**
 * TerminalOutput - CLI output display with ANSI color support
 *
 * @example
 * ```tsx
 * <TerminalOutput
 *   output={commandOutput}
 *   title="Build Output"
 *   live={true}
 * />
 * ```
 */
export interface TerminalOutputProps {
  /** Terminal output (string with ANSI codes) */
  output: string
  /** Title for the terminal */
  title?: string
  /** Enable live mode (auto-scroll to bottom) */
  live?: boolean
  /** Show copy button */
  copyable?: boolean
  /** Show download button */
  downloadable?: boolean
  /** Height of terminal */
  height?: string
  /** Additional CSS classes */
  className?: string
}

export function TerminalOutput({
  output,
  title,
  live = false,
  copyable = true,
  downloadable = true,
  height = '400px',
  className,
}: TerminalOutputProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (live && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [output, live])

  const handleCopy = () => {
    const text = output.replace(/\u001b\[.*?m/g, '')
    navigator.clipboard.writeText(text)
  }

  const handleDownload = () => {
    const text = output.replace(/\u001b\[.*?m/g, '')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terminal-output-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-zinc-200 bg-zinc-950 dark:border-zinc-800',
        className
      )}
    >
      {/* Header */}
      {(title || copyable || downloadable) && (
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          {title && <h3 className="font-mono text-sm font-semibold text-zinc-100">{title}</h3>}
          <div className="flex items-center gap-2">
            {copyable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100"
                title="Copy output"
                aria-label="Copy output"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {downloadable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100"
                title="Download output"
                aria-label="Download output"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Terminal Content */}
      <ScrollArea className="flex-1" style={{ height }}>
        <div className="p-4 font-mono text-sm">
          {output ? (
            <>
              <Ansi useClasses linkify={false}>
                {output}
              </Ansi>
              <div ref={endRef} />
            </>
          ) : (
            <div className="text-zinc-500">No output yet...</div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
