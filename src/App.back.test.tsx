import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'

const HOME = { tab: 'home', settings: false }

function backTo(state: { tab: string; settings: boolean; settingsView?: string }) {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state }))
  })
}

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  const result = render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
  return result
}

describe('Physical back button', () => {
  beforeEach(() => {
    setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.removeItem('bt.theme')
    window.localStorage.removeItem('bt.snapshotUnits')
    window.localStorage.removeItem('bt.reportUnits')
    document.documentElement.removeAttribute('data-theme')
  })

  it('returns to Home when back is pressed on another tab', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    await user.click(nav().getByRole('button', { name: 'Sleep' }))
    expect(screen.getByRole('heading', { name: 'Sleep' })).toBeInTheDocument()

    backTo(HOME)
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()

    await user.click(nav().getByRole('button', { name: 'Diaper' }))
    expect(screen.getByRole('heading', { name: 'Diaper' })).toBeInTheDocument()
    backTo(HOME)
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
  })

  it('returns to Settings main when back is pressed in a sub-screen', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))
    expect(screen.getByRole('heading', { name: 'Data & reports' })).toBeInTheDocument()

    backTo({ tab: 'home', settings: true })
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /units/i }))
    expect(screen.getByRole('heading', { name: 'Units' })).toBeInTheDocument()
    backTo({ tab: 'home', settings: true })
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('returns to the previous screen when back is pressed on Settings main', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()

    backTo({ tab: 'home', settings: false })
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
  })

  it('on-screen sub-screen back arrow matches physical back', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))
    expect(screen.getByRole('heading', { name: 'Data & reports' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /done/i }))
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
  })
})
