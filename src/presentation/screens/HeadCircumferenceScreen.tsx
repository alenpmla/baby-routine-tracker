import { useState } from 'react'
import type { HeadCircumferenceEntry, HeadCircumferenceUnit } from '../../domain/model/HeadCircumferenceEntry'
import { useTracker } from '../store/TrackerProvider'
import { formatClock, formatDayLabel, startOfDay } from '../utils/time'
import { CopyIcon, EditIcon, BackIcon, RulerIcon } from '../components/icons'
import DayNav from '../components/DayNav'
import Modal from '../components/Modal'
import StatTile from '../components/StatTile'
import { HeadCircumferenceBackfillForm, type HeadCircumferenceBackfillSubmit } from '../components/BackfillForms'
import SwipeableRow from '../components/SwipeableRow'

type HeadCircumferenceModal =
  | { mode: 'add' }
  | { mode: 'edit'; record: HeadCircumferenceEntry }
  | { mode: 'duplicate'; record: HeadCircumferenceEntry }

export default function HeadCircumferenceScreen({ onBack }: { onBack?: () => void }) {
  const { day, addHeadCircumference, removeHeadCircumference, updateHeadCircumferenceRecord, latestHeadCircumference, selectedDay, now } =
    useTracker()
  const [error, setError] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<HeadCircumferenceUnit>('cm')
  const [hcModal, setHcModal] = useState<HeadCircumferenceModal | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))
  const latest = latestHeadCircumference()

  function handleAdd() {
    setError(null)
    try {
      addHeadCircumference(Number(value), unit)
      setValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log head circumference')
    }
  }

  function handleSubmit(value: HeadCircumferenceBackfillSubmit) {
    setBackfillError(null)
    try {
      if (hcModal?.mode === 'edit') {
        updateHeadCircumferenceRecord(hcModal.record.id, value.value, value.unit, value.at)
      } else {
        addHeadCircumference(value.value, value.unit, value.at)
      }
      setHcModal(null)
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Could not save head circumference')
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
              <h1>Head circumference</h1>
            </div>
          </div>
        ) : (
          <h1>Head circumference</h1>
        )}
        <DayNav />
      </header>

      {latest && (
        <div className="stat-row">
          <StatTile
            accent="weight"
            Icon={RulerIcon}
            label="Latest head circumference"
            value={`${latest.value} ${latest.unit}`}
          />
        </div>
      )}

      <div className="card weight-card">
        <RulerIcon size={32} />
        <p className="sleep-hint">Log today&apos;s head circumference.</p>
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
        <button type="button" className="btn btn-primary btn-block" onClick={handleAdd}>
          Add head circumference
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => setHcModal({ mode: 'add' })}
        >
          Add past head circumference
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.headCircumferences.length === 0 ? (
          <div className="empty">
            <p>No head circumference recorded for this day.</p>
          </div>
        ) : (
          <ul className="event-list">
            {day.headCircumferences.map((h) => (
              <SwipeableRow
                key={h.id}
                id={h.id}
                deleteLabel={`Delete head circumference ${formatClock(h.time)}`}
                onDelete={() => removeHeadCircumference(h.id)}
                secondaryAction={{
                  label: `Duplicate head circumference ${formatClock(h.time)}`,
                  icon: <CopyIcon />,
                  onActivate: () => setHcModal({ mode: 'duplicate', record: h }),
                }}
              >
                <span className="event-icon event-weight">
                  <RulerIcon size={18} />
                </span>
                <span className="event-body">
                  <span className="event-title">Head circumference</span>
                  <span className="event-meta">
                    {formatClock(h.time)} · {h.value} {h.unit}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit head circumference ${formatClock(h.time)}`}
                  onClick={() => setHcModal({ mode: 'edit', record: h })}
                >
                  <EditIcon />
                </button>
              </SwipeableRow>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={hcModal !== null}
        title={hcModal?.mode === 'edit' ? 'Edit head circumference' : 'Add past head circumference'}
        onClose={() => setHcModal(null)}
      >
        {hcModal && (
          <>
            <HeadCircumferenceBackfillForm
              submitLabel={hcModal.mode === 'edit' ? 'Save changes' : 'Save head circumference'}
              initial={
                hcModal.mode === 'edit'
                  ? {
                      at: new Date(hcModal.record.time),
                      value: hcModal.record.value,
                      unit: hcModal.record.unit,
                    }
                  : hcModal.mode === 'duplicate'
                    ? {
                        at: new Date(),
                        value: hcModal.record.value,
                        unit: hcModal.record.unit,
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
