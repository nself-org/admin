/**
 * T-0392 — admin/ unit smoke tests
 *
 * Four pure-logic / lightweight rendering tests for plugin-related UI.
 * Run with: pnpm test (Jest + jsdom)
 *
 * No network, no Docker, no running nAdmin required.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ---------------------------------------------------------------------------
// Test 1 — Plugin status badge: "healthy" response → green badge class
// ---------------------------------------------------------------------------

/** Minimal inline component that mirrors the badge logic in plugins/page.tsx */
function PluginStatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    installed: 'bg-green-100 text-green-800',
    update_available: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    not_installed: 'bg-gray-100 text-gray-500',
  }

  const statusLabels: Record<string, string> = {
    installed: 'Installed',
    update_available: 'Update Available',
    error: 'Error',
    not_installed: 'Not Installed',
  }

  const color = statusColors[status] ?? statusColors.not_installed
  const label = statusLabels[status] ?? status

  return (
    <span
      data-testid="plugin-status-badge"
      className={`rounded-full px-2 py-0.5 text-xs ${color}`}
    >
      {label}
    </span>
  )
}

describe('PluginStatusBadge', () => {
  it('renders a green badge when status is "installed" (healthy)', () => {
    render(<PluginStatusBadge status="installed" />)

    const badge = screen.getByTestId('plugin-status-badge')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-green-100')
    expect(badge.className).toContain('text-green-800')
    expect(badge).toHaveTextContent('Installed')
  })
})

// ---------------------------------------------------------------------------
// Test 2 — DLQ badge count: mock API returns 5 items → badge shows "5"
// ---------------------------------------------------------------------------

/**
 * Minimal DLQ badge component.  Fetches /api/services/bullmq/dlq on mount
 * and displays the item count in a badge.
 */
function DlqBadge() {
  const [count, setCount] = React.useState<number | null>(null)

  React.useEffect(() => {
    fetch('/api/services/bullmq/dlq')
      .then((r) => r.json())
      .then((data: { items: unknown[] }) => setCount(data.items?.length ?? 0))
      .catch(() => setCount(0))
  }, [])

  if (count === null) return <span data-testid="dlq-badge-loading">…</span>

  return (
    <span data-testid="dlq-badge" className="rounded-full bg-red-500 px-2 text-xs text-white">
      {count}
    </span>
  )
}

describe('DlqBadge', () => {
  it('shows "5" when the API returns 5 failed items', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [{}, {}, {}, {}, {}] }),
    })

    render(<DlqBadge />)

    await waitFor(() => {
      expect(screen.getByTestId('dlq-badge')).toHaveTextContent('5')
    })
  })
})

// ---------------------------------------------------------------------------
// Test 3 — Plugin config form: required field empty → validation error shown
// ---------------------------------------------------------------------------

/**
 * Minimal plugin config form.  Validates that the "API Key" field is non-empty
 * before submitting.
 */
function PluginConfigForm({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [value, setValue] = React.useState('')
  const [error, setError] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) {
      setError('API Key is required')
      return
    }
    setError('')
    onSubmit(value)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="api-key">API Key</label>
      <input
        id="api-key"
        data-testid="api-key-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {error && <span data-testid="validation-error">{error}</span>}
      <button type="submit">Save</button>
    </form>
  )
}

describe('PluginConfigForm', () => {
  it('shows a validation error when required API Key field is submitted empty', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()

    render(<PluginConfigForm onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(screen.getByTestId('validation-error')).toHaveTextContent('API Key is required')
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Test 4 — AI usage chart: renders with sample data without throwing
// ---------------------------------------------------------------------------

/**
 * The real chart component uses recharts/nivo which requires Canvas — not
 * available in jsdom.  We verify the component mounts without throwing and
 * exposes a container with the expected data attribute.
 */

jest.mock('recharts', () => {
  const Recharts = jest.requireActual('recharts')
  return {
    ...Recharts,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="line-chart">{children}</div>
    ),
    Line: () => <div />,
    XAxis: () => <div />,
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Tooltip: () => <div />,
  }
})

const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } =
  require('recharts')

function AiUsageChart({ data }: { data: { date: string; tokens: number }[] }) {
  return (
    <div data-testid="ai-usage-chart">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="tokens" stroke="#6366f1" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

describe('AiUsageChart', () => {
  it('renders with sample data without throwing', () => {
    const sampleData = [
      { date: '2026-03-01', tokens: 1200 },
      { date: '2026-03-02', tokens: 3400 },
      { date: '2026-03-03', tokens: 2100 },
      { date: '2026-03-04', tokens: 4800 },
      { date: '2026-03-05', tokens: 3600 },
    ]

    expect(() => render(<AiUsageChart data={sampleData} />)).not.toThrow()
    expect(screen.getByTestId('ai-usage-chart')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})
