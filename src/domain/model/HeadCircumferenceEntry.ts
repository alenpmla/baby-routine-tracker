export type HeadCircumferenceUnit = 'cm' | 'in'

export interface HeadCircumferenceEntry {
  id: string
  /** ISO-8601 UTC */
  time: string
  value: number
  unit: HeadCircumferenceUnit
}
