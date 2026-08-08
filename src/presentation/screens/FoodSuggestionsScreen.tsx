import { useState } from 'react'
import { useTracker } from '../store/TrackerProvider'
import { BackIcon, TrashIcon } from '../components/icons'

export default function FoodSuggestionsScreen({ onBack }: { onBack: () => void }) {
  const { foodSuggestions, addSuggestion, removeSuggestion } = useTracker()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    setError(null)
    try {
      addSuggestion(value)
      setValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add suggestion')
    }
  }

  return (
    <div className="screen-content">
      <header className="screen-header">
        <div className="header-row">
          <div className="header-leading">
            <button type="button" className="icon-btn back-btn" aria-label="Back" onClick={onBack}>
              <BackIcon />
            </button>
            <h1>Food suggestions</h1>
          </div>
        </div>
        <p className="sub">Foods shown while typing the solids Food field</p>
      </header>

      <div className="card">
        <p className="settings-hint">Add a food name; suggestions appear while typing the Food field.</p>
        <div className="settings-add">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. Sweet potato"
            aria-label="New food suggestion"
          />
          <button type="button" className="btn btn-primary" onClick={handleAdd}>
            Add
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <section className="timeline">
        <h2>Suggestions</h2>
        {foodSuggestions.length === 0 ? (
          <div className="empty">
            <p>No suggestions yet. Add one above.</p>
          </div>
        ) : (
          <ul className="event-list">
            {foodSuggestions.map((s) => (
              <li key={s} className="card event">
                <span className="event-body">
                  <span className="event-title">{s}</span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Remove ${s}`}
                  onClick={() => removeSuggestion(s)}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
