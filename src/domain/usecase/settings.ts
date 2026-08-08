import type { SettingsRepository } from '../repository/repositories'

export function getFoodSuggestions(repo: SettingsRepository): string[] {
  return repo.get().foodSuggestions
}

export function addFoodSuggestion(repo: SettingsRepository, value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('Suggestion cannot be empty')
  }
  const current = repo.get().foodSuggestions
  const exists = current.some((s) => s.toLowerCase() === trimmed.toLowerCase())
  const next = exists ? current : [...current, trimmed]
  repo.save({ foodSuggestions: next })
  return next
}

export function removeFoodSuggestion(repo: SettingsRepository, value: string): string[] {
  const next = repo.get().foodSuggestions.filter((s) => s !== value)
  repo.save({ foodSuggestions: next })
  return next
}
