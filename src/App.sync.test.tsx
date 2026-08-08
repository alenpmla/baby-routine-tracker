import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  const result = render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
  return result
}

describe('Phase 3: sync server', () => {
  beforeEach(() => {
    setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shares data across devices via the central server', async () => {
    const user = userEvent.setup()
    const first = await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    // Device A adds a diaper change (goes to the "server")
    await user.click(nav().getByRole('button', { name: 'Diaper' }))
    await user.click(screen.getByRole('button', { name: 'Wet' }))
    await waitFor(() =>
      expect(within(screen.getByRole('group', { name: 'Changes' })).getByText('1')).toBeInTheDocument(),
    )
    first.unmount()

    // Device B opens the app fresh and sees the same data (profile already on the server)
    render(<App />)
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Diaper' }))
    expect(await screen.findByRole('group', { name: 'Changes' })).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Changes' })).getByText('1')).toBeInTheDocument()
  })

  it('shows an offline banner and syncs queued writes after reconnect', async () => {
    const user = userEvent.setup()
    const api: MockApi = setupApi()

    // First device: create profile while online so the baby exists on the server
    const first = await onboard(user)
    first.unmount()

    // Go offline, then open the app again on a device with no cache
    window.localStorage.clear()
    api.setOffline(true)
    render(<App />)
    await screen.findByLabelText(/name/i)
    expect(await screen.findByRole('status')).toHaveTextContent(/offline/i)

    // Add a feed while offline — it is queued locally
    await user.type(screen.getByLabelText(/name/i), 'Avery')
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(within(screen.getByRole('navigation', { name: /primary/i })).getByRole('button', { name: 'Feeding' }))
    await user.click(screen.getByRole('button', { name: 'Bottle' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { target: { value: '120' } })
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), { target: { value: 'ml' } })
    await user.click(screen.getByRole('button', { name: /save feed/i }))

    // Reconnect and retry sync
    api.setOffline(false)
    await user.click(screen.getByRole('button', { name: /retry sync/i }))
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())

    // The queued feed reached the server
    expect(api.state.feedings).toHaveLength(1)
  })

  it('uses cached data when the server is unreachable on load', async () => {
    const user = userEvent.setup()
    const api: MockApi = setupApi()
    const first = await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Diaper' }))
    await user.click(screen.getByRole('button', { name: 'Wet' }))
    first.unmount()

    // Now offline: reload uses the localStorage cache, so the profile is still there
    api.setOffline(true)
    render(<App />)
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/offline/i)
  })
})
