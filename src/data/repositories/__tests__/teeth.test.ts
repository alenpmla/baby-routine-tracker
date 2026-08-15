import { describe, it, expect, beforeEach } from 'vitest'
import { createMockApi } from '../../../test/mockApi'
import { FetchHttp } from '../../http'
import { LocalStorage } from '../../storage'
import { ToothRepositoryImpl } from '../ToothRepositoryImpl'
import { RemoteRepositories, isValidBackup } from '../RemoteRepositories'

const flush = () => new Promise<void>((r) => setTimeout(r, 0))

const ENTRY = { id: 't1', time: '2026-08-14T12:00:00Z', tooth: 'Lower central incisor' as const }

function makeRepos() {
  window.localStorage.clear()
  const api = createMockApi()
  const repos = new RemoteRepositories(new FetchHttp('', api.fetchStub), new LocalStorage())
  return { api, repos }
}

describe('ToothRepositoryImpl', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips teeth through localStorage (bt.-namespaced)', () => {
    const repo = new ToothRepositoryImpl(new LocalStorage())
    repo.add(ENTRY)
    expect(repo.getAll()).toEqual([ENTRY])
    expect(window.localStorage.getItem('bt.teeth')).toBe(JSON.stringify([ENTRY]))

    const fresh = new ToothRepositoryImpl(new LocalStorage())
    expect(fresh.getAll()).toEqual([ENTRY])

    fresh.update({ ...ENTRY, notes: 'first one' })
    expect(fresh.getAll()[0].notes).toBe('first one')

    fresh.delete(ENTRY.id)
    expect(fresh.getAll()).toEqual([])
  })

  it('update appends when the id is not already stored', () => {
    const repo = new ToothRepositoryImpl(new LocalStorage())
    repo.update(ENTRY)
    expect(repo.getAll()).toEqual([ENTRY])
  })
})

describe('isValidBackup with teeth', () => {
  const BASE = {
    version: 1 as const,
    exportedAt: '2026-08-14T00:00:00Z',
    baby: null,
    sleeps: [],
    feedings: [],
    diapers: [],
    weights: [],
    settings: { foodSuggestions: [] },
  }

  it('accepts an older backup without a teeth field', () => {
    expect(isValidBackup(BASE)).toBe(true)
  })

  it('accepts a backup with a teeth array', () => {
    expect(isValidBackup({ ...BASE, teeth: [ENTRY] })).toBe(true)
  })

  it('rejects a backup with a malformed teeth field', () => {
    expect(isValidBackup({ ...BASE, teeth: 'nope' })).toBe(false)
  })
})

describe('RemoteRepositories teeth collection', () => {
  it('writes an entry to the server through the pending-op queue', async () => {
    const { api, repos } = makeRepos()
    repos.tooth.add(ENTRY)
    await flush()
    expect(api.state.teeth).toEqual([ENTRY])
    expect(repos.tooth.getAll()).toEqual([ENTRY])
    expect(repos.isOffline()).toBe(false)
  })

  it('serves the entry back via loadAll and caches it locally', async () => {
    const { api, repos } = makeRepos()
    api.state.teeth.push(ENTRY)
    await repos.loadAll()
    expect(repos.tooth.getAll()).toEqual([ENTRY])
    expect(window.localStorage.getItem('bt.teeth')).toBe(JSON.stringify([ENTRY]))
    expect(repos.isOffline()).toBe(false)
  })

  it('queues an offline add and replays it to the server on sync', async () => {
    const { api, repos } = makeRepos()
    api.setOffline(true)
    repos.tooth.add(ENTRY)
    await flush()
    expect(api.state.teeth).toEqual([])
    expect(repos.isOffline()).toBe(true)

    api.setOffline(false)
    const ok = await repos.syncNow()
    expect(ok).toBe(true)
    expect(api.state.teeth).toEqual([ENTRY])
    expect(repos.isOffline()).toBe(false)
  })

  it('queues an offline delete and replays it to the server on sync', async () => {
    const { api, repos } = makeRepos()
    api.state.teeth.push(ENTRY)
    await repos.loadAll()
    api.setOffline(true)
    repos.tooth.delete(ENTRY.id)
    await flush()
    expect(api.state.teeth).toEqual([ENTRY])
    expect(repos.tooth.getAll()).toEqual([])
    expect(repos.isOffline()).toBe(true)

    api.setOffline(false)
    const ok = await repos.syncNow()
    expect(ok).toBe(true)
    expect(api.state.teeth).toEqual([])
    expect(repos.isOffline()).toBe(false)
  })

  it('deletes an entry from the server', async () => {
    const { api, repos } = makeRepos()
    api.state.teeth.push(ENTRY)
    await repos.loadAll()
    repos.tooth.delete(ENTRY.id)
    await flush()
    expect(api.state.teeth).toEqual([])
    expect(repos.tooth.getAll()).toEqual([])
  })

  it('round-trips via export/import', async () => {
    const { api, repos } = makeRepos()
    api.state.teeth.push(ENTRY)
    const data = await repos.exportData()
    expect(data.teeth).toEqual([ENTRY])

    api.state.teeth.push({ id: 't2', time: '2026-08-14T10:00:00Z', tooth: 'Upper central incisor' })
    await repos.importData({
      version: 1,
      exportedAt: 'x',
      baby: null,
      sleeps: [],
      feedings: [],
      diapers: [],
      weights: [],
      teeth: [ENTRY],
      settings: { foodSuggestions: [] },
    })
    expect(api.state.teeth).toEqual([ENTRY])
  })

  it('clears teeth when importing an older backup without the key', async () => {
    const { api, repos } = makeRepos()
    api.state.teeth.push(ENTRY)
    await repos.importData({
      version: 1,
      exportedAt: 'x',
      baby: null,
      sleeps: [],
      feedings: [],
      diapers: [],
      weights: [],
      settings: { foodSuggestions: [] },
    })
    expect(api.state.teeth).toEqual([])
  })

  it('loadAll with teeth missing (404) stays online and treats it as []', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['teeth'])
    api.state.sleeps.push({ id: 's1', startTime: '2026-08-14T10:00:00Z', endTime: '2026-08-14T11:00:00Z' })

    await repos.loadAll()

    expect(repos.isOffline()).toBe(false)
    expect(repos.sleep.getAll()).toHaveLength(1)
    expect(repos.tooth.getAll()).toEqual([])
  })

  it('push to a missing teeth collection (404) keeps the local op, stays online, and does not queue it', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['teeth'])
    repos.tooth.add(ENTRY)
    await flush()

    expect(repos.tooth.getAll()).toEqual([ENTRY])
    expect(repos.isOffline()).toBe(false)
    expect(api.state.teeth).toEqual([])
    expect(JSON.parse(window.localStorage.getItem('bt.pending') ?? 'null')).toEqual([])
  })

  it('replayPending skips a queued add for a missing teeth collection, replays the rest, and stays online', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['teeth'])
    api.setOffline(true)
    repos.tooth.add(ENTRY)
    await flush()
    repos.weight.add({ id: 'w1', time: '2026-08-14T08:00:00Z', weight: 7.5, unit: 'kg' })
    await flush()
    expect(repos.isOffline()).toBe(true)
    expect(api.state.teeth).toEqual([])
    expect(api.state.weights).toEqual([])

    api.setOffline(false)
    const ok = await repos.syncNow()

    expect(ok).toBe(true)
    expect(repos.isOffline()).toBe(false)
    expect(api.state.teeth).toEqual([])
    expect(api.state.weights).toHaveLength(1)
    expect(JSON.parse(window.localStorage.getItem('bt.pending') ?? 'null')).toEqual([])
  })

  it('unsetting the missing-collection knob restores the teeth collection on refresh', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['teeth'])
    await repos.loadAll()
    expect(repos.tooth.getAll()).toEqual([])

    api.setMissingCollections([])
    api.state.teeth.push(ENTRY)
    const ok = await repos.refreshFromServer()

    expect(ok).toBe(true)
    expect(repos.isOffline()).toBe(false)
    expect(repos.tooth.getAll()).toEqual([ENTRY])
  })
})
