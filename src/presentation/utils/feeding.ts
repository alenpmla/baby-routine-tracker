import type { AmountUnit, FeedingSession } from '../../domain/model/FeedingSession'
import { foodsOf } from '../../domain/model/FeedingSession'
import { formatDuration } from './time'

const OZ_TO_GRAM = 28.3495
const OZ_TO_ML = 29.5735

export type BottleUnit = 'ml' | 'oz'
export type SolidsUnit = 'g' | 'oz'
export interface SnapshotUnits {
  bottle: BottleUnit
  solids: SolidsUnit
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '')
}

/** Formats a single recorded amount in the target unit, converting if needed. */
export function describeAmount(
  amount: number,
  unit: AmountUnit,
  target: BottleUnit | SolidsUnit,
): string {
  if (unit === 'gram') {
    return target === 'g' ? `${Math.round(amount)}g` : `${formatAmount(amount / OZ_TO_GRAM)}oz`
  }
  if (unit === 'ml') {
    return target === 'ml' ? `${Math.round(amount)}ml` : `${formatAmount(amount / OZ_TO_ML)}oz`
  }
  // recorded in oz
  if (target === 'oz') {
    return `${formatAmount(amount)}oz`
  }
  if (target === 'g') {
    return `${Math.round(amount * OZ_TO_GRAM)}g`
  }
  return `${Math.round(amount * OZ_TO_ML)}ml`
}

export function describeFeedingTitle(f: FeedingSession): string {
  if (f.type === 'solids') {
    const foods = foodsOf(f)
    return foods.length > 0 ? `Solids · ${foods.join(', ')}` : 'Solid food'
  }
  return f.type[0].toUpperCase() + f.type.slice(1)
}

/** Total solid-food amount across the day's feeds, shown in the preferred unit. */
export function describeSolidsTotal(feedings: FeedingSession[], unit: SolidsUnit): string {
  let gram = 0
  let oz = 0
  for (const f of feedings) {
    if (f.type !== 'solids' || f.amount === undefined || !f.unit) {
      continue
    }
    if (f.unit === 'gram') {
      gram += f.amount
    } else if (f.unit === 'oz') {
      oz += f.amount
    }
  }
  if (gram === 0 && oz === 0) {
    return ''
  }
  if (unit === 'g') {
    return `${Math.round(gram + oz * OZ_TO_GRAM)}g`
  }
  return `${formatAmount(oz + gram / OZ_TO_GRAM)}oz`
}

/** Average solid-food amount (given in grams) per day, shown in the preferred unit. */
export function describeSolidsAverage(gram: number, unit: SolidsUnit): string {
  if (unit === 'g') {
    return `${Math.round(gram)}g`
  }
  return `${formatAmount(gram / OZ_TO_GRAM)}oz`
}

/** Total bottle amount across the day's feeds, shown in the preferred unit. */
export function describeBottleTotal(feedings: FeedingSession[], unit: BottleUnit): string {
  let ml = 0
  let oz = 0
  for (const f of feedings) {
    if (f.type !== 'bottle' || f.amount === undefined || !f.unit) {
      continue
    }
    if (f.unit === 'ml') {
      ml += f.amount
    } else if (f.unit === 'oz') {
      oz += f.amount
    }
  }
  if (ml === 0 && oz === 0) {
    return ''
  }
  if (unit === 'ml') {
    return `${Math.round(ml + oz * OZ_TO_ML)}ml`
  }
  return `${formatAmount(oz + ml / OZ_TO_ML)}oz`
}

export function describeFeedingMeta(f: FeedingSession): string {
  const parts: string[] = []
  if (f.amount !== undefined && f.unit) {
    parts.push(`${f.amount} ${f.unit}`)
  }
  if (f.startTime && f.endTime) {
    parts.push(formatDuration(new Date(f.endTime).getTime() - new Date(f.startTime).getTime()))
  }
  return parts.join(' · ')
}
