import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
}

describe('Back exits app from Home', () => {
  beforeEach(() => {
    setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.removeAttribute('data-theme')
    window.localStorage.clear()
  })

  it('collapses history on Home so back exits on the first press', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Sleep' }))
    expect(window.history.state).toEqual({ tab: 'sleep', settings: false })

    // Returning to Home collapses the history back to the root app entry,
    // so the next back press exits the app instead of a silent no-op.
    await user.click(nav().getByRole('button', { name: 'Home' }))
    await waitFor(() => expect(window.history.state).toEqual({ tab: 'home', settings: false }))
  })
})
