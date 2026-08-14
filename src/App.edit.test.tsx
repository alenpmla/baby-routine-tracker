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

describe('Edit records', () => {
  beforeEach(() => {
    api = setupApi()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-14T12:00:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
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
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

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
    await user.click(screen.getByRole('button', { name: 'Add foods' }))
    await user.type(screen.getByRole('textbox', { name: /search foods/i }), 'sal')
    await user.click(screen.getByRole('checkbox', { name: 'salmon' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), { target: { value: 'oz' } })
    await user.click(screen.getByRole('button', { name: /save solid food/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /edit solids feed/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /remove salmon/i })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /remove salmon/i }))
    await user.click(within(dialog).getByRole('button', { name: 'Add foods' }))
    const picker = screen.getByRole('dialog', { name: 'Add foods' })
    await user.type(within(picker).getByRole('textbox', { name: /search foods/i }), 'be')
    await user.click(within(picker).getByRole('checkbox', { name: 'beef' }))
    await user.click(within(picker).getByRole('button', { name: 'Done' }))
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /amount/i }), { target: { value: '30' } })
    fireEvent.change(within(dialog).getByRole('combobox', { name: /unit/i }), { target: { value: 'gram' } })
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(api.state.feedings[0].foods).toEqual(['beef'])
    expect(api.state.feedings[0].amount).toBe(30)
    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText('Solids')).toBeInTheDocument()
    expect(list.getByText('beef')).toBeInTheDocument()
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
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(new Date(api.state.sleeps[0].startTime).getHours()).toBe(0)
  })

  it('duplicates a solids feed via the swipe-reveal action', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Feeding' }))
    await user.click(screen.getByRole('button', { name: 'Solids' }))
    await user.click(screen.getByRole('button', { name: 'Add foods' }))
    await user.type(screen.getByRole('textbox', { name: /search foods/i }), 'sal')
    await user.click(screen.getByRole('checkbox', { name: 'salmon' }))
    await user.click(screen.getByRole('button', { name: 'Done' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), { target: { value: 'oz' } })
    await user.click(screen.getByRole('button', { name: /save solid food/i }))
    expect(api.state.feedings).toHaveLength(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Swipe the row open and tap Duplicate.
    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    const rowText = list.getByText('salmon')
    const row = rowText.closest('.swipeable-row-content') as HTMLElement
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 200, button: 0, pointerType: 'touch' })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 200 - 120, button: 0 })
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 200 - 120, button: 0 })

    await user.click(screen.getByRole('button', { name: /duplicate solids feed/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    // Details are prefilled (food chip), and the dialog is the Add feed sheet.
    expect(within(dialog).getByRole('button', { name: /remove salmon/i })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /save feed/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.state.feedings).toHaveLength(2)
    // The copy keeps the original details; the original record is untouched.
    expect(api.state.feedings[1].foods).toEqual(['salmon'])
    expect(api.state.feedings[1].amount).toBe(2)
    expect(api.state.feedings[1].unit).toBe('oz')
    expect(api.state.feedings[0].id).not.toBe(api.state.feedings[1].id)
  })

  it('duplicates a breast feed preserving start/end times', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Feeding' }))
    await user.click(screen.getByRole('button', { name: 'Breast' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getAllByLabelText(/time/i)[0], { target: { value: '08:00' } })
    fireEvent.change(within(dialog).getAllByLabelText(/time/i)[1], { target: { value: '08:30' } })
    await user.click(within(dialog).getByRole('button', { name: /save feed/i }))
    expect(api.state.feedings).toHaveLength(1)

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    const rowText = list.getByText('Breast')
    const row = rowText.closest('.swipeable-row-content') as HTMLElement
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 200, button: 0, pointerType: 'touch' })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 200 - 120, button: 0 })
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 200 - 120, button: 0 })

    await user.click(screen.getByRole('button', { name: /duplicate breast feed/i }))
    const dup = screen.getByRole('dialog')
    await user.click(within(dup).getByRole('button', { name: /save feed/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.state.feedings).toHaveLength(2)
    // Breast sessions are copied faithfully (start/end preserved); the record time
    // defaults to now for the other feed types.
    const original = api.state.feedings[0]
    const copy = api.state.feedings[1]
    expect(copy.startTime).toBe(original.startTime)
    expect(copy.endTime).toBe(original.endTime)
  })
})
