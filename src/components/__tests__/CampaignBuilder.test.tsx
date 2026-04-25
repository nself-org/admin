/**
 * Unit tests for CampaignBuilder component (B19).
 */
import { CampaignBuilder } from '@/components/notifications/CampaignBuilder'
import { campaigns } from '@/lib/api/notifications'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

// Mock the notifications API
jest.mock('@/lib/api/notifications', () => ({
  campaigns: {
    create: jest.fn(),
    send: jest.fn(),
  },
}))

const mockCreate = campaigns.create as jest.Mock
const mockSend = campaigns.send as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

function fillRequired(title = 'Test Title', body = 'Test body') {
  fireEvent.change(screen.getByLabelText(/title/i), {
    target: { value: title },
  })
  fireEvent.change(screen.getByLabelText(/body/i), { target: { value: body } })
}

function _clickSubmit() {
  // The submit button is type="submit" at the bottom of the form
  const submitBtn = screen.getByRole('button', {
    name: /^(send now|schedule)$/i,
    hidden: true,
  })
  fireEvent.click(submitBtn ?? document.querySelector('button[type="submit"]')!)
}

describe('CampaignBuilder form validation', () => {
  it('renders title and body inputs', () => {
    render(<CampaignBuilder />)
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/body/i)).toBeInTheDocument()
  })

  it('renders a submit button', () => {
    render(<CampaignBuilder />)
    const submitBtn = document.querySelector('button[type="submit"]')
    expect(submitBtn).toBeInTheDocument()
  })

  it('shows error when title is empty on submit', async () => {
    render(<CampaignBuilder />)
    const submitBtn = document.querySelector('button[type="submit"]')!
    fireEvent.click(submitBtn)
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
  })

  it('shows error when body is empty on submit', async () => {
    render(<CampaignBuilder />)
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'My Title' },
    })
    const submitBtn = document.querySelector('button[type="submit"]')!
    fireEvent.click(submitBtn)
    await waitFor(() => {
      expect(screen.getByText(/body is required/i)).toBeInTheDocument()
    })
  })

  it('shows inline JSON error for invalid segment', async () => {
    render(<CampaignBuilder />)

    // Click Segment target button
    const segmentBtn = screen.getAllByRole('button', { name: /segment/i })[0]
    fireEvent.click(segmentBtn)

    const segmentArea = screen.getByPlaceholderText(/\{"country"/i)
    fireEvent.change(segmentArea, { target: { value: 'not-json' } })

    expect(screen.getByText(/invalid json/i)).toBeInTheDocument()
  })

  it('calls campaigns.create and campaigns.send on valid submit', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'c123' })
    mockSend.mockResolvedValueOnce({ queued: true })

    const onSuccess = jest.fn()
    render(<CampaignBuilder onSuccess={onSuccess} />)

    fillRequired('Hello World', 'Notification body text')

    const submitBtn = document.querySelector('button[type="submit"]')!
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Hello World',
          body: 'Notification body text',
        }),
      )
      expect(mockSend).toHaveBeenCalledWith('c123')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('shows API error when create throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Server error'))

    render(<CampaignBuilder />)
    fillRequired()

    const submitBtn = document.querySelector('button[type="submit"]')!
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument()
    })
  })

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = jest.fn()
    render(<CampaignBuilder onCancel={onCancel} />)
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)
    expect(onCancel).toHaveBeenCalled()
  })

  it('updates batch size label when slider changes', () => {
    render(<CampaignBuilder />)
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '800' } })
    expect(screen.getByText('800')).toBeInTheDocument()
  })

  it('shows datetime input after selecting "Schedule" in schedule section', () => {
    render(<CampaignBuilder />)
    // There are two sections with schedule labels — the schedule-toggle buttons
    // We want the second "Schedule" button (the schedule-time picker trigger)
    const scheduleToggleBtn = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent === 'Schedule')
    expect(scheduleToggleBtn).toBeTruthy()
    fireEvent.click(scheduleToggleBtn!)
    const dateInput = document.querySelector('input[type="datetime-local"]')
    expect(dateInput).toBeInTheDocument()
  })

  it('does not call send when schedule=later', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'c2' })

    render(<CampaignBuilder />)
    fillRequired('Scheduled', 'Body')

    // Switch to "later" schedule
    const scheduleBtn = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent === 'Schedule')!
    fireEvent.click(scheduleBtn)

    const dateInput = document.querySelector('input[type="datetime-local"]')!
    fireEvent.change(dateInput, { target: { value: '2099-01-01T12:00' } })

    const submitBtn = document.querySelector('button[type="submit"]')!
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ scheduledAt: '2099-01-01T12:00' }),
      )
      // send should NOT be called for scheduled campaigns
      expect(mockSend).not.toHaveBeenCalled()
    })
  })
})
