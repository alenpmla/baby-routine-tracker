import { describe, it, expect } from 'vitest'
import { getDayTimeline } from '../timeline'
import { startSleep, stopSleep } from '../sleep'
import { recordFeeding } from '../feeding'
import { recordDiaperChange } from '../diaper'
import {
  MemorySleepRepo,
  MemoryFeedingRepo,
  MemoryDiaperRepo,
  MemoryWeightRepo,
} from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

describe('day timeline', () => {
  it('combines all event types sorted newest first', () => {
    const sleepRepo = new MemorySleepRepo()
    const feedingRepo = new MemoryFeedingRepo()
    const diaperRepo = new MemoryDiaperRepo()
    const weightRepo = new MemoryWeightRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)

    const sleep = startSleep(sleepRepo, new Date(Date.now() - 3 * HOUR))
    stopSleep(sleepRepo, sleep.id, new Date(Date.now() - 2 * HOUR))
    recordFeeding(feedingRepo, 'bottle', new Date(Date.now() - 4 * HOUR), { amount: 120, unit: 'ml' })
    recordDiaperChange(diaperRepo, 'wet', new Date(Date.now() - HOUR))

    const timeline = getDayTimeline(sleepRepo, feedingRepo, diaperRepo, weightRepo, dayStart, dayEnd)
    expect(timeline.events).toHaveLength(3)
    expect(timeline.events.map((e) => e.kind)).toEqual(['diaper', 'sleep', 'feeding'])
    expect(timeline.sleeps).toHaveLength(1)
    expect(timeline.feedings).toHaveLength(1)
    expect(timeline.diapers).toHaveLength(1)
  })

  it('excludes events outside the day', () => {
    const sleepRepo = new MemorySleepRepo()
    const feedingRepo = new MemoryFeedingRepo()
    const diaperRepo = new MemoryDiaperRepo()
    const weightRepo = new MemoryWeightRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)

    recordFeeding(feedingRepo, 'bottle', new Date(Date.now() - 30 * HOUR), { amount: 120, unit: 'ml' })

    const timeline = getDayTimeline(sleepRepo, feedingRepo, diaperRepo, weightRepo, dayStart, dayEnd)
    expect(timeline.events).toHaveLength(0)
  })
})
