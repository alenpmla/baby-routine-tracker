import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  const result = render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
  return result
}

describe('Baby Tracker end-to-end flow', () => {
  beforeEach(() => {
    setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('records a full day: sleep, feeding, diaper, and reflects it on the dashboard', async () => {
    const user = userEvent.setup()
    await onboard(user)

    const nav = () => screen.getByRole('navigation', { name: /primary/i })

    expect(screen.getByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()

    // Sleep: start and stop a timer
    await user.click(within(nav()).getByRole('button', { name: 'Sleep' }))
    await user.click(screen.getByRole('button', { name: /start sleep timer/i }))
    expect(screen.getByText('Sleeping now')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /stop sleep/i }))
    expect(
      within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement).getByText('Sleep'),
    ).toBeInTheDocument()

    // Feeding: quick-add a bottle with quantity
    await user.click(within(nav()).getByRole('button', { name: 'Feeding' }))
    await user.click(screen.getByRole('button', { name: 'Bottle' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { target: { value: '120' } })
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), { target: { value: 'ml' } })
    await user.click(screen.getByRole('button', { name: /save feed/i }))
    expect(screen.getAllByText('Bottle').length).toBeGreaterThanOrEqual(2) // chip + today's list
    const feedList = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(feedList.getByText(/120 ml/i)).toBeInTheDocument()

    // Diaper: one-tap records
    await user.click(within(nav()).getByRole('button', { name: 'Diaper' }))
    expect(within(screen.getByRole('group', { name: 'Changes' })).getByText('0')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Wet' }))
    await user.click(screen.getByRole('button', { name: 'Both' }))
    expect(within(screen.getByRole('group', { name: 'Changes' })).getByText('2')).toBeInTheDocument()

    // Dashboard summary + timeline reflect the day
    await user.click(within(nav()).getByRole('button', { name: 'Home' }))
    expect(screen.getAllByText('1')).toHaveLength(2) // sleeps + feeds
    expect(screen.getByText('2')).toBeInTheDocument() // diapers
    expect(screen.getByText('Slept')).toBeInTheDocument()
    expect(screen.getByText('Bottle')).toBeInTheDocument()
    expect(screen.getByText('Diaper (wet)')).toBeInTheDocument()

    // Delete a diaper change, count updates
    await user.click(within(nav()).getByRole('button', { name: 'Diaper' }))
    await user.click(screen.getByRole('button', { name: /delete wet diaper change/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(within(screen.getByRole('group', { name: 'Changes' })).getByText('1')).toBeInTheDocument()
  })

  it('dashboard summary cards navigate to their screens', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(screen.getByRole('button', { name: /sleep today/i }))
    expect(screen.getByRole('heading', { name: 'Sleep' })).toBeInTheDocument()
    await user.click(nav().getByRole('button', { name: 'Home' }))

    await user.click(screen.getByRole('button', { name: /feeds today/i }))
    expect(screen.getByRole('heading', { name: 'Feeding' })).toBeInTheDocument()
    await user.click(nav().getByRole('button', { name: 'Home' }))

    await user.click(screen.getByRole('button', { name: /diapers today/i }))
    expect(screen.getByRole('heading', { name: 'Diaper' })).toBeInTheDocument()
  })

  it('timeline events navigate to their screen', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Diaper' }))
    await user.click(screen.getByRole('button', { name: 'Wet' }))
    await user.click(nav().getByRole('button', { name: 'Home' }))

    await user.click(screen.getByRole('button', { name: /diaper \(wet\)/i }))
    expect(screen.getByRole('heading', { name: 'Diaper' })).toBeInTheDocument()
  })

  it('the sleeping-now indicator navigates to the Sleep tab', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Sleep' }))
    await user.click(screen.getByRole('button', { name: /start sleep timer/i }))
    await user.click(nav().getByRole('button', { name: 'Home' }))

    const pill = screen.getByRole('button', { name: /sleeping now/i })
    expect(pill).toBeInTheDocument()
    await user.click(pill)
    expect(screen.getByRole('heading', { name: 'Sleep' })).toBeInTheDocument()
  })

  it('persists the profile and data across a reload', async () => {
    const user = userEvent.setup()
    const first = await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Diaper' }))
    await user.click(screen.getByRole('button', { name: 'Wet' }))

    first.unmount()

    // Same-device reload restores the current page (Diaper) with data intact.
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Diaper' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Changes' })).getByText('1')).toBeInTheDocument()
  })
})
