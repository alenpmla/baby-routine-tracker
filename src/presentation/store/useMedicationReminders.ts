import { useEffect, useState } from 'react'
import {
  buildConfirmEntry,
  listMedicationReminders,
  type MedicationDismissalMap,
  type MedicationReminder,
} from '../../domain/usecase/medicationReminder'
import { useTracker } from './TrackerProvider'
import { isSameDay, shiftDays, startOfDay } from '../utils/time'

const DISMISSED_KEY = 'bt.medReminderDismissed'
const CHECK_INTERVAL_MS = 30_000
const LOOKBACK_DAYS = 7

function readDismissed(): MedicationDismissalMap {
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return parsed as MedicationDismissalMap
  } catch {
    return {}
  }
}

function writeDismissed(map: MedicationDismissalMap) {
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export interface MedicationReminders {
  reminders: MedicationReminder[]
  confirm: (name: string) => void
  dismissForever: (name: string) => void
}

export function useMedicationReminders(): MedicationReminders {
  const { getPeriodRecords, day, selectedDay, now, addMedication } = useTracker()
  const [, setTick] = useState(0)

  const viewingToday = isSameDay(selectedDay, startOfDay(now))
  const freshNow = new Date()

  useEffect(() => {
    if (!viewingToday) return
    const interval = window.setInterval(() => setTick((t) => t + 1), CHECK_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [viewingToday])

  const periodStart = startOfDay(shiftDays(freshNow, -LOOKBACK_DAYS))
  const records = getPeriodRecords(periodStart, freshNow)
  const seen = new Set<string>()
  const allEntries = [...records.medications, ...day.medications].filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  const reminders = viewingToday
    ? listMedicationReminders(allEntries, readDismissed(), freshNow.toISOString())
    : []

  const confirm = (name: string) => {
    const reminder = reminders.find((r) => r.name === name)
    if (!reminder) return
    const entry = buildConfirmEntry(reminder.referenceEntry, freshNow.toISOString())
    addMedication(entry.name, new Date(entry.time), entry.amount, entry.unit, entry.notes)
    const dismissed = readDismissed()
    if (dismissed[name] !== undefined) {
      delete dismissed[name]
      writeDismissed(dismissed)
    }
  }

  const dismissForever = (name: string) => {
    const dismissed = readDismissed()
    dismissed[name] = freshNow.toISOString()
    writeDismissed(dismissed)
    setTick((t) => t + 1)
  }

  return { reminders, confirm, dismissForever }
}