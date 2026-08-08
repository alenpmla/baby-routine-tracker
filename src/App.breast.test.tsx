import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'
import { toInputTime } from './presentation/utils/time'

let api: MockApi

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  const result = render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
  return result
}

describe('Breast feeding start/end', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('records a breast feed with start and end times and shows the duration', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Feeding' }))

    // Breast chip opens the feed form instead of recording instantly
    await user.click(screen.getByRole('button', { name: 'Breast' }))
    const dialog = screen.getByRole('dialog', { name: /add feed/i })
    const times = within(dialog).getAllByLabelText(/time/i)
    expect(times).toHaveLength(2)

    fireEvent.change(times[0], { target: { value: toInputTime(new Date(Date.now() - 2 * 3600 * 1000)) } })
    fireEvent.change(times[1], { target: { value: toInputTime(new Date(Date.now() - 60000)) } })
    await user.click(screen.getByRole('button', { name: /save feed/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(api.state.feedings[0].type).toBe('breast')
    expect(api.state.feedings[0].startTime).toBeDefined()
    expect(api.state.feedings[0].endTime).toBeDefined()

    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    expect(list.getByText('Breast')).toBeInTheDocument()
    expect(list.getByText(/1h 59m|2h 0m/i)).toBeInTheDocument()
  })
})
