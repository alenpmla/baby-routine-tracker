import { describe, it, expect } from 'vitest'
import {
  deleteTemperature,
  latestTemperature,
  listTemperaturesForDay,
  recordTemperature,
  updateTemperature,
  MAX_C,
  MIN_C,
  MIN_F,
  MAX_F,
} from '../temperature'
import { MemoryTemperatureRepo } from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

describe('temperature use cases', () => {
  it('records a temperature with unit and location', () => {
    const repo = new MemoryTemperatureRepo()
    const entry = recordTemperature(repo, 37.4, 'c', new Date(Date.now() - 60000), 'rectal')
    expect(entry.temp).toBe(37.4)
    expect(entry.unit).toBe('c')
    expect(entry.location).toBe('rectal')
    expect(repo.getAll()).toHaveLength(1)
  })

  it('rejects out-of-range temperatures in both units', () => {
    const repo = new MemoryTemperatureRepo()
    expect(() => recordTemperature(repo, MIN_C - 0.5, 'c')).toThrow(/between/i)
    expect(() => recordTemperature(repo, MAX_C + 0.5, 'c')).toThrow(/between/i)
    expect(() => recordTemperature(repo, MIN_F - 1, 'f')).toThrow(/between/i)
    expect(() => recordTemperature(repo, MAX_F + 1, 'f')).toThrow(/between/i)
    expect(() => recordTemperature(repo, 37.4, 'k' as never)).toThrow(/°C or °F/i)
  })

  it('rejects an invalid location and future timestamps', () => {
    const repo = new MemoryTemperatureRepo()
    expect(() => recordTemperature(repo, 37.4, 'c', new Date(), 'wrist' as never)).toThrow(/location/i)
    expect(() => recordTemperature(repo, 37.4, 'c', new Date(Date.now() + HOUR))).toThrow(/future/i)
  })

  it('lists temperatures for the day, newest first', () => {
    const repo = new MemoryTemperatureRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)
    const older = recordTemperature(repo, 36.8, 'c', new Date(Date.now() - 2 * HOUR))
    const newer = recordTemperature(repo, 37.1, 'c', new Date(Date.now() - HOUR))
    recordTemperature(repo, 38.0, 'c', new Date(Date.now() - 30 * HOUR))

    const listed = listTemperaturesForDay(repo, dayStart, dayEnd)
    expect(listed.map((t) => t.id)).toEqual([newer.id, older.id])
  })

  it('latestTemperature returns the most recent reading (or null)', () => {
    const repo = new MemoryTemperatureRepo()
    expect(latestTemperature(repo)).toBeNull()
    recordTemperature(repo, 36.8, 'c', new Date(Date.now() - 2 * HOUR))
    const newest = recordTemperature(repo, 37.9, 'c', new Date(Date.now() - HOUR))
    expect(latestTemperature(repo)?.id).toBe(newest.id)
  })

  it('updates and deletes a temperature', () => {
    const repo = new MemoryTemperatureRepo()
    const entry = recordTemperature(repo, 37.4, 'c', new Date())
    const updated = updateTemperature(repo, entry.id, { temp: 38.2, unit: 'c', location: 'ear' })
    expect(updated.temp).toBe(38.2)
    expect(updated.location).toBe('ear')
    expect(updated.id).toBe(entry.id)
    deleteTemperature(repo, entry.id)
    expect(repo.getAll()).toHaveLength(0)
  })

  it('update throws for an unknown id and re-validates', () => {
    const repo = new MemoryTemperatureRepo()
    expect(() => updateTemperature(repo, 'missing', {})).toThrow(/not found/i)
    const entry = recordTemperature(repo, 37.4, 'c', new Date())
    expect(() => updateTemperature(repo, entry.id, { temp: 50, unit: 'c' })).toThrow(/between/i)
  })
})
