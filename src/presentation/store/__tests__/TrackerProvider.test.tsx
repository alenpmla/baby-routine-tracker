import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { TrackerProvider, useTracker, type UseTracker } from '../TrackerProvider'
import type { SleepSession } from '../../../domain/model/SleepSession'
import type { HeadCircumferenceEntry } from '../../../domain/model/HeadCircumferenceEntry'
import type { MedicationEntry } from '../../../domain/model/MedicationEntry'
import type { MilestoneEntry } from '../../../domain/model/MilestoneEntry'
import type { TeethingDay } from '../../../domain/model/TeethingDay'
import type { TemperatureEntry } from '../../../domain/model/TemperatureEntry'
import type { ToothEntry } from '../../../domain/model/ToothEntry'
import { setupApi } from '../../../test/setupApi'
import type { MockApi } from '../../../test/mockApi'
import { shiftDays, startOfDay } from '../../utils/time'

const HOUR = 3600 * 1000

describe('TrackerProvider sleep kind + day split state', () => {
  let api: MockApi
  let t: UseTracker | null

  function Probe() {
    t = useTracker()
    return null
  }

  beforeEach(() => {
    api = setupApi()
    t = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  async function renderStore() {
    render(
      <TrackerProvider>
        <Probe />
      </TrackerProvider>,
    )
    await waitFor(() => expect(t?.ready).toBe(true))
  }

  it('exposes per-day nap/night split from the store timeline (explicit, inferred legacy, ongoing)', async () => {
    const dayStart = startOfDay(new Date())
    const at = (h: number) => new Date(dayStart.getTime() + h * HOUR).toISOString()
    api.state.sleeps = [
      { id: 'night1', startTime: at(1), endTime: at(8), kind: 'night' }, // 7h night, explicit
      { id: 'nap1', startTime: at(10), endTime: at(11), kind: 'nap' }, // 1h nap, explicit
      { id: 'legacy', startTime: at(12), endTime: at(13) }, // local noon -> inferred nap
      { id: 'ongoing', startTime: at(14), endTime: null }, // running: excluded from split
    ]
    await renderStore()
    expect(t!.day.sleeps).toHaveLength(4)
    expect(t!.day.sleepTotals).toEqual({
      nightMs: 7 * HOUR,
      napMs: 2 * HOUR,
      nightCount: 1,
      napCount: 2,
      totalMs: 9 * HOUR,
    })
  })

  it('threads kind through start/stop, backfill, and update and persists it', async () => {
    await renderStore()
    const now = new Date()
    const past = (h: number) => new Date(now.getTime() - h * HOUR)

    let running: SleepSession
    act(() => {
      running = t!.startSleepTimer(past(3), 'night')
    })
    expect(running!.kind).toBe('night')
    expect(t!.activeSleep?.kind).toBe('night')

    let stopped: SleepSession
    act(() => {
      stopped = t!.stopSleepTimer()
    })
    expect(stopped!.kind).toBe('night')
    expect(t!.day.sleepTotals.nightCount).toBe(1)

    let logged: SleepSession
    act(() => {
      logged = t!.logPastSleep(past(2), past(1), 'nap')
    })
    expect(logged!.kind).toBe('nap')
    expect(t!.day.sleepTotals.napCount).toBe(1)

    let updated: SleepSession
    act(() => {
      updated = t!.updateSleepRecord(logged!.id, past(2), past(1), 'night')
    })
    expect(updated!.kind).toBe('night')
    expect(t!.day.sleepTotals.nightCount).toBe(2)
    expect(t!.day.sleepTotals.napCount).toBe(0)
    expect(t!.day.sleepTotals.totalMs).toBe(
      t!.day.sleepTotals.nightMs + t!.day.sleepTotals.napMs,
    )
  })
})

describe('TrackerProvider head circumference store actions', () => {
  let api: MockApi
  let t: UseTracker | null

  function Probe() {
    t = useTracker()
    return null
  }

  beforeEach(() => {
    api = setupApi()
    t = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  async function renderStore() {
    render(
      <TrackerProvider>
        <Probe />
      </TrackerProvider>,
    )
    await waitFor(() => expect(t?.ready).toBe(true))
  }

  // A timestamp on the selected day that is never in the future, even near
  // midnight (Math.max clamps into the current day).
  const todayTime = () =>
    new Date(Math.max(startOfDay(new Date()).getTime(), Date.now() - 30 * 60 * 1000))

  it('adds a head circumference, persists it, and refreshes the day view and count', async () => {
    await renderStore()

    let added: HeadCircumferenceEntry
    act(() => {
      added = t!.addHeadCircumference(42.5, 'cm', todayTime())
    })

    expect(added!.value).toBe(42.5)
    expect(added!.unit).toBe('cm')
    expect(api.state.headCircumferences).toHaveLength(1)
    expect(api.state.headCircumferences[0].value).toBe(42.5)
    expect(api.state.headCircumferences[0].id).toBe(added!.id)
    expect(t!.day.headCircumferences).toHaveLength(1)
    expect(t!.day.headCircumferences[0].id).toBe(added!.id)
    expect(t!.dayCounts.headCircumferences).toBe(1)
  })

  it('updates a head circumference record, persisting and refreshing the day view', async () => {
    await renderStore()

    let added: HeadCircumferenceEntry
    act(() => {
      added = t!.addHeadCircumference(42.5, 'cm', todayTime())
    })
    let updated: HeadCircumferenceEntry
    act(() => {
      updated = t!.updateHeadCircumferenceRecord(added!.id, 43, 'cm', todayTime())
    })

    expect(updated!.value).toBe(43)
    expect(api.state.headCircumferences).toHaveLength(1)
    expect(api.state.headCircumferences[0].value).toBe(43)
    expect(t!.day.headCircumferences[0].value).toBe(43)
  })

  it('updateHeadCircumferenceRecord throws for an unknown id without corrupting state', async () => {
    await renderStore()

    expect(() =>
      t!.updateHeadCircumferenceRecord('missing', 43, 'cm', todayTime()),
    ).toThrow(/not found/i)
    expect(api.state.headCircumferences).toHaveLength(0)
    expect(t!.day.headCircumferences).toHaveLength(0)
    expect(t!.dayCounts.headCircumferences).toBe(0)
  })

  it('removes a head circumference record, persisting and refreshing the day view', async () => {
    await renderStore()

    let added: HeadCircumferenceEntry
    act(() => {
      added = t!.addHeadCircumference(42.5, 'cm', todayTime())
    })
    act(() => {
      t!.removeHeadCircumference(added!.id)
    })

    expect(api.state.headCircumferences).toHaveLength(0)
    expect(t!.day.headCircumferences).toHaveLength(0)
    expect(t!.dayCounts.headCircumferences).toBe(0)
  })

  it('latestHeadCircumference returns the most recent entry across all records', async () => {
    await renderStore()
    expect(t!.latestHeadCircumference()).toBeNull()

    const older = new Date(Date.now() - 5 * 24 * HOUR)
    const newer = new Date(Date.now() - 2 * 24 * HOUR)
    let second: HeadCircumferenceEntry
    act(() => {
      t!.addHeadCircumference(41, 'cm', older)
      second = t!.addHeadCircumference(43, 'cm', newer)
    })

    expect(t!.latestHeadCircumference()?.id).toBe(second!.id)
    expect(t!.latestHeadCircumference()?.value).toBe(43)
    expect(api.state.headCircumferences).toHaveLength(2)
  })

  it('scopes day.headCircumferences and the count to the selected day', async () => {
    const dayStart = startOfDay(new Date())
    api.state.headCircumferences = [
      { id: 'yesterday', time: new Date(dayStart.getTime() - HOUR).toISOString(), value: 41, unit: 'cm' },
      { id: 'today', time: todayTime().toISOString(), value: 42, unit: 'cm' },
    ]
    await renderStore()

    expect(t!.day.headCircumferences.map((h) => h.id)).toEqual(['today'])
    expect(t!.dayCounts.headCircumferences).toBe(1)
  })
})

describe('TrackerProvider medication store actions', () => {
  let api: MockApi
  let t: UseTracker | null

  function Probe() {
    t = useTracker()
    return null
  }

  beforeEach(() => {
    api = setupApi()
    t = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  async function renderStore() {
    render(
      <TrackerProvider>
        <Probe />
      </TrackerProvider>,
    )
    await waitFor(() => expect(t?.ready).toBe(true))
  }

  const todayTime = () =>
    new Date(Math.max(startOfDay(new Date()).getTime(), Date.now() - 30 * 60 * 1000))

  it('adds a medication, persists it, and refreshes the day view', async () => {
    await renderStore()

    let added: MedicationEntry
    act(() => {
      added = t!.addMedication('Paracetamol', todayTime(), 120, 'mg')
    })

    expect(added!.name).toBe('Paracetamol')
    expect(added!.amount).toBe(120)
    expect(added!.unit).toBe('mg')
    expect(api.state.medications).toHaveLength(1)
    expect(api.state.medications[0].id).toBe(added!.id)
    expect(t!.day.medications).toHaveLength(1)
    expect(t!.day.medications[0].id).toBe(added!.id)
  })

  it('adds a medication without an amount (drops)', async () => {
    await renderStore()

    let added: MedicationEntry
    act(() => {
      added = t!.addMedication('Vitamin D drops', todayTime())
    })

    expect(added!.amount).toBeUndefined()
    expect(added!.unit).toBe('')
    expect(api.state.medications).toHaveLength(1)
  })

  it('updates a medication record, persisting and refreshing the day view', async () => {
    await renderStore()

    let added: MedicationEntry
    act(() => {
      added = t!.addMedication('Paracetamol', todayTime(), 120, 'mg')
    })
    let updated: MedicationEntry
    act(() => {
      updated = t!.updateMedicationRecord(added!.id, { name: 'Ibuprofen', amount: 200, unit: 'mg' })
    })

    expect(updated!.name).toBe('Ibuprofen')
    expect(updated!.amount).toBe(200)
    expect(api.state.medications).toHaveLength(1)
    expect(api.state.medications[0].name).toBe('Ibuprofen')
    expect(t!.day.medications[0].name).toBe('Ibuprofen')
  })

  it('removes a medication record, persisting and refreshing the day view', async () => {
    await renderStore()

    let added: MedicationEntry
    act(() => {
      added = t!.addMedication('Paracetamol', todayTime(), 120, 'mg')
    })
    act(() => {
      t!.removeMedication(added!.id)
    })

    expect(api.state.medications).toHaveLength(0)
    expect(t!.day.medications).toHaveLength(0)
  })
})

describe('TrackerProvider temperature store actions', () => {
  let api: MockApi
  let t: UseTracker | null

  function Probe() {
    t = useTracker()
    return null
  }

  beforeEach(() => {
    api = setupApi()
    t = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  async function renderStore() {
    render(
      <TrackerProvider>
        <Probe />
      </TrackerProvider>,
    )
    await waitFor(() => expect(t?.ready).toBe(true))
  }

  const todayTime = () =>
    new Date(Math.max(startOfDay(new Date()).getTime(), Date.now() - 30 * 60 * 1000))

  it('adds a temperature, persists it, and refreshes the day view', async () => {
    await renderStore()

    let added: TemperatureEntry
    act(() => {
      added = t!.addTemperature(37.4, 'c', todayTime(), 'rectal')
    })

    expect(added!.temp).toBe(37.4)
    expect(added!.unit).toBe('c')
    expect(added!.location).toBe('rectal')
    expect(api.state.temperatures).toHaveLength(1)
    expect(api.state.temperatures[0].id).toBe(added!.id)
    expect(t!.day.temperatures).toHaveLength(1)
    expect(t!.day.temperatures[0].id).toBe(added!.id)
  })

  it('latestTemperature returns the most recent reading (or null)', async () => {
    await renderStore()
    expect(t!.latestTemperature()).toBeNull()

    const older = new Date(Date.now() - 2 * 3600 * 1000)
    const newer = new Date(Date.now() - 3600 * 1000)
    let first: TemperatureEntry
    act(() => {
      first = t!.addTemperature(37.1, 'c', older)
    })
    let second: TemperatureEntry
    act(() => {
      second = t!.addTemperature(38.0, 'c', newer)
    })

    expect(t!.latestTemperature()?.id).toBe(second!.id)
    expect(t!.latestTemperature()?.temp).toBe(38.0)
    expect(first!.id).not.toBe(second!.id)
  })

  it('updates and removes a temperature record', async () => {
    await renderStore()

    let added: TemperatureEntry
    act(() => {
      added = t!.addTemperature(37.4, 'c', todayTime())
    })
    let updated: TemperatureEntry
    act(() => {
      updated = t!.updateTemperatureRecord(added!.id, { temp: 38.2, unit: 'c', location: 'ear' })
    })
    expect(updated!.temp).toBe(38.2)
    expect(updated!.location).toBe('ear')
    expect(api.state.temperatures[0].temp).toBe(38.2)

    act(() => {
      t!.removeTemperature(added!.id)
    })
    expect(api.state.temperatures).toHaveLength(0)
    expect(t!.day.temperatures).toHaveLength(0)
  })
})

describe('TrackerProvider milestone store actions', () => {
  let api: MockApi
  let t: UseTracker | null

  function Probe() {
    t = useTracker()
    return null
  }

  beforeEach(() => {
    api = setupApi()
    t = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  async function renderStore() {
    render(
      <TrackerProvider>
        <Probe />
      </TrackerProvider>,
    )
    await waitFor(() => expect(t?.ready).toBe(true))
  }

  const todayTime = () =>
    new Date(Math.max(startOfDay(new Date()).getTime(), Date.now() - 30 * 60 * 1000))

  it('adds a milestone, persists it, and refreshes the day view', async () => {
    await renderStore()

    let added: MilestoneEntry
    act(() => {
      added = t!.addMilestone('Crawl', todayTime(), 'first shuffle')
    })

    expect(added!.milestone).toBe('Crawl')
    expect(added!.notes).toBe('first shuffle')
    expect(api.state.milestones).toHaveLength(1)
    expect(api.state.milestones[0].id).toBe(added!.id)
    expect(t!.day.milestones).toHaveLength(1)
    expect(t!.day.milestones[0].id).toBe(added!.id)
  })

  it('allows a custom milestone label', async () => {
    await renderStore()

    let added: MilestoneEntry
    act(() => {
      added = t!.addMilestone('Waves goodbye', todayTime())
    })

    expect(added!.milestone).toBe('Waves goodbye')
    expect(api.state.milestones).toHaveLength(1)
  })

  it('updates and removes a milestone record', async () => {
    await renderStore()

    let added: MilestoneEntry
    act(() => {
      added = t!.addMilestone('Crawl', todayTime())
    })
    let updated: MilestoneEntry
    act(() => {
      updated = t!.updateMilestoneRecord(added!.id, { milestone: 'Crawling', notes: 'fast now' })
    })
    expect(updated!.milestone).toBe('Crawling')
    expect(api.state.milestones[0].milestone).toBe('Crawling')

    act(() => {
      t!.removeMilestone(added!.id)
    })
    expect(api.state.milestones).toHaveLength(0)
    expect(t!.day.milestones).toHaveLength(0)
  })

  it('allMilestones returns all entries and firstMilestones exposes curated firsts', async () => {
    await renderStore()

    let added: MilestoneEntry
    act(() => {
      added = t!.addMilestone('Roll over', todayTime())
    })
    expect(t!.allMilestones()).toHaveLength(1)

    const firsts = t!.firstMilestones()
    const roll = firsts.find((f) => f.milestone === 'Roll over')
    expect(roll?.achieved).toBe(true)
    expect(roll?.time).toBe(added!.time)
    expect(firsts.find((f) => f.milestone === 'Walk')?.achieved).toBe(false)
  })
})

describe('TrackerProvider teeth store actions', () => {
  let api: MockApi
  let t: UseTracker | null

  function Probe() {
    t = useTracker()
    return null
  }

  beforeEach(() => {
    api = setupApi()
    t = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  async function renderStore() {
    render(
      <TrackerProvider>
        <Probe />
      </TrackerProvider>,
    )
    await waitFor(() => expect(t?.ready).toBe(true))
  }

  // A timestamp on the selected day that is never in the future, even near
  // midnight (Math.max clamps into the current day).
  const todayTime = () =>
    new Date(Math.max(startOfDay(new Date()).getTime(), Date.now() - 30 * 60 * 1000))

  it('adds a tooth, persists it, and refreshes the day list and count', async () => {
    await renderStore()

    let added: ToothEntry
    act(() => {
      added = t!.addTooth('Lower central incisor', todayTime(), 'first tooth!')
    })

    expect(added!.tooth).toBe('Lower central incisor')
    expect(added!.notes).toBe('first tooth!')
    expect(api.state.teeth).toHaveLength(1)
    expect(api.state.teeth[0].id).toBe(added!.id)
    expect(api.state.teeth[0].tooth).toBe('Lower central incisor')
    expect(t!.day.teeth).toHaveLength(1)
    expect(t!.day.teeth[0].id).toBe(added!.id)
    expect(t!.dayCounts.teeth).toBe(1)
  })

  it('addTooth validates and does not persist invalid input', async () => {
    await renderStore()

    expect(() =>
      t!.addTooth('Not a tooth' as ToothEntry['tooth'], todayTime()),
    ).toThrow(/Choose a tooth/i)
    expect(() => t!.addTooth('Lower central incisor', new Date(Date.now() + HOUR))).toThrow(/future/i)

    expect(api.state.teeth).toHaveLength(0)
    expect(t!.day.teeth).toHaveLength(0)
    expect(t!.dayCounts.teeth).toBe(0)
  })

  it('updates a tooth record, persisting and refreshing the day view', async () => {
    await renderStore()

    let added: ToothEntry
    act(() => {
      added = t!.addTooth('Lower central incisor', todayTime())
    })
    let updated: ToothEntry
    act(() => {
      updated = t!.updateToothRecord(added!.id, { tooth: 'Upper central incisor', notes: 'corrected' })
    })

    expect(updated!.tooth).toBe('Upper central incisor')
    expect(updated!.notes).toBe('corrected')
    expect(api.state.teeth).toHaveLength(1)
    expect(api.state.teeth[0].tooth).toBe('Upper central incisor')
    expect(t!.day.teeth[0].tooth).toBe('Upper central incisor')
  })

  it('updateToothRecord throws for an unknown id without corrupting state', async () => {
    await renderStore()

    expect(() => t!.updateToothRecord('missing', { tooth: 'Lower central incisor' })).toThrow(
      /not found/i,
    )
    expect(api.state.teeth).toHaveLength(0)
    expect(t!.day.teeth).toHaveLength(0)
    expect(t!.dayCounts.teeth).toBe(0)
  })

  it('removes a tooth record, persisting and refreshing the day view', async () => {
    await renderStore()

    let added: ToothEntry
    act(() => {
      added = t!.addTooth('Lower central incisor', todayTime())
    })
    act(() => {
      t!.removeTooth(added!.id)
    })

    expect(api.state.teeth).toHaveLength(0)
    expect(t!.day.teeth).toHaveLength(0)
    expect(t!.dayCounts.teeth).toBe(0)
  })

  it('eruptedTeeth returns the distinct erupted teeth in canonical order across all records', async () => {
    await renderStore()
    expect(t!.eruptedTeeth()).toEqual([])

    const older = new Date(Date.now() - 5 * 24 * HOUR)
    const newer = new Date(Date.now() - 2 * 24 * HOUR)
    act(() => {
      t!.addTooth('Lower central incisor', older)
      t!.addTooth('Lower central incisor', newer)
      t!.addTooth('Upper lateral incisor', newer)
    })

    expect(t!.eruptedTeeth()).toEqual(['Lower central incisor', 'Upper lateral incisor'])
    expect(api.state.teeth).toHaveLength(3)
  })

  it('scopes day.teeth and the count to the selected day by time', async () => {
    const dayStart = startOfDay(new Date())
    api.state.teeth = [
      {
        id: 'yesterday',
        time: new Date(dayStart.getTime() - HOUR).toISOString(),
        tooth: 'Lower central incisor',
      },
      { id: 'today', time: todayTime().toISOString(), tooth: 'Upper central incisor' },
    ]
    await renderStore()

    expect(t!.day.teeth.map((x) => x.id)).toEqual(['today'])
    expect(t!.dayCounts.teeth).toBe(1)
    expect(t!.eruptedTeeth()).toEqual(['Lower central incisor', 'Upper central incisor'])
  })
})

describe('TrackerProvider teething day store actions', () => {
  let api: MockApi
  let t: UseTracker | null

  function Probe() {
    t = useTracker()
    return null
  }

  beforeEach(() => {
    api = setupApi()
    t = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  async function renderStore() {
    render(
      <TrackerProvider>
        <Probe />
      </TrackerProvider>,
    )
    await waitFor(() => expect(t?.ready).toBe(true))
  }

  const localDayString = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  it('adds a teething day, persists it, and refreshes the day list and count', async () => {
    await renderStore()

    const day = localDayString(new Date())
    let added: TeethingDay
    act(() => {
      added = t!.addTeethingDay(day, ['Drooling', 'Poor sleep'], 'rough night')
    })

    expect(added!.day).toBe(day)
    expect(added!.symptoms).toEqual(['Drooling', 'Poor sleep'])
    expect(added!.notes).toBe('rough night')
    expect(api.state.teethingDays).toHaveLength(1)
    expect(api.state.teethingDays[0].id).toBe(added!.id)
    expect(t!.day.teethingDays).toHaveLength(1)
    expect(t!.day.teethingDays[0].id).toBe(added!.id)
    expect(t!.dayCounts.teethingDays).toBe(1)
  })

  it('addTeethingDay validates and does not persist invalid input', async () => {
    await renderStore()

    expect(() => t!.addTeethingDay('not-a-date', ['Drooling'])).toThrow(/valid yyyy-mm-dd/i)
    expect(() => t!.addTeethingDay(localDayString(new Date(Date.now() + 24 * HOUR)), ['Drooling'])).toThrow(
      /future/i,
    )
    expect(() => t!.addTeethingDay(localDayString(new Date()), [])).toThrow(/at least one symptom/i)

    expect(api.state.teethingDays).toHaveLength(0)
    expect(t!.day.teethingDays).toHaveLength(0)
    expect(t!.dayCounts.teethingDays).toBe(0)
  })

  it('addTeethingDay rejects a duplicate day (one entry per day)', async () => {
    await renderStore()

    const day = localDayString(new Date())
    act(() => {
      t!.addTeethingDay(day, ['Drooling'])
    })
    expect(() => t!.addTeethingDay(day, ['Fussy'])).toThrow(/already exists/i)

    expect(api.state.teethingDays).toHaveLength(1)
    expect(t!.dayCounts.teethingDays).toBe(1)
  })

  it('updates a teething day record, persisting and refreshing the day view', async () => {
    await renderStore()

    const day = localDayString(new Date())
    let added: TeethingDay
    act(() => {
      added = t!.addTeethingDay(day, ['Drooling'])
    })
    let updated: TeethingDay
    act(() => {
      updated = t!.updateTeethingDayRecord(added!.id, { symptoms: ['Drooling', 'Fever'] })
    })

    expect(updated!.day).toBe(day)
    expect(updated!.symptoms).toEqual(['Drooling', 'Fever'])
    expect(api.state.teethingDays).toHaveLength(1)
    expect(api.state.teethingDays[0].symptoms).toEqual(['Drooling', 'Fever'])
    expect(t!.day.teethingDays[0].symptoms).toEqual(['Drooling', 'Fever'])
  })

  it('updateTeethingDayRecord throws for an unknown id without corrupting state', async () => {
    await renderStore()

    expect(() =>
      t!.updateTeethingDayRecord('missing', { symptoms: ['Fussy'] }),
    ).toThrow(/not found/i)
    expect(api.state.teethingDays).toHaveLength(0)
    expect(t!.day.teethingDays).toHaveLength(0)
    expect(t!.dayCounts.teethingDays).toBe(0)
  })

  it('removes a teething day record, persisting and refreshing the day view', async () => {
    await renderStore()

    const day = localDayString(new Date())
    let added: TeethingDay
    act(() => {
      added = t!.addTeethingDay(day, ['Drooling'])
    })
    act(() => {
      t!.removeTeethingDay(added!.id)
    })

    expect(api.state.teethingDays).toHaveLength(0)
    expect(t!.day.teethingDays).toHaveLength(0)
    expect(t!.dayCounts.teethingDays).toBe(0)
  })

  it('shows a teething day added for a past date on that day after navigation, not today', async () => {
    await renderStore()

    const pastDay = localDayString(startOfDay(shiftDays(new Date(), -2)))
    let added: TeethingDay
    act(() => {
      added = t!.addTeethingDay(pastDay, ['Drooling', 'Fussy'])
    })

    expect(added!.day).toBe(pastDay)
    expect(api.state.teethingDays).toHaveLength(1)
    expect(api.state.teethingDays[0].day).toBe(pastDay)
    expect(t!.day.teethingDays).toHaveLength(0)
    expect(t!.dayCounts.teethingDays).toBe(0)

    act(() => {
      t!.prevDay()
    })
    act(() => {
      t!.prevDay()
    })
    expect(t!.day.teethingDays).toHaveLength(1)
    expect(t!.day.teethingDays[0].id).toBe(added!.id)
    expect(t!.day.teethingDays[0].symptoms).toEqual(['Drooling', 'Fussy'])
    expect(t!.dayCounts.teethingDays).toBe(1)
  })

  it('scopes day.teethingDays and the count to the selected day by matching the local yyyy-mm-dd day string', async () => {
    const dayStart = startOfDay(new Date())
    const yesterdayStart = startOfDay(new Date(dayStart.getTime() - HOUR))
    api.state.teethingDays = [
      { id: 'yesterday', day: localDayString(yesterdayStart), symptoms: ['Fussy'] },
      { id: 'today', day: localDayString(dayStart), symptoms: ['Drooling', 'Poor sleep'] },
    ]
    await renderStore()

    expect(t!.day.teethingDays.map((d) => d.id)).toEqual(['today'])
    expect(t!.dayCounts.teethingDays).toBe(1)
    expect(t!.day.teethingDays[0].symptoms).toEqual(['Drooling', 'Poor sleep'])
  })
})
