import type { AppSettings } from '../domain/model/AppSettings'
import type { Baby } from '../domain/model/Baby'
import type { DiaperChange } from '../domain/model/DiaperChange'
import type { FeedingSession } from '../domain/model/FeedingSession'
import type { SleepSession } from '../domain/model/SleepSession'
import type { WeightEntry } from '../domain/model/WeightEntry'
import type { Fetcher, HttpResponse } from '../data/http'

export const DEFAULT_FOOD_SUGGESTIONS = [
  'porridge (with pears)',
  'porridge (with apple)',
  'salmon',
  'beef',
]

export interface MockApi {
  state: {
    baby: Baby | null
    sleeps: SleepSession[]
    feedings: FeedingSession[]
    diapers: DiaperChange[]
    weights: WeightEntry[]
    settings: AppSettings
  }
  setOffline: (value: boolean) => void
  fetchStub: Fetcher
}

const COLLECTIONS = ['sleeps', 'feedings', 'diapers', 'weights'] as const

function respond(body: unknown, status = 200): HttpResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

export function createMockApi(): MockApi {
  const state: MockApi['state'] = {
    baby: null,
    sleeps: [],
    feedings: [],
    diapers: [],
    weights: [],
    settings: { foodSuggestions: [...DEFAULT_FOOD_SUGGESTIONS] },
  }
  let offline = false

  const fetchStub: Fetcher = async (input, init) => {
    if (offline) {
      throw new TypeError('Failed to fetch')
    }
    const path = String(input)
    const method = init?.method ?? 'GET'
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined

    if (path === '/api/health') {
      return respond({ ok: true })
    }
    if (path === '/api/baby') {
      if (method === 'GET') {
        return respond({ baby: state.baby })
      }
      if (method === 'PUT') {
        state.baby = body as unknown as Baby
        return respond({ baby: state.baby })
      }
    }
    if (path === '/api/settings') {
      if (method === 'GET') {
        return respond({ settings: state.settings })
      }
      if (method === 'PUT') {
        state.settings = body as unknown as AppSettings
        return respond({ settings: state.settings })
      }
    }
    if (path === '/api/import') {
      if (method === 'POST') {
        const b = body as unknown as {
          baby?: Baby | null
          sleeps?: SleepSession[]
          feedings?: FeedingSession[]
          diapers?: DiaperChange[]
          weights?: WeightEntry[]
          settings?: AppSettings
        }
        state.baby = b.baby ?? null
        state.sleeps = b.sleeps ?? []
        state.feedings = b.feedings ?? []
        state.diapers = b.diapers ?? []
        state.weights = b.weights ?? []
        state.settings = b.settings ?? { foodSuggestions: [] }
        return respond({ ok: true })
      }
    }
    for (const key of COLLECTIONS) {
      const prefix = `/api/${key}`
      if (path === prefix) {
        if (method === 'GET') {
          return respond({ [key]: state[key] })
        }
        if (method === 'POST') {
          const item = body as unknown as { id: string }
          const idx = state[key].findIndex((x) => x.id === item.id)
          if (idx >= 0) {
            state[key][idx] = item as never
          } else {
            state[key].push(item as never)
          }
          return respond({ [key]: state[key] })
        }
      }
      if (path.startsWith(`${prefix}/`)) {
        const id = path.slice(prefix.length + 1)
        if (method === 'DELETE') {
          state[key] = state[key].filter((x) => x.id !== id) as never
          return respond({ ok: true })
        }
      }
    }
    return respond({ error: 'not found' }, 404)
  }

  return { state, setOffline: (v) => (offline = v), fetchStub }
}
