export interface DayRange {
  start: Date
  end: Date
}

export function getDayRange(date: Date): DayRange {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

export function formatClock(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return ''
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDuration(millis: number): string {
  const totalMinutes = Math.floor(millis / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function formatDob(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  if (Number.isNaN(d.getTime())) {
    return isoDate
  }
  return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
}

export function describeAge(dobIsoDate: string, now: Date = new Date()): string {
  const dob = new Date(dobIsoDate + 'T00:00:00')
  if (Number.isNaN(dob.getTime())) {
    return ''
  }
  let months =
    (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  const dayDiff = now.getDate() - dob.getDate()
  if (dayDiff < 0) {
    months -= 1
  }
  if (months < 0) {
    return 'Newborn'
  }
  if (months < 12) {
    const weeks = Math.max(0, Math.floor((now.getTime() - dob.getTime()) / (7 * 24 * 3600 * 1000)))
    return `${months} mo${weeks > 0 ? ` · ${weeks} wk` : ''}`
  }
  const years = Math.floor(months / 12)
  const rem = months % 12
  return years === 1 && rem === 0 ? '1 yr' : `${years} yr ${rem} mo`
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function shiftDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function combineLocalDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr || '00:00'}`)
}

export function formatDayLabel(date: Date, today: Date): string {
  if (isSameDay(date, today)) {
    return 'Today'
  }
  if (isSameDay(date, shiftDays(today, -1))) {
    return 'Yesterday'
  }
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return ''
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDayMonth(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return ''
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function toInputDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toInputTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}
