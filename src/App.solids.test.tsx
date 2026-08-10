import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
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

describe('Solid-food details', () => {
  beforeEach(() => {
    api = setupApi()
    window.localStorage.setItem('bt.snapshotUnits', JSON.stringify({ bottle: 'ml', solids: 'g' }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.removeItem('bt.snapshotUnits')
  })

  it('records solid food with food, amount and unit via the quick-add modal', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    // Solids chip opens a modal instead of recording instantly
    await user.click(screen.getByRole('button', { name: 'Solids' }))
    expect(screen.getByRole('dialog', { name: /add solid food/i })).toBeInTheDocument()

    // Food, amount, and unit are all required; each field shows its own error
    await user.click(screen.getByRole('button', { name: /save solid food/i }))
    expect(screen.getByText('Choose at least one food')).toBeInTheDocument()
    expect(screen.getByText('Amount is required')).toBeInTheDocument()
    expect(screen.getByText('Please choose a unit')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /food/i }), 'Banana')
    await user.click(screen.getByRole('button', { name: /save solid food/i }))
    expect(screen.queryByText('Choose at least one food')).not.toBeInTheDocument()
    expect(screen.getByText('Amount is required')).toBeInTheDocument()
    expect(screen.getByText('Please choose a unit')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { target: { value: '2' } })
    await user.click(screen.getByRole('button', { name: /save solid food/i }))
    expect(screen.queryByText('Amount is required')).not.toBeInTheDocument()
    expect(screen.getByText('Please choose a unit')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), { target: { value: 'oz' } })
    await user.click(screen.getByRole('button', { name: /save solid food/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText('Solids · Banana')).toBeInTheDocument()
    expect(list.getByText(/2 oz/i)).toBeInTheDocument()

    // Dashboard shows the same details
    await user.click(nav().getByRole('button', { name: 'Home' }))
    expect(screen.getByText('Solids · Banana')).toBeInTheDocument()
    expect(screen.getByText(/2 oz/i)).toBeInTheDocument()
  })

  it('lets you tick multiple suggestion foods and saves them together', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))
    await user.click(screen.getByRole('button', { name: 'Solids' }))

    const food = screen.getByRole('textbox', { name: /food/i })
    await user.type(food, 'sa')
    await user.click(screen.getByRole('checkbox', { name: 'salmon' }))
    await user.type(food, 'be')
    await user.click(screen.getByRole('checkbox', { name: 'beef' }))
    expect(screen.getByRole('button', { name: /remove salmon/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove beef/i })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), { target: { value: 'oz' } })
    await user.click(screen.getByRole('button', { name: /save solid food/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(api.state.feedings[0].foods).toEqual(['salmon', 'beef'])
    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText('Solids · salmon, beef')).toBeInTheDocument()
  })

  it('shows the total solid food consumed for the day (ignores non-solids)', async () => {
    const now = new Date()
    api.state.feedings.push(
      { id: 'f1', time: new Date(now.getTime() - 60000).toISOString(), type: 'bottle', amount: 120, unit: 'ml' },
      { id: 'f2', time: new Date(now.getTime() - 120000).toISOString(), type: 'solids', foods: ['avocado'], amount: 120, unit: 'gram' },
      { id: 'f3', time: new Date(now.getTime() - 180000).toISOString(), type: 'solids', foods: ['salmon'], amount: 30, unit: 'gram' },
    )

    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    expect(within(screen.getByRole('group', { name: 'Feeds' })).getByText('3')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Bottle' })).getByText('120ml')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Solids' })).getByText('150g')).toBeInTheDocument()
  })

  it('combines oz and gram solids into the preferred grams total', async () => {
    const now = new Date()
    api.state.feedings.push(
      { id: 'f1', time: new Date(now.getTime() - 60000).toISOString(), type: 'solids', foods: ['salmon'], amount: 2, unit: 'oz' },
      { id: 'f2', time: new Date(now.getTime() - 120000).toISOString(), type: 'solids', foods: ['rice'], amount: 28.35, unit: 'gram' },
    )

    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    expect(within(screen.getByRole('group', { name: 'Solids' })).getByText('85g')).toBeInTheDocument()
  })

  it('converts an oz-only solids day to grams (default preferred unit)', async () => {
    const now = new Date()
    api.state.feedings.push(
      { id: 'f1', time: new Date(now.getTime() - 60000).toISOString(), type: 'solids', foods: ['salmon'], amount: 1.5, unit: 'oz' },
      { id: 'f2', time: new Date(now.getTime() - 120000).toISOString(), type: 'solids', foods: ['beef'], amount: 1, unit: 'oz' },
    )

    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    expect(within(screen.getByRole('group', { name: 'Solids' })).getByText('71g')).toBeInTheDocument()
  })

  it('shows the solids total in the preferred oz unit', async () => {
    window.localStorage.setItem('bt.snapshotUnits', JSON.stringify({ bottle: 'ml', solids: 'oz' }))
    const now = new Date()
    api.state.feedings.push(
      { id: 'f1', time: new Date(now.getTime() - 60000).toISOString(), type: 'solids', foods: ['avocado'], amount: 150, unit: 'gram' },
    )

    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    expect(within(screen.getByRole('group', { name: 'Solids' })).getByText('5.3oz')).toBeInTheDocument()
  })

  it('converts bottle to the preferred ml unit', async () => {
    window.localStorage.setItem('bt.snapshotUnits', JSON.stringify({ bottle: 'ml', solids: 'g' }))
    const now = new Date()
    api.state.feedings.push(
      { id: 'f1', time: new Date(now.getTime() - 60000).toISOString(), type: 'bottle', amount: 4, unit: 'oz' },
    )

    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    expect(within(screen.getByRole('group', { name: 'Bottle' })).getByText('118ml')).toBeInTheDocument()
  })

  it('converts bottle to the preferred oz unit', async () => {
    window.localStorage.setItem('bt.snapshotUnits', JSON.stringify({ bottle: 'oz', solids: 'g' }))
    const now = new Date()
    api.state.feedings.push(
      { id: 'f1', time: new Date(now.getTime() - 60000).toISOString(), type: 'bottle', amount: 240, unit: 'ml' },
    )

    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    expect(within(screen.getByRole('group', { name: 'Bottle' })).getByText('8.1oz')).toBeInTheDocument()
  })

  it('hides the solids snapshot tile when the day has no solids', async () => {
    const now = new Date()
    api.state.feedings.push(
      { id: 'f1', time: new Date(now.getTime() - 60000).toISOString(), type: 'bottle', amount: 120, unit: 'ml' },
    )

    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    expect(screen.getByRole('group', { name: 'Feeds' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Bottle' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Solids' })).not.toBeInTheDocument()
  })

  it('shows only the feeds snapshot when the day has no bottle or solids', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    expect(screen.getByRole('group', { name: 'Feeds' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Bottle' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Solids' })).not.toBeInTheDocument()
  })

  it('backfills a solid feed with details and validates food', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Feeding' }))
    await user.click(screen.getByRole('button', { name: /add past feed/i }))

    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Solids' }))
    expect(within(dialog).getByLabelText(/food/i)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /save feed/i }))
    expect(within(dialog).getByText('Choose at least one food')).toBeInTheDocument()
    expect(within(dialog).getByText('Amount is required')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/food/i), 'Carrot')
    fireEvent.change(within(dialog).getByLabelText(/amount/i), { target: { value: '30' } })
    fireEvent.change(within(dialog).getByLabelText(/unit/i), { target: { value: 'gram' } })
    await user.click(within(dialog).getByRole('button', { name: /save feed/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText('Solids · Carrot')).toBeInTheDocument()
    expect(list.getByText(/30 gram/i)).toBeInTheDocument()
  })
})
