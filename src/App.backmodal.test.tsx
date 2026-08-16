import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'

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

describe('Back closes an open Modal at the app level', () => {
  beforeEach(() => {
    setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
    cleanup()
  })

  it('back closes an open sheet on a tab and leaves the holding screen visible', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Feeding')
    await user.click(screen.getByRole('button', { name: /add past feed/i }))
    expect(screen.getByRole('dialog', { name: 'Add feed' })).toBeInTheDocument()

    pressBack()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add feed' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Feeding' })).toBeInTheDocument()
  })

  it('back closes the solids picker first, then the solids sheet, leaving the screen put', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Feeding')

    await user.click(screen.getByRole('button', { name: 'Solids' }))
    expect(screen.getByRole('dialog', { name: 'Add solid food' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add foods' }))
    expect(screen.getByRole('dialog', { name: 'Add foods' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Add solid food' })).toBeInTheDocument()

    pressBack()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add foods' })).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'Add solid food' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Feeding' })).toBeInTheDocument()

    pressBack()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add solid food' })).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Feeding' })).toBeInTheDocument()
  })

  it('a back after closing the modal via the X navigates normally (no swallowed back)', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Feeding')
    await user.click(screen.getByRole('button', { name: /add past feed/i }))
    expect(screen.getByRole('dialog', { name: 'Add feed' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add feed' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Feeding' })).toBeInTheDocument()

    pressBack()
    await expectHome()
  })

  it('a back after closing the modal via Escape navigates normally (no swallowed back)', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Feeding')
    await user.click(screen.getByRole('button', { name: /add past feed/i }))
    expect(screen.getByRole('dialog', { name: 'Add feed' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add feed' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Feeding' })).toBeInTheDocument()

    pressBack()
    await expectHome()
  })

  it('a back after closing the modal via the backdrop navigates normally (no swallowed back)', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Feeding')
    await user.click(screen.getByRole('button', { name: /add past feed/i }))
    const dialog = screen.getByRole('dialog', { name: 'Add feed' })
    expect(dialog).toBeInTheDocument()

    fireEvent.click(dialog.parentElement as HTMLElement)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add feed' })).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Feeding' })).toBeInTheDocument()

    pressBack()
    await expectHome()
  })

  it('with no modal open, back still navigates from a tab to Home', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTab(user, 'Sleep')
    expect(screen.getByRole('heading', { name: 'Sleep' })).toBeInTheDocument()

    pressBack()
    await expectHome()
  })
})
