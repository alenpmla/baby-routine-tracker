import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'
import { shiftDays, toInputDate } from './presentation/utils/time'

let api: MockApi

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
}

function goToSleep(user: ReturnType<typeof userEvent.setup>) {
  const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
  return user.click(nav().getByRole('button', { name: 'Sleep' }))
}

// Local-midnight-relative ISO so the LOCAL start hour stays fixed in any TZ.
function isoFromMidnight(hours: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return new Date(d.getTime() + hours * 3600 * 1000).toISOString()
}

describe('Sleep screen Nap/Night choice + split stats + labels', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('persists the chosen kind when backfilling a completed sleep', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goToSleep(user)

    await user.click(screen.getByRole('button', { name: /add past sleep/i }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Completed' }))
    await user.click(within(dialog).getByRole('button', { name: 'Night' }))

    const dates = within(dialog).getAllByLabelText(/date/i)
    const times = within(dialog).getAllByLabelText(/time/i)
    fireEvent.change(dates[0], { target: { value: toInputDate(shiftDays(new Date(), -1)) } })
    fireEvent.change(times[0], { target: { value: '22:00' } })
    fireEvent.change(dates[1], { target: { value: toInputDate(shiftDays(new Date(), -1)) } })
    fireEvent.change(times[1], { target: { value: '23:00' } })
    await user.click(within(dialog).getByRole('button', { name: /save sleep/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(api.state.sleeps[0].kind).toBe('night')
  })

  it('renders split tiles (night duration + count, nap count + total) and labels each row', async () => {
    api.state.sleeps.push(
      { id: 'night', startTime: isoFromMidnight(-2), endTime: isoFromMidnight(6) }, // 22:00→06:00 → 8h night
      { id: 'nap', startTime: isoFromMidnight(12), endTime: isoFromMidnight(13.5) }, // 12:00→13:30 → 1h30 nap
    )
    const user = userEvent.setup()
    await onboard(user)
    await goToSleep(user)

    expect(within(screen.getByRole('group', { name: 'Total slept' })).getByText('9h 30m')).toBeInTheDocument()

    const night = screen.getByRole('group', { name: 'Night sleep' })
    expect(within(night).getByText('8h 0m')).toBeInTheDocument()
    expect(within(night).getByText('1 session')).toBeInTheDocument()

    const naps = screen.getByRole('group', { name: 'Naps' })
    expect(within(naps).getByText('1h 30m')).toBeInTheDocument()
    expect(within(naps).getByText('1 nap')).toBeInTheDocument()

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText('Night')).toBeInTheDocument()
    expect(list.getByText('Nap')).toBeInTheDocument()
  })

  it('hides the split tiles when there are no completed sessions of that kind', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goToSleep(user)

    expect(screen.getByRole('group', { name: 'Total slept' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Night sleep' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Naps' })).not.toBeInTheDocument()
  })

  it('edit preserves the inferred kind on save and switching to Night updates label + tiles', async () => {
    api.state.sleeps.push({ id: 'nap1', startTime: isoFromMidnight(-14), endTime: isoFromMidnight(-13) }) // 10:00→11:00 yesterday
    const user = userEvent.setup()
    await onboard(user)
    await goToSleep(user)
    await user.click(screen.getByRole('button', { name: /previous day/i }))

    const list = within(screen.getByRole('heading', { name: 'Yesterday' }).closest('section') as HTMLElement)
    expect(list.getByText('Nap')).toBeInTheDocument()
    const naps = screen.getByRole('group', { name: 'Naps' })
    expect(within(naps).getByText('1h 0m')).toBeInTheDocument()
    expect(within(naps).getByText('1 nap')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Night sleep' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /edit sleep/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Nap' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.state.sleeps[0].kind).toBe('nap')

    await user.click(screen.getByRole('button', { name: /edit sleep/i }))
    const dialog2 = screen.getByRole('dialog')
    await user.click(within(dialog2).getByRole('button', { name: 'Night' }))
    await user.click(within(dialog2).getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(api.state.sleeps[0].kind).toBe('night')
    const night = screen.getByRole('group', { name: 'Night sleep' })
    expect(within(night).getByText('1h 0m')).toBeInTheDocument()
    expect(within(night).getByText('1 session')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Naps' })).not.toBeInTheDocument()
    const listAfter = within(screen.getByRole('heading', { name: 'Yesterday' }).closest('section') as HTMLElement)
    expect(listAfter.getByText('Night')).toBeInTheDocument()
  })

  it('quick-add ongoing sleep shows a Nap badge on the running row', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goToSleep(user)

    await user.click(screen.getByRole('button', { name: /start sleep timer/i }))

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText('Sleeping')).toBeInTheDocument()
    expect(list.getByText('Nap')).toBeInTheDocument()
  })
})
