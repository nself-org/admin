'use client'

import clsx from 'clsx'

interface BurnMeterProps {
  burnRate: number
  window: '1h' | '6h' | '24h' | '72h'
  budget: number
  className?: string
}

export function BurnMeter({ burnRate, window, budget, className }: BurnMeterProps) {
  const consumed = Math.min(burnRate * budget, budget)
  const pct = budget > 0 ? Math.min((consumed / budget) * 100, 100) : 0
  const remaining = Math.max(budget - consumed, 0)
  const remainingPct = budget > 0 ? (remaining / budget) * 100 : 0

  const isRed = burnRate > 2
  const isYellow = !isRed && burnRate > 1

  const barClass = isRed
    ? 'bg-red-500'
    : isYellow
      ? 'bg-amber-400'
      : 'bg-green-500'

  const textClass = isRed
    ? 'text-red-400'
    : isYellow
      ? 'text-amber-400'
      : 'text-green-400'

  return (
    <div className={clsx('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-nself-text-muted">
          Error budget · {window} window
        </span>
        <span className={clsx('font-medium', textClass)}>
          {remainingPct.toFixed(1)}% remaining
        </span>
      </div>
      <div className="border-nself-border h-2 w-full overflow-hidden rounded-full border bg-gray-800">
        <div
          className={clsx('h-full rounded-full transition-all', barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-nself-text-muted flex items-center justify-between text-xs">
        <span>
          Burn rate:{' '}
          <span className={clsx('font-medium', textClass)}>
            {burnRate.toFixed(2)}×
          </span>
        </span>
        <span>
          {consumed.toFixed(2)} / {budget.toFixed(2)} min consumed
        </span>
      </div>
    </div>
  )
}
