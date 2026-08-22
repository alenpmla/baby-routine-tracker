import type { MedicationEntry } from '../model/MedicationEntry'
import { newId } from '../util/id'

/** Suppression tolerance around the scheduled clock time (±30 min) for the already-logged check. */
export const REMINDER_WINDOW_MS = 60 * 60 * 1000
const HALF_WINDOW_MS = REMINDER_WINDOW_MS / 2

/** Dismissal map: medication name → ISO-8601 timestamp of the dismissal. */
export type MedicationDismissalMap = Record<string, string>

export interface MedicationReminder {
  name: string
  /** Today's scheduled clock time, local `HH:mm`. */
  scheduledClock: string
  /** The reference-day entry to duplicate on confirm. */
  referenceEntry: MedicationEntry
}

function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function localClockKey(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

function combineLocalDateTime(dateKey: string, clockKey: string): Date {
  return new Date(`${dateKey}T${clockKey || '00:00'}`)
}

export function isMedicationDismissed(dismissed: MedicationDismissalMap, name: string): boolean {
  return typeof dismissed[name] === 'string'
}

/**
 * The showable medication reminders for today. Pure: no timers or storage.
 *
 * For each distinct medication name with a dose on YESTERDAY's local calendar day, yesterday's
 * clock times define today's scheduled clock times. An instance `(name, HH:mm)` is showable
 * when all hold:
 *  - `now >= today@HH:mm` (the scheduled clock time has been reached; stays showable until
 *    acted on — no auto-clear);
 *  - no MedicationEntry for the name exists today within ±30 min of that clock time;
 *  - the name is not dismissed, or a newer entry than the dismissal timestamp proves a
 *    manual re-add (re-arm).
 */
export function listMedicationReminders(
  entries: MedicationEntry[],
  dismissed: MedicationDismissalMap,
  now: string,
): MedicationReminder[] {
  const nowDate = new Date(now)
  const nowMs = nowDate.getTime()
  const todayKey = localDateKey(nowDate)
  const yesterday = new Date(nowDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = localDateKey(yesterday)

  const byName = new Map<string, MedicationEntry[]>()
  for (const e of entries) {
    const list = byName.get(e.name) ?? []
    list.push(e)
    byName.set(e.name, list)
  }

  const reminders: MedicationReminder[] = []

  for (const [name, nameEntries] of byName) {
    const referenceEntries = nameEntries.filter((e) => localDateKey(new Date(e.time)) === yesterdayKey)
    if (referenceEntries.length === 0) continue

    for (const ref of referenceEntries) {
      const clock = localClockKey(new Date(ref.time))
      const scheduledMs = combineLocalDateTime(todayKey, clock).getTime()
      if (nowMs < scheduledMs) continue

      const alreadyLogged = nameEntries.some((e) => {
        const t = new Date(e.time).getTime()
        const dayKey = localDateKey(new Date(e.time))
        return dayKey === todayKey && Math.abs(t - scheduledMs) <= HALF_WINDOW_MS
      })
      if (alreadyLogged) continue

      const dismissAt = dismissed[name]
      if (typeof dismissAt === 'string') {
        const rearmed = nameEntries.some((e) => new Date(e.time).getTime() > new Date(dismissAt).getTime())
        if (!rearmed) continue
      }

      reminders.push({ name, scheduledClock: clock, referenceEntry: ref })
    }
  }

  reminders.sort((a, b) => (a.scheduledClock < b.scheduledClock ? -1 : a.scheduledClock > b.scheduledClock ? 1 : 0))
  return reminders
}

/**
 * Duplicates the reference entry changing only the date: same name/amount/unit/notes and same
 * clock time, date = today (local). If the scheduled time would be in the future (confirming
 * inside the pre-window), clamps to `now` so the store never rejects a future timestamp.
 */
export function buildConfirmEntry(referenceEntry: MedicationEntry, now: string): MedicationEntry {
  const nowDate = new Date(now)
  const todayKey = localDateKey(nowDate)
  const clock = localClockKey(new Date(referenceEntry.time))
  let time = combineLocalDateTime(todayKey, clock)
  if (time.getTime() > nowDate.getTime()) {
    time = nowDate
  }
  return {
    id: newId(),
    time: time.toISOString(),
    name: referenceEntry.name,
    ...(referenceEntry.amount !== undefined ? { amount: referenceEntry.amount } : {}),
    unit: referenceEntry.unit,
    ...(referenceEntry.notes && referenceEntry.notes.trim() ? { notes: referenceEntry.notes.trim() } : {}),
  }
}