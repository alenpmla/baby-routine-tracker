import { describe, it, expect, beforeEach } from 'vitest'
import { createMockApi } from '../../../test/mockApi'
import { FetchHttp } from '../../http'
import { LocalStorage } from '../../storage'
import { MedicationRepositoryImpl } from '../MedicationRepositoryImpl'
import { TemperatureRepositoryImpl } from '../TemperatureRepositoryImpl'
import { RemoteRepositories, isValidBackup } from '../RemoteRepositories'

const flush = () => new Promise<void>((r) => setTimeout(r, 0))

const MED = { id: 'm1', time: '2026-08-14T12:00:00Z', name: 'Paracetamol', amount: 120, unit: 'mg' as const }
const TEMP = { id: 'tp1', time: '2026-08-14T12:00:00Z', temp: 37.4, unit: 'c' as const, location: 'rectal' as const }

function makeRepos() {
  window.localStorage.clear()
  const api = createMockApi()
  const repos = new RemoteRepositories(new FetchHttp('', api.fetchStub), new LocalStorage())
  return { api, repos }
}

describe('MedicationRepositoryImpl', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips medications through localStorage (bt.-namespaced)', () => {
    const repo = new MedicationRepositoryImpl(new LocalStorage())
    repo.add(MED)
    expect(repo.getAll()).toEqual([MED])
    expect(window.localStorage.getItem('bt.medications')).toBe(JSON.stringify([MED]))

    const fresh = new MedicationRepositoryImpl(new LocalStorage())
    expect(fresh.getAll()).toEqual([MED])

    fresh.update({ ...MED, amount: 200 })
    expect(fresh.getAll()[0].amount).toBe(200)

    fresh.delete(MED.id)
    expect(fresh.getAll()).toEqual([])
  })
})

describe('TemperatureRepositoryImpl', () => {
  beforeEach(() => window.localStorage.clear())

  it('round-trips temperatures through localStorage (bt.-namespaced)', () => {
    const repo = new TemperatureRepositoryImpl(new LocalStorage())
    repo.add(TEMP)
    expect(repo.getAll()).toEqual([TEMP])
    expect(window.localStorage.getItem('bt.temperatures')).toBe(JSON.stringify([TEMP]))

    const fresh = new TemperatureRepositoryImpl(new LocalStorage())
    expect(fresh.getAll()).toEqual([TEMP])

    fresh.update({ ...TEMP, temp: 38.0 })
    expect(fresh.getAll()[0].temp).toBe(38.0)

    fresh.delete(TEMP.id)
    expect(fresh.getAll()).toEqual([])
  })
})

describe('isValidBackup with medications/temperatures', () => {
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

  it('accepts an older backup without the new fields', () => {
    expect(isValidBackup(BASE)).toBe(true)
  })

  it('accepts backups with medications and temperatures arrays', () => {
    expect(isValidBackup({ ...BASE, medications: [MED] })).toBe(true)
    expect(isValidBackup({ ...BASE, temperatures: [TEMP] })).toBe(true)
  })

  it('rejects a backup with malformed new fields', () => {
    expect(isValidBackup({ ...BASE, medications: 'nope' })).toBe(false)
    expect(isValidBackup({ ...BASE, temperatures: 'nope' })).toBe(false)
  })
})

describe('RemoteRepositories medications/temperatures collections', () => {
  it('writes an entry to the server through the pending-op queue', async () => {
    const { api, repos } = makeRepos()
    repos.medication.add(MED)
    repos.temperature.add(TEMP)
    await flush()
    expect(api.state.medications).toEqual([MED])
    expect(api.state.temperatures).toEqual([TEMP])
    expect(repos.medication.getAll()).toEqual([MED])
    expect(repos.temperature.getAll()).toEqual([TEMP])
    expect(repos.isOffline()).toBe(false)
  })

  it('serves entries back via loadAll and caches them locally', async () => {
    const { api, repos } = makeRepos()
    api.state.medications.push(MED)
    api.state.temperatures.push(TEMP)
    await repos.loadAll()
    expect(repos.medication.getAll()).toEqual([MED])
    expect(repos.temperature.getAll()).toEqual([TEMP])
    expect(window.localStorage.getItem('bt.medications')).toBe(JSON.stringify([MED]))
    expect(window.localStorage.getItem('bt.temperatures')).toBe(JSON.stringify([TEMP]))
    expect(repos.isOffline()).toBe(false)
  })

  it('queues offline adds and replays them on sync', async () => {
    const { api, repos } = makeRepos()
    api.setOffline(true)
    repos.medication.add(MED)
    repos.temperature.add(TEMP)
    await flush()
    expect(api.state.medications).toEqual([])
    expect(repos.isOffline()).toBe(true)

    api.setOffline(false)
    const ok = await repos.syncNow()
    expect(ok).toBe(true)
    expect(api.state.medications).toEqual([MED])
    expect(api.state.temperatures).toEqual([TEMP])
    expect(repos.isOffline()).toBe(false)
  })

  it('queues offline deletes and replays them on sync', async () => {
    const { api, repos } = makeRepos()
    api.state.medications.push(MED)
    api.state.temperatures.push(TEMP)
    await repos.loadAll()
    api.setOffline(true)
    repos.medication.delete(MED.id)
    repos.temperature.delete(TEMP.id)
    await flush()
    expect(repos.medication.getAll()).toEqual([])
    expect(repos.temperature.getAll()).toEqual([])
    expect(repos.isOffline()).toBe(true)

    api.setOffline(false)
    const ok = await repos.syncNow()
    expect(ok).toBe(true)
    expect(api.state.medications).toEqual([])
    expect(api.state.temperatures).toEqual([])
  })

  it('round-trips via export/import and clears when importing an older backup', async () => {
    const { api, repos } = makeRepos()
    api.state.medications.push(MED)
    api.state.temperatures.push(TEMP)
    const data = await repos.exportData()
    expect(data.medications).toEqual([MED])
    expect(data.temperatures).toEqual([TEMP])

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
    expect(api.state.medications).toEqual([])
    expect(api.state.temperatures).toEqual([])
  })

  it('loadAll with the collections missing (404) stays online and treats them as []', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['medications', 'temperatures'])
    await repos.loadAll()
    expect(repos.isOffline()).toBe(false)
    expect(repos.medication.getAll()).toEqual([])
    expect(repos.temperature.getAll()).toEqual([])
  })

  it('unsetting the missing-collection knob restores the collections on refresh', async () => {
    const { api, repos } = makeRepos()
    api.setMissingCollections(['medications', 'temperatures'])
    await repos.loadAll()
    expect(repos.medication.getAll()).toEqual([])

    api.setMissingCollections([])
    api.state.medications.push(MED)
    api.state.temperatures.push(TEMP)
    const ok = await repos.refreshFromServer()

    expect(ok).toBe(true)
    expect(repos.isOffline()).toBe(false)
    expect(repos.medication.getAll()).toEqual([MED])
    expect(repos.temperature.getAll()).toEqual([TEMP])
  })
})
