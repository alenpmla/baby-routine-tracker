import { describe, it, expect } from 'vitest'
import { createMockApi } from '../../../test/mockApi'
import { FetchHttp } from '../../http'
import { LocalStorage } from '../../storage'
import { RemoteRepositories } from '../RemoteRepositories'

const flush = () => new Promise<void>((r) => setTimeout(r, 0))

function makeRepos() {
  window.localStorage.clear()
  const api = createMockApi()
  const repos = new RemoteRepositories(new FetchHttp('', api.fetchStub), new LocalStorage())
  return { api, repos }
}

describe('RemoteRepositories 404-tolerant collection fetch', () => {
  it('loadAll with one collection 404 stays online, loads the rest, and treats the missing collection as []', async () => {
    const { api, repos } = makeRepos()
    api.state.sleeps.push({ id: 's1', startTime: '2026-08-14T10:00:00Z', endTime: '2026-08-14T11:00:00Z' })
    api.state.feedings.push({ id: 'f1', type: 'bottle', time: '2026-08-14T10:30:00Z', amount: 120, unit: 'ml' })
    api.state.diapers.push({ id: 'd1', type: 'wet', time: '2026-08-14T09:00:00Z' })
    api.state.weights.push({ id: 'w1', time: '2026-08-14T08:00:00Z', weight: 7.5, unit: 'kg' })
    api.setMissingCollections(['headCircumferences'])

    await repos.loadAll()

    expect(repos.isOffline()).toBe(false)
    expect(repos.sleep.getAll()).toEqual([{ id: 's1', startTime: '2026-08-14T10:00:00Z', endTime: '2026-08-14T11:00:00Z' }])
    expect(repos.feeding.getAll()).toEqual([{ id: 'f1', type: 'bottle', time: '2026-08-14T10:30:00Z', amount: 120, unit: 'ml' }])
    expect(repos.diaper.getAll()).toEqual([{ id: 'd1', type: 'wet', time: '2026-08-14T09:00:00Z' }])
    expect(repos.weight.getAll()).toEqual([{ id: 'w1', time: '2026-08-14T08:00:00Z', weight: 7.5, unit: 'kg' }])
    expect(repos.headCircumference.getAll()).toEqual([])
  })

  it('refreshFromServer with one collection 404 returns true, stays online, and loads the rest', async () => {
    const { api, repos } = makeRepos()
    api.state.sleeps.push({ id: 's1', startTime: '2026-08-14T10:00:00Z', endTime: '2026-08-14T11:00:00Z' })
    api.setMissingCollections(['weights'])

    const ok = await repos.refreshFromServer()

    expect(ok).toBe(true)
    expect(repos.isOffline()).toBe(false)
    expect(repos.sleep.getAll()).toHaveLength(1)
    expect(repos.weight.getAll()).toEqual([])
    expect(repos.headCircumference.getAll()).toEqual([])
  })

  it('exportData with a missing collection exports it as []', async () => {
    const { api, repos } = makeRepos()
    api.state.diapers.push({ id: 'd1', type: 'wet', time: '2026-08-14T09:00:00Z' })
    api.setMissingCollections(['headCircumferences'])

    const data = await repos.exportData()

    expect(data.diapers).toEqual([{ id: 'd1', type: 'wet', time: '2026-08-14T09:00:00Z' }])
    expect(data.headCircumferences).toEqual([])
    expect(data.sleeps).toEqual([])
    expect(data.weights).toEqual([])
  })

  it('refreshFromServer preserves locally-entered entries for a missing collection instead of wiping them', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['medications'])
    await repos.loadAll()
    expect(repos.isOffline()).toBe(false)

    repos.medication.add({ id: 'm1', time: '2026-08-14T10:00:00Z', name: 'Paracetamol', unit: '' })
    await flush()
    expect(repos.medication.getAll()).toHaveLength(1)

    const ok = await repos.refreshFromServer()
    expect(ok).toBe(true)
    expect(repos.medication.getAll()).toHaveLength(1)
    expect(repos.medication.getAll()[0].id).toBe('m1')
  })

  it('loadAll preserves locally-cached entries for a missing collection across a reload', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['milestones'])
    await repos.loadAll()

    repos.milestone.add({ id: 'ms1', time: '2026-08-14T10:00:00Z', milestone: 'Crawl' })
    await flush()
    expect(repos.milestone.getAll()).toHaveLength(1)

    // Simulate a fresh mount reading the same localStorage + server state
    window.localStorage.setItem(
      'bt.milestones',
      JSON.stringify([{ id: 'ms1', time: '2026-08-14T10:00:00Z', milestone: 'Crawl' }]),
    )
    const freshApi = createMockApi()
    freshApi.setMissingCollections(['milestones'])
    const fresh = new RemoteRepositories(new FetchHttp('', freshApi.fetchStub), new LocalStorage())

    await fresh.loadAll()
    expect(fresh.isOffline()).toBe(false)
    expect(fresh.milestone.getAll()).toEqual([{ id: 'ms1', time: '2026-08-14T10:00:00Z', milestone: 'Crawl' }])
  })

  it('exportData includes locally-entered entries for a missing collection', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['temperatures'])
    await repos.loadAll()

    repos.temperature.add({ id: 't1', time: '2026-08-14T10:00:00Z', temp: 37.4, unit: 'c' })
    await flush()

    const data = await repos.exportData()
    expect(data.temperatures).toEqual([{ id: 't1', time: '2026-08-14T10:00:00Z', temp: 37.4, unit: 'c' }])
  })

  it('a 404 on /api/baby stays strict: loadAll falls back to localStorage and flips offline', async () => {
    window.localStorage.clear()
    const api = createMockApi()
    const wrapped = (input: string, init?: RequestInit) => {
      const path = input
      if (path === '/api/baby' && (init?.method ?? 'GET') === 'GET') {
        return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'not found' }) })
      }
      return api.fetchStub(input, init)
    }
    const strict = new RemoteRepositories(new FetchHttp('', wrapped), new LocalStorage())
    window.localStorage.setItem('bt.sleeps', JSON.stringify([{ id: 'cached', startTime: 't', endTime: null }]))

    await strict.loadAll()

    expect(strict.isOffline()).toBe(true)
    expect(strict.sleep.getAll()).toEqual([{ id: 'cached', startTime: 't', endTime: null }])
  })

  it('a non-404 HTTP error (500) on a collection is NOT swallowed: loadAll flips offline and uses the localStorage fallback', async () => {
    window.localStorage.clear()
    const api = createMockApi()
    const wrapped = (input: string, init?: RequestInit) => {
      const path = input
      if (path === '/api/headCircumferences' && (init?.method ?? 'GET') === 'GET') {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'server error' }) })
      }
      return api.fetchStub(input, init)
    }
    const repos = new RemoteRepositories(new FetchHttp('', wrapped), new LocalStorage())
    window.localStorage.setItem('bt.sleeps', JSON.stringify([{ id: 'cached', startTime: 't', endTime: null }]))

    await repos.loadAll()

    expect(repos.isOffline()).toBe(true)
    expect(repos.sleep.getAll()).toEqual([{ id: 'cached', startTime: 't', endTime: null }])
    expect(repos.headCircumference.getAll()).toEqual([])
  })

  it('a 404 on /api/settings stays strict: loadAll falls back to localStorage and flips offline', async () => {
    window.localStorage.clear()
    const api = createMockApi()
    const wrapped = (input: string, init?: RequestInit) => {
      const path = input
      if (path === '/api/settings' && (init?.method ?? 'GET') === 'GET') {
        return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'not found' }) })
      }
      return api.fetchStub(input, init)
    }
    const repos = new RemoteRepositories(new FetchHttp('', wrapped), new LocalStorage())
    window.localStorage.setItem('bt.settings', JSON.stringify({ foodSuggestions: ['banana'] }))

    await repos.loadAll()

    expect(repos.isOffline()).toBe(true)
    expect(repos.settings.get()).toEqual({ foodSuggestions: ['banana'] })
  })

  it('a hard network failure (not a 404) still flips offline and uses the localStorage fallback', async () => {
    const { api, repos } = makeRepos()
    window.localStorage.setItem('bt.sleeps', JSON.stringify([{ id: 'cached', startTime: 't', endTime: null }]))
    api.setOffline(true)

    await repos.loadAll()

    expect(repos.isOffline()).toBe(true)
    expect(repos.sleep.getAll()).toEqual([{ id: 'cached', startTime: 't', endTime: null }])
  })

  it('unsetting the missing-collection knob restores the default online behaviour', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['headCircumferences'])
    await repos.loadAll()
    expect(repos.headCircumference.getAll()).toEqual([])

    api.setMissingCollections([])
    api.state.headCircumferences.push({ id: 'h1', time: '2026-08-14T12:00:00Z', value: 42, unit: 'cm' })
    const ok = await repos.refreshFromServer()

    expect(ok).toBe(true)
    expect(repos.isOffline()).toBe(false)
    expect(repos.headCircumference.getAll()).toEqual([{ id: 'h1', time: '2026-08-14T12:00:00Z', value: 42, unit: 'cm' }])
  })
})

describe('RemoteRepositories replayPending / push 404 tolerance (missing collection)', () => {
  const HC = { id: 'h1', time: '2026-08-14T12:00:00Z', value: 42, unit: 'cm' as const }
  const W = { id: 'w1', time: '2026-08-14T08:00:00Z', weight: 7.5, unit: 'kg' as const }

  it('replayPending skips a queued add for a missing collection, replays the rest, and stays online', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['headCircumferences'])
    api.setOffline(true)
    repos.headCircumference.add(HC)
    await flush()
    repos.weight.add(W)
    await flush()
    expect(repos.isOffline()).toBe(true)
    expect(api.state.headCircumferences).toEqual([])
    expect(api.state.weights).toEqual([])

    api.setOffline(false)
    const ok = await repos.syncNow()

    expect(ok).toBe(true)
    expect(repos.isOffline()).toBe(false)
    expect(api.state.headCircumferences).toEqual([])
    expect(api.state.weights).toEqual([W])
    expect(JSON.parse(window.localStorage.getItem('bt.pending') ?? 'null')).toEqual([])
  })

  it('replayPending skips a queued delete for a missing collection and keeps the queue cleared', async () => {
    const { api, repos } = makeRepos()
    api.state.weights.push(W)
    await repos.loadAll()
    api.setMissingCollections(['weights'])
    api.setOffline(true)
    repos.weight.delete(W.id)
    await flush()
    expect(repos.isOffline()).toBe(true)
    expect(api.state.weights).toEqual([W])

    api.setOffline(false)
    const ok = await repos.syncNow()

    expect(ok).toBe(true)
    expect(repos.isOffline()).toBe(false)
    expect(api.state.weights).toEqual([W])
    expect(JSON.parse(window.localStorage.getItem('bt.pending') ?? 'null')).toEqual([])
  })

  it('a real network failure during replay still aborts, keeps the queue, and flips offline', async () => {
    window.localStorage.clear()
    const api = createMockApi()
    const wrapped = (input: string, init?: RequestInit) => {
      if (String(input) === '/api/weights' && (init?.method ?? 'GET') === 'POST') {
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      return api.fetchStub(input, init)
    }
    const repos = new RemoteRepositories(new FetchHttp('', wrapped), new LocalStorage())
    api.setOffline(true)
    repos.headCircumference.add(HC)
    await flush()
    repos.weight.add(W)
    await flush()

    api.setOffline(false)
    const ok = await repos.syncNow()

    expect(ok).toBe(false)
    expect(repos.isOffline()).toBe(true)
    expect(api.state.weights).toEqual([])
    expect(JSON.parse(window.localStorage.getItem('bt.pending') ?? 'null')).toHaveLength(2)
  })

  it('loadAll-triggered replay skips a queued op for a missing collection, replays the rest, and stays online', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['headCircumferences'])
    api.setOffline(true)
    repos.headCircumference.add(HC)
    await flush()
    repos.weight.add(W)
    await flush()
    expect(repos.isOffline()).toBe(true)
    expect(api.state.headCircumferences).toEqual([])
    expect(api.state.weights).toEqual([])

    api.setOffline(false)
    await repos.loadAll()

    expect(repos.isOffline()).toBe(false)
    expect(api.state.headCircumferences).toEqual([])
    expect(api.state.weights).toEqual([W])
    expect(JSON.parse(window.localStorage.getItem('bt.pending') ?? 'null')).toEqual([])
  })

  it('push to a missing collection (POST 404) keeps the local op, stays online, and does not queue it', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['headCircumferences'])
    repos.headCircumference.add(HC)
    await flush()

    expect(repos.headCircumference.getAll()).toEqual([HC])
    expect(repos.isOffline()).toBe(false)
    expect(api.state.headCircumferences).toEqual([])
    expect(JSON.parse(window.localStorage.getItem('bt.pending') ?? 'null')).toEqual([])
  })

  it('push delete to a missing collection (DELETE 404) keeps the local removal, stays online, and does not queue it', async () => {
    const { api, repos } = makeRepos()
    api.state.weights.push(W)
    await repos.loadAll()
    api.setMissingCollections(['weights'])
    repos.weight.delete(W.id)
    await flush()

    expect(repos.weight.getAll()).toEqual([])
    expect(repos.isOffline()).toBe(false)
    expect(api.state.weights).toEqual([W])
    expect(JSON.parse(window.localStorage.getItem('bt.pending') ?? 'null')).toEqual([])
  })
})
