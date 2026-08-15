import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'

let api: MockApi

function pressBack() {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
  await screen.findByRole('heading', { name: /hi, avery/i })
}

function nav() {
  return within(screen.getByRole('navigation', { name: /primary/i }))
}

async function goTab(user: ReturnType<typeof userEvent.setup>, tab: string) {
  await user.click(nav().getByRole('button', { name: tab }))
}

async function expectHome() {
  expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
}

describe('Back navigation — exhaustive scenarios', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
    cleanup()
  })

  it('1. back on Home stays on Home (exit happens at the app level)', async () => {
    const user = userEvent.setup()
    await onboard(user)
    pressBack()
    await new Promise((r) => setTimeout(r, 30))
    await expectHome()
  })

  it('2. tab → back → Home', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Sleep')
    expect(screen.getByRole('heading', { name: 'Sleep' })).toBeInTheDocument()
    pressBack()
    await expectHome()
  })

  it('3. tab hop Sleep → Feeding → back → Home (not Feeding)', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Sleep')
    await goTab(user, 'Feeding')
    expect(screen.getByRole('heading', { name: 'Feeding' })).toBeInTheDocument()
    pressBack()
    await expectHome()
  })

  it('4. tab hop Sleep → Feeding → Diaper → back → Home', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Sleep')
    await goTab(user, 'Feeding')
    await goTab(user, 'Diaper')
    expect(screen.getByRole('heading', { name: 'Diaper' })).toBeInTheDocument()
    pressBack()
    await expectHome()
  })

  it('5. back on Home after returning from a tab stays Home', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Sleep')
    pressBack()
    await expectHome()
    pressBack()
    await new Promise((r) => setTimeout(r, 30))
    await expectHome()
  })

  it('6. Settings → back → Home', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    pressBack()
    await expectHome()
  })

  it('7. Settings → sub-screen (Data & reports) → back → Settings → back → Home', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))
    expect(screen.getByRole('heading', { name: 'Data & reports' })).toBeInTheDocument()

    pressBack()
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    pressBack()
    await expectHome()
  })

  it('8. Settings → deep sub-screen (Units) → back to Settings, then back Home', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /units/i }))
    expect(screen.getByRole('heading', { name: 'Units' })).toBeInTheDocument()
    pressBack()
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    pressBack()
    await expectHome()
  })

  it('9. Health tab → back → Home', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Health')
    expect(screen.getByRole('heading', { name: 'Health' })).toBeInTheDocument()
    pressBack()
    await expectHome()
  })

  it('10. Health → Weight sub-screen → back → Health menu → back → Home', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Health')
    await user.click(screen.getByRole('button', { name: /^weight/i }))
    expect(screen.getByRole('heading', { name: 'Weight' })).toBeInTheDocument()
    pressBack()
    expect(await screen.findByRole('heading', { name: 'Health' })).toBeInTheDocument()
    pressBack()
    await expectHome()
  })

  it('11. Health → Teeth sub-menu → Teeth → back → menu → back → Health → back → Home', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Health')
    await user.click(screen.getByRole('button', { name: /teeth & teething/i }))
    expect(screen.getByRole('heading', { name: 'Teeth & teething' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /teeth erupted teeth/i }))
    expect(screen.getByRole('heading', { name: 'Teeth' })).toBeInTheDocument()

    pressBack()
    expect(await screen.findByRole('heading', { name: 'Teeth & teething' })).toBeInTheDocument()
    pressBack()
    expect(await screen.findByRole('heading', { name: 'Health' })).toBeInTheDocument()
    pressBack()
    await expectHome()
  })

  it('12. Health → Milestones → back → Health → back → Home', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Health')
    await user.click(screen.getByRole('button', { name: /^milestones/i }))
    expect(screen.getByRole('heading', { name: 'Milestones' })).toBeInTheDocument()
    pressBack()
    expect(await screen.findByRole('heading', { name: 'Health' })).toBeInTheDocument()
    pressBack()
    await expectHome()
  })

  it('13. on-screen Settings back arrow matches physical back', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))
    expect(screen.getByRole('heading', { name: 'Data & reports' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^done$/i }))
    await expectHome()
  })

  it('14. on-screen Health back arrow matches physical back', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Health')
    await user.click(screen.getByRole('button', { name: /^weight/i }))
    expect(screen.getByRole('heading', { name: 'Weight' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(await screen.findByRole('heading', { name: 'Health' })).toBeInTheDocument()
  })

  it('15. same-device reload restores the current tab', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await user.type(await screen.findByLabelText(/name/i), 'Avery')
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await goTab(user, 'Sleep')
    first.unmount()

    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Sleep' })).toBeInTheDocument()
  })

  it('16. same-device reload restores a Settings sub-screen', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await user.type(await screen.findByLabelText(/name/i), 'Avery')
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))
    first.unmount()

    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Data & reports' })).toBeInTheDocument()
  })

  it('17. back in restored Settings sub-screen → Settings → Home', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await user.type(await screen.findByLabelText(/name/i), 'Avery')
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))
    first.unmount()

    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Data & reports' })).toBeInTheDocument()
    pressBack()
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    pressBack()
    await expectHome()
  })

  it('18. zoom modal back closes the modal, not the app', async () => {
    const dob = new Date('2026-01-15T00:00:00')
    api.state.weights = [
      { id: 'w1', time: new Date(dob.getTime()).toISOString(), weight: 3.3, unit: 'kg' },
      { id: 'w2', time: new Date(dob.getTime() + 6 * 2629746000).toISOString(), weight: 7.5, unit: 'kg' },
    ]
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /open weight chart zoom/i }))
    expect(await screen.findByRole('dialog', { name: /weight progress/i })).toBeInTheDocument()

    pressBack()
    await new Promise((r) => setTimeout(r, 60))
    expect(screen.queryByRole('dialog', { name: /weight progress/i })).not.toBeInTheDocument()
    await expectHome()
  })
})
