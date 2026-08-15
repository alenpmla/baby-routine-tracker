import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

function seedDay() {
  const dayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
  const at = (h: number) => new Date(dayStart.getTime() + h * 3600 * 1000).toISOString()
  // Overnight night sleep ending 7am (start 10pm previous local day)
  api.state.sleeps.push({ id: 's1', startTime: at(-2), endTime: at(7) })
  api.state.feedings.push({ id: 'f1', time: at(8), type: 'solids', foods: ['Oats porridge', 'Banana'] })
  api.state.sleeps.push({ id: 's2', startTime: at(10), endTime: at(11) })
  api.state.diapers.push({ id: 'd1', time: at(12), type: 'wet' })
  // Evening: night sleep just started (running) — the day's final entry
  api.state.sleeps.push({ id: 's3', startTime: at(20), endTime: null })
}

async function enableTimeline(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /settings/i }))
  await user.click(screen.getByRole('button', { name: 'Timeline' }))
  await user.click(screen.getByRole('button', { name: /^done$/i }))
}

describe('Home log timeline view', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.removeItem('bt.settings')
  })

  it('defaults to the list view (existing event cards)', async () => {
    seedDay()
    const user = userEvent.setup()
    await onboard(user)

    const list = screen.getByRole('button', { name: /oats porridge/i })
    expect(list).toBeInTheDocument()
    expect(screen.queryByText('Woke up at')).not.toBeInTheDocument()
  })

  it('persists the Timeline choice in Settings and renders natural-language wordings', async () => {
    seedDay()
    const user = userEvent.setup()
    await onboard(user)
    await enableTimeline(user)

    expect(screen.getByText(/^Woke up at /i)).toBeInTheDocument()
    expect(screen.getByText(/^Had Oats porridge, Banana$/i)).toBeInTheDocument()
    expect(screen.getByText('Wet diaper')).toBeInTheDocument()
    // The timeline entries are compact tappable rows, not the full card list rows
    expect(screen.queryByText('Solids · Oats porridge, Banana')).not.toBeInTheDocument()
  })

  it('orders the timeline morning → night (wake, eat, nap, wake, …, sleep)', async () => {
    seedDay()
    const user = userEvent.setup()
    await onboard(user)
    await enableTimeline(user)

    const rows = Array.from(document.querySelectorAll('.tl-item .tl-word')).map((el) => el.textContent ?? '')
    expect(rows[0]).toMatch(/^Woke up at /)
    expect(rows[1]).toMatch(/^Had Oats porridge, Banana$/)
    expect(rows[2]).toMatch(/^Napped /)
    expect(rows[3]).toBe('Wet diaper')
    expect(rows[rows.length - 1]).toMatch(/^Started night sleep at /)
  })

  it('survives reload (persisted setting)', async () => {
    seedDay()
    const user = userEvent.setup()
    await onboard(user)
    await enableTimeline(user)
    expect(screen.getByText(/^Woke up at /i)).toBeInTheDocument()

    // reload: re-mount with same server settings
    vi.unstubAllGlobals()
    render(<App />)
    await waitFor(() => expect(screen.getByText(/^Woke up at /i)).toBeInTheDocument())
  })

  it('tapping a timeline entry navigates to the matching tab', async () => {
    seedDay()
    const user = userEvent.setup()
    await onboard(user)
    await enableTimeline(user)

    await user.click(screen.getByRole('button', { name: /^Had Oats porridge, Banana$/i }))
    expect(await screen.findByRole('heading', { name: 'Feeding' })).toBeInTheDocument()
  })
})
