import type { AmountUnit, FeedingSession, FeedingType } from '../model/FeedingSession'
import { foodsOf } from '../model/FeedingSession'
import type { FeedingRepository } from '../repository/repositories'
import { newId } from '../util/id'

export interface FeedingDetails {
  foods?: string[]
  amount?: number
  unit?: AmountUnit
  startTime?: Date
  endTime?: Date
}

export type SolidsFieldErrors = Partial<Record<'foods' | 'amount' | 'unit', string>>

function cleanFoods(foods: string[] | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const f of foods ?? []) {
    const trimmed = f.trim()
    const key = trimmed.toLowerCase()
    if (!key || seen.has(key)) {
      continue
    }
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

export function validateSolidsDetails(details: FeedingDetails): SolidsFieldErrors {
  const errors: SolidsFieldErrors = {}
  if (cleanFoods(details.foods).length === 0) {
    errors.foods = 'Choose at least one food'
  }
  if (details.amount === undefined || !Number.isFinite(details.amount)) {
    errors.amount = 'Amount is required'
  } else if (details.amount <= 0) {
    errors.amount = 'Amount must be a positive number'
  }
  if (!details.unit) {
    errors.unit = 'Please choose a unit'
  } else if (details.unit !== 'oz' && details.unit !== 'gram') {
    errors.unit = 'Choose oz or gram'
  }
  return errors
}

export type BottleFieldErrors = Partial<Record<'amount' | 'unit', string>>

export function validateBottleDetails(details: FeedingDetails): BottleFieldErrors {
  const errors: BottleFieldErrors = {}
  if (details.amount === undefined || !Number.isFinite(details.amount)) {
    errors.amount = 'Amount is required'
  } else if (details.amount <= 0) {
    errors.amount = 'Amount must be a positive number'
  }
  if (!details.unit) {
    errors.unit = 'Please choose a unit'
  } else if (details.unit !== 'ml' && details.unit !== 'oz') {
    errors.unit = 'Choose ml or oz'
  }
  return errors
}

export function recordFeeding(
  repo: FeedingRepository,
  type: FeedingType,
  now: Date = new Date(),
  details: FeedingDetails = {},
): FeedingSession {
  if (now.getTime() > Date.now()) {
    throw new Error('Cannot record a feed in the future')
  }
  if (type === 'solids') {
    const errors = validateSolidsDetails(details)
    if (errors.foods) {
      throw new Error(errors.foods)
    }
    if (errors.amount) {
      throw new Error(errors.amount)
    }
    if (errors.unit) {
      throw new Error(errors.unit)
    }
  }
  if (type === 'bottle') {
    const errors = validateBottleDetails(details)
    if (errors.amount) {
      throw new Error(errors.amount)
    }
    if (errors.unit) {
      throw new Error(errors.unit)
    }
  }
  if (type === 'breast') {
    if (!details.startTime || !details.endTime) {
      throw new Error('Start and end times are required for breast feeding')
    }
    if (details.startTime.getTime() >= details.endTime.getTime()) {
      throw new Error('End time must be after start time')
    }
    if (details.endTime.getTime() > Date.now()) {
      throw new Error('Cannot record a feed in the future')
    }
  }
  const session: FeedingSession = {
    id: newId(),
    time: (type === 'breast' ? details.startTime! : now).toISOString(),
    type,
    ...(type === 'solids'
      ? { foods: cleanFoods(details.foods), amount: details.amount!, unit: details.unit! }
      : {}),
    ...(type === 'bottle' ? { amount: details.amount!, unit: details.unit! } : {}),
    ...(type === 'breast'
      ? { startTime: details.startTime!.toISOString(), endTime: details.endTime!.toISOString() }
      : {}),
  }
  repo.add(session)
  return session
}

export interface UpdateFeedingInput {
  type?: FeedingType
  time?: Date
  details?: FeedingDetails
}

export function updateFeeding(
  repo: FeedingRepository,
  sessionId: string,
  input: UpdateFeedingInput,
): FeedingSession {
  const target = repo.getAll().find((f) => f.id === sessionId)
  if (!target) {
    throw new Error('Feed not found')
  }
  const type = input.type ?? target.type

  const resolved: FeedingDetails =
    input.details !== undefined
      ? input.details
      : {
          ...(foodsOf(target).length > 0 ? { foods: foodsOf(target) } : {}),
          ...(target.amount !== undefined ? { amount: target.amount, unit: target.unit } : {}),
          ...(target.startTime ? { startTime: new Date(target.startTime) } : {}),
          ...(target.endTime ? { endTime: new Date(target.endTime) } : {}),
        }

  let time: Date
  let breast: { startTime: string; endTime: string } | null = null
  let solids: { foods: string[]; amount: number; unit: AmountUnit } | null = null
  let bottle: { amount: number; unit: AmountUnit } | null = null

  if (type === 'breast') {
    const start = resolved.startTime ?? (target.startTime ? new Date(target.startTime) : undefined)
    const end = resolved.endTime ?? (target.endTime ? new Date(target.endTime) : undefined)
    if (!start || !end) {
      throw new Error('Start and end times are required for breast feeding')
    }
    if (start.getTime() >= end.getTime()) {
      throw new Error('End time must be after start time')
    }
    if (end.getTime() > Date.now()) {
      throw new Error('Cannot record a feed in the future')
    }
    time = start
    breast = { startTime: start.toISOString(), endTime: end.toISOString() }
  } else {
    time = input.time ?? new Date(target.time)
    if (time.getTime() > Date.now()) {
      throw new Error('Cannot record a feed in the future')
    }
    if (type === 'solids') {
      const errors = validateSolidsDetails(resolved)
      if (errors.foods) {
        throw new Error(errors.foods)
      }
      if (errors.amount) {
        throw new Error(errors.amount)
      }
      if (errors.unit) {
        throw new Error(errors.unit)
      }
      solids = { foods: cleanFoods(resolved.foods), amount: resolved.amount!, unit: resolved.unit! }
    } else if (type === 'bottle') {
      const errors = validateBottleDetails(resolved)
      if (errors.amount) {
        throw new Error(errors.amount)
      }
      if (errors.unit) {
        throw new Error(errors.unit)
      }
      bottle = { amount: resolved.amount!, unit: resolved.unit! }
    }
  }

  const updated: FeedingSession = {
    id: target.id,
    time: time.toISOString(),
    type,
    ...(solids ? { ...solids } : {}),
    ...(bottle ? { ...bottle } : {}),
    ...(breast ? { ...breast } : {}),
  }
  repo.update(updated)
  return updated
}

export function deleteFeeding(repo: FeedingRepository, sessionId: string): void {
  repo.delete(sessionId)
}

export function listFeedingsForDay(repo: FeedingRepository, dayStart: Date, dayEnd: Date): FeedingSession[] {
  const startMs = dayStart.getTime()
  const endMs = dayEnd.getTime()
  return repo
    .getAll()
    .filter((f) => {
      const t = new Date(f.time).getTime()
      return t >= startMs && t < endMs
    })
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
}
