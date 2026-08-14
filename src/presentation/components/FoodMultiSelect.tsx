import { useEffect, useRef, useState } from 'react'
import Modal from './Modal'
import { foodEmoji, foodIconKey } from '../../domain/usecase/foodIcons'
import { FOOD_ICON_COLORS } from './FoodIcon'

interface FoodMultiSelectProps {
  value: string[]
  suggestions: string[]
  onChange: (foods: string[]) => void
  ariaInvalid?: boolean
  ariaDescribedby?: string
  mostUsed?: string[]
}

function sameFood(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export default function FoodMultiSelect({
  value,
  suggestions,
  onChange,
  ariaInvalid,
  ariaDescribedby,
  mostUsed,
}: FoodMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement | null>(null)

  const q = query.trim().toLowerCase()
  const matches = q ? suggestions.filter((s) => s.toLowerCase().includes(q)) : suggestions
  const mostUsedList = mostUsed ?? []
  const showMostUsed = !q && mostUsedList.length > 0
  const remaining = showMostUsed
    ? suggestions.filter((s) => !mostUsedList.some((m) => sameFood(m, s)))
    : matches
  const showDivider = showMostUsed && remaining.length > 0

  useEffect(() => {
    if (open) {
      setQuery('')
    }
  }, [open])

  function toggle(food: string) {
    if (value.some((f) => sameFood(f, food))) {
      onChange(value.filter((f) => !sameFood(f, food)))
    } else {
      onChange([...value, food])
    }
  }

  function clearSearch() {
    setQuery('')
    searchRef.current?.focus()
  }

  function renderItem(food: string) {
    const checked = value.some((f) => sameFood(f, food))
    const accent = FOOD_ICON_COLORS[foodIconKey(food)]
    return (
      <label className="food-suggest-item">
        <span
          className="food-item-icon"
          aria-hidden="true"
          style={{ ['--food-icon-accent' as string]: accent }}
        >
          {foodEmoji(food)}
        </span>
        <input type="checkbox" checked={checked} onChange={() => toggle(food)} />
        <span>{food}</span>
      </label>
    )
  }

  return (
    <div className="food-picker">
      {value.length > 0 && (
        <div className="food-tags">
          {value.map((f) => (
            <span key={f} className="food-tag">
              <span aria-hidden="true">{foodEmoji(f)}</span>
              {f}
              <button
                type="button"
                className="food-tag-remove"
                aria-label={`Remove ${f}`}
                onClick={() => toggle(f)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        className="food-add-chip"
        aria-label="Add foods"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        onClick={() => setOpen(true)}
      >
        + Add foods
      </button>

      <Modal open={open} title="Add foods" onClose={() => setOpen(false)} variant="fullscreen">
        <div className="food-picker-sheet">
          <div className="food-search">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search foods"
              aria-label="Search foods"
              autoComplete="off"
              autoFocus
            />
            {query.length > 0 && (
              <button
                type="button"
                className="food-search-clear"
                aria-label="Clear search"
                onClick={clearSearch}
              >
                ×
              </button>
            )}
          </div>
          <ul className="food-picker-list">
            {showMostUsed && (
              <>
                <li key="most-label" className="food-most-used-label-item">
                  <p className="food-most-used-label">Most used</p>
                </li>
                {mostUsedList.map((s) => (
                  <li key={s}>{renderItem(s)}</li>
                ))}
                {showDivider && (
                  <li key="divider">
                    <div className="food-list-divider" role="separator" />
                  </li>
                )}
              </>
            )}
            {remaining.length === 0 && !showMostUsed ? (
              <li className="food-picker-empty">No foods match "{query}"</li>
            ) : (
              remaining.map((s) => (
                <li key={s}>{renderItem(s)}</li>
              ))
            )}
          </ul>
          <button type="button" className="btn btn-primary btn-block" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </Modal>
    </div>
  )
}
