import { useEffect, useRef, useState } from 'react'

interface FoodMultiSelectProps {
  value: string[]
  suggestions: string[]
  onChange: (foods: string[]) => void
  ariaInvalid?: boolean
  ariaDescribedby?: string
}

const PREFERRED_HEIGHT = 220

function sameFood(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export default function FoodMultiSelect({
  value,
  suggestions,
  onChange,
  ariaInvalid,
  ariaDescribedby,
}: FoodMultiSelectProps) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<'below' | 'above'>('below')
  const [maxHeight, setMaxHeight] = useState(PREFERRED_HEIGHT)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const blurTimer = useRef<number | null>(null)

  const query = text.trim().toLowerCase()
  const matches = suggestions.filter((s) => s.toLowerCase().includes(query)).slice(0, 8)

  // Choose where the list can open without blocking the form's action button.
  function choosePlacement() {
    const input = inputRef.current
    const wrapper = wrapperRef.current
    if (!input || !wrapper) {
      return
    }
    const modal = wrapper.closest('.modal') as HTMLElement | null
    const root = modal ?? document.documentElement
    const form = input.closest('form')
    const buttons = form ? Array.from(form.querySelectorAll('button')) : []
    const boundaryEl = buttons[buttons.length - 1] ?? modal ?? root

    const inputRect = input.getBoundingClientRect()
    const below = boundaryEl.getBoundingClientRect().top - inputRect.bottom - 4
    const above = inputRect.top - root.getBoundingClientRect().top

    if (below >= PREFERRED_HEIGHT) {
      setPlacement('below')
      setMaxHeight(PREFERRED_HEIGHT)
    } else if (above >= PREFERRED_HEIGHT) {
      setPlacement('above')
      setMaxHeight(PREFERRED_HEIGHT)
    } else if (below > 0) {
      setPlacement('below')
      setMaxHeight(Math.max(72, below))
    } else if (above > 0) {
      setPlacement('above')
      setMaxHeight(Math.max(72, above))
    } else {
      setPlacement('below')
      setMaxHeight(PREFERRED_HEIGHT)
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }
    choosePlacement()
    function onResize() {
      choosePlacement()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  // Close when interacting anywhere outside the picker so the form stays usable.
  useEffect(() => {
    if (!open) {
      return
    }
    function onPointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  function openSoon() {
    if (blurTimer.current !== null) {
      window.clearTimeout(blurTimer.current)
      blurTimer.current = null
    }
    setOpen(true)
  }

  function closeSoon() {
    if (blurTimer.current !== null) {
      window.clearTimeout(blurTimer.current)
    }
    blurTimer.current = window.setTimeout(() => setOpen(false), 150)
  }

  function commitText() {
    const next = text.trim()
    if (!next || value.some((f) => sameFood(f, next))) {
      return
    }
    onChange([...value, next])
    setText('')
  }

  function toggle(food: string) {
    if (value.some((f) => sameFood(f, food))) {
      onChange(value.filter((f) => !sameFood(f, food)))
    } else {
      onChange([...value, food])
    }
    setText('')
  }

  return (
    <div className="food-suggest" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          openSoon()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commitText()
            setOpen(false)
          }
        }}
        onBlur={() => {
          commitText()
          closeSoon()
        }}
        placeholder="Type a food, press Enter to add"
        autoComplete="off"
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        onFocus={openSoon}
      />
      {open && matches.length > 0 && (
        <ul
          className={`food-suggest-list${placement === 'above' ? ' food-suggest-list-above' : ''}`}
          style={{ maxHeight }}
        >
          {matches.map((s) => {
            const checked = value.some((f) => sameFood(f, s))
            return (
              <li key={s}>
                <label className="food-suggest-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onMouseDown={(e) => e.preventDefault()}
                    onChange={() => toggle(s)}
                  />
                  <span>{s}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
      {value.length > 0 && (
        <div className="food-tags">
          {value.map((f) => (
            <span key={f} className="food-tag">
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
    </div>
  )
}
