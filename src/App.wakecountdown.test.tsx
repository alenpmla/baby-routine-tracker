import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'

let api: MockApi

const HOUR = 60 * 60 * 1000

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * HOUR).toISOString()
}

describe('Time left to sleep', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.removeAttribute('data-theme')
    window.localStorage.clear()
  })

  it('shows the nap-time countdown on the dashboard based on the wake window', async () => {
    window.localStorage.setItem('bt.wakeWindowMinutes', '180') // 3h
    api.state.sleeps.push({ id: 's1', startTime: hoursAgo(2), endTime: hoursAgo(1) }) // woke 1h ago → ~2h left

    const user = userEvent.setup()
    await onboard(user)
    const pill = await screen.findByText(/nap time in/i)
    expect(pill.textContent).toMatch(/nap time in \d+h/i)
    expect(screen.queryByText(/time for a nap/i)).not.toBeInTheDocument()
  })

  it('shows the overdue state once the wake window has elapsed', async () => {
    window.localStorage.setItem('bt.wakeWindowMinutes', '180') // 3h
    api.state.sleeps.push({ id: 's1', startTime: hoursAgo(6), endTime: hoursAgo(4) }) // woke 4h ago

    const user = userEvent.setup()
    await onboard(user)
    expect(await screen.findByText(/time for a nap/i)).toBeInTheDocument()
  })

  it('shows time left to sleep on the Sleep screen', async () => {
    window.localStorage.setItem('bt.wakeWindowMinutes', '180')
    api.state.sleeps.push({ id: 's1', startTime: hoursAgo(2), endTime: hoursAgo(1) })

    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Sleep' }))

    expect(await screen.findByText(/time left to sleep/i)).toBeInTheDocument()
  })

  it('does not show a countdown while the baby is asleep', async () => {
    window.localStorage.setItem('bt.wakeWindowMinutes', '180')
    api.state.sleeps.push({ id: 's1', startTime: hoursAgo(0.5), endTime: null }) // ongoing sleep

    const user = userEvent.setup()
    await onboard(user)
    await new Promise((r) => setTimeout(r, 200))

    expect(screen.queryByText(/nap time in|time for a nap|time left to sleep/i)).not.toBeInTheDocument()
  })

  it('does not show a countdown when there is no wake window yet', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await new Promise((r) => setTimeout(r, 200))

    expect(screen.queryByText(/nap time in|time for a nap|time left to sleep/i)).not.toBeInTheDocument()
  })
})
