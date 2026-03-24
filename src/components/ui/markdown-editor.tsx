'use client'

import { cn } from '@/lib/utils'
import { sanitizeUrl } from '@/lib/validation'
import { Code, Eye } from 'lucide-react'
import * as React from 'react'
import { Button } from './button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Textarea } from './textarea'

/**
 * Markdown editor component with preview
 *
 * @example
 * ```tsx
 * <MarkdownEditor
 *   value={markdown}
 *   onChange={setMarkdown}
 *   placeholder="Write markdown..."
 * />
 * ```
 */

export interface MarkdownEditorProps {
  /** Markdown content */
  value?: string
  /** Change handler */
  onChange?: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Editor height */
  height?: string
  /** Read-only mode */
  readOnly?: boolean
  /** Class name */
  className?: string
}

export function MarkdownEditor({
  value = '',
  onChange,
  placeholder = 'Write markdown...',
  height = '400px',
  readOnly = false,
  className,
}: MarkdownEditorProps) {
  const [mode, setMode] = React.useState<'write' | 'preview'>('write')

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value)
  }

  const insertMarkdown = (syntax: string, placeholder: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end) || placeholder
    const newText =
      value.substring(0, start) +
      syntax +
      selectedText +
      syntax +
      value.substring(end)

    onChange?.(newText)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(
        start + syntax.length,
        start + syntax.length + selectedText.length,
      )
    }, 0)
  }

  const toolbarButtons = [
    { label: 'Bold', action: () => insertMarkdown('**', 'bold text') },
    { label: 'Italic', action: () => insertMarkdown('*', 'italic text') },
    { label: 'Code', action: () => insertMarkdown('`', 'code') },
    {
      label: 'Link',
      action: () => {
        const textarea = document.querySelector(
          'textarea',
        ) as HTMLTextAreaElement
        if (!textarea) return
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = value.substring(start, end) || 'link text'
        const newText =
          value.substring(0, start) +
          `[${selectedText}](url)` +
          value.substring(end)
        onChange?.(newText)
      },
    },
  ]

  return (
    <div className={cn('space-y-2', className)}>
      <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
          <TabsList className="h-auto border-0 bg-transparent p-0">
            <TabsTrigger
              value="write"
              className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent dark:data-[state=active]:border-zinc-50"
            >
              <Code className="h-4 w-4" />
              Write
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent dark:data-[state=active]:border-zinc-50"
            >
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {mode === 'write' && !readOnly && (
            <div className="flex gap-1 p-2">
              {toolbarButtons.map((btn) => (
                <Button
                  key={btn.label}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={btn.action}
                  className="h-8 px-2 text-xs"
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <TabsContent value="write" className="mt-0">
          <Textarea
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            readOnly={readOnly}
            className="font-mono"
            style={{ height }}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <div
            className={cn(
              'prose-zinc prose max-w-none rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 dark:prose-invert',
            )}
            style={{ height, overflowY: 'auto' }}
          >
            {value ? (
              <MarkdownPreview content={value} />
            ) : (
              <p className="text-zinc-500 dark:text-zinc-400">
                Nothing to preview
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Simple markdown preview (basic implementation)
// In production, you might want to use a library like react-markdown
function MarkdownPreview({ content }: { content: string }) {
  const html = React.useMemo(() => {
    return content
      .split('\n')
      .map((line) => {
        // Headers
        if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`
        if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`
        if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`

        // Bold
        line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

        // Italic
        line = line.replace(/\*(.+?)\*/g, '<em>$1</em>')

        // Inline code
        line = line.replace(/`(.+?)`/g, '<code>$1</code>')

        // Links (sanitize URLs to prevent javascript: XSS)
        line = line.replace(/\[(.+?)\]\((.+?)\)/g, (_match, text, url) => {
          const safeUrl = sanitizeUrl(url)
          return `<a href="${safeUrl}">${text}</a>`
        })

        // Empty lines
        if (!line.trim()) return '<br />'

        return `<p>${line}</p>`
      })
      .join('\n')
  }, [content])

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
