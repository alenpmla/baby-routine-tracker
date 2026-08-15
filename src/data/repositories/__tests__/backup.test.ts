import { describe, it, expect } from 'vitest'
import { createMockApi } from '../../../test/mockApi'
import { FetchHttp } from '../../http'
import { LocalStorage } from '../../storage'
import { RemoteRepositories, isValidBackup } from '../RemoteRepositories'

function makeRepos() {
  window.localStorage.clear()
  const api = createMockApi()
  const repos = new RemoteRepositories(new FetchHttp('', api.fetchStub), new LocalStorage())
  return { api, repos }
}

const VALID = {
  version: 1,
  exportedAt: '2026-08-09T00:00:00Z',
  baby: null,
  sleeps: [],
  feedings: [],
  diapers: [],
  weights: [],
  settings: { foodSuggestions: [] },
}

describe('backup validation', () => {
  it('accepts a well-formed backup', () => {
    expect(isValidBackup(VALID)).toBe(true)
  })

  it('accepts an older backup without a weights field', () => {
    const { weights: _omit, ...legacy } = VALID
    expect(isValidBackup(legacy)).toBe(true)
  })

  it('rejects malformed backups', () => {
    expect(isValidBackup(null)).toBe(false)
    expect(isValidBackup('nope')).toBe(false)
    expect(isValidBackup({ ...VALID, version: 2 })).toBe(false)
    expect(isValidBackup({ ...VALID, sleeps: 'not-an-array' })).toBe(false)
    expect(isValidBackup({ ...VALID, settings: null })).toBe(false)
    expect(isValidBackup({ ...VALID, weights: 'nope' })).toBe(false)
  })
})

describe('backup export/import', () => {
  it('exports the current server data', async () => {
    const { api, repos } = makeRepos()
    api.state.baby = { id: 'b1', name: 'Ciara', dob: '2025-10-30', notes: '' }
    api.state.diapers.push({ id: 'd1', time: new Date().toISOString(), type: 'wet' })
    api.state.weights.push({ id: 'w1', time: new Date().toISOString(), weight: 7.5, unit: 'kg' })
    const data = await repos.exportData()
    expect(data.version).toBe(1)
    expect(data.baby?.name).toBe('Ciara')
    expect(data.diapers).toHaveLength(1)
    expect(data.weights).toHaveLength(1)
  })

  it('exports every collection, including the newer health/milestone collections', async () => {
    const { api, repos } = makeRepos()
    api.state.baby = { id: 'b1', name: 'Ciara', dob: '2025-10-30', notes: '' }
    api.state.sleeps.push({ id: 's1', startTime: '2026-08-14T10:00:00Z', endTime: '2026-08-14T11:00:00Z' })
    api.state.feedings.push({ id: 'f1', type: 'bottle', time: '2026-08-14T10:30:00Z', amount: 120, unit: 'ml' })
    api.state.diapers.push({ id: 'd1', type: 'wet', time: '2026-08-14T09:00:00Z' })
    api.state.weights.push({ id: 'w1', time: '2026-08-14T08:00:00Z', weight: 7.5, unit: 'kg' })
    api.state.headCircumferences.push({ id: 'h1', time: '2026-08-14T08:30:00Z', value: 42, unit: 'cm' })
    api.state.medications.push({ id: 'm1', time: '2026-08-14T09:30:00Z', name: 'Paracetamol', amount: 120, unit: 'mg' })
    api.state.temperatures.push({ id: 't1', time: '2026-08-14T09:40:00Z', temp: 37.4, unit: 'c', location: 'rectal' })
    api.state.milestones.push({ id: 'ms1', time: '2026-08-14T12:00:00Z', milestone: 'Crawl' })
    api.state.teeth.push({ id: 'th1', time: '2026-08-14T13:00:00Z', tooth: 'Lower central incisor' })
    api.state.teethingDays.push({ id: 'td1', day: '2026-08-14', symptoms: ['Drooling'] })

    const data = await repos.exportData()
    expect(data.sleeps).toHaveLength(1)
    expect(data.feedings).toHaveLength(1)
    expect(data.diapers).toHaveLength(1)
    expect(data.weights).toHaveLength(1)
    expect(data.headCircumferences).toHaveLength(1)
    expect(data.medications).toHaveLength(1)
    expect(data.temperatures).toHaveLength(1)
    expect(data.milestones).toHaveLength(1)
    expect(data.teeth).toHaveLength(1)
    expect(data.teethingDays).toHaveLength(1)
  })

  it('imports a full backup with every collection, replacing server state', async () => {
    const { api, repos } = makeRepos()
    await repos.importData({
      version: 1,
      exportedAt: 'x',
      baby: { id: 'b1', name: 'Ciara', dob: '2025-10-30', notes: '' },
      sleeps: [{ id: 's1', startTime: '2026-08-14T10:00:00Z', endTime: '2026-08-14T11:00:00Z' }],
      feedings: [{ id: 'f1', type: 'bottle', time: '2026-08-14T10:30:00Z', amount: 120, unit: 'ml' }],
      diapers: [{ id: 'd1', type: 'wet', time: '2026-08-14T09:00:00Z' }],
      weights: [{ id: 'w1', time: '2026-08-14T08:00:00Z', weight: 7.5, unit: 'kg' }],
      headCircumferences: [{ id: 'h1', time: '2026-08-14T08:30:00Z', value: 42, unit: 'cm' }],
      medications: [{ id: 'm1', time: '2026-08-14T09:30:00Z', name: 'Paracetamol', amount: 120, unit: 'mg' }],
      temperatures: [{ id: 't1', time: '2026-08-14T09:40:00Z', temp: 37.4, unit: 'c', location: 'rectal' }],
      milestones: [{ id: 'ms1', time: '2026-08-14T12:00:00Z', milestone: 'Crawl' }],
      teeth: [{ id: 'th1', time: '2026-08-14T13:00:00Z', tooth: 'Lower central incisor' }],
      teethingDays: [{ id: 'td1', day: '2026-08-14', symptoms: ['Drooling'] }],
      settings: { foodSuggestions: ['carrot'] },
    })

    expect(api.state.baby?.name).toBe('Ciara')
    expect(api.state.sleeps).toHaveLength(1)
    expect(api.state.feedings).toHaveLength(1)
    expect(api.state.diapers).toHaveLength(1)
    expect(api.state.weights).toHaveLength(1)
    expect(api.state.headCircumferences).toHaveLength(1)
    expect(api.state.medications).toHaveLength(1)
    expect(api.state.temperatures).toHaveLength(1)
    expect(api.state.milestones).toHaveLength(1)
    expect(api.state.teeth).toHaveLength(1)
    expect(api.state.teethingDays).toHaveLength(1)
  })

  it('imports a backup, replacing the server state', async () => {
    const { api, repos } = makeRepos()
    api.state.baby = { id: 'old', name: 'Old', dob: '2020-01-01', notes: '' }
    api.state.diapers.push({ id: 'old-d', time: 't', type: 'wet' })

    await repos.importData({
      version: 1,
      exportedAt: 'x',
      baby: { id: 'new', name: 'New', dob: '2021-01-01', notes: '' },
      sleeps: [],
      feedings: [],
      diapers: [{ id: 'n1', time: 't2', type: 'dirty' }],
      weights: [{ id: 'w1', time: 't3', weight: 8, unit: 'kg' }],
      settings: { foodSuggestions: ['carrot'] },
    })

    expect(api.state.baby?.name).toBe('New')
    expect(api.state.diapers).toHaveLength(1)
    expect(api.state.diapers[0].id).toBe('n1')
    expect(api.state.weights).toHaveLength(1)
    expect(api.state.weights[0].weight).toBe(8)
    expect(api.state.settings.foodSuggestions).toEqual(['carrot'])
  })

  it('imports an older backup without weights', async () => {
    const { api, repos } = makeRepos()
    api.state.weights.push({ id: 'old-w', time: 't', weight: 5, unit: 'kg' })
    await repos.importData({
      version: 1,
      exportedAt: 'x',
      baby: null,
      sleeps: [],
      feedings: [],
      diapers: [],
      settings: { foodSuggestions: [] },
    })
    expect(api.state.weights).toHaveLength(0)
  })
})
