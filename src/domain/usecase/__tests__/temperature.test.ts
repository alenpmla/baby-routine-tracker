import { describe, it, expect } from 'vitest'
import {
  deleteTemperature,
  latestTemperature,
  listTemperaturesForDay,
  recordTemperature,
  updateTemperature,
  hasFeverInWindow,
  tempInC,
  FEVER_THRESHOLD_C,
  describeTempStatus,
  tempStatusLabel,
  MAX_C,
  MIN_C,
  MIN_F,
  MAX_F,
} from '../temperature'
import { MemoryTemperatureRepo } from '../../../test/memoryRepos'
import type { TemperatureEntry } from '../../model/TemperatureEntry'

const HOUR = 3600 * 1000

function temp(id: string, hoursAgo: number, value: number, unit: 'c' | 'f'): TemperatureEntry {
  return { id, time: new Date(Date.now() - hoursAgo * HOUR).toISOString(), temp: value, unit }
}

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

describe('tempInC / hasFeverInWindow', () => {
  it('normalizes Fahrenheit to Celsius', () => {
    expect(tempInC(100.4, 'f')).toBeCloseTo(38, 5)
    expect(tempInC(99.5, 'f')).toBeCloseTo(37.5, 5)
    expect(tempInC(37, 'c')).toBe(37)
  })

  it('flags a fever when any reading in the window is at/above 37.5 °C', () => {
    const now = Date.now()
    expect(hasFeverInWindow([temp('a', 2, 38.1, 'c')], 7, now)).toBe(true)
    expect(hasFeverInWindow([temp('b', 2, 99.5, 'f')], 7, now)).toBe(true) // 37.5 °C
    expect(hasFeverInWindow([temp('c', 2, 98.6, 'f')], 7, now)).toBe(false) // 37 °C
    expect(hasFeverInWindow([temp('d', 2, 37.4, 'c')], 7, now)).toBe(false)
  })

  it('ignores readings older than the window', () => {
    const now = Date.now()
    expect(hasFeverInWindow([temp('a', 8 * 24, 39, 'c')], 7, now)).toBe(false)
    expect(hasFeverInWindow([temp('a', 8 * 24, 39, 'c'), temp('b', 2, 37.6, 'c')], 7, now)).toBe(true)
  })

  it('exposes the threshold constant', () => {
    expect(FEVER_THRESHOLD_C).toBe(37.5)
  })
})

describe('describeTempStatus / tempStatusLabel', () => {
  it('classifies readings against the typical range and fever threshold', () => {
    expect(describeTempStatus(37.5)).toBe('fever')
    expect(describeTempStatus(38.2)).toBe('fever')
    expect(describeTempStatus(36.5)).toBe('in-range')
    expect(describeTempStatus(37.0)).toBe('in-range')
    expect(describeTempStatus(35.9)).toBe('low')
    expect(describeTempStatus(36.0)).toBe('in-range')
  })

  it('labels statuses in human terms', () => {
    expect(tempStatusLabel('fever')).toBe('Fever')
    expect(tempStatusLabel('in-range')).toBe('In range')
    expect(tempStatusLabel('low')).toBe('Low temp')
  })
})
