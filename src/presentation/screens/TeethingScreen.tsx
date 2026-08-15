import { useState } from 'react'
import type { TeethingDay } from '../../domain/model/TeethingDay'
import { useTracker } from '../store/TrackerProvider'
import { formatDayLabel, startOfDay } from '../utils/time'
import { EditIcon, BackIcon, SmileIcon } from '../components/icons'
import DayNav from '../components/DayNav'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import { TeethingDayForm, type TeethingDayFormSubmit } from '../components/BackfillForms'
import TeethingSleepCard from '../components/TeethingSleepCard'

type TeethingModal = { mode: 'edit'; record: TeethingDay }

export default function TeethingScreen({ onBack }: { onBack?: () => void }) {
  const { day, selectedDay, now, addTeethingDay, removeTeethingDay, updateTeethingDayRecord } = useTracker()
  const [formKey, setFormKey] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [teethingModal, setTeethingModal] = useState<TeethingModal | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))

  function handleQuickAdd(value: TeethingDayFormSubmit) {
    setFormError(null)
    try {
      addTeethingDay(value.day, value.symptoms, value.notes)
      setFormKey((k) => k + 1)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save teething day')
    }
  }

  function handleModalSubmit(value: TeethingDayFormSubmit) {
    setModalError(null)
    try {
      if (teethingModal?.mode === 'edit') {
        updateTeethingDayRecord(teethingModal.record.id, {
          day: value.day,
          symptoms: value.symptoms,
          notes: value.notes,
        })
      }
      setTeethingModal(null)
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Could not save teething day')
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
              <h1>Teething</h1>
            </div>
          </div>
        ) : (
          <h1>Teething</h1>
        )}
        <DayNav />
      </header>

      <TeethingSleepCard />

      <section className="card quick-add-card" aria-label="Log a teething day">
        <div className="quick-add-head">
          <span className="quick-add-icon quick-add-health" aria-hidden="true">
            <SmileIcon size={20} />
          </span>
          <div className="quick-add-head-text">
            <span className="quick-add-title">Teething</span>
            <p className="quick-add-sub">Log a day with teething symptoms.</p>
          </div>
        </div>
        <TeethingDayForm key={formKey} submitLabel="Add teething day" onSubmit={handleQuickAdd} />
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
      </section>

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.teethingDays.length === 0 ? (
          <div className="empty">
            <p>No teething day recorded for this day.</p>
          </div>
        ) : (
          <ul className="event-list">
            {day.teethingDays.map((td) => (
              <SwipeableRow
                key={td.id}
                id={td.id}
                deleteLabel={`Delete teething day ${td.day}`}
                onDelete={() => removeTeethingDay(td.id)}
              >
                <span className="event-icon event-health">
                  <SmileIcon size={18} />
                </span>
                <span className="event-body">
                  <span className="event-title">{td.day}</span>
                  <span className="event-meta">{td.symptoms.join(' · ')}</span>
                  {td.notes && <span className="event-meta">{td.notes}</span>}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit teething day ${td.day}`}
                  onClick={() => setTeethingModal({ mode: 'edit', record: td })}
                >
                  <EditIcon />
                </button>
              </SwipeableRow>
            ))}
          </ul>
        )}
      </section>

      <Modal open={teethingModal !== null} title="Edit teething day" onClose={() => setTeethingModal(null)}>
        {teethingModal && teethingModal.mode === 'edit' && (
          <>
            <TeethingDayForm
              submitLabel="Save changes"
              initial={{
                day: teethingModal.record.day,
                symptoms: teethingModal.record.symptoms,
                notes: teethingModal.record.notes,
              }}
              onSubmit={handleModalSubmit}
            />
            {modalError && (
              <p className="form-error" role="alert">
                {modalError}
              </p>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
