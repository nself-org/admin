'use client'

import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import * as React from 'react'

export interface AccordionItem {
  id: string
  title: string | React.ReactNode
  content: React.ReactNode
}

export interface AccordionProps {
  items: AccordionItem[]
  /** Allow multiple items to be open at once */
  multiple?: boolean
  /** Default open item IDs */
  defaultOpen?: string[]
  /** Class name */
  className?: string
}

export function Accordion({
  items,
  multiple = false,
  defaultOpen = [],
  className,
}: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(new Set(defaultOpen))

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!multiple) {
          next.clear()
        }
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const isOpen = openItems.has(item.id)
        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
          >
            <button
              onClick={() => toggleItem(item.id)}
              className="flex w-full items-center justify-between bg-white px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              <span>{item.title}</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <div className="border-t border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                {item.content}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
