export type DiaperType = 'wet' | 'dirty' | 'both'

export interface DiaperChange {
  id: string
  /** ISO-8601 UTC */
  time: string
  type: DiaperType
}
