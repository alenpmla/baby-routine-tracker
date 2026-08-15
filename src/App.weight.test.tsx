import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
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

async function goWeight(user: ReturnType<typeof userEvent.setup>) {
  const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
  await user.click(nav().getByRole('button', { name: 'Health' }))
  await user.click(screen.getByRole('button', { name: /^weight/i }))
}

describe('Weight tracking', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('logs a weight and shows it in the list and as the latest', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goWeight(user)

    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '7.5' } })
    await user.click(screen.getByRole('button', { name: /add weight/i }))

    expect(api.state.weights).toHaveLength(1)
    expect(api.state.weights[0].weight).toBe(7.5)
    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText(/7.5 kg/)).toBeInTheDocument()
    expect(screen.getByText('7.5 kg')).toBeInTheDocument()
  })

  it('rejects a non-positive weight', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goWeight(user)

    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '0' } })
    await user.click(screen.getByRole('button', { name: /add weight/i }))

    expect(screen.getByText(/positive number/i)).toBeInTheDocument()
    expect(api.state.weights).toHaveLength(0)
  })

  it('adds a past weight and edits it', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goWeight(user)

    await user.click(screen.getByRole('button', { name: /add past weight/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/weight/i), { target: { value: '7.2' } })
    fireEvent.change(within(dialog).getByLabelText(/unit/i), { target: { value: 'lb' } })
    await user.click(within(dialog).getByRole('button', { name: /save weight/i }))

    expect(api.state.weights).toHaveLength(1)
    expect(api.state.weights[0].unit).toBe('lb')

    await user.click(screen.getByRole('button', { name: /edit weight/i }))
    const edit = screen.getByRole('dialog')
    fireEvent.change(within(edit).getByLabelText(/weight/i), { target: { value: '7.4' } })
    await user.click(within(edit).getByRole('button', { name: /save changes/i }))

    expect(api.state.weights[0].weight).toBe(7.4)
  })

  it('deletes a weight via swipe-to-reveal', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goWeight(user)

    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '7.5' } })
    await user.click(screen.getByRole('button', { name: /add weight/i }))
    expect(api.state.weights).toHaveLength(1)

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    const rowText = list.getByText(/7.5\s*kg/)
    const row = rowText.closest('.swipeable-row-content') as HTMLElement
    const li = rowText.closest('.swipeable-row') as HTMLElement
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 200, button: 0, pointerType: 'touch' })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 200 - 60, button: 0 })
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 200 - 60, button: 0 })
    expect(li.classList.contains('swipeable-row-open')).toBe(true)

    await user.click(screen.getByRole('button', { name: /delete weight/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(api.state.weights).toHaveLength(0)
    expect(screen.queryByText('7.5 kg')).not.toBeInTheDocument()
  })

  it('duplicates a weight via the swipe-reveal action', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goWeight(user)

    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '7.5' } })
    await user.click(screen.getByRole('button', { name: /add weight/i }))
    expect(api.state.weights).toHaveLength(1)

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    const rowText = list.getByText(/7.5\s*kg/)
    const row = rowText.closest('.swipeable-row-content') as HTMLElement
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 200, button: 0, pointerType: 'touch' })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 200 - 120, button: 0 })
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 200 - 120, button: 0 })

    await user.click(screen.getByRole('button', { name: /duplicate weight/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    // Weight and unit are prefilled from the original record.
    expect(within(dialog).getByLabelText(/weight/i)).toHaveValue(7.5)

    await user.click(within(dialog).getByRole('button', { name: /save weight/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.state.weights).toHaveLength(2)
    expect(api.state.weights[1].weight).toBe(7.5)
    expect(api.state.weights[0].id).not.toBe(api.state.weights[1].id)
  })

  it('shows the weight progress chart on the dashboard', async () => {
    const now = new Date()
    api.state.weights.push(
      { id: 'w1', time: new Date(now.getTime() - 30 * 86400000).toISOString(), weight: 5, unit: 'kg' },
      { id: 'w2', time: new Date(now.getTime() - 10 * 86400000).toISOString(), weight: 5.5, unit: 'kg' },
    )
    const user = userEvent.setup()
    await onboard(user)

    expect(screen.getByText('Weight progress')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /weight growth chart/i })).toBeInTheDocument()
  })

  it('does not show the chart when there are no weights', async () => {
    const user = userEvent.setup()
    await onboard(user)
    expect(screen.queryByText('Weight progress')).not.toBeInTheDocument()
  })

  it('applies the baby sex to the dashboard growth band (male vs female)', async () => {
    const now = new Date()
    const seedWeight = () =>
      api.state.weights.push({
        id: 'w1',
        time: new Date(now.getTime() - 30 * 86400000).toISOString(),
        weight: 5,
        unit: 'kg',
      })

    const bandPath = async (sexLabel: string) => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(await screen.findByLabelText(/name/i), 'Avery')
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
      await user.click(screen.getByRole('button', { name: sexLabel }))
      await user.click(screen.getByRole('button', { name: /continue/i }))
      expect(await screen.findByText('Weight progress')).toBeInTheDocument()
      const band = document.querySelector('.growth-chart path') as SVGPathElement | null
      const d = band?.getAttribute('d') ?? ''
      cleanup()
      return d
    }

    seedWeight()
    const male = await bandPath('Male')
    api = setupApi()
    seedWeight()
    const female = await bandPath('Female')

    expect(api.state.baby?.sex).toBe('female')
    expect(male).not.toBe(female)
  })

  it('saves the birth weight from onboarding and anchors the chart at birth', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText(/name/i), 'Avery')
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
    fireEvent.change(screen.getByLabelText(/birth weight/i), { target: { value: '3.4' } })
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(api.state.baby?.birthWeightKg).toBe(3.4)
    expect(screen.getByText('Weight progress')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /weight growth chart/i })).toBeInTheDocument()
  })

  it('converts a birth weight entered in lb to kg', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText(/name/i), 'Avery')
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
    fireEvent.change(screen.getByLabelText(/unit/i), { target: { value: 'lb' } })
    fireEvent.change(screen.getByLabelText(/birth weight/i), { target: { value: '7.5' } })
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(api.state.baby?.birthWeightKg).toBeCloseTo(7.5 * 0.45359237, 5)
  })
})

describe('Health tab navigation', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows 5 tabs with Health replacing Weight', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    for (const label of ['Home', 'Sleep', 'Feeding', 'Diaper', 'Health']) {
      expect(nav().getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(nav().queryByRole('button', { name: 'Weight' })).not.toBeInTheDocument()
  })

  it('opens the Health sub-navigator menu with all four views', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Health' }))
    expect(screen.getByRole('heading', { name: 'Health' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^weight/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /head circumference/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /teeth & teething/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /medication & fever/i })).toBeInTheDocument()
  })

  it('back arrow in the Weight sub-view returns to the Health menu', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goWeight(user)
    expect(screen.getByRole('heading', { name: 'Weight' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^back/i }))
    expect(await screen.findByRole('heading', { name: 'Health' })).toBeInTheDocument()
  })

  it('switching to another tab drops the Health sub-view back to the menu', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goWeight(user)
    expect(screen.getByRole('heading', { name: 'Weight' })).toBeInTheDocument()

    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Sleep' }))
    expect(screen.getByRole('heading', { name: 'Sleep' })).toBeInTheDocument()

    await user.click(nav().getByRole('button', { name: 'Health' }))
    expect(await screen.findByRole('heading', { name: 'Health' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^weight/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Weight' })).not.toBeInTheDocument()
  })

  it('the Teeth & teething menu opens a sub-menu with Teeth and Teething views', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Health' }))
    await user.click(screen.getByRole('button', { name: /teeth & teething/i }))
    expect(screen.getByRole('heading', { name: 'Teeth & teething' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /teeth erupted teeth/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /teething day-by-day/i })).toBeInTheDocument()
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
  })
})
