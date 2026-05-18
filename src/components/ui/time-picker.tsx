'use client'

import { cn } from '@/lib/utils'
import * as Popover from '@radix-ui/react-popover'
import { Clock } from 'lucide-react'
import * as React from 'react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'

/**
 * Time picker component for selecting hours and minutes
 *
 * @example
 * ```tsx
 * <TimePicker
 *   value="14:30"
 *   onChange={(time) => console.log(time)}
 *   placeholder="Select time"
 * />
 * ```
 */

export interface TimePickerProps {
  /** Time value in HH:mm format */
  value?: string
  /** Change handler */
  onChange?: (time: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Use 12-hour format (default: 24-hour) */
  use12Hour?: boolean
  /** Class name */
  className?: string
}

export function TimePicker({
  value = '',
  onChange,
  placeholder = 'Select time',
  disabled = false,
  use12Hour = false,
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hours, setHours] = React.useState('')
  const [minutes, setMinutes] = React.useState('')
  const [period, setPeriod] = React.useState<'AM' | 'PM'>('AM')

  // Parse value on mount/change
  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':')
      if (use12Hour) {
        const hourNum = parseInt(h, 10)
        setHours(String(hourNum > 12 ? hourNum - 12 : hourNum || 12))
        setPeriod(hourNum >= 12 ? 'PM' : 'AM')
      } else {
        setHours(h)
      }
      setMinutes(m)
    }
  }, [value, use12Hour])

  const handleApply = () => {
    let hourNum = parseInt(hours, 10)
    const minNum = parseInt(minutes, 10)

    if (use12Hour) {
      if (period === 'PM' && hourNum !== 12) hourNum += 12
      if (period === 'AM' && hourNum === 12) hourNum = 0
    }

    const timeStr = `${String(hourNum).padStart(2, '0')}:${String(minNum).padStart(2, '0')}`
    onChange?.(timeStr)
    setOpen(false)
  }

  const displayValue = value ? (use12Hour ? `${hours}:${minutes} ${period}` : value) : ''

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-zinc-500 dark:text-zinc-400',
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {displayValue || <span>{placeholder}</span>}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="w-auto rounded-md border border-zinc-200 bg-white p-4 shadow-md dark:border-zinc-800 dark:bg-zinc-950"
          sideOffset={4}
        >
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="hours">Hours</Label>
                <Input
                  id="hours"
                  type="number"
                  min={use12Hour ? 1 : 0}
                  max={use12Hour ? 12 : 23}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="HH"
                  className="text-center"
                />
              </div>
              <span className="mb-2 text-xl font-bold">:</span>
              <div className="flex-1 space-y-2">
                <Label htmlFor="minutes">Minutes</Label>
                <Input
                  id="minutes"
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  placeholder="MM"
                  className="text-center"
                />
              </div>
              {use12Hour && (
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant={period === 'AM' ? 'default' : 'outline'}
                    onClick={() => setPeriod('AM')}
                    className="h-8 w-12"
                  >
                    AM
                  </Button>
                  <Button
                    size="sm"
                    variant={period === 'PM' ? 'default' : 'outline'}
                    onClick={() => setPeriod('PM')}
                    className="h-8 w-12"
                  >
                    PM
                  </Button>
                </div>
              )}
            </div>
            <Button onClick={handleApply} className="w-full">
              Apply
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
