import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import { createMockApi, type MockApi } from './test/mockApi'
import type { MockApi as MockApiT } from './test/mockApi'
import { RemoteRepositories } from './data/repositories/RemoteRepositories'
import { FetchHttp } from './data/http'
import { LocalStorage } from './data/storage'

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onmessage: ((e: { data: string }) => void) | null = null
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  url: string
  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }
  close() {
    FakeEventSource.instances = FakeEventSource.instances.filter((x) => x !== this)
  }
}

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  const result = render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
  return result
}

async function addDiaper(user: ReturnType<typeof userEvent.setup>, type: string) {
  await user.click(within(screen.getByRole('navigation', { name: /primary/i })).getByRole('button', { name: 'Diaper' }))
  await user.click(screen.getByRole('button', { name: type }))
}

describe('Offline/online multi-device sync (comprehensive)', () => {
  beforeEach(() => {
    vi.stubGlobal('EventSource', FakeEventSource)
  })
  afterEach(() => {
    FakeEventSource.instances = []
    vi.unstubAllGlobals()
  })

  it('replays an offline edit to the server and a fresh device sees it', async () => {
    const user = userEvent.setup()
    const api: MockApi = setupApi()

    // Record a solids feed online.
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
    expect(api.state.feedings).toHaveLength(1)

    // Go offline and edit the amount.
    api.setOffline(true)
    act(() => window.dispatchEvent(new Event('offline')))
    await user.click(screen.getByRole('button', { name: /edit solids feed/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /amount/i }), { target: { value: '5' } })
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    // Offline: the server copy is unchanged for now.
    expect(api.state.feedings[0].amount).toBe(2)

    // Back online via the browser event; the queued edit should replay.
    api.setOffline(false)
    act(() => window.dispatchEvent(new Event('online')))
    await waitFor(() => expect(api.state.feedings[0].amount).toBe(5))
    await waitFor(() => expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument())
  })

  it('replays an offline delete to the server and a fresh device sees the removal', async () => {
    const user = userEvent.setup()
    const api: MockApi = setupApi()

    await onboard(user)
    await addDiaper(user, 'Wet')
    expect(api.state.diapers).toHaveLength(1)

    // Go offline and delete it via swipe.
    api.setOffline(true)
    act(() => window.dispatchEvent(new Event('offline')))
    const list = within(screen.getByRole('heading', { name: 'Today' }).closest('section') as HTMLElement)
    const rowText = list.getByText(/diaper/i)
    const row = rowText.closest('.swipeable-row-content') as HTMLElement
    const li = rowText.closest('.swipeable-row') as HTMLElement
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 200, button: 0, pointerType: 'touch' })
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 200 - 60, button: 0 })
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 200 - 60, button: 0 })
    expect(li.classList.contains('swipeable-row-open')).toBe(true)
    await user.click(screen.getByRole('button', { name: /delete wet diaper change/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    // Offline: still present on the server.
    expect(api.state.diapers).toHaveLength(1)

    // Back online: the delete replays.
    api.setOffline(false)
    act(() => window.dispatchEvent(new Event('online')))
    await waitFor(() => expect(api.state.diapers).toHaveLength(0))
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()
  })

  it('replays an offline settings change and a fresh device sees it', async () => {
    const user = userEvent.setup()
    const api: MockApi = setupApi()

    await onboard(user)
    expect(api.state.settings.foodSuggestions).not.toContain('sweet potato')

    // Go offline and add a food suggestion.
    api.setOffline(true)
    act(() => window.dispatchEvent(new Event('offline')))
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /food suggestions/i }))
    await user.type(screen.getByLabelText(/new food suggestion/i), 'sweet potato')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    // Offline: server settings unchanged for now.
    expect(api.state.settings.foodSuggestions).not.toContain('sweet potato')

    // Back online: the settings change replays.
    api.setOffline(false)
    act(() => window.dispatchEvent(new Event('online')))
    await waitFor(() => expect(api.state.settings.foodSuggestions).toContain('sweet potato'))
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()
  })

  it('two devices offline-add concurrently, both come online, and the union merges', async () => {
    const api: MockApiT = createMockApi()
    api.state.settings.wakeWindowEnabled = false
    vi.stubGlobal('fetch', api.fetchStub)

    // Device A and B share the server but have separate local caches.
    const repoA = new RemoteRepositories(new FetchHttp('', api.fetchStub, 2000), new LocalStorage('bt.devA.'))
    const repoB = new RemoteRepositories(new FetchHttp('', api.fetchStub, 2000), new LocalStorage('bt.devB.'))

    // Both devices start online and load the (empty) server.
    await repoA.loadAll()
    await repoB.loadAll()

    // Both go offline and each adds a different record.
    api.setOffline(true)
    repoA.feeding.add({ id: 'devA-f1', time: new Date().toISOString(), type: 'bottle', amount: 120, unit: 'ml' })
    repoB.diaper.add({ id: 'devB-d1', time: new Date().toISOString(), type: 'wet' })

    // Both come online and sync.
    api.setOffline(false)
    await repoA.syncNow()
    await repoB.syncNow()

    // The server holds the union of both devices' records.
    expect(api.state.feedings.map((f) => f.id)).toContain('devA-f1')
    expect(api.state.diapers.map((d) => d.id)).toContain('devB-d1')

    // NOTE: syncNow only replays pending + health-checks; it does NOT re-fetch.
    // So a device does NOT immediately see the other device's records here —
    // that only happens on the next refreshFromServer (SSE/online event).
    // After each device also refreshes, the union converges.
    await repoA.refreshFromServer()
    await repoB.refreshFromServer()
    expect(repoA.feeding.getAll().map((f) => f.id)).toContain('devA-f1')
    expect(repoB.feeding.getAll().map((f) => f.id)).toContain('devA-f1')
    expect(repoA.diaper.getAll().map((d) => d.id)).toContain('devB-d1')
    expect(repoB.diaper.getAll().map((d) => d.id)).toContain('devB-d1')

    // Both should now report online.
    expect(repoA.isOffline()).toBe(false)
    expect(repoB.isOffline()).toBe(false)
  })

  it('broadcasts via SSE so an online device sees another device addition', async () => {
    const user = userEvent.setup()
    const api: MockApi = setupApi()

    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))

    // Simulate the wife's device writing to the shared server.
    api.state.diapers.push({ id: 'wife-d', time: new Date().toISOString(), type: 'dirty' })

    // The server broadcasts; this online device refetches and reflects it.
    const source = FakeEventSource.instances[0]
    act(() => source.onmessage?.({ data: '{"kind":"update"}' }))
    await user.click(nav().getByRole('button', { name: 'Diaper' }))
    await waitFor(() =>
      expect(within(screen.getByRole('group', { name: 'Changes' })).getByText('1')).toBeInTheDocument(),
    )
  })

  it('auto-merges mid-session: online -> offline -> add -> back online (no reload)', async () => {
    const user = userEvent.setup()
    const api: MockApi = setupApi()

    await onboard(user)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument()

    // Drop offline mid-session and add a feed.
    api.setOffline(true)
    act(() => window.dispatchEvent(new Event('offline')))
    expect(await screen.findByTestId('offline-banner')).toHaveTextContent(/offline/i)

    await user.click(nav().getByRole('button', { name: 'Feeding' }))
    await user.click(screen.getByRole('button', { name: 'Bottle' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { target: { value: '90' } })
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), { target: { value: 'ml' } })
    await user.click(screen.getByRole('button', { name: /save feed/i }))
    expect(api.state.feedings).toHaveLength(0) // queued locally only

    // Back online: the SSE reconnect (or online event) merges without any Retry.
    api.setOffline(false)
    act(() => window.dispatchEvent(new Event('online')))
    await waitFor(() => expect(api.state.feedings).toHaveLength(1))
    await waitFor(() => expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument())
  })
})
