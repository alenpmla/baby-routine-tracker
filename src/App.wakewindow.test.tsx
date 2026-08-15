import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'

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

// Local-midnight-relative ISO so the LOCAL clock hour stays fixed in any TZ.
function isoFromMidnight(hours: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return new Date(d.getTime() + hours * 3600 * 1000).toISOString()
}

describe('Sleep screen wake-window line between naps', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('shows the day wake windows for a past day (after waking, between naps, before bed)', async () => {
    // Yesterday's two-nap pattern with explicit kinds (TZ-robust):
    api.state.sleeps.push(
      { id: 'n1', startTime: isoFromMidnight(-26), endTime: isoFromMidnight(-18), kind: 'night' }, // 22:00→06:00
      { id: 'nap1', startTime: isoFromMidnight(-14.5), endTime: isoFromMidnight(-13), kind: 'nap' }, // 09:30→11:00
      { id: 'nap2', startTime: isoFromMidnight(-10), endTime: isoFromMidnight(-8.5), kind: 'nap' }, // 14:00→15:30
      { id: 'n2', startTime: isoFromMidnight(-5), endTime: isoFromMidnight(6), kind: 'night' }, // bedtime → boundary
    )
    const user = userEvent.setup()
    await onboard(user)
    await goToSleep(user)
    await user.click(screen.getByRole('button', { name: /previous day/i }))

    const region = screen.getByRole('region', { name: 'Wake windows' })
    expect(region).toHaveTextContent('Awake 3h 30m after waking')
    expect(region).toHaveTextContent('Awake 3h 0m between naps')
    expect(region).toHaveTextContent('Awake 3h 30m before bed')
    expect(within(region).queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows a live awake-since line while awake after the last nap today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 7, 14, 17, 0, 0)) // local 17:00
    api.state.sleeps.push(
      { id: 'n1', startTime: isoFromMidnight(-2), endTime: isoFromMidnight(6), kind: 'night' }, // 22:00→06:00
      { id: 'nap1', startTime: isoFromMidnight(9.5), endTime: isoFromMidnight(11), kind: 'nap' }, // 09:30→11:00
      { id: 'nap2', startTime: isoFromMidnight(14), endTime: isoFromMidnight(15.5), kind: 'nap' }, // 14:00→15:30
    )
    const user = userEvent.setup()
    await onboard(user)
    await goToSleep(user)

    const region = screen.getByRole('region', { name: 'Wake windows' })
    const status = within(region).getByRole('status')
    expect(status).toHaveTextContent(/Awake since .+ · 1h 30m/)
    expect(region).toHaveTextContent('Awake 3h 30m after waking')
    expect(region).toHaveTextContent('Awake 3h 0m between naps')
  })

  it('hides the live window while the baby is sleeping now', async () => {
    api.state.sleeps.push(
      { id: 'n1', startTime: isoFromMidnight(-2), endTime: isoFromMidnight(6), kind: 'night' },
      { id: 'nap1', startTime: isoFromMidnight(9.5), endTime: isoFromMidnight(11), kind: 'nap' },
      { id: 'ongoing', startTime: isoFromMidnight(14), endTime: null, kind: 'nap' },
    )
    const user = userEvent.setup()
    await onboard(user)
    await goToSleep(user)

    expect(within(screen.getByRole('region', { name: 'Wake windows' })).queryByRole('status')).not.toBeInTheDocument()
    const region = screen.getByRole('region', { name: 'Wake windows' })
    expect(region).toHaveTextContent('Awake 3h 30m after waking')
  })

  it('renders no wake-window card on a day with no naps', async () => {
    api.state.sleeps.push(
      { id: 'n1', startTime: isoFromMidnight(-2), endTime: isoFromMidnight(6), kind: 'night' },
    )
    const user = userEvent.setup()
    await onboard(user)
    await goToSleep(user)

    expect(screen.queryByRole('region', { name: 'Wake windows' })).not.toBeInTheDocument()
  })
})
