import { describe, it, expect } from 'vitest'
import {
  buildConfirmEntry,
  isMedicationDismissed,
  listMedicationReminders,
  REMINDER_WINDOW_MS,
} from '../medicationReminder'
import type { MedicationEntry, MedicationUnit } from '../../model/MedicationEntry'

function entry(name: string, time: string, amount?: number, unit: MedicationUnit = '', notes?: string): MedicationEntry {
  return { id: `id-${name}-${time}`, time, name, ...(amount !== undefined ? { amount } : {}), unit, ...(notes ? { notes } : {}) }
}

function atLocal(daysAgo: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function nowAt(hour: number, minute = 0): string {
  return atLocal(0, hour, minute)
}

describe('listMedicationReminders', () => {
  const emptyDismissed = {}

  it('schedules today at the same clock times as the most recent prior day', () => {
    const entries = [
      entry('Antibiotic', atLocal(1, 8, 30), 5, 'ml'),
      entry('Antibiotic', atLocal(1, 20, 30), 5, 'ml'),
    ]
    const morning = listMedicationReminders(entries, emptyDismissed, nowAt(8, 30))
    expect(morning.map((r) => r.scheduledClock)).toEqual(['08:30'])
    expect(morning.every((r) => r.name === 'Antibiotic')).toBe(true)
    // By evening, both morning and evening instances are showable (no auto-clear).
    const evening = listMedicationReminders(entries, emptyDismissed, nowAt(20, 30))
    expect(evening.map((r) => r.scheduledClock)).toEqual(['08:30', '20:30'])
  })

  it('uses only yesterday\'s entries as the reference day (older doses ignored)', () => {
    const entries = [
      entry('Antibiotic', atLocal(3, 9, 0), 5, 'ml'),
      entry('Antibiotic', atLocal(1, 7, 0), 5, 'ml'),
    ]
    const reminders = listMedicationReminders(entries, emptyDismissed, nowAt(7, 10))
    expect(reminders.map((r) => r.scheduledClock)).toEqual(['07:00'])
    expect(reminders[0].referenceEntry.time).toBe(atLocal(1, 7, 0))
  })

  it('returns no reminders when there is no dose yesterday (older doses only)', () => {
    const entries = [
      entry('A', atLocal(3, 8, 0), 1, 'ml'),
      entry('A', atLocal(2, 8, 30), 1, 'ml'),
    ]
    expect(listMedicationReminders(entries, emptyDismissed, nowAt(20, 0))).toHaveLength(0)
  })

  it('returns no reminders when there are no prior-day entries', () => {
    expect(listMedicationReminders([entry('Vitamin D', nowAt(8, 0))], emptyDismissed, nowAt(8, 0))).toEqual([])
    expect(listMedicationReminders([], emptyDismissed, nowAt(8, 0))).toEqual([])
  })

  it('does not show before the scheduled clock time', () => {
    const entries = [entry('A', atLocal(1, 8, 0), 1, 'ml')]
    expect(listMedicationReminders(entries, emptyDismissed, nowAt(7, 59))).toHaveLength(0)
    expect(listMedicationReminders(entries, emptyDismissed, nowAt(8, 0))).toHaveLength(1)
  })

  it('stays showable long after the scheduled time (no auto-clear)', () => {
    const entries = [entry('A', atLocal(1, 8, 0), 1, 'ml')]
    expect(listMedicationReminders(entries, emptyDismissed, nowAt(12, 0))).toHaveLength(1)
    expect(listMedicationReminders(entries, emptyDismissed, nowAt(20, 0))).toHaveLength(1)
    expect(listMedicationReminders(entries, emptyDismissed, nowAt(23, 59))).toHaveLength(1)
  })

  it('skips an instance already logged today within the window (manual or card)', () => {
    const entries = [
      entry('A', atLocal(1, 8, 0), 1, 'ml'),
      entry('A', nowAt(8, 10), 1, 'ml'),
    ]
    expect(listMedicationReminders(entries, emptyDismissed, nowAt(20, 0))).toHaveLength(0)
  })

  it('does not treat a prior-day entry as today\'s logged dose', () => {
    const entries = [
      entry('A', atLocal(2, 8, 10), 1, 'ml'),
      entry('A', atLocal(1, 8, 0), 1, 'ml'),
    ]
    expect(listMedicationReminders(entries, emptyDismissed, nowAt(20, 0))).toHaveLength(1)
  })

  it('skips a dismissed name', () => {
    const entries = [entry('A', atLocal(1, 8, 0), 1, 'ml')]
    const dismissed = { A: new Date().toISOString() }
    expect(listMedicationReminders(entries, dismissed, nowAt(20, 0))).toHaveLength(0)
  })

  it('re-arms when a newer entry than the dismissal timestamp exists (manual re-add)', () => {
    const dismissAt = atLocal(2, 12, 0)
    const entries = [
      entry('A', atLocal(1, 8, 0), 1, 'ml'),
      entry('A', atLocal(0, 6, 0), 1, 'ml'), // manually re-added today, newer than dismissal
    ]
    const dismissed = { A: dismissAt }
    expect(listMedicationReminders(entries, dismissed, nowAt(20, 0))).toHaveLength(1)
  })

  it('keeps a dismissal when the re-added entry is older than the dismissal', () => {
    const dismissAt = atLocal(0, 12, 0)
    const entries = [
      entry('A', atLocal(1, 8, 0), 1, 'ml'),
      entry('A', atLocal(0, 6, 0), 1, 'ml'), // added before dismissal time
    ]
    const dismissed = { A: dismissAt }
    expect(listMedicationReminders(entries, dismissed, nowAt(20, 0))).toHaveLength(0)
  })

  it('returns reminders sorted by clock time', () => {
    const entries = [
      entry('B', atLocal(1, 20, 0)),
      entry('A', atLocal(1, 8, 0)),
      entry('B', atLocal(1, 8, 0)),
    ]
    const reminders = listMedicationReminders(entries, emptyDismissed, nowAt(20, 0))
    const clocks = reminders.map((r) => r.scheduledClock)
    expect(clocks).toEqual([...clocks].sort())
  })

  it('exposes the constant and dismissal helper', () => {
    expect(REMINDER_WINDOW_MS).toBe(60 * 60 * 1000)
    expect(isMedicationDismissed({ A: 'x' }, 'A')).toBe(true)
    expect(isMedicationDismissed({}, 'A')).toBe(false)
  })
})

describe('buildConfirmEntry', () => {
  it('duplicates the reference entry changing only the date', () => {
    const ref = entry('Antibiotic', atLocal(1, 8, 30), 5, 'ml', 'after food')
    const confirm = buildConfirmEntry(ref, nowAt(8, 40))
    expect(confirm.id).not.toBe(ref.id)
    expect(confirm.name).toBe('Antibiotic')
    expect(confirm.amount).toBe(5)
    expect(confirm.unit).toBe('ml')
    expect(confirm.notes).toBe('after food')
    const c = new Date(confirm.time)
    expect(c.getHours()).toBe(8)
    expect(c.getMinutes()).toBe(30)
    const now = new Date(nowAt(8, 40))
    expect(c.getFullYear()).toBe(now.getFullYear())
    expect(c.getMonth()).toBe(now.getMonth())
    expect(c.getDate()).toBe(now.getDate())
  })

  it('clamps to now when the scheduled time would be in the future', () => {
    const ref = entry('A', atLocal(1, 8, 30), 1, 'ml')
    const confirm = buildConfirmEntry(ref, nowAt(8, 15))
    expect(new Date(confirm.time).getTime()).toBeLessThanOrEqual(Date.now())
    expect(new Date(confirm.time).getHours()).toBe(8)
  })
})