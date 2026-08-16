import type { ReportRecords } from './report'

export interface ReportSections {
  summary: boolean
  dailyTotals: boolean
  sleep: boolean
  feeding: boolean
  diaper: boolean
  medication: boolean
  temperature: boolean
  weight: boolean
  headCircumference: boolean
  teeth: boolean
  teething: boolean
  milestones: boolean
}

export function sectionsWithData(records: ReportRecords): ReportSections {
  const core = records.sleeps.length > 0 || records.feedings.length > 0 || records.diapers.length > 0
  return {
    summary: core,
    dailyTotals: core,
    sleep: records.sleeps.length > 0,
    feeding: records.feedings.length > 0,
    diaper: records.diapers.length > 0,
    medication: records.medications.length > 0,
    temperature: records.temperatures.length > 0,
    weight: records.weights.length > 0,
    headCircumference: records.headCircumferences.length > 0,
    teeth: records.teeth.length > 0,
    teething: records.teethingDays.length > 0,
    milestones: records.milestones.length > 0,
  }
}

export const DEFAULT_REPORT_SECTIONS: ReportSections = {
  summary: true,
  dailyTotals: true,
  sleep: true,
  feeding: true,
  diaper: true,
  medication: true,
  temperature: true,
  weight: true,
  headCircumference: true,
  teeth: true,
  teething: true,
  milestones: true,
}

export const REPORT_SECTION_LABELS: Array<{ key: keyof ReportSections; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'dailyTotals', label: 'Daily totals' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'feeding', label: 'Feeding' },
  { key: 'diaper', label: 'Diaper' },
  { key: 'medication', label: 'Medication' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'weight', label: 'Weight' },
  { key: 'headCircumference', label: 'Head circumference' },
  { key: 'teeth', label: 'Teeth' },
  { key: 'teething', label: 'Teething days' },
  { key: 'milestones', label: 'Milestones' },
]

export function hasAnySection(sections: ReportSections): boolean {
  return Object.values(sections).some(Boolean)
}
