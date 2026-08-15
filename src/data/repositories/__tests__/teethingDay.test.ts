import { describe, it, expect, beforeEach } from 'vitest'
import { createMockApi } from '../../../test/mockApi'
import type { TeethingDay } from '../../../domain/model/TeethingDay'
import { FetchHttp } from '../../http'
import { LocalStorage } from '../../storage'
import { TeethingDayRepositoryImpl } from '../TeethingDayRepositoryImpl'
import { RemoteRepositories, isValidBackup } from '../RemoteRepositories'

const flush = () => new Promise<void>((r) => setTimeout(r, 0))

const DAY: TeethingDay = { id: 'td1', day: '2026-08-14', symptoms: ['Drooling', 'Fussy'] }

function makeRepos() {
  window.localStorage.clear()
  const api = createMockApi()
  const repos = new RemoteRepositories(new FetchHttp('', api.fetchStub), new LocalStorage())
  return { api, repos }
}

describe('TeethingDayRepositoryImpl', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips teething days through localStorage (bt.-namespaced)', () => {
    const repo = new TeethingDayRepositoryImpl(new LocalStorage())
    repo.add(DAY)
    expect(repo.getAll()).toEqual([DAY])
    expect(window.localStorage.getItem('bt.teethingDays')).toBe(JSON.stringify([DAY]))

    const fresh = new TeethingDayRepositoryImpl(new LocalStorage())
    expect(fresh.getAll()).toEqual([DAY])

    fresh.update({ ...DAY, notes: 'bad night' })
    expect(fresh.getAll()[0].notes).toBe('bad night')

    fresh.delete(DAY.id)
    expect(fresh.getAll()).toEqual([])
  })

  it('update appends when the id is not already stored', () => {
    const repo = new TeethingDayRepositoryImpl(new LocalStorage())
    repo.update(DAY)
    expect(repo.getAll()).toEqual([DAY])
  })
})

describe('isValidBackup with teethingDays', () => {
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

  it('accepts an older backup without a teethingDays field', () => {
    expect(isValidBackup(BASE)).toBe(true)
  })

  it('accepts a backup with a teethingDays array', () => {
    expect(isValidBackup({ ...BASE, teethingDays: [DAY] })).toBe(true)
  })

  it('rejects a backup with a malformed teethingDays field', () => {
    expect(isValidBackup({ ...BASE, teethingDays: 'nope' })).toBe(false)
  })
})

describe('RemoteRepositories teethingDays collection', () => {
  it('writes a day to the server through the pending-op queue', async () => {
    const { api, repos } = makeRepos()
    repos.teethingDay.add(DAY)
    await flush()
    expect(api.state.teethingDays).toEqual([DAY])
    expect(repos.teethingDay.getAll()).toEqual([DAY])
    expect(repos.isOffline()).toBe(false)
  })

  it('serves the day back via loadAll and caches it locally', async () => {
    const { api, repos } = makeRepos()
    api.state.teethingDays.push(DAY)
    await repos.loadAll()
    expect(repos.teethingDay.getAll()).toEqual([DAY])
    expect(window.localStorage.getItem('bt.teethingDays')).toBe(JSON.stringify([DAY]))
    expect(repos.isOffline()).toBe(false)
  })

  it('queues an offline add and replays it to the server on sync', async () => {
    const { api, repos } = makeRepos()
    api.setOffline(true)
    repos.teethingDay.add(DAY)
    await flush()
    expect(api.state.teethingDays).toEqual([])
    expect(repos.isOffline()).toBe(true)

    api.setOffline(false)
    const ok = await repos.syncNow()
    expect(ok).toBe(true)
    expect(api.state.teethingDays).toEqual([DAY])
    expect(repos.isOffline()).toBe(false)
  })

  it('queues an offline delete and replays it to the server on sync', async () => {
    const { api, repos } = makeRepos()
    api.state.teethingDays.push(DAY)
    await repos.loadAll()
    api.setOffline(true)
    repos.teethingDay.delete(DAY.id)
    await flush()
    expect(api.state.teethingDays).toEqual([DAY])
    expect(repos.teethingDay.getAll()).toEqual([])
    expect(repos.isOffline()).toBe(true)

    api.setOffline(false)
    const ok = await repos.syncNow()
    expect(ok).toBe(true)
    expect(api.state.teethingDays).toEqual([])
    expect(repos.isOffline()).toBe(false)
  })

  it('deletes a day from the server', async () => {
    const { api, repos } = makeRepos()
    api.state.teethingDays.push(DAY)
    await repos.loadAll()
    repos.teethingDay.delete(DAY.id)
    await flush()
    expect(api.state.teethingDays).toEqual([])
    expect(repos.teethingDay.getAll()).toEqual([])
  })

  it('round-trips via export/import', async () => {
    const { api, repos } = makeRepos()
    api.state.teethingDays.push(DAY)
    const data = await repos.exportData()
    expect(data.teethingDays).toEqual([DAY])

    api.state.teethingDays.push({ id: 'td2', day: '2026-08-15', symptoms: ['Fever'] })
    await repos.importData({
      version: 1,
      exportedAt: 'x',
      baby: null,
      sleeps: [],
      feedings: [],
      diapers: [],
      weights: [],
      teethingDays: [DAY],
      settings: { foodSuggestions: [] },
    })
    expect(api.state.teethingDays).toEqual([DAY])
  })

  it('clears teething days when importing an older backup without the key', async () => {
    const { api, repos } = makeRepos()
    api.state.teethingDays.push(DAY)
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
    expect(api.state.teethingDays).toEqual([])
  })

  it('loadAll with teethingDays missing (404) stays online and treats it as []', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['teethingDays'])
    api.state.sleeps.push({ id: 's1', startTime: '2026-08-14T10:00:00Z', endTime: '2026-08-14T11:00:00Z' })

    await repos.loadAll()

    expect(repos.isOffline()).toBe(false)
    expect(repos.sleep.getAll()).toHaveLength(1)
    expect(repos.teethingDay.getAll()).toEqual([])
  })

  it('push to a missing teethingDays collection (404) keeps the local op, stays online, and does not queue it', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['teethingDays'])
    repos.teethingDay.add(DAY)
    await flush()

    expect(repos.teethingDay.getAll()).toEqual([DAY])
    expect(repos.isOffline()).toBe(false)
    expect(api.state.teethingDays).toEqual([])
    expect(JSON.parse(window.localStorage.getItem('bt.pending') ?? 'null')).toEqual([])
  })

  it('replayPending skips a queued add for a missing teethingDays collection, replays the rest, and stays online', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['teethingDays'])
    api.setOffline(true)
    repos.teethingDay.add(DAY)
    await flush()
    repos.weight.add({ id: 'w1', time: '2026-08-14T08:00:00Z', weight: 7.5, unit: 'kg' })
    await flush()
    expect(repos.isOffline()).toBe(true)
    expect(api.state.teethingDays).toEqual([])
    expect(api.state.weights).toEqual([])

    api.setOffline(false)
    const ok = await repos.syncNow()

    expect(ok).toBe(true)
    expect(repos.isOffline()).toBe(false)
    expect(api.state.teethingDays).toEqual([])
    expect(api.state.weights).toHaveLength(1)
    expect(JSON.parse(window.localStorage.getItem('bt.pending') ?? 'null')).toEqual([])
  })

  it('unsetting the missing-collection knob restores the teethingDays collection on refresh', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['teethingDays'])
    await repos.loadAll()
    expect(repos.teethingDay.getAll()).toEqual([])

    api.setMissingCollections([])
    api.state.teethingDays.push(DAY)
    const ok = await repos.refreshFromServer()

    expect(ok).toBe(true)
    expect(repos.isOffline()).toBe(false)
    expect(repos.teethingDay.getAll()).toEqual([DAY])
  })
})
