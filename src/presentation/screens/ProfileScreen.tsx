import { useState, type FormEvent } from 'react'
import type { Baby } from '../../domain/model/Baby'
import type { SaveBabyInput } from '../../domain/usecase/baby'
import { BackIcon, CheckIcon } from '../components/icons'

interface ProfileScreenProps {
  existing?: Baby | null
  onSubmit: (input: SaveBabyInput) => void
  /** When set, renders as an embedded sub-screen (Settings) with a leading back button. */
  onBack?: () => void
}

export default function ProfileScreen({ existing, onSubmit, onBack }: ProfileScreenProps) {
  const [name, setName] = useState(existing?.name ?? '')
  const [dob, setDob] = useState(existing?.dob ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Please enter your baby\u2019s name')
      return
    }
    if (!dob) {
      setError('Please enter your baby\u2019s date of birth')
      return
    }
    setError(null)
    onSubmit({ name: trimmed, dob, notes })
  }

  const form = (
    <form className="card form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Avery"
          autoComplete="off"
        />
      </label>

      <label className="field">
        <span className="field-label">Date of birth</span>
        <input
          type="date"
          value={dob}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDob(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="field-label">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything we should remember?"
          rows={3}
        />
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-block">
        <CheckIcon />
        {existing ? 'Save changes' : 'Continue'}
      </button>
    </form>
  )

  if (onBack) {
    return (
      <div className="screen-content">
        <header className="screen-header">
          <div className="header-row">
            <div className="header-leading">
              <button type="button" className="icon-btn back-btn" aria-label="Back" onClick={onBack}>
                <BackIcon />
              </button>
              <h1>Edit profile</h1>
            </div>
          </div>
          <p className="sub">Update your baby\u2019s details below.</p>
        </header>
        {form}
      </div>
    )
  }

  return (
    <div className="profile">
      <header className="profile-header">
        <h1>{existing ? 'Edit profile' : 'Welcome to Baby Tracker'}</h1>
        <p>{existing ? 'Update your baby\u2019s details below.' : 'Tell us a little about your baby to get started.'}</p>
      </header>
      {form}
    </div>
  )
}
