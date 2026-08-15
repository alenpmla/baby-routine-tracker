export const MED_UNITS = ['mg', 'ml', 'tsp', 'drops', ''] as const

export type MedicationUnit = (typeof MED_UNITS)[number]

export function isMedicationUnit(value: string): value is MedicationUnit {
  return (MED_UNITS as readonly string[]).includes(value)
}

export interface MedicationEntry {
  id: string
  /** ISO-8601 UTC */
  time: string
  name: string
  amount?: number
  unit: MedicationUnit
  notes?: string
}
