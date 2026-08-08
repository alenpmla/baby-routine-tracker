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

async function goWeight(user: ReturnType<typeof userEvent.setup>) {
  const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
  await user.click(nav().getByRole('button', { name: 'Weight' }))
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

  it('deletes a weight', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goWeight(user)

    fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: '7.5' } })
    await user.click(screen.getByRole('button', { name: /add weight/i }))

    await user.click(screen.getByRole('button', { name: /delete weight/i }))
    expect(api.state.weights).toHaveLength(0)
    expect(screen.queryByText('7.5 kg')).not.toBeInTheDocument()
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
})
