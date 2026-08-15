import { useState } from 'react'
import type { MedicationEntry } from '../../domain/model/MedicationEntry'
import type { MedicationUnit } from '../../domain/model/MedicationEntry'
import type { TemperatureEntry } from '../../domain/model/TemperatureEntry'
import type { TemperatureLocation, TemperatureUnit } from '../../domain/model/TemperatureEntry'
import { useTracker } from '../store/TrackerProvider'
import { formatClock, formatDayLabel, startOfDay } from '../utils/time'
import { BackIcon, CopyIcon, EditIcon, PillIcon, ThermoIcon } from '../components/icons'
import DayNav from '../components/DayNav'
import Modal from '../components/Modal'
import StatTile from '../components/StatTile'
import {
  MedicationBackfillForm,
  TemperatureBackfillForm,
  type MedicationBackfillSubmit,
  type TemperatureBackfillSubmit,
} from '../components/BackfillForms'
import SwipeableRow from '../components/SwipeableRow'

type MedModal =
  | { mode: 'add' }
  | { mode: 'edit'; record: MedicationEntry }
  | { mode: 'duplicate'; record: MedicationEntry }

type TempModal =
  | { mode: 'add' }
  | { mode: 'edit'; record: TemperatureEntry }
  | { mode: 'duplicate'; record: TemperatureEntry }

const MED_UNITS: MedicationUnit[] = ['mg', 'ml', 'tsp', 'drops']

const TEMP_LOCATIONS: TemperatureLocation[] = ['rectal', 'axillary', 'ear', 'oral']

export default function MedicationFeverScreen({ onBack }: { onBack?: () => void }) {
  const {
    day,
    selectedDay,
    now,
    addMedication,
    removeMedication,
    updateMedicationRecord,
    addTemperature,
    removeTemperature,
    updateTemperatureRecord,
    latestTemperature,
  } = useTracker()
  const [medError, setMedError] = useState<string | null>(null)
  const [tempError, setTempError] = useState<string | null>(null)
  const [medModal, setMedModal] = useState<MedModal | null>(null)
  const [medModalError, setMedModalError] = useState<string | null>(null)
  const [tempModal, setTempModal] = useState<TempModal | null>(null)
  const [tempModalError, setTempModalError] = useState<string | null>(null)
  const [medName, setMedName] = useState('')
  const [medAmount, setMedAmount] = useState('')
  const [medUnit, setMedUnit] = useState<MedicationUnit | ''>('')
  const [tempValue, setTempValue] = useState('')
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>('c')
  const [tempLocation, setTempLocation] = useState<TemperatureLocation | ''>('')
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))
  const latest = latestTemperature()

  function handleMedQuickAdd() {
    setMedError(null)
    try {
      const hasAmount = medAmount.trim().length > 0
      addMedication(
        medName,
        undefined,
        hasAmount ? Number(medAmount) : undefined,
        hasAmount ? (medUnit as MedicationUnit) : '',
      )
      setMedName('')
      setMedAmount('')
      setMedUnit('')
    } catch (err) {
      setMedError(err instanceof Error ? err.message : 'Could not log medication')
    }
  }

  function handleTempQuickAdd() {
    setTempError(null)
    try {
      addTemperature(Number(tempValue), tempUnit, undefined, tempLocation || undefined)
      setTempValue('')
      setTempLocation('')
    } catch (err) {
      setTempError(err instanceof Error ? err.message : 'Could not log temperature')
    }
  }

  function handleMedSubmit(value: MedicationBackfillSubmit) {
    setMedModalError(null)
    try {
      if (medModal?.mode === 'edit') {
        updateMedicationRecord(medModal.record.id, {
          name: value.name,
          amount: value.amount,
          unit: value.unit,
          notes: value.notes,
          time: value.at,
        })
      } else {
        addMedication(value.name, value.at, value.amount, value.unit, value.notes)
      }
      setMedModal(null)
    } catch (err) {
      setMedModalError(err instanceof Error ? err.message : 'Could not save medication')
    }
  }

  function handleTempSubmit(value: TemperatureBackfillSubmit) {
    setTempModalError(null)
    try {
      if (tempModal?.mode === 'edit') {
        updateTemperatureRecord(tempModal.record.id, {
          temp: value.temp,
          unit: value.unit,
          location: value.location,
          notes: value.notes,
          time: value.at,
        })
      } else {
        addTemperature(value.temp, value.unit, value.at, value.location, value.notes)
      }
      setTempModal(null)
    } catch (err) {
      setTempModalError(err instanceof Error ? err.message : 'Could not save temperature')
    }
  }

  return (
    <div className="screen-content">
      <header className="screen-header">
        {onBack ? (
          <div className="header-row">
            <div className="header-leading">
              <button type="button" className="icon-btn back-btn" aria-label="Back" onClick={onBack}>
                <BackIcon />
              </button>
              <h1>Medication &amp; fever</h1>
            </div>
          </div>
        ) : (
          <h1>Medication &amp; fever</h1>
        )}
        <DayNav />
      </header>

      {latest && (
        <div className="stat-row">
          <StatTile
            accent="health"
            Icon={ThermoIcon}
            label="Latest temperature"
            value={`${latest.temp} °${latest.unit === 'c' ? 'C' : 'F'}`}
          />
        </div>
      )}

      <section className="card quick-add-card" aria-label="Log a medication dose">
        <div className="quick-add-head">
          <span className="quick-add-icon quick-add-health" aria-hidden="true">
            <PillIcon size={20} />
          </span>
          <div className="quick-add-head-text">
            <span className="quick-add-title">Medication</span>
            <p className="quick-add-sub">Log a dose now.</p>
          </div>
        </div>
        <label className="field field-block">
          <span className="field-label">Medication</span>
          <input
            type="text"
            value={medName}
            onChange={(e) => setMedName(e.target.value)}
            placeholder="e.g. Paracetamol"
          />
        </label>
        <div className="quick-add-row">
          <label className="field">
            <span className="field-label">Amount</span>
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={medAmount}
              onChange={(e) => setMedAmount(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <div className="field">
            <span className="field-label">Unit</span>
            <div className="chip-row chip-row-wrap" role="group" aria-label="Medication unit">
              {MED_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  className={`chip chip-small${medUnit === u ? ' chip-selected' : ''}`}
                  aria-pressed={medUnit === u}
                  onClick={() => setMedUnit(medUnit === u ? '' : u)}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
        {medError && (
          <p className="form-error" role="alert">
            {medError}
          </p>
        )}
        <div className="quick-add-actions">
          <button type="button" className="btn btn-primary" onClick={handleMedQuickAdd}>
            <PillIcon size={18} />
            Add medication
          </button>
          <button type="button" className="btn btn-outlined" onClick={() => setMedModal({ mode: 'add' })}>
            Add past dose
          </button>
        </div>
      </section>

      <section className="card quick-add-card" aria-label="Log a temperature reading">
        <div className="quick-add-head">
          <span className="quick-add-icon quick-add-health" aria-hidden="true">
            <ThermoIcon size={20} />
          </span>
          <div className="quick-add-head-text">
            <span className="quick-add-title">Temperature</span>
            <p className="quick-add-sub">Log a reading now.</p>
          </div>
        </div>
        <div className="quick-add-row">
          <label className="field">
            <span className="field-label">Temperature</span>
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              placeholder={tempUnit === 'c' ? '37.4' : '99.3'}
            />
          </label>
          <div className="field">
            <span className="field-label">Unit</span>
            <div className="segmented" role="group" aria-label="Temperature unit">
              <button
                type="button"
                className={`segment${tempUnit === 'c' ? ' segment-selected' : ''}`}
                aria-pressed={tempUnit === 'c'}
                onClick={() => setTempUnit('c')}
              >
                °C
              </button>
              <button
                type="button"
                className={`segment${tempUnit === 'f' ? ' segment-selected' : ''}`}
                aria-pressed={tempUnit === 'f'}
                onClick={() => setTempUnit('f')}
              >
                °F
              </button>
            </div>
          </div>
        </div>
        <div className="field">
          <span className="field-label">Location (optional)</span>
          <div className="chip-row chip-row-wrap" role="group" aria-label="Measurement location">
            {TEMP_LOCATIONS.map((l) => (
              <button
                key={l}
                type="button"
                className={`chip chip-small${tempLocation === l ? ' chip-selected' : ''}`}
                aria-pressed={tempLocation === l}
                onClick={() => setTempLocation(tempLocation === l ? '' : l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        {tempError && (
          <p className="form-error" role="alert">
            {tempError}
          </p>
        )}
        <div className="quick-add-actions">
          <button type="button" className="btn btn-primary" onClick={handleTempQuickAdd}>
            <ThermoIcon size={18} />
            Add temperature
          </button>
          <button type="button" className="btn btn-outlined" onClick={() => setTempModal({ mode: 'add' })}>
            Add past temperature
          </button>
        </div>
      </section>

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.medications.length === 0 && day.temperatures.length === 0 ? (
          <div className="empty">
            <p>No medication or temperature recorded for this day.</p>
          </div>
        ) : (
          <ul className="event-list">
            {day.medications.map((m) => (
              <SwipeableRow
                key={m.id}
                id={`med-${m.id}`}
                deleteLabel={`Delete medication ${formatClock(m.time)}`}
                onDelete={() => removeMedication(m.id)}
                secondaryAction={{
                  label: `Duplicate medication ${formatClock(m.time)}`,
                  icon: <CopyIcon />,
                  onActivate: () => setMedModal({ mode: 'duplicate', record: m }),
                }}
              >
                <span className="event-icon event-health">
                  <PillIcon size={18} />
                </span>
                <span className="event-body">
                  <span className="event-title">{m.name}</span>
                  <span className="event-meta">
                    {formatClock(m.time)}
                    {m.amount !== undefined ? ` · ${m.amount} ${m.unit}` : ''}
                    {m.notes ? ` · ${m.notes}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit medication ${formatClock(m.time)}`}
                  onClick={() => setMedModal({ mode: 'edit', record: m })}
                >
                  <EditIcon />
                </button>
              </SwipeableRow>
            ))}
            {day.temperatures.map((tp) => (
              <SwipeableRow
                key={tp.id}
                id={`temp-${tp.id}`}
                deleteLabel={`Delete temperature ${formatClock(tp.time)}`}
                onDelete={() => removeTemperature(tp.id)}
                secondaryAction={{
                  label: `Duplicate temperature ${formatClock(tp.time)}`,
                  icon: <CopyIcon />,
                  onActivate: () => setTempModal({ mode: 'duplicate', record: tp }),
                }}
              >
                <span className="event-icon event-health">
                  <ThermoIcon size={18} />
                </span>
                <span className="event-body">
                  <span className="event-title">
                    {tp.temp} °{tp.unit === 'c' ? 'C' : 'F'}
                  </span>
                  <span className="event-meta">
                    {formatClock(tp.time)}
                    {tp.location ? ` · ${tp.location}` : ''}
                    {tp.notes ? ` · ${tp.notes}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit temperature ${formatClock(tp.time)}`}
                  onClick={() => setTempModal({ mode: 'edit', record: tp })}
                >
                  <EditIcon />
                </button>
              </SwipeableRow>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={medModal !== null}
        title={medModal?.mode === 'edit' ? 'Edit medication' : 'Add past dose'}
        onClose={() => setMedModal(null)}
      >
        {medModal && (
          <>
            <MedicationBackfillForm
              submitLabel={medModal.mode === 'edit' ? 'Save changes' : 'Save medication'}
              initial={
                medModal.mode === 'edit'
                  ? {
                      at: new Date(medModal.record.time),
                      name: medModal.record.name,
                      amount: medModal.record.amount,
                      unit: medModal.record.unit,
                      notes: medModal.record.notes,
                    }
                  : medModal.mode === 'duplicate'
                    ? {
                        at: new Date(),
                        name: medModal.record.name,
                        amount: medModal.record.amount,
                        unit: medModal.record.unit,
                        notes: medModal.record.notes,
                      }
                    : undefined
              }
              onSubmit={handleMedSubmit}
            />
            {medModalError && (
              <p className="form-error" role="alert">
                {medModalError}
              </p>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={tempModal !== null}
        title={tempModal?.mode === 'edit' ? 'Edit temperature' : 'Add past temperature'}
        onClose={() => setTempModal(null)}
      >
        {tempModal && (
          <>
            <TemperatureBackfillForm
              submitLabel={tempModal.mode === 'edit' ? 'Save changes' : 'Save temperature'}
              initial={
                tempModal.mode === 'edit'
                  ? {
                      at: new Date(tempModal.record.time),
                      temp: tempModal.record.temp,
                      unit: tempModal.record.unit,
                      location: tempModal.record.location,
                      notes: tempModal.record.notes,
                    }
                  : tempModal.mode === 'duplicate'
                    ? {
                        at: new Date(),
                        temp: tempModal.record.temp,
                        unit: tempModal.record.unit,
                        location: tempModal.record.location,
                        notes: tempModal.record.notes,
                      }
                    : undefined
              }
              onSubmit={handleTempSubmit}
            />
            {tempModalError && (
              <p className="form-error" role="alert">
                {tempModalError}
              </p>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
