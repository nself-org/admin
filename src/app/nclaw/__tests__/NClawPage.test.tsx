/**
 * Tests for the ɳClaw admin page.
 *
 * The page reads NEXT_PUBLIC_NCLAW_ENABLED at module load time. To avoid the
 * React-instance-conflict caused by jest.resetModules() + dynamic import, we
 * set the env var to 'true' before the module loads (via the module-level
 * assignment below) and test the feature-gate path with a separate describe
 * block that overrides the constant via jest.mock.
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Environment ──────────────────────────────────────────────────────────────

// Set before any import of the page so the module-level constant is 'true'
process.env.NEXT_PUBLIC_NCLAW_ENABLED = 'true'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFetch = jest.fn()
global.fetch = mockFetch

// AbortSignal.timeout is not available in jsdom
if (typeof AbortSignal.timeout === 'undefined') {
  Object.defineProperty(AbortSignal, 'timeout', {
    value: (_ms: number) => new AbortController().signal,
    writable: true,
  })
}

// Import after env is set
import NClawPage from '../page'

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupFetchOffline() {
  mockFetch.mockRejectedValue(new Error('connection refused'))
}

function setupFetchRunning() {
  // health call
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      status: 'running',
      version: '1.2.0',
      uptime_seconds: 3661,
    }),
  } as Response)
  // sessions call for active users
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ sessions: [], total: 3 }),
  } as Response)
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('NClawPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupFetchOffline()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ── Header & layout ────────────────────────────────────────────────────────

  it('renders the ɳClaw page header', () => {
    render(<NClawPage />)
    expect(screen.getByText('ɳClaw')).toBeInTheDocument()
    expect(screen.getByText('AI assistant plugin management')).toBeInTheDocument()
  })

  it('shows a Refresh button', () => {
    render(<NClawPage />)
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
  })

  // ── Status badge ───────────────────────────────────────────────────────────

  it('shows Offline badge when plugin is not reachable', async () => {
    render(<NClawPage />)
    await waitFor(() => {
      // Multiple "Offline" texts may appear (status badge + logs section message)
      const matches = screen.getAllByText(/^Offline$/)
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  it('shows Running badge when plugin responds ok', async () => {
    setupFetchRunning()
    render(<NClawPage />)
    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument()
    })
  })

  it('shows offline warning banner when plugin is down', async () => {
    render(<NClawPage />)
    await waitFor(() => {
      expect(screen.getByText('nself-claw is not running')).toBeInTheDocument()
    })
  })

  it('shows install hint in the offline banner', async () => {
    render(<NClawPage />)
    await waitFor(() => {
      expect(screen.getByText(/nself plugin install claw/i)).toBeInTheDocument()
    })
  })

  // ── Section nav ────────────────────────────────────────────────────────────

  it('renders all 6 section nav buttons', async () => {
    render(<NClawPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Overview$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Connected Accounts/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Companion Devices/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Security$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Plugin Secrets/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Logs$/i })).toBeInTheDocument()
    })
  })

  it('defaults to the Overview section', async () => {
    render(<NClawPage />)
    await waitFor(() => {
      expect(screen.getByText('Service status')).toBeInTheDocument()
      expect(screen.getByText('Uptime')).toBeInTheDocument()
      expect(screen.getByText('Active users')).toBeInTheDocument()
    })
  })

  // ── Connected Accounts section ─────────────────────────────────────────────

  it('Connected Accounts section shows Add account button', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Connected Accounts/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Connected Accounts/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add account/i })).toBeInTheDocument()
    })
  })

  it('Connected Accounts section shows empty state when no accounts', async () => {
    const user = userEvent.setup()
    // accounts endpoint returns empty
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ accounts: [] }),
    } as Response)
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Connected Accounts/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Connected Accounts/i }))

    await waitFor(() => {
      expect(screen.getByText('No accounts connected')).toBeInTheDocument()
    })
  })

  // ── Companion Devices section ──────────────────────────────────────────────

  it('Companion Devices section shows Phase 224 notice', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Companion Devices/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Companion Devices/i }))

    await waitFor(() => {
      expect(screen.getByText(/Phase 224/i)).toBeInTheDocument()
    })
  })

  it('Companion Devices section shows empty state when no devices', async () => {
    const user = userEvent.setup()
    // devices endpoint returns empty
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ devices: [] }),
    } as Response)
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Companion Devices/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Companion Devices/i }))

    await waitFor(() => {
      expect(screen.getByText('No companion devices')).toBeInTheDocument()
    })
  })

  // ── Security section ───────────────────────────────────────────────────────

  it('Security section shows passkey enrollment button', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Security$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Security$/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enroll passkey/i })).toBeInTheDocument()
    })
  })

  it('Security section shows Session timeout config', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Security$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Security$/i }))

    await waitFor(() => {
      expect(screen.getByText('Session timeout')).toBeInTheDocument()
    })
  })

  it('Security section shows Secret rotation panel', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Security$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Security$/i }))

    await waitFor(() => {
      expect(screen.getByText('Secret rotation')).toBeInTheDocument()
      // All three secret keys present
      expect(screen.getByText('NCLAW_JWT_SECRET')).toBeInTheDocument()
      expect(screen.getByText('NCLAW_ENCRYPTION_KEY')).toBeInTheDocument()
      expect(screen.getByText('NCLAW_WEBHOOK_SECRET')).toBeInTheDocument()
    })
  })

  // ── Plugin Secrets section ─────────────────────────────────────────────────

  it('Plugin Secrets section lists expected env vars', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Plugin Secrets/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Plugin Secrets/i }))

    await waitFor(() => {
      expect(screen.getByText('NCLAW_GOOGLE_CLIENT_ID')).toBeInTheDocument()
      expect(screen.getByText('NCLAW_GOOGLE_CLIENT_SECRET')).toBeInTheDocument()
      expect(screen.getByText('NCLAW_JWT_SECRET')).toBeInTheDocument()
      expect(screen.getByText('NCLAW_ENCRYPTION_KEY')).toBeInTheDocument()
      expect(screen.getByText('NCLAW_WEBHOOK_SECRET')).toBeInTheDocument()
      expect(screen.getByText('NCLAW_OPENAI_API_KEY')).toBeInTheDocument()
    })
  })

  it('Plugin Secrets section never shows plaintext values disclaimer', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Plugin Secrets/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Plugin Secrets/i }))

    await waitFor(() => {
      expect(screen.getByText(/Secret values are never displayed here/i)).toBeInTheDocument()
    })
  })

  it('Plugin Secrets section shows missing required notice when plugin offline', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Plugin Secrets/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /Plugin Secrets/i }))

    // Plugin is offline, env/status fetch fails → all required secrets missing → notice shown
    await waitFor(() => {
      expect(screen.getByText(/required secret/i)).toBeInTheDocument()
    })
  })

  // ── Logs section ───────────────────────────────────────────────────────────

  it('Logs section shows level filter buttons', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Logs$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Logs$/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'DEBUG' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'INFO' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'WARN' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ERROR' })).toBeInTheDocument()
    })
  })

  it('Logs section shows offline message when plugin is down', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Logs$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Logs$/i }))

    await waitFor(() => {
      expect(screen.getByText(/Plugin offline/i)).toBeInTheDocument()
    })
  })

  it('Logs section shows Auto-scroll checkbox', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Logs$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Logs$/i }))

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /Auto-scroll/i })).toBeInTheDocument()
    })
  })

  // ── Refresh button ─────────────────────────────────────────────────────────

  it('Refresh button triggers a new health check request', async () => {
    const user = userEvent.setup()
    render(<NClawPage />)

    // Wait for initial render to settle — look for the Refresh button itself
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
    })

    const callsBefore = mockFetch.mock.calls.length
    await user.click(screen.getByRole('button', { name: /Refresh/i }))
    expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})
