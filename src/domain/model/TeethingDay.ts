export const TEETHING_SYMPTOMS = [
  'Drooling',
  'Fussy',
  'Fever',
  'Poor sleep',
  'Chewing',
  'Ears pulling',
] as const

export type TeethingSymptom = (typeof TEETHING_SYMPTOMS)[number]

export function isTeethingSymptom(value: string): value is TeethingSymptom {
  return (TEETHING_SYMPTOMS as readonly string[]).includes(value)
}

export interface TeethingDay {
  id: string
  /** Date-only, local calendar day, yyyy-mm-dd */
  day: string
  symptoms: TeethingSymptom[]
  notes?: string
}
