import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'

function back() {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

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
    window.sessionStorage.clear()
  })

  it('does not navigate when back is pressed on Home (app exits instead)', async () => {
    const user = userEvent.setup()
    await onboard(user)
    expect(screen.getByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()

    // The nav stack is at the root: back must not move to a different tab.
    back()
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
  })

  it('returns to Home on back from any tab, then stays on Home on the next back', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Sleep' }))
    expect(screen.getByRole('heading', { name: 'Sleep' })).toBeInTheDocument()

    back()
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()

    // Now on Home: the next back exits (stays on Home in the app).
    back()
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
  })
})
