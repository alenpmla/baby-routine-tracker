import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

// A reading a set number of hours ago, TZ-robust via absolute ms.
function hoursAgo(hours: number, temp: number, unit: 'c' | 'f'): { id: string; time: string; temp: number; unit: 'c' | 'f' } {
  return { id: `t-${hours}-${temp}`, time: new Date(Date.now() - hours * 3600 * 1000).toISOString(), temp, unit }
}

describe('Home temperature chart', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('shows the temperature chart when a reading in the last 7 days is >= 37.5 °C', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date())
    api.state.temperatures.push(hoursAgo(20, 38.4, 'c'))

    const user = userEvent.setup()
    await onboard(user)

    expect(await screen.findByRole('heading', { name: /temperature \(last 7 days\)/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /temperature over the last 7 days/i })).toBeInTheDocument()
  })

  it('shows the chart for a Fahrenheit reading equivalent to >= 37.5 °C', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date())
    api.state.temperatures.push(hoursAgo(20, 100.4, 'f')) // 38 °C

    const user = userEvent.setup()
    await onboard(user)

    expect(await screen.findByRole('heading', { name: /temperature \(last 7 days\)/i })).toBeInTheDocument()
  })

  it('hides the chart when no reading in the last 7 days exceeds 37.5 °C', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date())
    api.state.temperatures.push(hoursAgo(20, 37.2, 'c'))

    const user = userEvent.setup()
    await onboard(user)

    expect(screen.queryByRole('heading', { name: /temperature \(last 7 days\)/i })).not.toBeInTheDocument()
  })

  it('hides the chart when the only fever reading is older than 7 days', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date())
    api.state.temperatures.push(hoursAgo(9 * 24, 39, 'c'))

    const user = userEvent.setup()
    await onboard(user)

    expect(screen.queryByRole('heading', { name: /temperature \(last 7 days\)/i })).not.toBeInTheDocument()
  })

  it('hides the chart when there are no temperature records', async () => {
    const user = userEvent.setup()
    await onboard(user)

    expect(screen.queryByRole('heading', { name: /temperature \(last 7 days\)/i })).not.toBeInTheDocument()
  })
})