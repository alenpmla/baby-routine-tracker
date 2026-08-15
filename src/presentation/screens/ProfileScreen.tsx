import { useState, type FormEvent } from 'react'
import type { Baby, BabySex } from '../../domain/model/Baby'
import type { SaveBabyInput } from '../../domain/usecase/baby'
import type { WeightUnit } from '../../domain/model/WeightEntry'
import { BackIcon, CheckIcon } from '../components/icons'

const LB_TO_KG = 0.45359237

const SEX_OPTIONS: { value: BabySex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
]

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
  const [birthWeight, setBirthWeight] = useState(existing?.birthWeightKg != null ? String(existing.birthWeightKg) : '')
  const [birthWeightUnit, setBirthWeightUnit] = useState<WeightUnit>('kg')
  const [sex, setSex] = useState<BabySex | undefined>(existing?.sex)
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
    const input: SaveBabyInput = { name: trimmed, dob, notes, sex }
    if (birthWeight.trim() !== '') {
      const value = Number(birthWeight)
      if (Number.isFinite(value) && value > 0) {
        input.birthWeightKg = birthWeightUnit === 'kg' ? value : value * LB_TO_KG
      }
    }
    onSubmit(input)
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

      <div className="field">
        <span className="field-label">Sex (optional)</span>
        <div className="segmented segmented-3" role="group" aria-label="Sex">
          {SEX_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`seg${sex === value ? ' seg-selected' : ''}`}
              aria-pressed={sex === value}
              onClick={() => setSex(value)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className={`seg${sex === undefined ? ' seg-selected' : ''}`}
            aria-pressed={sex === undefined}
            onClick={() => setSex(undefined)}
          >
            Not set
          </button>
        </div>
      </div>

      <label className="field">
        <span className="field-label">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything we should remember?"
          rows={3}
        />
      </label>

      <div className="backfill-datetime settings-units">
        <label className="field">
          <span className="field-label">Birth weight (optional)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={birthWeight}
            onChange={(e) => setBirthWeight(e.target.value)}
            placeholder="e.g. 3.4"
          />
        </label>
        <label className="field">
          <span className="field-label">Unit</span>
          <select
            value={birthWeightUnit}
            onChange={(e) => {
              const unit = e.target.value as WeightUnit
              if (birthWeight.trim() !== '') {
                const value = Number(birthWeight)
                if (Number.isFinite(value) && value > 0) {
                  const converted =
                    unit === 'kg'
                      ? Math.round(value * LB_TO_KG * 100) / 100 // lb → kg
                      : Math.round((value / LB_TO_KG) * 100) / 100 // kg → lb
                  setBirthWeight(String(converted))
                }
              }
              setBirthWeightUnit(unit)
            }}
          >
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>
      </div>

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
          <p className="sub">Update your baby&rsquo;s details below.</p>
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
