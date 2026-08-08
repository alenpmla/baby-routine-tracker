import type { Baby } from '../model/Baby'
import type { BabyRepository } from '../repository/repositories'
import { newId } from '../util/id'

export interface SaveBabyInput {
  name: string
  dob: string
  notes?: string
}

export function getBabyProfile(repo: BabyRepository): Baby | null {
  return repo.get()
}

export function saveBabyProfile(repo: BabyRepository, input: SaveBabyInput, existing?: Baby | null): Baby {
  if (!input.name.trim()) {
    throw new Error('Name is required')
  }
  if (!input.dob) {
    throw new Error('Date of birth is required')
  }
  const baby: Baby = {
    id: existing?.id ?? newId(),
    name: input.name.trim(),
    dob: input.dob,
    notes: input.notes?.trim() ?? '',
  }
  repo.save(baby)
  return baby
}
