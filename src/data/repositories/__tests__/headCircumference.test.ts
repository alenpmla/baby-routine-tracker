import { describe, it, expect, beforeEach } from 'vitest'
import { createMockApi } from '../../../test/mockApi'
import { FetchHttp } from '../../http'
import { LocalStorage } from '../../storage'
import { HeadCircumferenceRepositoryImpl } from '../HeadCircumferenceRepositoryImpl'
import { RemoteRepositories, isValidBackup } from '../RemoteRepositories'

const flush = () => new Promise<void>((r) => setTimeout(r, 0))

const ENTRY = { id: 'h1', time: '2026-08-14T12:00:00Z', value: 42, unit: 'cm' as const }

function makeRepos() {
  window.localStorage.clear()
  const api = createMockApi()
  const repos = new RemoteRepositories(new FetchHttp('', api.fetchStub), new LocalStorage())
  return { api, repos }
}

describe('HeadCircumferenceRepositoryImpl', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips head circumferences through localStorage (bt.-namespaced)', () => {
    const repo = new HeadCircumferenceRepositoryImpl(new LocalStorage())
    repo.add(ENTRY)
    expect(repo.getAll()).toEqual([ENTRY])
    expect(window.localStorage.getItem('bt.headCircumferences')).toBe(JSON.stringify([ENTRY]))

    const fresh = new HeadCircumferenceRepositoryImpl(new LocalStorage())
    expect(fresh.getAll()).toEqual([ENTRY])

    fresh.update({ ...ENTRY, value: 43 })
    expect(fresh.getAll()[0].value).toBe(43)

    fresh.delete(ENTRY.id)
    expect(fresh.getAll()).toEqual([])
  })

  it('update appends when the id is not already stored', () => {
    const repo = new HeadCircumferenceRepositoryImpl(new LocalStorage())
    repo.update(ENTRY)
    expect(repo.getAll()).toEqual([ENTRY])
  })
})

describe('isValidBackup with headCircumferences', () => {
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

  it('accepts an older backup without a headCircumferences field', () => {
    expect(isValidBackup(BASE)).toBe(true)
  })

  it('accepts a backup with a headCircumferences array', () => {
    expect(isValidBackup({ ...BASE, headCircumferences: [ENTRY] })).toBe(true)
  })

  it('rejects a backup with a malformed headCircumferences field', () => {
    expect(isValidBackup({ ...BASE, headCircumferences: 'nope' })).toBe(false)
  })
})

describe('RemoteRepositories headCircumferences collection', () => {
  it('writes an entry to the server through the pending-op queue', async () => {
    const { api, repos } = makeRepos()
    repos.headCircumference.add(ENTRY)
    await flush()
    expect(api.state.headCircumferences).toEqual([ENTRY])
    expect(repos.headCircumference.getAll()).toEqual([ENTRY])
    expect(repos.isOffline()).toBe(false)
  })

  it('serves the entry back via loadAll and caches it locally', async () => {
    const { api, repos } = makeRepos()
    api.state.headCircumferences.push(ENTRY)
    await repos.loadAll()
    expect(repos.headCircumference.getAll()).toEqual([ENTRY])
    expect(window.localStorage.getItem('bt.headCircumferences')).toBe(JSON.stringify([ENTRY]))
    expect(repos.isOffline()).toBe(false)
  })

  it('queues an offline add and replays it to the server on sync', async () => {
    const { api, repos } = makeRepos()
    api.setOffline(true)
    repos.headCircumference.add(ENTRY)
    await flush()
    expect(api.state.headCircumferences).toEqual([])
    expect(repos.isOffline()).toBe(true)

    api.setOffline(false)
    const ok = await repos.syncNow()
    expect(ok).toBe(true)
    expect(api.state.headCircumferences).toEqual([ENTRY])
    expect(repos.isOffline()).toBe(false)
  })

  it('queues an offline delete and replays it to the server on sync', async () => {
    const { api, repos } = makeRepos()
    api.state.headCircumferences.push(ENTRY)
    await repos.loadAll()
    api.setOffline(true)
    repos.headCircumference.delete(ENTRY.id)
    await flush()
    expect(api.state.headCircumferences).toEqual([ENTRY])
    expect(repos.headCircumference.getAll()).toEqual([])
    expect(repos.isOffline()).toBe(true)

    api.setOffline(false)
    const ok = await repos.syncNow()
    expect(ok).toBe(true)
    expect(api.state.headCircumferences).toEqual([])
    expect(repos.isOffline()).toBe(false)
  })

  it('deletes an entry from the server', async () => {
    const { api, repos } = makeRepos()
    api.state.headCircumferences.push(ENTRY)
    await repos.loadAll()
    repos.headCircumference.delete(ENTRY.id)
    await flush()
    expect(api.state.headCircumferences).toEqual([])
    expect(repos.headCircumference.getAll()).toEqual([])
  })

  it('round-trips via export/import', async () => {
    const { api, repos } = makeRepos()
    api.state.headCircumferences.push(ENTRY)
    const data = await repos.exportData()
    expect(data.headCircumferences).toEqual([ENTRY])

    api.state.headCircumferences.push({ id: 'h2', time: '2026-08-14T10:00:00Z', value: 30, unit: 'in' })
    await repos.importData({
      version: 1,
      exportedAt: 'x',
      baby: null,
      sleeps: [],
      feedings: [],
      diapers: [],
      weights: [],
      headCircumferences: [ENTRY],
      settings: { foodSuggestions: [] },
    })
    expect(api.state.headCircumferences).toEqual([ENTRY])
  })

  it('clears head circumferences when importing an older backup without the key', async () => {
    const { api, repos } = makeRepos()
    api.state.headCircumferences.push(ENTRY)
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
    expect(api.state.headCircumferences).toEqual([])
  })
})
