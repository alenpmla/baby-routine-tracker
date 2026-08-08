export type WeightUnit = 'kg' | 'lb'

export interface WeightEntry {
  id: string
  /** ISO-8601 UTC */
  time: string
  weight: number
  unit: WeightUnit
}
