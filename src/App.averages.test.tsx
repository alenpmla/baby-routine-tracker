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

function iso(daysAgo: number, hour = 12) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

describe('Daily averages snapshot tiles', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.removeAttribute('data-theme')
    window.localStorage.clear()
  })

  it('shows avg solids amount per day on the Feeding screen in the snapshot unit', async () => {
    // 300g of solids today → avg 10g/day; default solids unit is 'g'
    api.state.feedings.push({ id: 'f1', time: iso(0), type: 'solids', foods: ['banana'], amount: 300, unit: 'gram' })
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    const avg = screen.getByRole('group', { name: 'Avg/day' })
    expect(avg).toHaveTextContent('10g')
  })

  it('shows the solids average converted to the chosen snapshot unit', async () => {
    window.localStorage.setItem('bt.snapshotUnits', JSON.stringify({ bottle: 'ml', solids: 'oz' }))
    // 28.3495g of solids today → avg ~0.9g/day → oz ≈ 0.03... use larger: 2834.95g/day avg
    api.state.feedings.push({
      id: 'f1',
      time: iso(0),
      type: 'solids',
      foods: ['banana'],
      amount: 85049, // grams so avg = 2834.9666g/day = 100oz/day
      unit: 'gram',
    })
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    const avg = screen.getByRole('group', { name: 'Avg/day' })
    expect(avg).toHaveTextContent('100oz')
  })

  it('shows avg diaper changes per day on the Diaper screen', async () => {
    // 60 diapers over 30 days → avg 2.0
    for (let i = 0; i < 60; i++) {
      api.state.diapers.push({ id: `d${i}`, time: iso(Math.floor(i / 2)), type: 'wet' })
    }
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Diaper' }))

    const avg = screen.getByRole('group', { name: 'Avg/day' })
    expect(avg).toHaveTextContent('2.0')
  })

  it('shows avg sleep duration per day on the Sleep screen', async () => {
    // One 12h sleep 10 days ago → 12h/30 = 24m
    api.state.sleeps.push({ id: 's1', startTime: iso(10, 1), endTime: iso(10, 13) })
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Sleep' }))

    const avg = screen.getByRole('group', { name: 'Avg/day' })
    expect(avg).toHaveTextContent('24m')
  })

  it('hides the Avg/day tile when there is no data in the window', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Sleep' }))

    expect(screen.getByRole('group', { name: 'Total slept' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Avg/day' })).not.toBeInTheDocument()
  })

  it('uses the configured averages window from Settings', async () => {
    window.localStorage.setItem('bt.averagesDays', '7')
    // 140g today → avg 20g/day over 7 days; the 7kg feed 20 days ago must be excluded
    api.state.feedings.push({ id: 'f1', time: iso(0), type: 'solids', foods: ['banana'], amount: 140, unit: 'gram' })
    api.state.feedings.push({ id: 'f2', time: iso(20), type: 'solids', foods: ['apple'], amount: 7000, unit: 'gram' })

    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    const avg = screen.getByRole('group', { name: 'Avg/day' })
    expect(avg).toHaveTextContent('20g')
  })
})
