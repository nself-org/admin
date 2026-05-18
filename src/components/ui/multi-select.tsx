'use client'

import { cn } from '@/lib/utils'
import * as Popover from '@radix-ui/react-popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk'
import { Check, X } from 'lucide-react'
import * as React from 'react'
import { Badge } from './badge'
import { Button } from './button'

/**
 * Multi-select component for selecting multiple options
 *
 * @example
 * ```tsx
 * <MultiSelect
 *   options={[
 *     { value: 'postgres', label: 'PostgreSQL' },
 *     { value: 'redis', label: 'Redis' },
 *     { value: 'nginx', label: 'Nginx' },
 *   ]}
 *   value={selectedServices}
 *   onChange={setSelectedServices}
 *   placeholder="Select services..."
 * />
 * ```
 */

export interface MultiSelectOption {
  value: string
  label: string
  icon?: React.ReactNode
}

export interface MultiSelectProps {
  /** Available options */
  options: MultiSelectOption[]
  /** Selected values */
  value?: string[]
  /** Change handler */
  onChange?: (values: string[]) => void
  /** Placeholder text */
  placeholder?: string
  /** Empty state message */
  emptyMessage?: string
  /** Disabled state */
  disabled?: boolean
  /** Max items to show before scrolling */
  maxItems?: number
  /** Class name */
  className?: string
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = 'Select items...',
  emptyMessage = 'No items found',
  disabled = false,
  maxItems = 3,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const selectedOptions = options.filter((opt) => value.includes(opt.value))

  const toggleOption = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onChange?.(newValue)
  }

  const removeOption = (optionValue: string) => {
    onChange?.(value.filter((v) => v !== optionValue))
  }

  const clearAll = () => {
    onChange?.([])
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('h-auto min-h-10 w-full justify-between', className)}
        >
          <div className="flex flex-wrap gap-1">
            {selectedOptions.length === 0 && (
              <span className="text-zinc-500 dark:text-zinc-400">{placeholder}</span>
            )}
            {selectedOptions.slice(0, maxItems).map((option) => (
              <Badge key={option.value} variant="secondary" className="gap-1">
                {option.icon}
                {option.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeOption(option.value)
                  }}
                  className="ml-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {selectedOptions.length > maxItems && (
              <Badge variant="secondary">+{selectedOptions.length - maxItems} more</Badge>
            )}
          </div>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="w-[var(--radix-popover-trigger-width)] rounded-md border border-zinc-200 bg-white p-0 shadow-md dark:border-zinc-800 dark:bg-zinc-950"
          sideOffset={4}
        >
          <Command>
            <CommandInput
              placeholder="Search..."
              value={search}
              onValueChange={setSearch}
              className="h-9"
            />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = value.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      onSelect={() => toggleOption(option.value)}
                      className="cursor-pointer"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex items-center gap-2">
                          {option.icon}
                          {option.label}
                        </div>
                        {isSelected && <Check className="h-4 w-4" />}
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          {value.length > 0 && (
            <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
              <Button variant="ghost" size="sm" onClick={clearAll} className="w-full">
                Clear all
              </Button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
