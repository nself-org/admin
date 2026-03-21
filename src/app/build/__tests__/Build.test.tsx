import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import BuildPage from '../page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock hooks
jest.mock('@/hooks/useBuildProgress', () => ({
  useBuildProgress: () => ({
    progress: null,
    history: [],
    isBuilding: false,
    isComplete: false,
    isFailed: false,
    reset: jest.fn(),
  }),
}))

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    status: { connected: true, reconnecting: false, reconnectAttempts: 0 },
    connected: true,
    reconnecting: false,
    on: jest.fn(() => jest.fn()),
    emit: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    client: {},
  }),
}))

// Mock fetch
global.fetch = jest.fn()

describe('BuildPage', () => {
  const mockPush = jest.fn()
  const mockSearchParams = new URLSearchParams()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/project/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ hasEnvFile: true }),
        })
      }
      if (url === '/api/docker/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ running: true }),
        })
      }
      if (url === '/api/nself/version') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: '0.4.4' }),
        })
      }
      if (url === '/api/nself/build') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, serviceCount: 8 }),
        })
      }
      return Promise.reject(new Error('Not found'))
    })
  })

  it('should run pre-build checks on mount', async () => {
    render(<BuildPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/project/status')
      expect(global.fetch).toHaveBeenCalledWith('/api/docker/status')
      expect(global.fetch).toHaveBeenCalledWith('/api/nself/version')
    })
  })

  it('should display pre-build check results', async () => {
    render(<BuildPage />)

    // Wait for checks to complete and status to become 'idle'
    // Use getByRole to find the heading specifically
    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', { name: /Pre-Build Checks/i }),
        ).toBeDefined()
      },
      { timeout: 3000 },
    )

    // Check that the pre-build checks are shown - use getAllBy since logs also show these texts
    expect(screen.getAllByText(/Environment files/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Docker daemon/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/nself CLI/i).length).toBeGreaterThan(0)
  })

  it('should show "Start Build" button when checks pass', async () => {
    render(<BuildPage />)

    await waitFor(
      () => {
        const startButton = screen.getByRole('button', { name: /Start Build/i })
        expect(startButton).toBeDefined()
      },
      { timeout: 3000 },
    )
  })

  it('should start build and show build progress when button is clicked', async () => {
    const user = userEvent.setup()
    render(<BuildPage />)

    // Wait for pre-build checks to complete
    await waitFor(
      () => {
        expect(
          screen.getByRole('button', { name: /Start Build/i }),
        ).toBeDefined()
      },
      { timeout: 3000 },
    )

    const startButton = screen.getByRole('button', { name: /Start Build/i })
    await user.click(startButton)

    // After clicking, the build process starts - we should see Build Progress heading
    // or the build completes quickly and we see Build Successful
    await waitFor(
      () => {
        const h1 = screen.getByRole('heading', { level: 1 })
        const text = h1.textContent || ''
        // Either building or already completed
        expect(text.includes('Building') || text.includes('Successful')).toBe(
          true,
        )
      },
      { timeout: 10000 },
    )
  })

  it('should display build logs during build', async () => {
    const user = userEvent.setup()
    render(<BuildPage />)

    await waitFor(
      () => {
        expect(
          screen.getByRole('button', { name: /Start Build/i }),
        ).toBeDefined()
      },
      { timeout: 3000 },
    )

    const startButton = screen.getByRole('button', { name: /Start Build/i })
    await user.click(startButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Build Logs/i })).toBeDefined()
    })
  })

  it('should show success state after build completes', async () => {
    const user = userEvent.setup()
    render(<BuildPage />)

    await waitFor(
      () => {
        expect(
          screen.getByRole('button', { name: /Start Build/i }),
        ).toBeDefined()
      },
      { timeout: 3000 },
    )

    const startButton = screen.getByRole('button', { name: /Start Build/i })
    await user.click(startButton)

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
          /Build Successful/i,
        )
      },
      { timeout: 10000 },
    )
  })

  it('should handle build errors', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/project/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ hasEnvFile: true }),
        })
      }
      if (url === '/api/docker/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ running: true }),
        })
      }
      if (url === '/api/nself/version') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: '0.4.4' }),
        })
      }
      if (url === '/api/nself/build') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Build failed' }),
        })
      }
      return Promise.reject(new Error('Not found'))
    })

    const user = userEvent.setup()
    render(<BuildPage />)

    await waitFor(
      () => {
        expect(
          screen.getByRole('button', { name: /Start Build/i }),
        ).toBeDefined()
      },
      { timeout: 3000 },
    )

    const startButton = screen.getByRole('button', { name: /Start Build/i })
    await user.click(startButton)

    await waitFor(
      () => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
          /Build Failed/i,
        )
      },
      { timeout: 5000 },
    )
  })

  it('should filter logs when filter checkboxes are clicked', async () => {
    const user = userEvent.setup()
    render(<BuildPage />)

    await waitFor(
      () => {
        expect(
          screen.getByRole('button', { name: /Start Build/i }),
        ).toBeDefined()
      },
      { timeout: 3000 },
    )

    const startButton = screen.getByRole('button', { name: /Start Build/i })
    await user.click(startButton)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Build Logs/i })).toBeDefined()
    })

    const errorsCheckbox = screen.getByRole('checkbox', {
      name: /Errors Only/i,
    })
    await user.click(errorsCheckbox)

    // Verify checkbox is checked
    expect(errorsCheckbox).toBeChecked()
  })

  it('should show retry button on error', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/project/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ hasEnvFile: true }),
        })
      }
      if (url === '/api/docker/status') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ running: true }),
        })
      }
      if (url === '/api/nself/version') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: '0.4.4' }),
        })
      }
      if (url === '/api/nself/build') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Build failed' }),
        })
      }
      return Promise.reject(new Error('Not found'))
    })

    const user = userEvent.setup()
    render(<BuildPage />)

    await waitFor(
      () => {
        expect(
          screen.getByRole('button', { name: /Start Build/i }),
        ).toBeDefined()
      },
      { timeout: 3000 },
    )

    const startButton = screen.getByRole('button', { name: /Start Build/i })
    await user.click(startButton)

    await waitFor(
      () => {
        expect(
          screen.getByRole('button', { name: /Retry Build/i }),
        ).toBeDefined()
      },
      { timeout: 5000 },
    )
  })

  it('should skip checks when coming from wizard', async () => {
    const mockParams = new URLSearchParams('from=wizard')
    ;(useSearchParams as jest.Mock).mockReturnValue(mockParams)

    render(<BuildPage />)

    // When coming from wizard, it skips checks and auto-starts build
    // The Pre-Build Checks card should never be visible when from=wizard
    // and either Building or Successful should show
    await waitFor(
      () => {
        // Pre-Build Checks heading should not be present
        expect(
          screen.queryByRole('heading', { name: /Pre-Build Checks/i }),
        ).toBeNull()
      },
      { timeout: 5000 },
    )

    // Verify the build progressed (either building or completed)
    await waitFor(
      () => {
        const h1 = screen.getByRole('heading', { level: 1 })
        const text = h1.textContent || ''
        expect(
          text.includes('Building') ||
            text.includes('Successful') ||
            text.includes('Ready'),
        ).toBe(true)
      },
      { timeout: 5000 },
    )
  })
})
