import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LogFilters, LogFilters as LogFiltersType } from '../LogFilters'
import { LogEntry, LogLine } from '../LogLine'
import { ServiceSelector } from '../ServiceSelector'

describe('LogLine', () => {
  const mockLog: LogEntry = {
    id: '1',
    service: 'postgres',
    line: 'Database connection established',
    timestamp: new Date().toISOString(),
    level: 'info',
    source: 'stdout',
  }

  it('renders log entry correctly', () => {
    render(<LogLine log={mockLog} />)

    expect(
      screen.getByText(/Database connection established/i),
    ).toBeInTheDocument()
    expect(screen.getByText('postgres')).toBeInTheDocument()
    expect(screen.getByText('info')).toBeInTheDocument()
  })

  it('displays error level with correct styling', () => {
    const errorLog: LogEntry = {
      ...mockLog,
      level: 'error',
      line: 'Connection failed',
    }

    render(<LogLine log={errorLog} />)

    const levelBadge = screen.getByText('error')
    // The text-red-500 class is on the span element containing the level text
    expect(levelBadge).toHaveClass('text-red-500')
  })

  it('parses JSON logs correctly', () => {
    const jsonLog: LogEntry = {
      ...mockLog,
      line: '{"status": "ok", "message": "test"}',
    }

    render(<LogLine log={jsonLog} />)

    // JSON is parsed and displayed with formatting
    expect(screen.getByText(/"status": "ok"/i)).toBeInTheDocument()
  })

  it('hides service name when showService is false', () => {
    render(<LogLine log={mockLog} showService={false} />)

    expect(screen.queryByText('postgres')).not.toBeInTheDocument()
  })
})

describe('ServiceSelector', () => {
  const mockServices = ['postgres', 'hasura', 'auth', 'functions']
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders with no services selected', () => {
    render(
      <ServiceSelector
        services={mockServices}
        selectedServices={[]}
        onChange={mockOnChange}
      />,
    )

    expect(screen.getByText('All Services')).toBeInTheDocument()
  })

  it('displays single selected service name', () => {
    render(
      <ServiceSelector
        services={mockServices}
        selectedServices={['postgres']}
        onChange={mockOnChange}
      />,
    )

    expect(screen.getByText('postgres')).toBeInTheDocument()
  })

  it('displays count for multiple selected services', () => {
    render(
      <ServiceSelector
        services={mockServices}
        selectedServices={['postgres', 'hasura']}
        onChange={mockOnChange}
      />,
    )

    expect(screen.getByText('2 services')).toBeInTheDocument()
  })

  it('opens dropdown on click', () => {
    render(
      <ServiceSelector
        services={mockServices}
        selectedServices={[]}
        onChange={mockOnChange}
      />,
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    // After opening dropdown, each service appears in the list
    mockServices.forEach((service) => {
      expect(screen.getAllByText(service).length).toBeGreaterThan(0)
    })
  })

  it('toggles service selection', async () => {
    render(
      <ServiceSelector
        services={mockServices}
        selectedServices={[]}
        onChange={mockOnChange}
      />,
    )

    // Open dropdown
    const button = screen.getByRole('button')
    fireEvent.click(button)

    // Click on postgres in the service list
    const postgresButtons = screen.getAllByText('postgres')
    if (postgresButtons[0]) fireEvent.click(postgresButtons[0])

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(['postgres'])
    })
  })

  it('selects all services', async () => {
    render(
      <ServiceSelector
        services={mockServices}
        selectedServices={[]}
        onChange={mockOnChange}
      />,
    )

    // Open dropdown
    fireEvent.click(screen.getByRole('button'))

    // Click "All" button
    const allButton = screen.getByText('All')
    fireEvent.click(allButton)

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(mockServices)
    })
  })

  it('clears all selections', async () => {
    render(
      <ServiceSelector
        services={mockServices}
        selectedServices={mockServices}
        onChange={mockOnChange}
      />,
    )

    // Open dropdown
    fireEvent.click(screen.getByRole('button'))

    // Click "Clear" button
    const clearButton = screen.getByText('Clear')
    fireEvent.click(clearButton)

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([])
    })
  })

  it('displays recent services section', () => {
    render(
      <ServiceSelector
        services={mockServices}
        selectedServices={[]}
        onChange={mockOnChange}
        recentServices={['postgres', 'hasura']}
      />,
    )

    // Open dropdown
    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('Recent')).toBeInTheDocument()
  })
})

describe('LogFilters', () => {
  const mockFilters: LogFiltersType = {
    searchText: '',
    level: 'all',
    timeRange: '5m',
    regexEnabled: false,
  }
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders all filter controls', () => {
    render(
      <LogFilters
        filters={mockFilters}
        onChange={mockOnChange}
        totalCount={100}
        filteredCount={100}
      />,
    )

    expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument()
    // The regex toggle button shows ".*"
    expect(screen.getByText('.*')).toBeInTheDocument()
  })

  it('updates search text', () => {
    render(
      <LogFilters
        filters={mockFilters}
        onChange={mockOnChange}
        totalCount={100}
        filteredCount={100}
      />,
    )

    const searchInput = screen.getByPlaceholderText('Search logs...')
    fireEvent.change(searchInput, { target: { value: 'error' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockFilters,
      searchText: 'error',
    })
  })

  it('toggles regex mode', () => {
    render(
      <LogFilters
        filters={mockFilters}
        onChange={mockOnChange}
        totalCount={100}
        filteredCount={100}
      />,
    )

    const regexButton = screen.getByText('.*')
    fireEvent.click(regexButton)

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockFilters,
      regexEnabled: true,
    })
  })

  it('changes log level filter', () => {
    render(
      <LogFilters
        filters={mockFilters}
        onChange={mockOnChange}
        totalCount={100}
        filteredCount={100}
      />,
    )

    // Find the level select by its current value
    const levelSelect = screen.getByDisplayValue('All Levels')
    fireEvent.change(levelSelect, { target: { value: 'error' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockFilters,
      level: 'error',
    })
  })

  it('changes time range filter', () => {
    render(
      <LogFilters
        filters={mockFilters}
        onChange={mockOnChange}
        totalCount={100}
        filteredCount={100}
      />,
    )

    const timeSelect = screen.getByDisplayValue('Last 5 minutes')
    fireEvent.change(timeSelect, { target: { value: '1h' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockFilters,
      timeRange: '1h',
    })
  })

  it('displays correct count information', () => {
    render(
      <LogFilters
        filters={mockFilters}
        onChange={mockOnChange}
        totalCount={100}
        filteredCount={50}
      />,
    )

    expect(screen.getByText(/Showing/i)).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('shows clear filters button when filters are active', () => {
    const activeFilters: LogFiltersType = {
      ...mockFilters,
      searchText: 'error',
      level: 'error',
    }

    render(
      <LogFilters
        filters={activeFilters}
        onChange={mockOnChange}
        totalCount={100}
        filteredCount={50}
      />,
    )

    expect(screen.getByText('Clear Filters')).toBeInTheDocument()
  })

  it('clears all filters', () => {
    const activeFilters: LogFiltersType = {
      searchText: 'error',
      level: 'error',
      timeRange: '1h',
      regexEnabled: true,
    }

    render(
      <LogFilters
        filters={activeFilters}
        onChange={mockOnChange}
        totalCount={100}
        filteredCount={50}
      />,
    )

    const clearButton = screen.getByText('Clear Filters')
    fireEvent.click(clearButton)

    expect(mockOnChange).toHaveBeenCalledWith({
      searchText: '',
      level: 'all',
      timeRange: '5m',
      regexEnabled: false,
    })
  })

  it('shows custom time range inputs when selected', () => {
    const customFilters: LogFiltersType = {
      ...mockFilters,
      timeRange: 'custom',
    }

    render(
      <LogFilters
        filters={customFilters}
        onChange={mockOnChange}
        totalCount={100}
        filteredCount={100}
      />,
    )

    // The labels are rendered as text, not as accessible labels with htmlFor
    expect(screen.getByText('Start Time')).toBeInTheDocument()
    expect(screen.getByText('End Time')).toBeInTheDocument()
  })
})
