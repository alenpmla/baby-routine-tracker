export const MILESTONES = [
  'Lift head',
  'Roll over',
  'Sit up',
  'Crawl',
  'Pull to stand',
  'First word',
  'Stand alone',
  'Walk',
] as const

export type MilestoneName = (typeof MILESTONES)[number]

export function isMilestoneName(value: string): value is MilestoneName {
  return (MILESTONES as readonly string[]).includes(value)
}

export interface MilestoneEntry {
  id: string
  /** ISO-8601 UTC */
  time: string
  milestone: string
  notes?: string
}
