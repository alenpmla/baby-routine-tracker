export interface ReportSections {
  summary: boolean
  dailyTotals: boolean
  sleep: boolean
  feeding: boolean
  diaper: boolean
}

export const DEFAULT_REPORT_SECTIONS: ReportSections = {
  summary: true,
  dailyTotals: true,
  sleep: true,
  feeding: true,
  diaper: true,
}

export const REPORT_SECTION_LABELS: Array<{ key: keyof ReportSections; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'dailyTotals', label: 'Daily totals' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'feeding', label: 'Feeding' },
  { key: 'diaper', label: 'Diaper' },
]

export function hasAnySection(sections: ReportSections): boolean {
  return Object.values(sections).some(Boolean)
}
