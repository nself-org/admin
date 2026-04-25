/**
 * Tests for the ɳClaw Entities page (/claw/entities).
 * Covers 7 UI states: checking, running, stopped, loading, empty,
 * list with typed entities, type filter.
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

import EntitiesPage from '../entities/page'

// ── Helpers ──────────────────────────────────────────────────────────────────

const SAMPLE_ENTITIES = [
  {
    id: 'e1',
    name: 'Alice Johnson',
    entity_type: 'person',
    description: 'Team lead',
    confidence: 0.95,
    mention_count: 12,
    topic_ids: ['t1'],
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
    updated_at: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: 'e2',
    name: 'Acme Corp',
    entity_type: 'organization',
    description: 'Client company',
    confidence: 0.88,
    mention_count: 5,
    topic_ids: ['t2'],
    created_at: new Date(Date.now() - 172_800_000).toISOString(),
    updated_at: new Date(Date.now() - 7_200_000).toISOString(),
  },
]

function setupOffline() {
  mockFetch.mockRejectedValue(new Error('connection refused'))
}

function setupRunning(entities = SAMPLE_ENTITIES) {
  // health
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({}),
  } as Response)
  // entities
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ entities }),
  } as Response)
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EntitiesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupOffline()
  })

  // ── State 1: Header ────────────────────────────────────────────────────────

  it('renders the Entities header', () => {
    render(<EntitiesPage />)
    expect(screen.getByText('Entities')).toBeInTheDocument()
    expect(
      screen.getByText(/People, places, and concepts/i),
    ).toBeInTheDocument()
  })

  it('shows a search input', () => {
    render(<EntitiesPage />)
    expect(
      screen.getByPlaceholderText('Search entities...'),
    ).toBeInTheDocument()
  })

  it('renders entity type filter buttons', () => {
    render(<EntitiesPage />)
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'person' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'organization' }),
    ).toBeInTheDocument()
  })

  // ── State 2: Checking ──────────────────────────────────────────────────────

  it('shows Checking badge initially', () => {
    render(<EntitiesPage />)
    expect(screen.getByText('Checking')).toBeInTheDocument()
  })

  // ── State 3: Stopped ──────────────────────────────────────────────────────

  it('shows Stopped badge when offline', async () => {
    render(<EntitiesPage />)
    await waitFor(() => {
      expect(screen.getByText('Stopped')).toBeInTheDocument()
    })
  })

  it('shows offline banner', async () => {
    render(<EntitiesPage />)
    await waitFor(() => {
      expect(screen.getByText('claw plugin is not running')).toBeInTheDocument()
    })
  })

  // ── State 4: Empty list ────────────────────────────────────────────────────

  it('shows empty state when no entities', async () => {
    setupRunning([])
    render(<EntitiesPage />)
    await waitFor(() => {
      expect(screen.getByText('No entities yet')).toBeInTheDocument()
    })
  })

  // ── State 5: List with entities ────────────────────────────────────────────

  it('renders entity names', async () => {
    setupRunning()
    render(<EntitiesPage />)
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
  })

  it('renders entity type badges', async () => {
    setupRunning()
    render(<EntitiesPage />)
    await waitFor(() => {
      expect(screen.getByText('person')).toBeInTheDocument()
      expect(screen.getByText('organization')).toBeInTheDocument()
    })
  })

  it('shows description for entities that have one', async () => {
    setupRunning()
    render(<EntitiesPage />)
    await waitFor(() => {
      expect(screen.getByText('Team lead')).toBeInTheDocument()
    })
  })

  // ── State 6: Type filter ───────────────────────────────────────────────────

  it('filters entities by type', async () => {
    const user = userEvent.setup()
    setupRunning()
    render(<EntitiesPage />)
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
    // Filter to organization
    await user.click(screen.getByRole('button', { name: 'organization' }))
    await waitFor(() => {
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
  })

  // ── State 7: Search filter ────────────────────────────────────────────────

  it('filters entities by search term', async () => {
    const user = userEvent.setup()
    setupRunning()
    render(<EntitiesPage />)
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    })
    await user.type(screen.getByPlaceholderText('Search entities...'), 'alice')
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
  })

  // ── Refresh ────────────────────────────────────────────────────────────────

  it('Refresh button fires additional fetch calls', async () => {
    const user = userEvent.setup()
    render(<EntitiesPage />)
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
