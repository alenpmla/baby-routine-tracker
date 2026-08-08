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
