import { useState } from 'react'
import type { DiaperChange, DiaperType } from '../../domain/model/DiaperChange'
import { useTracker } from '../store/TrackerProvider'
import { formatClock, formatDayLabel, startOfDay } from '../utils/time'
import { DiaperIcon, EditIcon, TrashIcon } from '../components/icons'
import DayNav from '../components/DayNav'
import Modal from '../components/Modal'
import StatTile from '../components/StatTile'
import { FeedDiaperBackfillForm } from '../components/BackfillForms'

const TYPES: { id: DiaperType; label: string }[] = [
  { id: 'wet', label: 'Wet' },
  { id: 'dirty', label: 'Dirty' },
  { id: 'both', label: 'Both' },
]

type DiaperModal = { mode: 'add' } | { mode: 'edit'; record: DiaperChange }

export default function DiaperScreen() {
  const { addDiaper, updateDiaperRecord, day, dayCounts, removeDiaper, selectedDay, now } = useTracker()
  const [error, setError] = useState<string | null>(null)
  const [diaperModal, setDiaperModal] = useState<DiaperModal | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))

  function handleRecord(type: DiaperType) {
    try {
      addDiaper(type)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record change')
    }
  }

  function handleBackfill(type: string, at: Date) {
    setBackfillError(null)
    try {
      if (diaperModal?.mode === 'edit') {
        updateDiaperRecord(diaperModal.record.id, type as DiaperType, at)
      } else {
        addDiaper(type as DiaperType, at)
      }
      setDiaperModal(null)
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Could not record change')
    }
  }

  return (
    <div className="screen-content">
      <header className="screen-header">
        <h1>Diaper</h1>
        <DayNav />
      </header>

      <div className="stat-row">
        <StatTile accent="diaper" Icon={DiaperIcon} label="Changes" value={String(dayCounts.diapers)} />
      </div>

      <div className="card diaper-card">
        <DiaperIcon size={32} />
        <p className="sleep-hint">One tap to record.</p>
        <div className="diaper-row">
          {TYPES.map(({ id, label }) => (
            <button key={id} type="button" className="diaper-btn" onClick={() => handleRecord(id)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setDiaperModal({ mode: 'add' })}>
          Add past change
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.diapers.length === 0 ? (
          <div className="empty">
            <p>No changes recorded for this day.</p>
          </div>
        ) : (
          <ul className="event-list">
            {day.diapers.map((d) => (
              <li key={d.id} className="card event">
                <span className="event-icon event-diaper">
                  <DiaperIcon size={18} />
                </span>
                <span className="event-body">
                  <span className="event-title">Diaper ({d.type})</span>
                  <span className="event-meta">{formatClock(d.time)}</span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit ${d.type} diaper change`}
                  onClick={() => setDiaperModal({ mode: 'edit', record: d })}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Delete ${d.type} diaper change`}
                  onClick={() => removeDiaper(d.id)}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {diaperModal && (
        <Modal
          title={diaperModal.mode === 'edit' ? 'Edit change' : 'Add past change'}
          onClose={() => setDiaperModal(null)}
        >
          <FeedDiaperBackfillForm
            options={TYPES}
            submitLabel={diaperModal.mode === 'edit' ? 'Save changes' : 'Save change'}
            initial={
              diaperModal.mode === 'edit'
                ? { type: diaperModal.record.type, at: new Date(diaperModal.record.time) }
                : undefined
            }
            onSubmit={handleBackfill}
          />
          {backfillError && (
            <p className="form-error" role="alert">
              {backfillError}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}
