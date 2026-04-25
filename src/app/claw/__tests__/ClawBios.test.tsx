/**
 * Tests for the ɳClaw BIOS page (/claw/bios).
 * Covers 7 UI states: checking, running, stopped, bios loaded healthy,
 * bios drift with heal, snapshot action, bios unavailable.
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

import BiosPage from '../bios/page'

// ── Helpers ──────────────────────────────────────────────────────────────────

const HEALTHY_BIOS = {
  level: 3,
  prompt_hash: 'abc123defghijk',
  last_snapshot: new Date(Date.now() - 120_000).toISOString(),
  drift_count: 0,
  healthy: true,
  heal_available: false,
  total_tokens: 2048,
  layers: [
    {
      level: 1,
      name: 'Core Identity',
      description: 'Base identity layer',
      active: true,
      prompt_hash: 'layer1hash',
      token_count: 500,
      last_modified: new Date(Date.now() - 86_400_000).toISOString(),
    },
    {
      level: 2,
      name: 'Behavioral Defaults',
      description: 'Default behaviors',
      active: false,
      prompt_hash: 'layer2hash',
      token_count: 300,
      last_modified: new Date(Date.now() - 86_400_000).toISOString(),
    },
  ],
}

const DRIFTED_BIOS = {
  ...HEALTHY_BIOS,
  healthy: false,
  drift_count: 5,
  heal_available: true,
}

function setupOffline() {
  mockFetch.mockRejectedValue(new Error('connection refused'))
}

function setupRunning(bios = HEALTHY_BIOS) {
  // health
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({}),
  } as Response)
  // bios/status
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => bios,
  } as Response)
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('BiosPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupOffline()
  })

  // ── State 1: Header ────────────────────────────────────────────────────────

  it('renders the BIOS header', () => {
    render(<BiosPage />)
    expect(screen.getByText('BIOS')).toBeInTheDocument()
    expect(
      screen.getByText(/Behavioral Identity Operating System/i),
    ).toBeInTheDocument()
  })

  // ── State 2: Checking ──────────────────────────────────────────────────────

  it('shows Checking badge initially', () => {
    render(<BiosPage />)
    expect(screen.getByText('Checking')).toBeInTheDocument()
  })

  // ── State 3: Stopped ──────────────────────────────────────────────────────

  it('shows Stopped badge when plugin is unreachable', async () => {
    render(<BiosPage />)
    await waitFor(() => {
      expect(screen.getByText('Stopped')).toBeInTheDocument()
    })
  })

  it('shows offline warning banner', async () => {
    render(<BiosPage />)
    await waitFor(() => {
      expect(screen.getByText('claw plugin is not running')).toBeInTheDocument()
    })
  })

  // ── State 4: BIOS unavailable (plugin down, no data) ──────────────────────

  it('shows BIOS unavailable notice when plugin is down', async () => {
    render(<BiosPage />)
    await waitFor(() => {
      expect(screen.getByText('BIOS status unavailable')).toBeInTheDocument()
    })
  })

  // ── State 5: BIOS loaded healthy ──────────────────────────────────────────

  it('shows Running and Healthy when bios is ok', async () => {
    setupRunning()
    render(<BiosPage />)
    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument()
      expect(screen.getByText('Healthy')).toBeInTheDocument()
    })
  })

  it('shows prompt hash (first 8 chars)', async () => {
    setupRunning()
    render(<BiosPage />)
    await waitFor(() => {
      expect(screen.getAllByText(/abc123de/i).length).toBeGreaterThan(0)
    })
  })

  it('renders layer rows for each BIOS layer', async () => {
    setupRunning()
    render(<BiosPage />)
    await waitFor(() => {
      expect(screen.getByText('L1 — Core Identity')).toBeInTheDocument()
      expect(screen.getByText('L2 — Behavioral Defaults')).toBeInTheDocument()
    })
  })

  it('marks the active layer', async () => {
    setupRunning()
    render(<BiosPage />)
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  it('shows Save snapshot button', async () => {
    setupRunning()
    render(<BiosPage />)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Save snapshot/i }),
      ).toBeInTheDocument()
    })
  })

  // ── State 6: BIOS drift with heal ────────────────────────────────────────

  it('shows Drift detected and Heal drift button when drift_count > 0', async () => {
    setupRunning(DRIFTED_BIOS)
    render(<BiosPage />)
    await waitFor(() => {
      expect(screen.getByText('Drift detected')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Heal drift/i }),
      ).toBeInTheDocument()
    })
  })

  it('shows drift count in summary card', async () => {
    setupRunning(DRIFTED_BIOS)
    render(<BiosPage />)
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  // ── State 7: Snapshot action ──────────────────────────────────────────────

  it('Save snapshot button calls /claw/bios/snapshot', async () => {
    const user = userEvent.setup()
    setupRunning()
    // snapshot POST response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response)
    // re-fetch bios after snapshot
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => HEALTHY_BIOS,
    } as Response)

    render(<BiosPage />)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Save snapshot/i }),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Save snapshot/i }))

    await waitFor(() => {
      const calls = mockFetch.mock.calls.map((c) => c[0] as string)
      expect(calls.some((url) => url.includes('/claw/bios/snapshot'))).toBe(
        true,
      )
    })
  })

  it('shows Snapshot saved message on success', async () => {
    const user = userEvent.setup()
    setupRunning()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => HEALTHY_BIOS,
    } as Response)

    render(<BiosPage />)
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Save snapshot/i }),
      ).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Save snapshot/i }))

    await waitFor(() => {
      expect(screen.getByText('Snapshot saved')).toBeInTheDocument()
    })
  })

  // ── Refresh ────────────────────────────────────────────────────────────────

  it('Refresh button fires additional fetch calls', async () => {
    const user = userEvent.setup()
    render(<BiosPage />)
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
