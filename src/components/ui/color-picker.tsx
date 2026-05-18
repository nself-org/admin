'use client'

import { cn } from '@/lib/utils'
import * as Popover from '@radix-ui/react-popover'
import * as React from 'react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'

/**
 * Color picker component with preset colors and custom input
 *
 * @example
 * ```tsx
 * <ColorPicker
 *   value="#3b82f6"
 *   onChange={(color) => console.log(color)}
 *   presetColors={['#ef4444', '#3b82f6', '#10b981']}
 * />
 * ```
 */

export interface ColorPickerProps {
  /** Color value (hex format) */
  value?: string
  /** Change handler */
  onChange?: (color: string) => void
  /** Preset colors to show */
  presetColors?: string[]
  /** Placeholder text */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Class name */
  className?: string
}

const DEFAULT_PRESETS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
]

export function ColorPicker({
  value = '#000000',
  onChange,
  presetColors = DEFAULT_PRESETS,
  placeholder = 'Select color',
  disabled = false,
  className,
}: ColorPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [customColor, setCustomColor] = React.useState(value)

  const handlePresetClick = (color: string) => {
    onChange?.(color)
    setCustomColor(color)
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value
    setCustomColor(newColor)
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      onChange?.(newColor)
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn('w-full justify-start text-left font-normal', className)}
        >
          <div
            className="mr-2 h-5 w-5 rounded border border-zinc-300 dark:border-zinc-700"
            style={{ backgroundColor: value }}
          />
          {value || <span className="text-zinc-500 dark:text-zinc-400">{placeholder}</span>}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="w-64 rounded-md border border-zinc-200 bg-white p-4 shadow-md dark:border-zinc-800 dark:bg-zinc-950"
          sideOffset={4}
        >
          <div className="space-y-4">
            {/* Preset colors */}
            <div className="space-y-2">
              <Label>Preset Colors</Label>
              <div className="grid grid-cols-8 gap-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handlePresetClick(color)}
                    className={cn(
                      'h-8 w-8 rounded border-2 transition-all hover:scale-110',
                      value === color
                        ? 'border-zinc-900 dark:border-zinc-50'
                        : 'border-zinc-200 dark:border-zinc-800'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>

            {/* Custom color input */}
            <div className="space-y-2">
              <Label htmlFor="custom-color">Custom Color</Label>
              <div className="flex gap-2">
                <Input
                  id="custom-color"
                  type="text"
                  value={customColor}
                  onChange={handleCustomChange}
                  placeholder="#000000"
                  maxLength={7}
                  className="flex-1"
                />
                <input
                  type="color"
                  value={value}
                  onChange={(e) => {
                    const newColor = e.target.value
                    setCustomColor(newColor)
                    onChange?.(newColor)
                  }}
                  className="h-10 w-10 cursor-pointer rounded border border-zinc-200 dark:border-zinc-800"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div
                className="h-12 w-full rounded border border-zinc-200 dark:border-zinc-800"
                style={{ backgroundColor: value }}
              />
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
