import { useState } from 'react'
import type { ToothEntry, ToothName } from '../../domain/model/ToothEntry'
import { TOOTH_NAMES } from '../../domain/model/ToothEntry'
import { useTracker } from '../store/TrackerProvider'
import { combineLocalDateTime, formatClock, formatDayLabel, startOfDay, toInputDate, toInputTime } from '../utils/time'
import { CopyIcon, EditIcon, BackIcon, SmileIcon } from '../components/icons'
import DayNav from '../components/DayNav'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import ToothChart from '../components/ToothChart'
import { ToothBackfillForm, type ToothBackfillSubmit } from '../components/BackfillForms'

type ToothModal =
  | { mode: 'add' }
  | { mode: 'edit'; record: ToothEntry }
  | { mode: 'duplicate'; record: ToothEntry }

export default function TeethScreen({ onBack }: { onBack?: () => void }) {
  const { day, selectedDay, now, addTooth, removeTooth, updateToothRecord, eruptedTeeth } = useTracker()
  const [tooth, setTooth] = useState<ToothName>(TOOTH_NAMES[0])
  const [time, setTime] = useState(toInputTime(now))
  const [error, setError] = useState<string | null>(null)
  const [toothModal, setToothModal] = useState<ToothModal | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))
  const erupted = eruptedTeeth()

  function handleAdd() {
    setError(null)
    try {
      addTooth(tooth, combineLocalDateTime(toInputDate(now), time))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log tooth')
    }
  }

  function handleSubmit(value: ToothBackfillSubmit) {
    setBackfillError(null)
    try {
      if (toothModal?.mode === 'edit') {
        updateToothRecord(toothModal.record.id, { time: value.at, tooth: value.tooth, notes: value.notes })
      } else {
        addTooth(value.tooth, value.at, value.notes)
      }
      setToothModal(null)
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Could not save tooth')
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
              <h1>Teeth</h1>
            </div>
          </div>
        ) : (
          <h1>Teeth</h1>
        )}
        <DayNav />
      </header>

      <section className="card tooth-chart-card">
        <div className="tooth-chart-header">
          <span className="quick-add-icon quick-add-health" aria-hidden="true">
            <SmileIcon size={20} />
          </span>
          <h2>Tooth chart</h2>
          {erupted.length > 0 ? (
            <p className="tooth-chart-count">
              {erupted.length} of {TOOTH_NAMES.length} teeth erupted
            </p>
          ) : (
            <p className="empty-hint">No teeth erupted yet — log the first one below.</p>
          )}
        </div>
        <ToothChart erupted={erupted} />
      </section>

      <div className="card quick-add-card">
        <div className="quick-add-head">
          <span className="quick-add-icon quick-add-health" aria-hidden="true">
            <SmileIcon size={20} />
          </span>
          <div className="quick-add-head-text">
            <span className="quick-add-title">Log a tooth</span>
            <p className="quick-add-sub">Record a tooth that came in.</p>
          </div>
        </div>
        <div className="backfill-datetime">
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
            <span className="field-label">Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <div className="quick-add-actions">
          <button type="button" className="btn btn-primary" onClick={handleAdd}>
            <SmileIcon size={18} />
            Add tooth
          </button>
          <button type="button" className="btn btn-outlined" onClick={() => setToothModal({ mode: 'add' })}>
            Add past tooth
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.teeth.length === 0 ? (
          <div className="empty">
            <p>No teeth recorded for this day.</p>
          </div>
        ) : (
          <ul className="event-list">
            {day.teeth.map((t) => (
              <SwipeableRow
                key={t.id}
                id={t.id}
                deleteLabel={`Delete tooth ${formatClock(t.time)}`}
                onDelete={() => removeTooth(t.id)}
                secondaryAction={{
                  label: `Duplicate tooth ${formatClock(t.time)}`,
                  icon: <CopyIcon />,
                  onActivate: () => setToothModal({ mode: 'duplicate', record: t }),
                }}
              >
                <span className="event-icon event-health">
                  <SmileIcon size={18} />
                </span>
                <span className="event-body">
                  <span className="event-title">{t.tooth}</span>
                  <span className="event-meta">
                    {formatClock(t.time)}
                    {t.notes ? ` · ${t.notes}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit tooth ${formatClock(t.time)}`}
                  onClick={() => setToothModal({ mode: 'edit', record: t })}
                >
                  <EditIcon />
                </button>
              </SwipeableRow>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={toothModal !== null}
        title={toothModal?.mode === 'edit' ? 'Edit tooth' : 'Add past tooth'}
        onClose={() => setToothModal(null)}
      >
        {toothModal && (
          <>
            <ToothBackfillForm
              submitLabel={toothModal.mode === 'edit' ? 'Save changes' : 'Save tooth'}
              initial={
                toothModal.mode === 'edit'
                  ? { at: new Date(toothModal.record.time), tooth: toothModal.record.tooth, notes: toothModal.record.notes }
                  : toothModal.mode === 'duplicate'
                    ? { at: new Date(), tooth: toothModal.record.tooth, notes: toothModal.record.notes }
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
