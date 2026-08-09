// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createStore, DEFAULT_FOOD_SUGGESTIONS } from './store.js'
import { createApp } from './app.js'
import http from 'node:http'

let dir
let store
let dataFile

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'bt-'))
  dataFile = path.join(dir, 'bt.json')
  store = createStore(dataFile)
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('json store', () => {
  it('starts empty with seeded food suggestions', () => {
    expect(store.get()).toEqual({
      baby: null,
      sleeps: [],
      feedings: [],
      diapers: [],
      weights: [],
      settings: { foodSuggestions: DEFAULT_FOOD_SUGGESTIONS },
    })
  })

  it('persists baby and reads it back', () => {
    const baby = { id: 'b1', name: 'Avery', dob: '2026-01-15', notes: '' }
    store.setBaby(baby)
    expect(store.get().baby).toEqual(baby)
  })

  it('persists settings with seeded defaults as fallback', () => {
    expect(store.get().settings.foodSuggestions).toEqual(DEFAULT_FOOD_SUGGESTIONS)
    store.setSettings({ foodSuggestions: ['carrot', 'sweet potato'] })
    const fresh = createStore(dataFile)
    expect(fresh.get().settings.foodSuggestions).toEqual(['carrot', 'sweet potato'])
  })

  it('merges items by id instead of duplicating', () => {
    store.add('sleeps', { id: 's1', startTime: 'a', endTime: null })
    store.add('sleeps', { id: 's1', startTime: 'b', endTime: null })
    const sleeps = store.get().sleeps
    expect(sleeps).toHaveLength(1)
    expect(sleeps[0].startTime).toBe('b')
  })

  it('removes by id', () => {
    store.add('feedings', { id: 'f1', time: 'a', type: 'bottle' })
    store.remove('feedings', 'f1')
    expect(store.get().feedings).toHaveLength(0)
  })

  it('stores weight entries', () => {
    store.add('weights', { id: 'w1', time: 't', weight: 7.5, unit: 'kg' })
    expect(store.get().weights).toHaveLength(1)
    expect(store.get().weights[0].weight).toBe(7.5)
  })

  it('migrates legacy single-food records to foods on read', () => {
    store.add('feedings', { id: 'f1', time: 'a', type: 'solids', food: 'Banana', amount: 2, unit: 'oz' })
    const fresh = createStore(dataFile)
    expect(fresh.get().feedings[0].foods).toEqual(['Banana'])
    expect(fresh.get().feedings[0].food).toBeUndefined()
  })

  it('survives a reload from disk (volume persistence)', () => {
    store.setBaby({ id: 'b1', name: 'Avery', dob: '2026-01-15', notes: '' })
    store.add('diapers', { id: 'd1', time: 't', type: 'wet' })
    const fresh = createStore(dataFile)
    expect(fresh.get().baby.name).toBe('Avery')
    expect(fresh.get().diapers).toHaveLength(1)
    expect(existsSync(dataFile)).toBe(true)
  })

  it('recovers when the file is absent or corrupt', () => {
    const store2 = createStore(path.join(dir, 'missing', 'bt.json'))
    expect(store2.get().sleeps).toEqual([])
  })

  it('replaces all data in a single write and normalizes feedings', () => {
    store.add('sleeps', { id: 'old', startTime: 't', endTime: null })
    const replaced = store.replace({
      baby: { id: 'b1', name: 'New', dob: '2026-01-01', notes: '' },
      sleeps: [{ id: 's1', startTime: 'a', endTime: null }],
      feedings: [{ id: 'f1', time: 'a', type: 'solids', food: 'Banana', amount: 2, unit: 'oz' }],
      diapers: [{ id: 'd1', time: 't', type: 'wet' }],
      weights: [{ id: 'w1', time: 't', weight: 8, unit: 'kg' }],
      settings: { foodSuggestions: ['carrot'] },
    })
    expect(replaced.sleeps).toEqual([{ id: 's1', startTime: 'a', endTime: null }])
    expect(replaced.feedings[0].foods).toEqual(['Banana'])
    expect(replaced.baby.name).toBe('New')

    const fresh = createStore(dataFile)
    expect(fresh.get().sleeps).toHaveLength(1)
    expect(fresh.get().weights).toHaveLength(1)
  })

  it('replace() drops invalid collection shapes and keeps settings defaults', () => {
    const replaced = store.replace({ baby: null, sleeps: 'nope', settings: null })
    expect(replaced.sleeps).toEqual([])
    expect(replaced.settings.foodSuggestions).toEqual(DEFAULT_FOOD_SUGGESTIONS)
  })
})

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app)
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

function request(server, method, pathName, body) {
  return new Promise((resolve, reject) => {
    const addr = server.address()
    const req = http.request(
      { host: '127.0.0.1', port: addr.port, path: pathName, method, headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          let json = null
          try {
            json = JSON.parse(data)
          } catch {
            /* ignore */
          }
          resolve({ status: res.statusCode, json })
        })
      },
    )
    req.on('error', reject)
    if (body !== undefined) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

describe('REST API', () => {
  let server
  beforeEach(async () => {
    server = await listen(createApp(store, null))
  })
  afterEach(() => {
    server.close()
  })

  it('reports health', async () => {
    const res = await request(server, 'GET', '/api/health')
    expect(res.status).toBe(200)
    expect(res.json.ok).toBe(true)
  })

  it('round-trips baby, adds and deletes a sleep', async () => {
    const put = await request(server, 'PUT', '/api/baby', { id: 'b1', name: 'Avery', dob: '2026-01-15', notes: '' })
    expect(put.status).toBe(200)
    expect(put.json.baby.name).toBe('Avery')

    const add = await request(server, 'POST', '/api/sleeps', { id: 's1', startTime: 't', endTime: null })
    expect(add.status).toBe(200)
    expect(add.json.sleeps).toHaveLength(1)

    const list = await request(server, 'GET', '/api/sleeps')
    expect(list.json.sleeps[0].id).toBe('s1')

    const del = await request(server, 'DELETE', '/api/sleeps/s1')
    expect(del.status).toBe(200)
    expect(store.get().sleeps).toHaveLength(0)
  })

  it('round-trips settings with seeded defaults', async () => {
    const get = await request(server, 'GET', '/api/settings')
    expect(get.status).toBe(200)
    expect(get.json.settings.foodSuggestions).toEqual(DEFAULT_FOOD_SUGGESTIONS)

    const put = await request(server, 'PUT', '/api/settings', { foodSuggestions: ['carrot'] })
    expect(put.status).toBe(200)
    expect(put.json.settings.foodSuggestions).toEqual(['carrot'])
  })

  it('rejects invalid settings', async () => {
    const res = await request(server, 'PUT', '/api/settings', { nope: true })
    expect(res.status).toBe(400)
  })

  it('rejects items without an id', async () => {
    const res = await request(server, 'POST', '/api/feedings', { time: 't', type: 'bottle' })
    expect(res.status).toBe(400)
  })

  it('bulk-imports a full backup atomically', async () => {
    const backup = {
      baby: { id: 'b1', name: 'Ciara', dob: '2025-10-30', notes: '' },
      sleeps: [{ id: 's1', startTime: 't', endTime: null }],
      feedings: [{ id: 'f1', time: 'a', type: 'solids', food: 'Banana', amount: 2, unit: 'oz' }],
      diapers: [{ id: 'd1', time: 't', type: 'wet' }],
      weights: [{ id: 'w1', time: 't', weight: 8, unit: 'kg' }],
      settings: { foodSuggestions: ['carrot'] },
    }
    const res = await request(server, 'POST', '/api/import', backup)
    expect(res.status).toBe(200)
    expect(res.json.ok).toBe(true)

    const state = store.get()
    expect(state.baby.name).toBe('Ciara')
    expect(state.sleeps).toHaveLength(1)
    expect(state.feedings[0].foods).toEqual(['Banana'])
    expect(state.diapers).toHaveLength(1)
    expect(state.weights[0].weight).toBe(8)
    expect(state.settings.foodSuggestions).toEqual(['carrot'])
  })

  it('rejects a bulk import with missing collections', async () => {
    const res = await request(server, 'POST', '/api/import', { baby: null })
    expect(res.status).toBe(400)
  })
})
