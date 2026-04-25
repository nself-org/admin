/**
 * Tests for the ɳClaw Topics page (/claw/topics).
 * Covers 7 UI states: checking, running, stopped, loading, empty,
 * list with data, search filter.
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

import TopicsPage from '../topics/page'

// ── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLE_TOPICS = [
  {
    id: 't1',
    name: 'Machine Learning',
    slug: 'machine-learning',
    message_count: 42,
    entity_count: 7,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    updated_at: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: 't2',
    name: 'Home Renovation',
    slug: 'home-renovation',
    message_count: 15,
    entity_count: 3,
    created_at: new Date(Date.now() - 172_800_000).toISOString(),
    updated_at: new Date(Date.now() - 7_200_000).toISOString(),
  },
]

function setupOffline() {
  mockFetch.mockRejectedValue(new Error('connection refused'))
}

function setupRunning(topics = SAMPLE_TOPICS) {
  // health
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({}),
  } as Response)
  // topics
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ topics }),
  } as Response)
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TopicsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupOffline()
  })

  // ── State 1: Header ────────────────────────────────────────────────────────

  it('renders the Topics header', () => {
    render(<TopicsPage />)
    expect(screen.getByText('Topics')).toBeInTheDocument()
    expect(
      screen.getByText('Auto-detected conversation topics'),
    ).toBeInTheDocument()
  })

  it('shows a search input', () => {
    render(<TopicsPage />)
    expect(screen.getByPlaceholderText('Search topics...')).toBeInTheDocument()
  })

  // ── State 2: Checking ──────────────────────────────────────────────────────

  it('shows Checking badge initially', () => {
    render(<TopicsPage />)
    expect(screen.getByText('Checking')).toBeInTheDocument()
  })

  // ── State 3: Stopped ──────────────────────────────────────────────────────

  it('shows Stopped badge when offline', async () => {
    render(<TopicsPage />)
    await waitFor(() => {
      expect(screen.getByText('Stopped')).toBeInTheDocument()
    })
  })

  it('shows offline banner', async () => {
    render(<TopicsPage />)
    await waitFor(() => {
      expect(screen.getByText('claw plugin is not running')).toBeInTheDocument()
    })
  })

  // ── State 4: Empty list ────────────────────────────────────────────────────

  it('shows empty state when no topics', async () => {
    setupRunning([])
    render(<TopicsPage />)
    await waitFor(() => {
      expect(screen.getByText('No topics yet')).toBeInTheDocument()
    })
  })

  // ── State 5: List with topics ──────────────────────────────────────────────

  it('renders topic names', async () => {
    setupRunning()
    render(<TopicsPage />)
    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument()
      expect(screen.getByText('Home Renovation')).toBeInTheDocument()
    })
  })

  it('shows message count for each topic', async () => {
    setupRunning()
    render(<TopicsPage />)
    await waitFor(() => {
      expect(screen.getByText(/42 messages/i)).toBeInTheDocument()
    })
  })

  // ── State 6: Search filter ────────────────────────────────────────────────

  it('filters topics by search term', async () => {
    const user = userEvent.setup()
    setupRunning()
    render(<TopicsPage />)
    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    })
    await user.type(screen.getByPlaceholderText('Search topics...'), 'machine')
    expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    expect(screen.queryByText('Home Renovation')).not.toBeInTheDocument()
  })

  it('shows no-match message when search has no results', async () => {
    const user = userEvent.setup()
    setupRunning()
    render(<TopicsPage />)
    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    })
    await user.type(
      screen.getByPlaceholderText('Search topics...'),
      'xyznotfound',
    )
    await waitFor(() => {
      expect(
        screen.getByText('No topics match your search'),
      ).toBeInTheDocument()
    })
  })

  // ── State 7: Delete confirm ───────────────────────────────────────────────

  it('shows Confirm button on first delete click', async () => {
    const user = userEvent.setup()
    setupRunning()
    render(<TopicsPage />)
    await waitFor(() => {
      expect(screen.getByText('Machine Learning')).toBeInTheDocument()
    })
    const deleteButtons = screen.getAllByRole('button', { name: '' })
    // First delete button (trash icon)
    await user.click(deleteButtons[0])
    await waitFor(() => {
      expect(screen.getByText('Confirm')).toBeInTheDocument()
    })
  })

  // ── Refresh ────────────────────────────────────────────────────────────────

  it('Refresh button fires additional fetch calls', async () => {
    const user = userEvent.setup()
    render(<TopicsPage />)
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
