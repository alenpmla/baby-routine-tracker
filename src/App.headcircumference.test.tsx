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

async function goHeadCircumference(user: ReturnType<typeof userEvent.setup>) {
  const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
  await user.click(nav().getByRole('button', { name: 'Health' }))
  await user.click(screen.getByRole('button', { name: /^head circumference/i }))
}

describe('Head circumference tracking', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('logs a head circumference and shows it in the list and as the latest', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goHeadCircumference(user)

    fireEvent.change(screen.getByLabelText(/head circumference/i), { target: { value: '42.5' } })
    await user.click(screen.getByRole('button', { name: /add head circumference/i }))

    expect(api.state.headCircumferences).toHaveLength(1)
    expect(api.state.headCircumferences[0].value).toBe(42.5)
    expect(api.state.headCircumferences[0].unit).toBe('cm')
    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText(/42.5 cm/)).toBeInTheDocument()
    expect(screen.getByText('42.5 cm')).toBeInTheDocument()
  })

  it('rejects a non-positive head circumference', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goHeadCircumference(user)

    fireEvent.change(screen.getByLabelText(/head circumference/i), { target: { value: '0' } })
    await user.click(screen.getByRole('button', { name: /add head circumference/i }))

    expect(screen.getByText(/positive number/i)).toBeInTheDocument()
    expect(api.state.headCircumferences).toHaveLength(0)
  })

  it('adds a past head circumference and edits it with a unit change', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goHeadCircumference(user)

    await user.click(screen.getByRole('button', { name: /add past head circumference/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/head circumference/i), { target: { value: '16.5' } })
    fireEvent.change(within(dialog).getByLabelText(/unit/i), { target: { value: 'in' } })
    await user.click(within(dialog).getByRole('button', { name: /save head circumference/i }))

    expect(api.state.headCircumferences).toHaveLength(1)
    expect(api.state.headCircumferences[0].unit).toBe('in')

    await user.click(screen.getByRole('button', { name: /edit head circumference/i }))
    const edit = screen.getByRole('dialog')
    fireEvent.change(within(edit).getByLabelText(/head circumference/i), { target: { value: '42.8' } })
    fireEvent.change(within(edit).getByLabelText(/unit/i), { target: { value: 'cm' } })
    await user.click(within(edit).getByRole('button', { name: /save changes/i }))

    expect(api.state.headCircumferences[0].value).toBe(42.8)
    expect(api.state.headCircumferences[0].unit).toBe('cm')
  })

  it('deletes a head circumference via swipe-to-reveal', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goHeadCircumference(user)

    fireEvent.change(screen.getByLabelText(/head circumference/i), { target: { value: '42.5' } })
    await user.click(screen.getByRole('button', { name: /add head circumference/i }))
    expect(api.state.headCircumferences).toHaveLength(1)

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    const rowText = list.getByText(/42.5\s*cm/)
    const row = rowText.closest('.swipeable-row-content') as HTMLElement
    const li = rowText.closest('.swipeable-row') as HTMLElement
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 200, button: 0, pointerType: 'touch' })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 200 - 60, button: 0 })
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 200 - 60, button: 0 })
    expect(li.classList.contains('swipeable-row-open')).toBe(true)

    await user.click(screen.getByRole('button', { name: /delete head circumference/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(api.state.headCircumferences).toHaveLength(0)
    expect(screen.queryByText('42.5 cm')).not.toBeInTheDocument()
  })

  it('duplicates a head circumference via the swipe-reveal action', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goHeadCircumference(user)

    fireEvent.change(screen.getByLabelText(/head circumference/i), { target: { value: '42.5' } })
    await user.click(screen.getByRole('button', { name: /add head circumference/i }))
    expect(api.state.headCircumferences).toHaveLength(1)

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    const rowText = list.getByText(/42.5\s*cm/)
    const row = rowText.closest('.swipeable-row-content') as HTMLElement
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 200, button: 0, pointerType: 'touch' })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 200 - 120, button: 0 })
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 200 - 120, button: 0 })

    await user.click(screen.getByRole('button', { name: /duplicate head circumference/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    // Value and unit are prefilled from the original record.
    expect(within(dialog).getByLabelText(/head circumference/i)).toHaveValue(42.5)

    await user.click(within(dialog).getByRole('button', { name: /save head circumference/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.state.headCircumferences).toHaveLength(2)
    expect(api.state.headCircumferences[1].value).toBe(42.5)
    expect(api.state.headCircumferences[0].id).not.toBe(api.state.headCircumferences[1].id)
  })

  it('quick-add accepts a measurement in inches', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goHeadCircumference(user)

    fireEvent.change(screen.getByLabelText(/head circumference/i), { target: { value: '16.5' } })
    fireEvent.change(screen.getByLabelText(/^unit/i), { target: { value: 'in' } })
    await user.click(screen.getByRole('button', { name: /add head circumference/i }))

    expect(api.state.headCircumferences).toHaveLength(1)
    expect(api.state.headCircumferences[0].unit).toBe('in')
    expect(api.state.headCircumferences[0].value).toBe(16.5)
    expect(screen.getByText('16.5 in')).toBeInTheDocument()
  })

  it('opens the real head circumference screen from the Health menu and backs out', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goHeadCircumference(user)

    expect(screen.getByRole('heading', { name: 'Head circumference' })).toBeInTheDocument()
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add head circumference/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^back/i }))
    expect(await screen.findByRole('heading', { name: 'Health' })).toBeInTheDocument()
  })
})

describe('Dashboard head circumference chart', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the head circumference chart on the dashboard with the aria-label', async () => {
    const now = new Date()
    api.state.headCircumferences.push(
      { id: 'h1', time: new Date(now.getTime() - 30 * 86400000).toISOString(), value: 40, unit: 'cm' },
      { id: 'h2', time: new Date(now.getTime() - 10 * 86400000).toISOString(), value: 43, unit: 'cm' },
    )
    const user = userEvent.setup()
    await onboard(user)

    expect(screen.getByText('Head circumference progress')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /head circumference growth chart/i })).toBeInTheDocument()
  })

  it('does not show the head circumference chart when there are no records', async () => {
    const user = userEvent.setup()
    await onboard(user)
    expect(screen.queryByText('Head circumference progress')).not.toBeInTheDocument()
  })

  it('applies the baby sex to the dashboard head circumference band (male vs female)', async () => {
    const now = new Date()
    const seedHC = () =>
      api.state.headCircumferences.push({
        id: 'h1',
        time: new Date(now.getTime() - 30 * 86400000).toISOString(),
        value: 42.5,
        unit: 'cm',
      })

    const bandPath = async (sexLabel: string) => {
      const user = userEvent.setup()
      render(<App />)
      await user.type(await screen.findByLabelText(/name/i), 'Avery')
      fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
      await user.click(screen.getByRole('button', { name: sexLabel }))
      await user.click(screen.getByRole('button', { name: /continue/i }))
      expect(await screen.findByText('Head circumference progress')).toBeInTheDocument()
      const band = document.querySelector('.growth-chart path') as SVGPathElement | null
      const d = band?.getAttribute('d') ?? ''
      cleanup()
      return d
    }

    seedHC()
    const male = await bandPath('Male')
    api = setupApi()
    seedHC()
    const female = await bandPath('Female')

    expect(api.state.baby?.sex).toBe('female')
    expect(male).not.toBe(female)
  })
})
