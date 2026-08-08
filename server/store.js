import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const KEYS = ['sleeps', 'feedings', 'diapers', 'weights']

export const DEFAULT_FOOD_SUGGESTIONS = [
  'porridge (with pears)',
  'porridge (with apple)',
  'salmon',
  'beef',
]

export function createStore(filePath) {
  const defaults = () => ({
    baby: null,
    sleeps: [],
    feedings: [],
    diapers: [],
    weights: [],
    settings: { foodSuggestions: [...DEFAULT_FOOD_SUGGESTIONS] },
  })

  function read() {
    try {
      const raw = readFileSync(filePath, 'utf8')
      const data = JSON.parse(raw)
      const base = defaults()
      for (const key of KEYS) {
        base[key] = Array.isArray(data[key]) ? data[key] : []
      }
      base.feedings = base.feedings.map((f) => {
        if (f && typeof f.food === 'string' && !Array.isArray(f.foods)) {
          const { food, ...rest } = f
          return { ...rest, foods: [food] }
        }
        return f
      })
      base.baby = data.baby ?? null
      base.settings = {
        foodSuggestions: Array.isArray(data.settings?.foodSuggestions)
          ? data.settings.foodSuggestions
          : [...DEFAULT_FOOD_SUGGESTIONS],
      }
      return base
    } catch {
      return defaults()
    }
  }

  function write(data) {
    const dir = path.dirname(filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    const tmp = `${filePath}.tmp`
    writeFileSync(tmp, JSON.stringify(data, null, 2))
    renameSync(tmp, filePath)
  }

  function upsert(list, item) {
    const idx = list.findIndex((x) => x.id === item.id)
    if (idx >= 0) {
      list[idx] = item
    } else {
      list.push(item)
    }
    return list
  }

  return {
    get: () => read(),
    setBaby(baby) {
      const data = read()
      data.baby = baby
      write(data)
      return baby
    },
    setSettings(settings) {
      const data = read()
      data.settings = settings
      write(data)
      return settings
    },
    add(key, item) {
      const data = read()
      upsert(data[key], item)
      write(data)
      return item
    },
    remove(key, id) {
      const data = read()
      data[key] = data[key].filter((x) => x.id !== id)
      write(data)
      return true
    },
  }
}
