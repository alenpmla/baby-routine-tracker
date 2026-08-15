import { describe, it, expect } from 'vitest'
import type { TimelineEvent } from '../../../domain/usecase/timeline'
import { timelineTab, timelineWording } from '../timeline'

const event = (partial: TimelineEvent): TimelineEvent => partial

describe('timelineTab', () => {
  it('maps each kind to its tab', () => {
    expect(timelineTab({ kind: 'sleep', id: 's1', time: 't', data: {} as never })).toBe('sleep')
    expect(timelineTab({ kind: 'feeding', id: 'f1', time: 't', data: {} as never })).toBe('feeding')
    expect(timelineTab({ kind: 'diaper', id: 'd1', time: 't', data: {} as never })).toBe('diaper')
  })
})

describe('timelineWording', () => {
  it('completed sleep says "Woke up" (time lives on the rail) with duration meta', () => {
    const dayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
    const start = new Date(dayStart.getTime() - 5 * 3600 * 1000) // 19:00 previous local day (night)
    const end = new Date(dayStart.getTime() + 7 * 3600 * 1000) // 07:00 today local
    const e = event({
      kind: 'sleep',
      id: 's1',
      time: start.toISOString(),
      data: { id: 's1', startTime: start.toISOString(), endTime: end.toISOString() },
    })
    const w = timelineWording(e)
    expect(w.headline).toBe('Woke up')
    expect(w.meta.length).toBeGreaterThan(0)
  })

  it('running night sleep says "Started night sleep"', () => {
    const dayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
    const start = new Date(dayStart.getTime() - 2 * 3600 * 1000) // 22:00 previous local day
    const e = event({
      kind: 'sleep',
      id: 's1',
      time: start.toISOString(),
      data: { id: 's1', startTime: start.toISOString(), endTime: null },
    })
    const w = timelineWording(e)
    expect(w.headline).toBe('Started night sleep')
    expect(w.meta).toBe('asleep now')
    expect(w.time).toBe(start.toISOString())
  })

  it('running nap says "Started nap"', () => {
    const noon = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 0)
    const e = event({
      kind: 'sleep',
      id: 's1',
      time: noon.toISOString(),
      data: { id: 's1', startTime: noon.toISOString(), endTime: null },
    })
    const w = timelineWording(e)
    expect(w.headline).toBe('Started nap')
    expect(w.meta).toBe('asleep now')
  })

  it('night sleep (evening start) anchors the wake-up at the end time', () => {
    const dayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
    const start = new Date(dayStart.getTime() - 4 * 3600 * 1000) // 20:00 previous local day
    const end = new Date(dayStart.getTime() + 7 * 3600 * 1000) // 07:00 today local
    const e = event({
      kind: 'sleep',
      id: 's1',
      time: start.toISOString(),
      data: { id: 's1', startTime: start.toISOString(), endTime: end.toISOString() },
    })
    const w = timelineWording(e)
    expect(w.headline).toBe('Woke up')
    expect(w.meta).toMatch(/slept/)
    expect(w.time).toBe(end.toISOString())
  })

  it('nap wording is "Napped" anchored at the start', () => {
    const noon = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 12, 0)
    const end = new Date(noon.getTime() + 90 * 60 * 1000)
    const e = event({
      kind: 'sleep',
      id: 's1',
      time: noon.toISOString(),
      data: { id: 's1', startTime: noon.toISOString(), endTime: end.toISOString() },
    })
    const w = timelineWording(e)
    expect(w.headline).toBe('Napped')
    expect(w.time).toBe(noon.toISOString())
  })

  it('solids feeding lists the foods eaten', () => {
    const e = event({
      kind: 'feeding',
      id: 'f1',
      time: '2026-08-14T10:00:00Z',
      data: { id: 'f1', time: '2026-08-14T10:00:00Z', type: 'solids', foods: ['Oats porridge', 'Banana'] },
    })
    const w = timelineWording(e)
    expect(w.headline).toBe('Had Oats porridge, Banana')
  })

  it('bottle feeding includes the amount', () => {
    const e = event({
      kind: 'feeding',
      id: 'f1',
      time: '2026-08-14T10:00:00Z',
      data: { id: 'f1', time: '2026-08-14T10:00:00Z', type: 'bottle', amount: 180, unit: 'ml' },
    })
    const w = timelineWording(e)
    expect(w.headline).toBe('Had 180 ml bottle')
  })

  it('breast feeding reports the nursing duration', () => {
    const e = event({
      kind: 'feeding',
      id: 'f1',
      time: '2026-08-14T10:00:00Z',
      data: {
        id: 'f1',
        time: '2026-08-14T10:00:00Z',
        type: 'breast',
        startTime: '2026-08-14T10:00:00Z',
        endTime: '2026-08-14T10:15:00Z',
      },
    })
    const w = timelineWording(e)
    expect(w.headline).toMatch(/^Nursed /)
  })

  it('diaper uses natural wording by type', () => {
    const wet = timelineWording(event({
      kind: 'diaper',
      id: 'd1',
      time: '2026-08-14T09:00:00Z',
      data: { id: 'd1', time: '2026-08-14T09:00:00Z', type: 'wet' },
    }))
    const dirty = timelineWording(event({
      kind: 'diaper',
      id: 'd2',
      time: '2026-08-14T09:00:00Z',
      data: { id: 'd2', time: '2026-08-14T09:00:00Z', type: 'dirty' },
    }))
    const both = timelineWording(event({
      kind: 'diaper',
      id: 'd3',
      time: '2026-08-14T09:00:00Z',
      data: { id: 'd3', time: '2026-08-14T09:00:00Z', type: 'both' },
    }))
    expect(wet.headline).toBe('Wet diaper')
    expect(dirty.headline).toBe('Dirty diaper')
    expect(both.headline).toBe('Diaper (both)')
  })
})
