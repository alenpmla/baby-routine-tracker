import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Baby } from '../../domain/model/Baby'
import type { FeedingSession } from '../../domain/model/FeedingSession'
import { foodsOf } from '../../domain/model/FeedingSession'
import type { DiaperChange } from '../../domain/model/DiaperChange'
import type { SleepSession } from '../../domain/model/SleepSession'
import { formatDuration, startOfDay, toInputDate } from './time'
import { describeBottleTotal, describeSolidsTotal, describeAmount, type SnapshotUnits } from './feeding'

const PRIMARY: [number, number, number] = [107, 92, 230]
const INK: [number, number, number] = [43, 38, 34]
const MUTED: [number, number, number] = [122, 117, 112]
const CARD: [number, number, number] = [245, 243, 248]
const ALT: [number, number, number] = [248, 246, 251]

export interface ReportRecords {
  sleeps: SleepSession[]
  feedings: FeedingSession[]
  diapers: DiaperChange[]
}

export interface ReportSummary {
  sleepCount: number
  totalSleep: string
  feedCount: number
  bottleCount: number
  breastCount: number
  solidsCount: number
  bottleTotal: string
  solidsTotal: string
  diaperCount: number
  wet: number
  dirty: number
  both: number
}

export interface DayTotals {
  /** Local calendar day key, YYYY-MM-DD */
  dayKey: string
  /** Local midnight of the day */
  date: Date
  sleepCount: number
  sleepTotal: string
  feedCount: number
  bottleCount: number
  breastCount: number
  solidsCount: number
  bottleTotal: string
  solidsTotal: string
  diaperCount: number
  wet: number
  dirty: number
  both: number
}

export function buildDailyTotals(records: ReportRecords, units: SnapshotUnits): DayTotals[] {
  const sleepsByDay = new Map<string, SleepSession[]>()
  const feedingsByDay = new Map<string, FeedingSession[]>()
  const diapersByDay = new Map<string, DiaperChange[]>()
  const dayStart = new Map<string, Date>()

  const append = <T>(map: Map<string, T[]>, key: string, value: T) => {
    const list = map.get(key)
    if (list) {
      list.push(value)
    } else {
      map.set(key, [value])
    }
  }

  for (const s of records.sleeps) {
    const d = new Date(s.startTime)
    const key = toInputDate(d)
    append(sleepsByDay, key, s)
    dayStart.set(key, startOfDay(d))
  }
  for (const f of records.feedings) {
    const d = new Date(f.time)
    const key = toInputDate(d)
    append(feedingsByDay, key, f)
    dayStart.set(key, startOfDay(d))
  }
  for (const d of records.diapers) {
    const date = new Date(d.time)
    const key = toInputDate(date)
    append(diapersByDay, key, d)
    dayStart.set(key, startOfDay(date))
  }

  const keys = Array.from(
    new Set([...sleepsByDay.keys(), ...feedingsByDay.keys(), ...diapersByDay.keys()]),
  )
  keys.sort((a, b) => dayStart.get(a)!.getTime() - dayStart.get(b)!.getTime())

  return keys.map((key) => {
    const sleeps = sleepsByDay.get(key) ?? []
    const feedings = feedingsByDay.get(key) ?? []
    const diapers = diapersByDay.get(key) ?? []
    let totalSleepMs = 0
    let sleepCount = 0
    for (const s of sleeps) {
      if (s.endTime) {
        totalSleepMs += new Date(s.endTime).getTime() - new Date(s.startTime).getTime()
        sleepCount += 1
      }
    }
    return {
      dayKey: key,
      date: dayStart.get(key)!,
      sleepCount,
      sleepTotal: formatDuration(totalSleepMs),
      feedCount: feedings.length,
      bottleCount: feedings.filter((f) => f.type === 'bottle').length,
      breastCount: feedings.filter((f) => f.type === 'breast').length,
      solidsCount: feedings.filter((f) => f.type === 'solids').length,
      bottleTotal: describeBottleTotal(feedings, units.bottle),
      solidsTotal: describeSolidsTotal(feedings, units.solids),
      diaperCount: diapers.length,
      wet: diapers.filter((d) => d.type === 'wet').length,
      dirty: diapers.filter((d) => d.type === 'dirty').length,
      both: diapers.filter((d) => d.type === 'both').length,
    }
  })
}

export function buildReportSummary(records: ReportRecords, units: SnapshotUnits): ReportSummary {
  let totalSleepMs = 0
  for (const s of records.sleeps) {
    if (s.endTime) {
      totalSleepMs += new Date(s.endTime).getTime() - new Date(s.startTime).getTime()
    }
  }
  return {
    sleepCount: records.sleeps.length,
    totalSleep: formatDuration(totalSleepMs),
    feedCount: records.feedings.length,
    bottleCount: records.feedings.filter((f) => f.type === 'bottle').length,
    breastCount: records.feedings.filter((f) => f.type === 'breast').length,
    solidsCount: records.feedings.filter((f) => f.type === 'solids').length,
    bottleTotal: describeBottleTotal(records.feedings, units.bottle),
    solidsTotal: describeSolidsTotal(records.feedings, units.solids),
    diaperCount: records.diapers.length,
    wet: records.diapers.filter((d) => d.type === 'wet').length,
    dirty: records.diapers.filter((d) => d.type === 'dirty').length,
    both: records.diapers.filter((d) => d.type === 'both').length,
  }
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtClock(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function pageHeader(doc: jsPDF, title: string, sub: string) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, w, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(title, 14, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(sub, 14, 22)
}

function statCard(doc: jsPDF, x: number, y: number, w: number, h: number, value: string, label: string) {
  doc.setFillColor(...CARD)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  doc.setTextColor(...PRIMARY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(value, x + 5, y + 9)
  doc.setTextColor(...MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(label, x + 5, y + 14.5)
}

export function buildReportPdf(
  baby: Baby | null,
  start: Date,
  end: Date,
  records: ReportRecords,
  units: SnapshotUnits,
): ArrayBuffer {
  const doc = new jsPDF()
  const summary = buildReportSummary(records, units)
  const periodLabel = `${start.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
  const name = baby?.name ?? 'Baby'

  pageHeader(doc, 'Baby Tracker — Period Report', `${name}  ·  ${periodLabel}`)

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Summary', 14, 42)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(`Report generated on ${new Date().toLocaleDateString()}`, 14, 47.5)

  const cw = 90
  const ch = 22
  const gap = 6
  const x0 = 14
  const y0 = 54
  statCard(doc, x0, y0, cw, ch, summary.totalSleep, `Sleep · ${summary.sleepCount} session${summary.sleepCount === 1 ? '' : 's'}`)
  statCard(doc, x0 + cw + gap, y0, cw, ch, String(summary.feedCount), 'Total feeds')
  statCard(doc, x0, y0 + ch + gap, cw, ch, summary.bottleTotal || '—', `Bottle · ${summary.bottleCount}`)
  statCard(doc, x0 + cw + gap, y0 + ch + gap, cw, ch, summary.solidsTotal || '—', `Solids · ${summary.solidsCount}`)
  statCard(doc, x0, y0 + 2 * (ch + gap), cw, ch, String(summary.diaperCount), 'Diaper changes')
  statCard(doc, x0 + cw + gap, y0 + 2 * (ch + gap), cw, ch, `${summary.wet} · ${summary.dirty} · ${summary.both}`, 'Wet · Dirty · Both')

  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text('Detailed reports follow for Sleep, Feeding, and Diaper.', 14, y0 + 3 * (ch + gap) + 2)

  const dailyTotals = buildDailyTotals(records, units)
  doc.setFontSize(12)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.text('Daily totals', 14, y0 + 3 * (ch + gap) + 14)
  const dailyRows = dailyTotals.length
    ? dailyTotals.map((d) => [
        fmtDate(d.date.toISOString()),
        `${d.sleepCount} · ${d.sleepTotal}`,
        String(d.feedCount),
        d.bottleTotal || '—',
        d.solidsTotal || '—',
        String(d.diaperCount),
      ])
    : [['—', '—', '—', '—', '—', 'No records in period']]
  autoTable(doc, {
    startY: y0 + 3 * (ch + gap) + 20,
    head: [['Day', 'Sleep', 'Feeds', 'Bottle', 'Solids', 'Diapers']],
    body: dailyRows,
    theme: 'grid',
    styles: { textColor: INK, fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ALT },
    margin: { left: 14, right: 14 },
  })

  // ---- Sleep report (own page) ----
  doc.addPage()
  pageHeader(doc, 'Sleep Report', `${name}  ·  ${periodLabel}`)
  const sleepRows = records.sleeps.map((s) => [
    fmtDate(s.startTime),
    fmtClock(s.startTime),
    s.endTime ? fmtClock(s.endTime) : '—',
    s.endTime ? formatDuration(new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) : 'ongoing',
  ])
  autoTable(doc, {
    startY: 34,
    head: [['Date', 'Start', 'End', 'Duration']],
    body: sleepRows.length ? sleepRows : [['—', '—', '—', 'No sleep recorded']],
    theme: 'grid',
    styles: { textColor: INK, fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ALT },
    margin: { left: 14, right: 14 },
  })

  // ---- Feeding report (own, dedicated page) ----
  doc.addPage()
  pageHeader(doc, 'Feeding Report', `${name}  ·  ${periodLabel}`)
  const feedingRows = records.feedings.map((f) => {
    let details = ''
    let amount = ''
    if (f.type === 'solids') {
      details = foodsOf(f).join(', ')
      amount = f.amount !== undefined && f.unit ? describeAmount(f.amount, f.unit, units.solids) : ''
    } else if (f.type === 'bottle') {
      details = 'Bottle'
      amount = f.amount !== undefined && f.unit ? describeAmount(f.amount, f.unit, units.bottle) : ''
    } else {
      details = 'Breast'
      if (f.startTime && f.endTime) {
        amount = formatDuration(new Date(f.endTime).getTime() - new Date(f.startTime).getTime())
      }
    }
    return [fmtDateTime(f.time), f.type.charAt(0).toUpperCase() + f.type.slice(1), details, amount]
  })
  autoTable(doc, {
    startY: 34,
    head: [['Date & time', 'Type', 'Details', 'Amount']],
    body: feedingRows.length ? feedingRows : [['—', '—', '—', 'No feeding recorded']],
    theme: 'grid',
    styles: { textColor: INK, fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ALT },
    columnStyles: { 0: { cellWidth: 42 }, 2: { cellWidth: 60 } },
    margin: { left: 14, right: 14 },
  })

  // ---- Diaper report (own page) ----
  doc.addPage()
  pageHeader(doc, 'Diaper Report', `${name}  ·  ${periodLabel}`)
  const diaperRows = records.diapers.map((d) => [fmtDateTime(d.time), d.type.charAt(0).toUpperCase() + d.type.slice(1)])
  autoTable(doc, {
    startY: 34,
    head: [['Date & time', 'Type']],
    body: diaperRows.length ? diaperRows : [['—', 'No diaper changes recorded']],
    theme: 'grid',
    styles: { textColor: INK, fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: ALT },
    margin: { left: 14, right: 14 },
  })

  const out = doc.output('arraybuffer')
  return out as ArrayBuffer
}

export function downloadReportPdf(
  baby: Baby | null,
  start: Date,
  end: Date,
  records: ReportRecords,
  units: SnapshotUnits,
) {
  const bytes = buildReportPdf(baby, start, end, records, units)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const label = `${start.toISOString().slice(0, 10)}_${end.toISOString().slice(0, 10)}`
  a.href = url
  a.download = `baby-tracker-report-${label}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
