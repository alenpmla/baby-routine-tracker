import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { shiftDays, toInputDate } from './presentation/utils/time'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'

let api: MockApi

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  const result = render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
  return result
}

const yesterday = () => toInputDate(shiftDays(new Date(), -1))

describe('Phase 2: backfill + day navigation', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the running sleep in the list and edits its start time', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Sleep' }))
    await user.click(screen.getByRole('button', { name: /start sleep timer/i }))

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText('Sleeping')).toBeInTheDocument()
    expect(list.getByText(/ongoing/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /edit sleep/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getAllByLabelText(/time/i)).toHaveLength(1) // start only
    fireEvent.change(within(dialog).getByLabelText(/time/i), { target: { value: '00:00' } })
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(screen.getByText('Sleeping now')).toBeInTheDocument()
    expect(new Date(api.state.sleeps[0].startTime).getHours()).toBe(0)
    expect(api.state.sleeps[0].endTime).toBeNull()
  })

  it('backfills a past feed and it appears when viewing yesterday', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Feeding' }))
    await user.click(screen.getByRole('button', { name: /add past feed/i }))

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: yesterday() } })
    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { target: { value: '120' } })
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), { target: { value: 'ml' } })
    await user.click(screen.getByRole('button', { name: /save feed/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/no feeds recorded/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /previous day/i }))
    expect(screen.getByRole('button', { name: /yesterday/i })).toBeInTheDocument()

    const list = within(screen.getByRole('heading', { name: 'Yesterday' }).closest('section') as HTMLElement)
    expect(list.getAllByText('Bottle').length).toBeGreaterThanOrEqual(1)
  })

  it('backfills a diaper change and shows the count on its day; next-day is blocked on today', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Diaper' }))
    await user.click(screen.getByRole('button', { name: /add past change/i }))
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: yesterday() } })
    await user.click(screen.getByRole('button', { name: /save change/i }))

    expect(within(screen.getByRole('group', { name: 'Changes' })).getByText('0')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /previous day/i }))
    expect(within(screen.getByRole('group', { name: 'Changes' })).getByText('1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /next day/i }))
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Changes' })).getByText('0')).toBeInTheDocument()

    const next = screen.getByRole('button', { name: /next day/i })
    expect(next).toBeDisabled()
  })

  it('shows each completed sleep duration and the day total on the Sleep screen', async () => {
    const start = new Date()
    start.setHours(9, 0, 0, 0)
    const start2 = new Date()
    start2.setHours(13, 0, 0, 0)
    api.state.sleeps.push(
      { id: 's1', startTime: start.toISOString(), endTime: new Date(start.getTime() + 90 * 60000).toISOString() },
      { id: 's2', startTime: start2.toISOString(), endTime: new Date(start2.getTime() + 60 * 60000).toISOString() },
    )

    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Sleep' }))

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText(/1h 30m/)).toBeInTheDocument()
    expect(list.getByText(/1h 0m/)).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Total slept' })).getByText('2h 30m')).toBeInTheDocument()
  })

  it('shows total naps for the day excluding night sleep (7pm–9am window)', async () => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    const nightStart = new Date(t.getTime() - 2 * 3600000) // 22:00 yesterday
    const nightEnd = new Date(t.getTime() + 4 * 3600000) // 04:00 today → 6h night (ends today)
    const napStart = new Date(t.getTime() + 12 * 3600000) // 12:00
    const napEnd = new Date(t.getTime() + 18.5 * 3600000) // 18:30 → 6.5h (longer than night, still a nap)
    api.state.sleeps.push(
      { id: 's-night', startTime: nightStart.toISOString(), endTime: nightEnd.toISOString() },
      { id: 's-nap', startTime: napStart.toISOString(), endTime: napEnd.toISOString() },
    )

    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Sleep' }))

    expect(within(screen.getByRole('group', { name: 'Total slept' })).getByText('12h 30m')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Total naps' })).getByText('6h 30m')).toBeInTheDocument()
  })

  it('backfills a completed sleep; rejects end-before-start', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Sleep' }))
    await user.click(screen.getByRole('button', { name: /add past sleep/i }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Completed' }))
    const dates = within(dialog).getAllByLabelText(/date/i)
    const times = within(dialog).getAllByLabelText(/time/i)

    fireEvent.change(dates[0], { target: { value: yesterday() } })
    fireEvent.change(times[0], { target: { value: '10:00' } })
    fireEvent.change(dates[1], { target: { value: yesterday() } })
    fireEvent.change(times[1], { target: { value: '09:00' } })
    await user.click(within(dialog).getByRole('button', { name: /save sleep/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/end time must be after/i)

    fireEvent.change(times[1], { target: { value: '11:30' } })
    await user.click(within(dialog).getByRole('button', { name: /save sleep/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /previous day/i }))
    const list = within(screen.getByRole('heading', { name: 'Yesterday' }).closest('section') as HTMLElement)
    expect(list.getByText('Sleep')).toBeInTheDocument()
  })

  it('starts an ongoing past sleep and completes it with Stop sleep', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Sleep' }))
    await user.click(screen.getByRole('button', { name: /add past sleep/i }))
    const dialog = screen.getByRole('dialog')

    // Ongoing mode is the default: only a start date/time is asked
    expect(within(dialog).getAllByLabelText(/date/i)).toHaveLength(1)
    fireEvent.change(within(dialog).getByLabelText(/date/i), { target: { value: yesterday() } })
    fireEvent.change(within(dialog).getByLabelText(/time/i), { target: { value: '08:00' } })
    await user.click(within(dialog).getByRole('button', { name: /save sleep/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // It becomes the running timer with the past start time
    expect(screen.getByText('Sleeping now')).toBeInTheDocument()
    expect(screen.getByText(/started at 08:00/i)).toBeInTheDocument()

    // Baby wakes up: stop the timer, session lands in today's list
    await user.click(screen.getByRole('button', { name: /stop sleep/i }))
    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText('Sleep')).toBeInTheDocument()
  })
})
