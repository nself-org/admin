/**
 * Tests for the ɳClaw dashboard page (/claw).
 * Covers 7 UI states: checking, running, stopped, stats loaded,
 * bios healthy, bios drift, plugin offline banner.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── AbortSignal shim ──────────────────────────────────────────────────────────

if (typeof AbortSignal.timeout === 'undefined') {
  Object.defineProperty(AbortSignal, 'timeout', {
    value: (_ms: number) => new AbortController().signal,
    writable: true,
  })
}

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFetch = jest.fn()
global.fetch = mockFetch

// Next.js Link renders as <a> in tests
jest.mock('next/link', () => {
  const MockLink = ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
  MockLink.displayName = 'MockLink'
  return MockLink
})

import ClawDashboardPage from '../page'

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupOffline() {
  mockFetch.mockRejectedValue(new Error('connection refused'))
}

function setupRunning(
  stats = {
    conversation_count: 42,
    topic_count: 7,
    entity_count: 15,
    memory_count: 300,
    session_count: 3,
  },
  bios = {
    level: 3,
    prompt_hash: 'abc123defghijk',
    last_snapshot: new Date(Date.now() - 60_000).toISOString(),
    drift_count: 0,
    healthy: true,
    layers: [],
    total_tokens: 1024,
    heal_available: false,
  },
) {
  // health
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({}),
  } as Response)
  // stats
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => stats,
  } as Response)
  // bios
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => bios,
  } as Response)
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ClawDashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupOffline()
  })

  // ── State 1: Initial render / header ───────────────────────────────────────

  it('renders the ɳClaw header', () => {
    render(<ClawDashboardPage />)
    expect(screen.getByText('ɳClaw')).toBeInTheDocument()
    expect(screen.getByText('AI assistant data management')).toBeInTheDocument()
  })

  it('shows Refresh button', () => {
    render(<ClawDashboardPage />)
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
  })

  // ── State 2: Checking ──────────────────────────────────────────────────────

  it('shows Checking badge initially', () => {
    render(<ClawDashboardPage />)
    expect(screen.getByText('Checking')).toBeInTheDocument()
  })

  // ── State 3: Plugin stopped ────────────────────────────────────────────────

  it('shows Stopped badge when plugin is unreachable', async () => {
    render(<ClawDashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Stopped')).toBeInTheDocument()
    })
  })

  it('shows offline warning banner when plugin is down', async () => {
    render(<ClawDashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('claw plugin is not running')).toBeInTheDocument()
    })
  })

  it('shows install hint in the offline banner', async () => {
    render(<ClawDashboardPage />)
    await waitFor(() => {
      expect(screen.getByText(/nself plugin install claw/i)).toBeInTheDocument()
    })
  })

  // ── State 4: Running with stats ────────────────────────────────────────────

  it('shows Running badge when plugin responds ok', async () => {
    setupRunning()
    render(<ClawDashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument()
    })
  })

  it('renders conversation count stat card', async () => {
    setupRunning()
    render(<ClawDashboardPage />)
    await waitFor(() => {
      // stat label (may also appear in quick nav — getAllByText handles both)
      expect(screen.getAllByText('Conversations').length).toBeGreaterThan(0)
      expect(screen.getByText('42')).toBeInTheDocument()
    })
  })

  it('renders topics stat card', async () => {
    setupRunning()
    render(<ClawDashboardPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Topics').length).toBeGreaterThan(0)
      expect(screen.getByText('7')).toBeInTheDocument()
    })
  })

  it('renders entities stat card', async () => {
    setupRunning()
    render(<ClawDashboardPage />)
    await waitFor(() => {
      expect(screen.getAllByText('Entities').length).toBeGreaterThan(0)
      expect(screen.getByText('15')).toBeInTheDocument()
    })
  })

  // ── State 5: BIOS healthy ──────────────────────────────────────────────────

  it('shows BIOS Healthy when drift_count is 0', async () => {
    setupRunning()
    render(<ClawDashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument()
    })
  })

  it('shows shortened prompt hash in BIOS widget', async () => {
    setupRunning()
    render(<ClawDashboardPage />)
    await waitFor(() => {
      expect(screen.getByText(/abc123de/i)).toBeInTheDocument()
    })
  })

  // ── State 6: BIOS drift ────────────────────────────────────────────────────

  it('shows Drift detected when healthy is false', async () => {
    setupRunning(
      {
        conversation_count: 5,
        topic_count: 2,
        entity_count: 3,
        memory_count: 10,
        session_count: 1,
      },
      {
        level: 2,
        prompt_hash: 'deadbeef12345',
        last_snapshot: new Date(Date.now() - 3_600_000).toISOString(),
        drift_count: 3,
        healthy: false,
        layers: [],
        total_tokens: 512,
        heal_available: true,
      },
    )
    render(<ClawDashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Drift detected')).toBeInTheDocument()
    })
  })

  // ── State 7: Quick nav links ───────────────────────────────────────────────

  it('renders all 6 quick access links', async () => {
    render(<ClawDashboardPage />)
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Conversations' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Topics' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Entities' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Memory' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Sessions' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'BIOS' })).toBeInTheDocument()
    })
  })

  // ── Refresh ────────────────────────────────────────────────────────────────

  it('Refresh button fires additional fetch calls', async () => {
    const user = userEvent.setup()
    render(<ClawDashboardPage />)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Refresh/i }),
      ).toBeInTheDocument()
    })
    const before = mockFetch.mock.calls.length
    await user.click(screen.getByRole('button', { name: /Refresh/i }))
    expect(mockFetch.mock.calls.length).toBeGreaterThan(before)
  })
})
