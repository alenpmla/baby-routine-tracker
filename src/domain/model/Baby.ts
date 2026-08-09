export interface Baby {
  id: string
  name: string
  /** ISO date string, yyyy-mm-dd */
  dob: string
  notes: string
  /** Birth weight in kilograms (optional). */
  birthWeightKg?: number
}
