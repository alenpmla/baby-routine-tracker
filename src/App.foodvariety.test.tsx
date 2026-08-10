import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { Baby } from './domain/model/Baby'

const DAY = 24 * 60 * 60 * 1000

function baby(): Baby {
  return { id: 'b1', name: 'Avery', dob: '2026-01-15', notes: '', birthWeightKg: 3.2 }
}

async function openFeeding(user: ReturnType<typeof userEvent.setup>) {
  const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
  await user.click(nav().getByRole('button', { name: 'Feeding' }))
}

describe('Food variety card', () => {
  beforeEach(() => {
    setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a collapsed summary with covered-group chips, then expands to details', async () => {
    const api = setupApi()
    const now = new Date()
    api.state.baby = baby()
    api.state.feedings = [
      { id: 'f1', time: new Date(now.getTime() - DAY).toISOString(), type: 'solids', foods: ['beef', 'broccoli'] },
      { id: 'f2', time: new Date(now.getTime() - 2 * DAY).toISOString(), type: 'solids', foods: ['banana', 'rice'] },
      { id: 'f3', time: new Date(now.getTime() - DAY).toISOString(), type: 'solids', foods: ['yogurt'] },
    ]

    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
    await openFeeding(user)

    const card = screen.getByRole('region', { name: /food variety this week/i })
    const toggle = within(card).getByRole('button', { name: /food variety · last 7 days/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(card).getByText('Food variety · last 7 days')).toBeInTheDocument()
    expect(within(card).getByText('6 of 7')).toBeInTheDocument()
    expect(within(card).getByText(/great mix — 6 of 7 food groups covered/i)).toBeInTheDocument()

    // Collapsed: per-group food names stay in the DOM but are hidden from view and AT.
    const details = within(card).getByText('Beef · Broccoli').closest('#food-variety-details') as HTMLElement
    expect(details).toHaveAttribute('aria-hidden', 'true')
    expect(within(card).getByText('Beef · Broccoli')).not.toBeVisible()
    expect(within(card).getByText('none yet — try Lentils · Chickpeas · Hummus')).not.toBeVisible()

    // Expand: details reveal per-group rows.
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(details).not.toHaveAttribute('aria-hidden')
    expect(within(card).getByText('Beef · Broccoli')).toBeVisible()
    expect(within(card).getByText('none yet — try Lentils · Chickpeas · Hummus')).toBeVisible()

    // Collapse again.
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(card).getByText('Beef · Broccoli')).not.toBeVisible()
  })

  it('classifies misspelled real-world foods', async () => {
    const api = setupApi()
    const now = new Date()
    api.state.baby = baby()
    api.state.feedings = [
      { id: 'f1', time: new Date(now.getTime() - 1000).toISOString(), type: 'solids', foods: ['sakmon', 'cattot'] },
    ]

    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
    await openFeeding(user)

    const card = screen.getByRole('region', { name: /food variety this week/i })
    await user.click(within(card).getByRole('button', { name: /food variety · last 7 days/i }))
    expect(within(card).getByText(/salmon/i)).toBeInTheDocument()
    expect(within(card).getByText(/carrot/i)).toBeInTheDocument()
  })

  it('hides the card when no solids were recorded this week', async () => {
    const api = setupApi()
    const now = new Date()
    api.state.baby = baby()
    api.state.feedings = [
      { id: 'f1', time: new Date(now.getTime() - 1000).toISOString(), type: 'bottle', amount: 120, unit: 'ml' },
    ]

    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
    await openFeeding(user)

    expect(screen.queryByRole('region', { name: /food variety this week/i })).not.toBeInTheDocument()
  })

  it('hides the card when viewing a past day', async () => {
    const api = setupApi()
    const now = new Date()
    api.state.baby = baby()
    api.state.feedings = [
      { id: 'f1', time: new Date(now.getTime() - DAY).toISOString(), type: 'solids', foods: ['beef'] },
    ]

    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
    await openFeeding(user)
    expect(screen.getByRole('region', { name: /food variety this week/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /previous day/i }))
    expect(screen.queryByRole('region', { name: /food variety this week/i })).not.toBeInTheDocument()
  })
})
