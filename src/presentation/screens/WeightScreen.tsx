import { useState } from 'react'
import type { WeightEntry, WeightUnit } from '../../domain/model/WeightEntry'
import { useTracker } from '../store/TrackerProvider'
import { formatClock, formatDayLabel, startOfDay } from '../utils/time'
import { EditIcon, ScaleIcon } from '../components/icons'
import DayNav from '../components/DayNav'
import Modal from '../components/Modal'
import StatTile from '../components/StatTile'
import { WeightBackfillForm, type WeightBackfillSubmit } from '../components/BackfillForms'
import SwipeableRow from '../components/SwipeableRow'

type WeightModal = { mode: 'add' } | { mode: 'edit'; record: WeightEntry }

export default function WeightScreen() {
  const { day, addWeight, removeWeight, updateWeightRecord, latestWeight, selectedDay, now } = useTracker()
  const [error, setError] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<WeightUnit>('kg')
  const [weightModal, setWeightModal] = useState<WeightModal | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))
  const latest = latestWeight()

  function handleAdd() {
    setError(null)
    try {
      addWeight(Number(value), unit)
      setValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log weight')
    }
  }

  function handleSubmit(value: WeightBackfillSubmit) {
    setBackfillError(null)
    try {
      if (weightModal?.mode === 'edit') {
        updateWeightRecord(weightModal.record.id, value.weight, value.unit, value.at)
      } else {
        addWeight(value.weight, value.unit, value.at)
      }
      setWeightModal(null)
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Could not save weight')
    }
  }

  return (
    <div className="screen-content">
      <header className="screen-header">
        <h1>Weight</h1>
        <DayNav />
      </header>

      {latest && (
        <div className="stat-row">
          <StatTile
            accent="weight"
            Icon={ScaleIcon}
            label="Latest weight"
            value={`${latest.weight} ${latest.unit}`}
          />
        </div>
      )}

      <div className="card weight-card">
        <ScaleIcon size={32} />
        <p className="sleep-hint">Log today&apos;s weight.</p>
        <div className="backfill-datetime">
          <label className="field">
            <span className="field-label">Weight</span>
            <input
              type="number"
              min="0.01"
              step="any"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
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
        <button type="button" className="btn btn-primary btn-block" onClick={handleAdd}>
          Add weight
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setWeightModal({ mode: 'add' })}>
          Add past weight
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.weights.length === 0 ? (
          <div className="empty">
            <p>No weight recorded for this day.</p>
          </div>
        ) : (
          <ul className="event-list">
            {day.weights.map((w) => (
              <SwipeableRow
                key={w.id}
                id={w.id}
                deleteLabel={`Delete weight ${formatClock(w.time)}`}
                onDelete={() => removeWeight(w.id)}
              >
                <span className="event-icon event-weight">
                  <ScaleIcon size={18} />
                </span>
                <span className="event-body">
                  <span className="event-title">Weight</span>
                  <span className="event-meta">
                    {formatClock(w.time)} · {w.weight} {w.unit}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit weight ${formatClock(w.time)}`}
                  onClick={() => setWeightModal({ mode: 'edit', record: w })}
                >
                  <EditIcon />
                </button>
              </SwipeableRow>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={weightModal !== null}
        title={weightModal?.mode === 'edit' ? 'Edit weight' : 'Add past weight'}
        onClose={() => setWeightModal(null)}
      >
        {weightModal && (
          <>
            <WeightBackfillForm
              submitLabel={weightModal.mode === 'edit' ? 'Save changes' : 'Save weight'}
              initial={
                weightModal.mode === 'edit'
                  ? {
                      at: new Date(weightModal.record.time),
                      weight: weightModal.record.weight,
                      unit: weightModal.record.unit,
                    }
                  : undefined
              }
              onSubmit={handleSubmit}
            />
            {backfillError && (
              <p className="form-error" role="alert">
                {backfillError}
              </p>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
