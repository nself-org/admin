'use client'

import type { VibeGeneration } from '@/app/vibe/hooks/useVibeSession'
import { Loader2, Send, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

interface ChatPanelProps {
  generation: VibeGeneration | null
  streamChunks: Array<{ type: string; content: string }>
  isStreaming: boolean
  statusMessage: string
  onSubmit: (prompt: string) => void
  disabled: boolean
}

export function ChatPanel({
  generation,
  streamChunks,
  isStreaming,
  statusMessage,
  onSubmit,
  disabled,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<HTMLDivElement>(null)

  // Add user message when generation starts
  useEffect(() => {
    if (generation?.prompt && generation.status === 'generating') {
      setMessages((prev) => {
        // Avoid duplicates
        if (
          prev.some((m) => m.role === 'user' && m.content === generation.prompt)
        ) {
          return prev
        }
        return [
          ...prev,
          { role: 'user', content: generation.prompt },
          { role: 'assistant', content: '', isStreaming: true },
        ]
      })
    }
  }, [generation?.prompt, generation?.status])

  // Build streaming assistant message from chunks
  useEffect(() => {
    const tokenChunks = streamChunks.filter((c) => c.type === 'token')
    if (tokenChunks.length === 0) return

    const content = tokenChunks.map((c) => c.content).join('')
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      return [
        ...prev.slice(0, -1),
        { ...last, content, isStreaming: isStreaming },
      ]
    })
  }, [streamChunks, isStreaming])

  // Finalize when done/error
  useEffect(() => {
    if (!isStreaming && generation?.status === 'done') {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (!last || last.role !== 'assistant') return prev
        return [...prev.slice(0, -1), { ...last, isStreaming: false }]
      })
    }
  }, [isStreaming, generation?.status])

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamChunks])

  const handleSubmit = useCallback(() => {
    const text = input.trim()
    if (!text || disabled) return
    onSubmit(text)
    setInput('')
    if (inputRef.current) inputRef.current.focus()
  }, [input, disabled, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <section role="region" aria-label="Chat" className="flex h-full flex-col">
      <h2 className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100">
        Feature Request
      </h2>

      {/* Status live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
        ref={liveRef}
      >
        {statusMessage}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
        aria-label="Conversation history"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <Sparkles
              className="mb-3 h-8 w-8 text-sky-500"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-zinc-300">
              Describe a feature to generate
            </p>
            <p className="mt-1 max-w-xs text-xs text-zinc-500">
              Example: &quot;Add a comments table with user_id and body, with
              Hasura permissions for authenticated users&quot;
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <article
            key={i}
            className={
              msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'
            }
          >
            <div
              className={
                msg.role === 'user'
                  ? 'max-w-[80%] rounded-lg bg-sky-600 px-3 py-2 text-sm text-white'
                  : 'max-w-[90%] rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-100'
              }
            >
              {msg.role === 'assistant' && msg.isStreaming && !msg.content && (
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  <span>Generating...</span>
                </span>
              )}
              {msg.content && (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              {msg.role === 'assistant' && msg.isStreaming && (
                <span
                  className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-sky-400"
                  aria-hidden="true"
                />
              )}
            </div>
          </article>
        ))}

        {statusMessage && isStreaming && (
          <p
            className="py-1 text-center text-xs text-zinc-500"
            aria-hidden="true"
          >
            {statusMessage}
          </p>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-3">
        <div className="flex items-end gap-2">
          <label htmlFor="vibe-prompt" className="sr-only">
            Describe the feature you want to generate
          </label>
          <textarea
            id="vibe-prompt"
            ref={inputRef}
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Describe the feature to generate (e.g. "add a comments table with user_id and body")'
            disabled={disabled}
            aria-label="Feature request"
            className="flex-1 resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            aria-label="Submit prompt"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-sky-600 text-white transition-colors hover:bg-sky-500 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-zinc-600">
          Enter to send &middot; Shift+Enter for new line
        </p>
      </div>
    </section>
  )
}
