import { describe, it, expect } from 'vitest'
import { getDayTimeline } from '../timeline'
import { startSleep, stopSleep } from '../sleep'
import { recordFeeding } from '../feeding'
import { recordDiaperChange } from '../diaper'
import { recordHeadCircumference } from '../headCircumference'
import { recordTooth } from '../teeth'
import { recordTeethingDay } from '../teething'
import {
  MemorySleepRepo,
  MemoryFeedingRepo,
  MemoryDiaperRepo,
  MemoryWeightRepo,
  MemoryHeadCircumferenceRepo,
  MemoryMedicationRepo,
  MemoryMilestoneRepo,
  MemoryTemperatureRepo,
  MemoryToothRepo,
  MemoryTeethingDayRepo,
} from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

describe('day timeline', () => {
  it('combines all event types sorted newest first', () => {
    const sleepRepo = new MemorySleepRepo()
    const feedingRepo = new MemoryFeedingRepo()
    const diaperRepo = new MemoryDiaperRepo()
    const weightRepo = new MemoryWeightRepo()
    const headCircumferenceRepo = new MemoryHeadCircumferenceRepo()
    const medicationRepo = new MemoryMedicationRepo()
    const temperatureRepo = new MemoryTemperatureRepo()
    const milestoneRepo = new MemoryMilestoneRepo()
    const toothRepo = new MemoryToothRepo()
    const teethingDayRepo = new MemoryTeethingDayRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)

    const sleep = startSleep(sleepRepo, new Date(Date.now() - 3 * HOUR))
    stopSleep(sleepRepo, sleep.id, new Date(Date.now() - 2 * HOUR))
    recordFeeding(feedingRepo, 'bottle', new Date(Date.now() - 4 * HOUR), { amount: 120, unit: 'ml' })
    recordDiaperChange(diaperRepo, 'wet', new Date(Date.now() - HOUR))

    const timeline = getDayTimeline(
      sleepRepo,
      feedingRepo,
      diaperRepo,
      weightRepo,
      headCircumferenceRepo,
      medicationRepo,
      temperatureRepo,
      milestoneRepo,
      toothRepo,
      teethingDayRepo,
      dayStart,
      dayEnd,
    )
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
    const headCircumferenceRepo = new MemoryHeadCircumferenceRepo()
    const medicationRepo = new MemoryMedicationRepo()
    const temperatureRepo = new MemoryTemperatureRepo()
    const milestoneRepo = new MemoryMilestoneRepo()
    const toothRepo = new MemoryToothRepo()
    const teethingDayRepo = new MemoryTeethingDayRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)

    recordFeeding(feedingRepo, 'bottle', new Date(Date.now() - 30 * HOUR), { amount: 120, unit: 'ml' })

    const timeline = getDayTimeline(
      sleepRepo,
      feedingRepo,
      diaperRepo,
      weightRepo,
      headCircumferenceRepo,
      medicationRepo,
      temperatureRepo,
      milestoneRepo,
      toothRepo,
      teethingDayRepo,
      dayStart,
      dayEnd,
    )
    expect(timeline.events).toHaveLength(0)
  })

  it('derives per-day sleep totals split by nap/night, excluding ongoing sleeps', () => {
    const sleepRepo = new MemorySleepRepo()
    const feedingRepo = new MemoryFeedingRepo()
    const diaperRepo = new MemoryDiaperRepo()
    const weightRepo = new MemoryWeightRepo()
    const headCircumferenceRepo = new MemoryHeadCircumferenceRepo()
    const medicationRepo = new MemoryMedicationRepo()
    const temperatureRepo = new MemoryTemperatureRepo()
    const milestoneRepo = new MemoryMilestoneRepo()
    const toothRepo = new MemoryToothRepo()
    const teethingDayRepo = new MemoryTeethingDayRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)

    const night = startSleep(sleepRepo, new Date(Date.now() - 5 * HOUR), 'night')
    stopSleep(sleepRepo, night.id, new Date(Date.now() - 2 * HOUR))
    const nap = startSleep(sleepRepo, new Date(Date.now() - 90 * 60 * 1000), 'nap')
    stopSleep(sleepRepo, nap.id, new Date(Date.now() - 30 * 60 * 1000))
    const ongoing = startSleep(sleepRepo, new Date(Date.now() - HOUR), 'nap')
    void ongoing

    const timeline = getDayTimeline(
      sleepRepo,
      feedingRepo,
      diaperRepo,
      weightRepo,
      headCircumferenceRepo,
      medicationRepo,
      temperatureRepo,
      milestoneRepo,
      toothRepo,
      teethingDayRepo,
      dayStart,
      dayEnd,
    )
    expect(timeline.sleepTotals).toEqual({
      nightMs: 3 * HOUR,
      napMs: HOUR,
      nightCount: 1,
      napCount: 1,
      totalMs: 4 * HOUR,
    })
  })

  it('infers nap/night for legacy sleeps (no kind) in the day totals', () => {
    const sleepRepo = new MemorySleepRepo()
    const feedingRepo = new MemoryFeedingRepo()
    const diaperRepo = new MemoryDiaperRepo()
    const weightRepo = new MemoryWeightRepo()
    const headCircumferenceRepo = new MemoryHeadCircumferenceRepo()
    const medicationRepo = new MemoryMedicationRepo()
    const temperatureRepo = new MemoryTemperatureRepo()
    const milestoneRepo = new MemoryMilestoneRepo()
    const toothRepo = new MemoryToothRepo()
    const teethingDayRepo = new MemoryTeethingDayRepo()
    const dayStart = new Date(2026, 7, 14)
    const dayEnd = new Date(dayStart.getTime() + 24 * HOUR)
    const at = (hour: number) => new Date(dayStart.getTime() + hour * HOUR).toISOString()

    sleepRepo.add({ id: 'night', startTime: at(2), endTime: at(6) })
    sleepRepo.add({ id: 'nap', startTime: at(12), endTime: at(13) })

    const timeline = getDayTimeline(
      sleepRepo,
      feedingRepo,
      diaperRepo,
      weightRepo,
      headCircumferenceRepo,
      medicationRepo,
      temperatureRepo,
      milestoneRepo,
      toothRepo,
      teethingDayRepo,
      dayStart,
      dayEnd,
    )
    expect(timeline.sleepTotals).toEqual({
      nightMs: 4 * HOUR,
      napMs: HOUR,
      nightCount: 1,
      napCount: 1,
      totalMs: 5 * HOUR,
    })
  })

  it('includes head circumferences for the day, scoped and newest first', () => {
    const sleepRepo = new MemorySleepRepo()
    const feedingRepo = new MemoryFeedingRepo()
    const diaperRepo = new MemoryDiaperRepo()
    const weightRepo = new MemoryWeightRepo()
    const headCircumferenceRepo = new MemoryHeadCircumferenceRepo()
    const medicationRepo = new MemoryMedicationRepo()
    const temperatureRepo = new MemoryTemperatureRepo()
    const milestoneRepo = new MemoryMilestoneRepo()
    const toothRepo = new MemoryToothRepo()
    const teethingDayRepo = new MemoryTeethingDayRepo()
    const dayStart = new Date(2026, 7, 14)
    const dayEnd = new Date(dayStart.getTime() + 24 * HOUR)
    const at = (hour: number) => new Date(dayStart.getTime() + hour * HOUR)

    recordHeadCircumference(headCircumferenceRepo, 42.5, 'cm', at(10))
    recordHeadCircumference(headCircumferenceRepo, 43, 'cm', at(14))
    recordHeadCircumference(headCircumferenceRepo, 17, 'in', new Date(dayStart.getTime() - HOUR))

    const timeline = getDayTimeline(
      sleepRepo,
      feedingRepo,
      diaperRepo,
      weightRepo,
      headCircumferenceRepo,
      medicationRepo,
      temperatureRepo,
      milestoneRepo,
      toothRepo,
      teethingDayRepo,
      dayStart,
      dayEnd,
    )
    expect(timeline.headCircumferences).toHaveLength(2)
    expect(timeline.headCircumferences.map((h) => h.value)).toEqual([43, 42.5])
  })

  it('includes tooth entries for the day, scoped by time and newest first', () => {
    const sleepRepo = new MemorySleepRepo()
    const feedingRepo = new MemoryFeedingRepo()
    const diaperRepo = new MemoryDiaperRepo()
    const weightRepo = new MemoryWeightRepo()
    const headCircumferenceRepo = new MemoryHeadCircumferenceRepo()
    const medicationRepo = new MemoryMedicationRepo()
    const temperatureRepo = new MemoryTemperatureRepo()
    const milestoneRepo = new MemoryMilestoneRepo()
    const toothRepo = new MemoryToothRepo()
    const teethingDayRepo = new MemoryTeethingDayRepo()
    const dayStart = new Date(2026, 7, 14)
    const dayEnd = new Date(dayStart.getTime() + 24 * HOUR)
    const at = (hour: number) => new Date(dayStart.getTime() + hour * HOUR)

    recordTooth(toothRepo, 'Lower central incisor', at(10))
    recordTooth(toothRepo, 'Upper central incisor', at(14), 'peeking through')
    recordTooth(toothRepo, 'Lower lateral incisor', new Date(dayStart.getTime() - HOUR))

    const timeline = getDayTimeline(
      sleepRepo,
      feedingRepo,
      diaperRepo,
      weightRepo,
      headCircumferenceRepo,
      medicationRepo,
      temperatureRepo,
      milestoneRepo,
      toothRepo,
      teethingDayRepo,
      dayStart,
      dayEnd,
    )
    expect(timeline.teeth).toHaveLength(2)
    expect(timeline.teeth.map((t) => t.tooth)).toEqual(['Upper central incisor', 'Lower central incisor'])
    expect(timeline.teeth[0].notes).toBe('peeking through')
  })

  it('includes teething days matching the day as a local yyyy-mm-dd string', () => {
    const sleepRepo = new MemorySleepRepo()
    const feedingRepo = new MemoryFeedingRepo()
    const diaperRepo = new MemoryDiaperRepo()
    const weightRepo = new MemoryWeightRepo()
    const headCircumferenceRepo = new MemoryHeadCircumferenceRepo()
    const medicationRepo = new MemoryMedicationRepo()
    const temperatureRepo = new MemoryTemperatureRepo()
    const milestoneRepo = new MemoryMilestoneRepo()
    const toothRepo = new MemoryToothRepo()
    const teethingDayRepo = new MemoryTeethingDayRepo()
    const dayStart = new Date(2026, 7, 14)
    const dayEnd = new Date(dayStart.getTime() + 24 * HOUR)
    const local = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    recordTeethingDay(teethingDayRepo, local(dayStart), ['Drooling', 'Fussy'])
    recordTeethingDay(teethingDayRepo, '2026-07-01', ['Fever'])

    const timeline = getDayTimeline(
      sleepRepo,
      feedingRepo,
      diaperRepo,
      weightRepo,
      headCircumferenceRepo,
      medicationRepo,
      temperatureRepo,
      milestoneRepo,
      toothRepo,
      teethingDayRepo,
      dayStart,
      dayEnd,
    )
    expect(timeline.teethingDays).toHaveLength(1)
    expect(timeline.teethingDays[0].day).toBe('2026-08-14')
    expect(timeline.teethingDays[0].symptoms).toEqual(['Drooling', 'Fussy'])
  })
})
