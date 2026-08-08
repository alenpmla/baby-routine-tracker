import { useState, type FormEvent } from 'react'
import { combineLocalDateTime, toInputDate, toInputTime } from '../utils/time'
import type { BottleFieldErrors, FeedingDetails, SolidsFieldErrors } from '../../domain/usecase/feeding'
import { validateBottleDetails, validateSolidsDetails } from '../../domain/usecase/feeding'
import type { WeightUnit } from '../../domain/model/WeightEntry'
import SolidsFields from './SolidsFields'
import BottleFields from './BottleFields'

export interface BackfillOption {
  id: string
  label: string
}

interface DateTimeFieldProps {
  date: string
  time: string
  maxDate: string
  onDate: (value: string) => void
  onTime: (value: string) => void
}

function DateTimeFields({ date, time, maxDate, onDate, onTime }: DateTimeFieldProps) {
  return (
    <div className="backfill-datetime">
      <label className="field">
        <span className="field-label">Date</span>
        <input type="date" value={date} max={maxDate} onChange={(e) => onDate(e.target.value)} required />
      </label>
      <label className="field">
        <span className="field-label">Time</span>
        <input type="time" value={time} onChange={(e) => onTime(e.target.value)} required />
      </label>
    </div>
  )
}

interface FeedDiaperBackfillFormProps {
  options: BackfillOption[]
  submitLabel: string
  showSolidsDetails?: boolean
  showBreastTiming?: boolean
  showBottleDetails?: boolean
  suggestions?: string[]
  initial?: { type: string; at: Date; details?: FeedingDetails }
  onSubmit: (type: string, at: Date, details?: FeedingDetails) => void
}

export function FeedDiaperBackfillForm({
  options,
  submitLabel,
  showSolidsDetails = false,
  showBreastTiming = false,
  showBottleDetails = false,
  suggestions = [],
  initial,
  onSubmit,
}: FeedDiaperBackfillFormProps) {
  const now = new Date()
  const initialEnd = initial?.details?.endTime ? new Date(initial.details.endTime) : undefined
  const [type, setType] = useState(initial?.type ?? options[0]?.id ?? '')
  const [date, setDate] = useState(toInputDate(initial?.at ?? now))
  const [time, setTime] = useState(toInputTime(initial?.at ?? now))
  const [endDate, setEndDate] = useState(toInputDate(initialEnd ?? now))
  const [endTime, setEndTime] = useState(toInputTime(initialEnd ?? now))
  const [solidsDetails, setSolidsDetails] = useState<FeedingDetails>(initial?.details ?? {})
  const [solidsErrors, setSolidsErrors] = useState<SolidsFieldErrors>({})
  const [bottleDetails, setBottleDetails] = useState<FeedingDetails>(initial?.details ?? {})
  const [bottleErrors, setBottleErrors] = useState<BottleFieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const maxDate = toInputDate(now)

  const isSolids = showSolidsDetails && type === 'solids'
  const isBreast = showBreastTiming && type === 'breast'
  const isBottle = showBottleDetails && type === 'bottle'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!type) {
      setError('Please choose a type')
      return
    }
    if (!date || !time) {
      setError('Please choose a start date and time')
      return
    }
    const at = combineLocalDateTime(date, time)
    if (Number.isNaN(at.getTime()) || at.getTime() > Date.now()) {
      setError('That date and time is in the future')
      return
    }
    if (isBreast) {
      if (!endDate || !endTime) {
        setError('Please choose an end date and time')
        return
      }
      const end = combineLocalDateTime(endDate, endTime)
      if (Number.isNaN(end.getTime())) {
        setError('Please enter a valid end time')
        return
      }
      if (at.getTime() >= end.getTime()) {
        setError('End time must be after start time')
        return
      }
      if (end.getTime() > Date.now()) {
        setError('That date and time is in the future')
        return
      }
      setError(null)
      onSubmit(type, at, { startTime: at, endTime: end })
      return
    }
    if (isBottle) {
      const errs = validateBottleDetails(bottleDetails)
      if (Object.keys(errs).length > 0) {
        setBottleErrors(errs)
        return
      }
      setBottleErrors({})
      setError(null)
      onSubmit(type, at, { amount: bottleDetails.amount, unit: bottleDetails.unit })
      return
    }
    if (isSolids) {
      const errs = validateSolidsDetails(solidsDetails)
      if (Object.keys(errs).length > 0) {
        setSolidsErrors(errs)
        return
      }
      setSolidsErrors({})
    }
    setError(null)
    onSubmit(type, at, isSolids ? solidsDetails : undefined)
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="chip-row">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`chip${type === o.id ? ' chip-selected' : ''}`}
            onClick={() => {
              setType(o.id)
              setSolidsErrors({})
              setBottleErrors({})
              setError(null)
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      {isBreast ? (
        <>
          <div className="backfill-block">
            <p className="backfill-block-label">Started</p>
            <DateTimeFields date={date} time={time} maxDate={maxDate} onDate={setDate} onTime={setTime} />
          </div>
          <div className="backfill-block">
            <p className="backfill-block-label">Ended</p>
            <DateTimeFields date={endDate} time={endTime} maxDate={maxDate} onDate={setEndDate} onTime={setEndTime} />
          </div>
        </>
      ) : (
        <DateTimeFields date={date} time={time} maxDate={maxDate} onDate={setDate} onTime={setTime} />
      )}
      {isBottle && <BottleFields value={bottleDetails} errors={bottleErrors} onChange={setBottleDetails} />}
      {isSolids && (
        <SolidsFields
          value={solidsDetails}
          errors={solidsErrors}
          suggestions={suggestions}
          onChange={setSolidsDetails}
        />
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block">
        {submitLabel}
      </button>
    </form>
  )
}

export type SleepBackfillSubmit =
  | { kind: 'ongoing'; start: Date }
  | { kind: 'completed'; start: Date; end: Date }

interface SleepBackfillFormProps {
  submitLabel: string
  initial?: { start: Date; end: Date | null }
  onSubmit: (value: SleepBackfillSubmit) => void
}

export function SleepBackfillForm({ submitLabel, initial, onSubmit }: SleepBackfillFormProps) {
  const now = new Date()
  const [mode, setMode] = useState<'ongoing' | 'completed'>(
    initial ? (initial.end === null ? 'ongoing' : 'completed') : 'ongoing',
  )
  const [startDate, setStartDate] = useState(toInputDate(initial?.start ?? now))
  const [startTime, setStartTime] = useState(toInputTime(initial?.start ?? now))
  const [endDate, setEndDate] = useState(toInputDate(initial?.end ?? now))
  const [endTime, setEndTime] = useState(toInputTime(initial?.end ?? now))
  const [error, setError] = useState<string | null>(null)
  const maxDate = toInputDate(now)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!startDate || !startTime) {
      setError('Please choose a start date and time')
      return
    }
    const start = combineLocalDateTime(startDate, startTime)
    if (Number.isNaN(start.getTime())) {
      setError('Please enter a valid time')
      return
    }
    if (start.getTime() > Date.now()) {
      setError('That date and time is in the future')
      return
    }
    if (mode === 'ongoing') {
      setError(null)
      onSubmit({ kind: 'ongoing', start })
      return
    }
    if (!endDate || !endTime) {
      setError('Please choose an end date and time')
      return
    }
    const end = combineLocalDateTime(endDate, endTime)
    if (Number.isNaN(end.getTime())) {
      setError('Please enter a valid time')
      return
    }
    if (start.getTime() >= end.getTime()) {
      setError('End time must be after start time')
      return
    }
    if (end.getTime() > Date.now()) {
      setError('That date and time is in the future')
      return
    }
    setError(null)
    onSubmit({ kind: 'completed', start, end })
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {!initial && (
        <div className="segmented" aria-label="Sleep status">
          <button
            type="button"
            className={`seg${mode === 'ongoing' ? ' seg-selected' : ''}`}
            onClick={() => setMode('ongoing')}
          >
            Still sleeping
          </button>
          <button
            type="button"
            className={`seg${mode === 'completed' ? ' seg-selected' : ''}`}
            onClick={() => setMode('completed')}
          >
            Completed
          </button>
        </div>
      )}
      <div className="backfill-block">
        <p className="backfill-block-label">Started</p>
        <DateTimeFields
          date={startDate}
          time={startTime}
          maxDate={maxDate}
          onDate={setStartDate}
          onTime={setStartTime}
        />
      </div>
      {mode === 'completed' && (
        <div className="backfill-block">
          <p className="backfill-block-label">Ended</p>
          <DateTimeFields
            date={endDate}
            time={endTime}
            maxDate={maxDate}
            onDate={setEndDate}
            onTime={setEndTime}
          />
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block">
        {submitLabel}
      </button>
    </form>
  )
}

export interface WeightBackfillSubmit {
  at: Date
  weight: number
  unit: WeightUnit
}

interface WeightBackfillFormProps {
  submitLabel: string
  initial?: { at: Date; weight: number; unit: WeightUnit }
  onSubmit: (value: WeightBackfillSubmit) => void
}

export function WeightBackfillForm({ submitLabel, initial, onSubmit }: WeightBackfillFormProps) {
  const now = new Date()
  const [date, setDate] = useState(toInputDate(initial?.at ?? now))
  const [time, setTime] = useState(toInputTime(initial?.at ?? now))
  const [weight, setWeight] = useState(initial ? String(initial.weight) : '')
  const [unit, setUnit] = useState<WeightUnit>(initial?.unit ?? 'kg')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!date || !time) {
      setError('Please choose a date and time')
      return
    }
    const at = combineLocalDateTime(date, time)
    if (Number.isNaN(at.getTime()) || at.getTime() > Date.now()) {
      setError('That date and time is in the future')
      return
    }
    const w = Number(weight)
    if (!Number.isFinite(w) || w <= 0) {
      setError('Weight must be a positive number')
      return
    }
    setError(null)
    onSubmit({ at, weight: w, unit })
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="backfill-datetime">
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" value={date} max={toInputDate(now)} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
      </div>
      <div className="backfill-datetime">
        <label className="field">
          <span className="field-label">Weight</span>
          <input
            type="number"
            min="0.01"
            step="any"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Unit</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as WeightUnit)}>
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
        {submitLabel}
      </button>
    </form>
  )
}
