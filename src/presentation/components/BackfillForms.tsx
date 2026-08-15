import { useState, type FormEvent } from 'react'
import { combineLocalDateTime, toInputDate, toInputTime } from '../utils/time'
import type { BottleFieldErrors, FeedingDetails, SolidsFieldErrors } from '../../domain/usecase/feeding'
import { validateBottleDetails, validateSolidsDetails } from '../../domain/usecase/feeding'
import type { WeightUnit } from '../../domain/model/WeightEntry'
import type { HeadCircumferenceUnit } from '../../domain/model/HeadCircumferenceEntry'
import type { ToothName } from '../../domain/model/ToothEntry'
import { TOOTH_NAMES } from '../../domain/model/ToothEntry'
import type { MedicationUnit } from '../../domain/model/MedicationEntry'
import type { TemperatureLocation, TemperatureUnit } from '../../domain/model/TemperatureEntry'
import type { MilestoneName } from '../../domain/model/MilestoneEntry'
import { MILESTONES } from '../../domain/model/MilestoneEntry'
import type { TeethingSymptom } from '../../domain/model/TeethingDay'
import { TEETHING_SYMPTOMS } from '../../domain/model/TeethingDay'
import { inferSleepKind } from '../../domain/model/SleepSession'
import type { SleepKind } from '../../domain/model/SleepSession'
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
  mostUsed?: string[]
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
  mostUsed,
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
          mostUsed={mostUsed}
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
  | { kind: 'ongoing'; start: Date; sleepKind: SleepKind }
  | { kind: 'completed'; start: Date; end: Date; sleepKind: SleepKind }

interface SleepBackfillFormProps {
  submitLabel: string
  initial?: { start: Date; end: Date | null; kind?: SleepKind }
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
  const [selectedKind, setSelectedKind] = useState<SleepKind | null>(initial?.kind ?? null)
  const [error, setError] = useState<string | null>(null)
  const maxDate = toInputDate(now)

  // Default follows the inference rule for the chosen start time until the
  // user explicitly picks a kind. An ongoing sleep has no end time, so the
  // domain inference classifies it as a nap unless a kind is chosen.
  const startDateTime = combineLocalDateTime(startDate, startTime || '00:00')
  const inferredKind =
    startDate && !Number.isNaN(startDateTime.getTime())
      ? inferSleepKind({
          id: '',
          startTime: startDateTime.toISOString(),
          endTime: mode === 'completed' ? startDateTime.toISOString() : null,
        })
      : 'nap'
  const sleepKind: SleepKind = selectedKind ?? inferredKind

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
      onSubmit({ kind: 'ongoing', start, sleepKind })
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
    onSubmit({ kind: 'completed', start, end, sleepKind })
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
      <div className="chip-row" aria-label="Sleep kind">
        {(['nap', 'night'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            className={`chip${sleepKind === kind ? ' chip-selected' : ''}`}
            aria-pressed={sleepKind === kind}
            onClick={() => {
              setSelectedKind(kind)
              setError(null)
            }}
          >
            {kind === 'nap' ? 'Nap' : 'Night'}
          </button>
        ))}
      </div>
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

export interface HeadCircumferenceBackfillSubmit {
  at: Date
  value: number
  unit: HeadCircumferenceUnit
}

interface HeadCircumferenceBackfillFormProps {
  submitLabel: string
  initial?: { at: Date; value: number; unit: HeadCircumferenceUnit }
  onSubmit: (value: HeadCircumferenceBackfillSubmit) => void
}

export function HeadCircumferenceBackfillForm({ submitLabel, initial, onSubmit }: HeadCircumferenceBackfillFormProps) {
  const now = new Date()
  const [date, setDate] = useState(toInputDate(initial?.at ?? now))
  const [time, setTime] = useState(toInputTime(initial?.at ?? now))
  const [value, setValue] = useState(initial ? String(initial.value) : '')
  const [unit, setUnit] = useState<HeadCircumferenceUnit>(initial?.unit ?? 'cm')
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
    const v = Number(value)
    if (!Number.isFinite(v) || v <= 0) {
      setError('Head circumference must be a positive number')
      return
    }
    setError(null)
    onSubmit({ at, value: v, unit })
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
          <span className="field-label">Head circumference</span>
          <input
            type="number"
            min="0.01"
            step="any"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Unit</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as HeadCircumferenceUnit)}>
            <option value="cm">cm</option>
            <option value="in">in</option>
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

export interface MedicationBackfillSubmit {
  at: Date
  name: string
  amount?: number
  unit: MedicationUnit
  notes?: string
}

interface MedicationBackfillFormProps {
  submitLabel: string
  initial?: { at: Date; name: string; amount?: number; unit: MedicationUnit; notes?: string }
  onSubmit: (value: MedicationBackfillSubmit) => void
}

const MED_UNIT_OPTIONS: { value: MedicationUnit; label: string }[] = [
  { value: 'mg', label: 'mg' },
  { value: 'ml', label: 'ml' },
  { value: 'tsp', label: 'tsp' },
  { value: 'drops', label: 'drops' },
]

export function MedicationBackfillForm({ submitLabel, initial, onSubmit }: MedicationBackfillFormProps) {
  const now = new Date()
  const [date, setDate] = useState(toInputDate(initial?.at ?? now))
  const [time, setTime] = useState(toInputTime(initial?.at ?? now))
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial?.amount !== undefined ? String(initial.amount) : '')
  const [unit, setUnit] = useState<MedicationUnit>(initial?.unit ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
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
    if (!name.trim()) {
      setError('Medication name is required')
      return
    }
    const hasAmount = amount.trim().length > 0
    const amountValue = hasAmount ? Number(amount) : undefined
    if (hasAmount && (!Number.isFinite(amountValue) || amountValue! < 0)) {
      setError('Amount must be a non-negative number')
      return
    }
    if (hasAmount && unit === '') {
      setError('Choose a unit for the amount')
      return
    }
    if (!hasAmount && unit !== '') {
      setError('Amount is required when a unit is chosen')
      return
    }
    setError(null)
    onSubmit({ at, name: name.trim(), ...(hasAmount ? { amount: amountValue } : {}), unit, notes: notes.trim() ? notes.trim() : undefined })
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Medication</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paracetamol" />
      </label>
      <div className="backfill-datetime">
        <label className="field">
          <span className="field-label">Amount (optional)</span>
          <input type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Unit</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as MedicationUnit)}>
            <option value="">—</option>
            {MED_UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
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
      <label className="field">
        <span className="field-label">Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
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

export interface TemperatureBackfillSubmit {
  at: Date
  temp: number
  unit: TemperatureUnit
  location?: TemperatureLocation
  notes?: string
}

interface TemperatureBackfillFormProps {
  submitLabel: string
  initial?: { at: Date; temp: number; unit: TemperatureUnit; location?: TemperatureLocation; notes?: string }
  onSubmit: (value: TemperatureBackfillSubmit) => void
}

const TEMP_LOCATIONS: TemperatureLocation[] = ['rectal', 'axillary', 'ear', 'oral']

export function TemperatureBackfillForm({ submitLabel, initial, onSubmit }: TemperatureBackfillFormProps) {
  const now = new Date()
  const [date, setDate] = useState(toInputDate(initial?.at ?? now))
  const [time, setTime] = useState(toInputTime(initial?.at ?? now))
  const [temp, setTemp] = useState(initial ? String(initial.temp) : '')
  const [unit, setUnit] = useState<TemperatureUnit>(initial?.unit ?? 'c')
  const [location, setLocation] = useState<TemperatureLocation | ''>(initial?.location ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
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
    const value = Number(temp)
    if (!Number.isFinite(value)) {
      setError('Temperature must be a number')
      return
    }
    if (unit === 'c' && (value < 30 || value > 45)) {
      setError('Temperature must be between 30–45 °C')
      return
    }
    if (unit === 'f' && (value < 86 || value > 113)) {
      setError('Temperature must be between 86–113 °F')
      return
    }
    setError(null)
    onSubmit({ at, temp: value, unit, ...(location ? { location } : {}), notes: notes.trim() ? notes.trim() : undefined })
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="backfill-datetime">
        <label className="field">
          <span className="field-label">Temperature</span>
          <input type="number" min="0" step="any" inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Unit</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as TemperatureUnit)}>
            <option value="c">°C</option>
            <option value="f">°F</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span className="field-label">Location (optional)</span>
        <select value={location} onChange={(e) => setLocation(e.target.value as TemperatureLocation | '')}>
          <option value="">—</option>
          {TEMP_LOCATIONS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
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
      <label className="field">
        <span className="field-label">Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
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

export interface ToothBackfillSubmit {
  at: Date
  tooth: ToothName
  notes?: string
}

interface ToothBackfillFormProps {
  submitLabel: string
  initial?: { at: Date; tooth: ToothName; notes?: string }
  onSubmit: (value: ToothBackfillSubmit) => void
}

export function ToothBackfillForm({ submitLabel, initial, onSubmit }: ToothBackfillFormProps) {
  const now = new Date()
  const [date, setDate] = useState(toInputDate(initial?.at ?? now))
  const [time, setTime] = useState(toInputTime(initial?.at ?? now))
  const [tooth, setTooth] = useState<ToothName>(initial?.tooth ?? TOOTH_NAMES[0])
  const [notes, setNotes] = useState(initial?.notes ?? '')
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
    setError(null)
    onSubmit({ at, tooth, notes: notes.trim() ? notes.trim() : undefined })
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="backfill-datetime">
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Tooth</span>
        <select value={tooth} onChange={(e) => setTooth(e.target.value as ToothName)}>
          {TOOTH_NAMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
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

export interface MilestoneBackfillSubmit {
  at: Date
  milestone: string
  notes?: string
}

interface MilestoneBackfillFormProps {
  submitLabel: string
  initial?: { at: Date; milestone: string; notes?: string }
  onSubmit: (value: MilestoneBackfillSubmit) => void
  /** Curated milestones to offer; defaults to the full list. Pass only unachieved ones for add flows. */
  options?: readonly string[]
}

export function MilestoneBackfillForm({ submitLabel, initial, onSubmit, options }: MilestoneBackfillFormProps) {
  const now = new Date()
  const [date, setDate] = useState(toInputDate(initial?.at ?? now))
  const [time, setTime] = useState(toInputTime(initial?.at ?? now))
  const list = options ?? MILESTONES
  const [milestone, setMilestone] = useState<string>(initial?.milestone ?? list[0])
  const [custom, setCustom] = useState(
    initial && !(MILESTONES as readonly string[]).includes(initial.milestone) ? initial.milestone : '',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const isCustom = custom.trim().length > 0

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
    const value = isCustom ? custom.trim() : milestone
    if (!value) {
      setError('Milestone name is required')
      return
    }
    setError(null)
    onSubmit({ at, milestone: value, notes: notes.trim() ? notes.trim() : undefined })
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="backfill-datetime">
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Milestone</span>
        <select value={milestone} onChange={(e) => setMilestone(e.target.value as MilestoneName)} disabled={isCustom}>
          {list.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Or custom (optional)</span>
        <input type="text" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Waves goodbye" />
      </label>
      <label className="field">
        <span className="field-label">Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
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

export interface TeethingDayFormSubmit {
  day: string
  symptoms: TeethingSymptom[]
  notes?: string
}

interface TeethingDayFormProps {
  submitLabel: string
  initial?: { day: string; symptoms: TeethingSymptom[]; notes?: string }
  onSubmit: (value: TeethingDayFormSubmit) => void
}

export function TeethingDayForm({ submitLabel, initial, onSubmit }: TeethingDayFormProps) {
  const now = new Date()
  const [day, setDay] = useState(initial?.day ?? toInputDate(now))
  const [symptoms, setSymptoms] = useState<TeethingSymptom[]>(initial?.symptoms ?? [])
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  function toggleSymptom(symptom: TeethingSymptom) {
    setSymptoms((cur) => (cur.includes(symptom) ? cur.filter((s) => s !== symptom) : [...cur, symptom]))
    setError(null)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!day) {
      setError('Please choose a date')
      return
    }
    if (symptoms.length === 0) {
      setError('Choose at least one symptom')
      return
    }
    if (day > toInputDate(new Date())) {
      setError('Cannot log a teething day in the future')
      return
    }
    setError(null)
    onSubmit({ day, symptoms, notes: notes.trim() ? notes.trim() : undefined })
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Date</span>
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} required />
      </label>
      <div className="chip-row" aria-label="Symptoms">
        {TEETHING_SYMPTOMS.map((symptom) => (
          <button
            key={symptom}
            type="button"
            className={`chip${symptoms.includes(symptom) ? ' chip-selected' : ''}`}
            aria-pressed={symptoms.includes(symptom)}
            onClick={() => toggleSymptom(symptom)}
          >
            {symptom}
          </button>
        ))}
      </div>
      <label className="field">
        <span className="field-label">Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
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
