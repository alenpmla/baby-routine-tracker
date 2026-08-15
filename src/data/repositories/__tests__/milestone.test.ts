import { describe, it, expect, beforeEach } from 'vitest'
import { createMockApi } from '../../../test/mockApi'
import { FetchHttp } from '../../http'
import { LocalStorage } from '../../storage'
import { MilestoneRepositoryImpl } from '../MilestoneRepositoryImpl'
import { RemoteRepositories, isValidBackup } from '../RemoteRepositories'

const flush = () => new Promise<void>((r) => setTimeout(r, 0))

const ENTRY = { id: 'm1', time: '2026-08-14T12:00:00Z', milestone: 'Crawl' }

function makeRepos() {
  window.localStorage.clear()
  const api = createMockApi()
  const repos = new RemoteRepositories(new FetchHttp('', api.fetchStub), new LocalStorage())
  return { api, repos }
}

describe('MilestoneRepositoryImpl', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips milestones through localStorage (bt.-namespaced)', () => {
    const repo = new MilestoneRepositoryImpl(new LocalStorage())
    repo.add(ENTRY)
    expect(repo.getAll()).toEqual([ENTRY])
    expect(window.localStorage.getItem('bt.milestones')).toBe(JSON.stringify([ENTRY]))

    const fresh = new MilestoneRepositoryImpl(new LocalStorage())
    expect(fresh.getAll()).toEqual([ENTRY])

    fresh.update({ ...ENTRY, notes: 'first time' })
    expect(fresh.getAll()[0].notes).toBe('first time')

    fresh.delete(ENTRY.id)
    expect(fresh.getAll()).toEqual([])
  })
})

describe('isValidBackup with milestones', () => {
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

  it('accepts an older backup without the milestones field', () => {
    expect(isValidBackup(BASE)).toBe(true)
  })

  it('accepts a backup with a milestones array', () => {
    expect(isValidBackup({ ...BASE, milestones: [ENTRY] })).toBe(true)
  })

  it('rejects a backup with a malformed milestones field', () => {
    expect(isValidBackup({ ...BASE, milestones: 'nope' })).toBe(false)
  })
})

describe('RemoteRepositories milestones collection', () => {
  it('writes an entry to the server through the pending-op queue', async () => {
    const { api, repos } = makeRepos()
    repos.milestone.add(ENTRY)
    await flush()
    expect(api.state.milestones).toEqual([ENTRY])
    expect(repos.milestone.getAll()).toEqual([ENTRY])
    expect(repos.isOffline()).toBe(false)
  })

  it('serves the entry back via loadAll and caches it locally', async () => {
    const { api, repos } = makeRepos()
    api.state.milestones.push(ENTRY)
    await repos.loadAll()
    expect(repos.milestone.getAll()).toEqual([ENTRY])
    expect(window.localStorage.getItem('bt.milestones')).toBe(JSON.stringify([ENTRY]))
    expect(repos.isOffline()).toBe(false)
  })

  it('queues an offline add and replays it to the server on sync', async () => {
    const { api, repos } = makeRepos()
    api.setOffline(true)
    repos.milestone.add(ENTRY)
    await flush()
    expect(api.state.milestones).toEqual([])
    expect(repos.isOffline()).toBe(true)

    api.setOffline(false)
    const ok = await repos.syncNow()
    expect(ok).toBe(true)
    expect(api.state.milestones).toEqual([ENTRY])
    expect(repos.isOffline()).toBe(false)
  })

  it('queues an offline delete and replays it to the server on sync', async () => {
    const { api, repos } = makeRepos()
    api.state.milestones.push(ENTRY)
    await repos.loadAll()
    api.setOffline(true)
    repos.milestone.delete(ENTRY.id)
    await flush()
    expect(api.state.milestones).toEqual([ENTRY])
    expect(repos.milestone.getAll()).toEqual([])
    expect(repos.isOffline()).toBe(true)

    api.setOffline(false)
    const ok = await repos.syncNow()
    expect(ok).toBe(true)
    expect(api.state.milestones).toEqual([])
    expect(repos.isOffline()).toBe(false)
  })

  it('round-trips via export/import and clears when importing an older backup', async () => {
    const { api, repos } = makeRepos()
    api.state.milestones.push(ENTRY)
    const data = await repos.exportData()
    expect(data.milestones).toEqual([ENTRY])

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
    expect(api.state.milestones).toEqual([])
  })

  it('loadAll with the collection missing (404) stays online and treats it as []', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['milestones'])
    await repos.loadAll()
    expect(repos.isOffline()).toBe(false)
    expect(repos.milestone.getAll()).toEqual([])
  })

  it('unsetting the missing-collection knob restores the collection on refresh', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['milestones'])
    await repos.loadAll()
    expect(repos.milestone.getAll()).toEqual([])

    api.setMissingCollections([])
    api.state.milestones.push(ENTRY)
    const ok = await repos.refreshFromServer()

    expect(ok).toBe(true)
    expect(repos.isOffline()).toBe(false)
    expect(repos.milestone.getAll()).toEqual([ENTRY])
  })
})
