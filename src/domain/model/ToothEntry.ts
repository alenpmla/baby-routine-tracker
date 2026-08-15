export const TOOTH_NAMES = [
  'Lower central incisor',
  'Upper central incisor',
  'Lower lateral incisor',
  'Upper lateral incisor',
  'Lower first molar',
  'Upper first molar',
  'Lower canine',
  'Upper canine',
  'Lower second molar',
  'Upper second molar',
] as const

export type ToothName = (typeof TOOTH_NAMES)[number]

export function isToothName(value: string): value is ToothName {
  return (TOOTH_NAMES as readonly string[]).includes(value)
}

export interface ToothEntry {
  id: string
  /** ISO-8601 UTC */
  time: string
  tooth: ToothName
  notes?: string
}
