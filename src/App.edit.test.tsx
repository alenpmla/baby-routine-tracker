import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
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

describe('Edit records', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('edits a diaper change (type)', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Diaper' }))
    await user.click(screen.getByRole('button', { name: 'Wet' }))

    await user.click(screen.getByRole('button', { name: /edit wet diaper change/i }))
    expect(screen.getByRole('dialog', { name: /edit change/i })).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Dirty' }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(api.state.diapers[0].type).toBe('dirty')
    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText('Diaper (dirty)')).toBeInTheDocument()
  })

  it('edits a solids feed (food/amount/unit)', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Feeding' }))
    await user.click(screen.getByRole('button', { name: 'Solids' }))
    await user.type(screen.getByRole('textbox', { name: /food/i }), 'Banana')
    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), { target: { value: 'oz' } })
    await user.click(screen.getByRole('button', { name: /save solid food/i }))

    await user.click(screen.getByRole('button', { name: /edit solids feed/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /remove banana/i })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /remove banana/i }))
    const food = within(dialog).getByRole('textbox', { name: /food/i })
    await user.type(food, 'Carrot')
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /amount/i }), { target: { value: '30' } })
    fireEvent.change(within(dialog).getByRole('combobox', { name: /unit/i }), { target: { value: 'gram' } })
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(api.state.feedings[0].foods).toEqual(['Carrot'])
    expect(api.state.feedings[0].amount).toBe(30)
    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText('Solids · Carrot')).toBeInTheDocument()
    expect(list.getByText(/30 gram/i)).toBeInTheDocument()
  })

  it('edits a completed sleep start time', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Sleep' }))
    await user.click(screen.getByRole('button', { name: /start sleep timer/i }))
    await user.click(screen.getByRole('button', { name: /stop sleep/i }))

    await user.click(screen.getByRole('button', { name: /edit sleep/i }))
    const dialog = screen.getByRole('dialog')
    const times = within(dialog).getAllByLabelText(/time/i)
    fireEvent.change(times[0], { target: { value: '00:00' } })
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(new Date(api.state.sleeps[0].startTime).getHours()).toBe(0)
  })
})
