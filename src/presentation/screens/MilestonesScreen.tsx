import { useState } from 'react'
import type { MilestoneEntry } from '../../domain/model/MilestoneEntry'
import { MILESTONES } from '../../domain/model/MilestoneEntry'
import { useTracker } from '../store/TrackerProvider'
import { describeAge, formatClock, formatDayLabel, startOfDay } from '../utils/time'
import { BackIcon, CheckIcon, CopyIcon, EditIcon, StarIcon } from '../components/icons'
import DayNav from '../components/DayNav'
import Modal from '../components/Modal'
import SwipeableRow from '../components/SwipeableRow'
import { MilestoneBackfillForm, type MilestoneBackfillSubmit } from '../components/BackfillForms'

type MilestoneModal =
  | { mode: 'add' }
  | { mode: 'edit'; record: MilestoneEntry }
  | { mode: 'duplicate'; record: MilestoneEntry }

export default function MilestonesScreen({ onBack }: { onBack?: () => void }) {
  const {
    day,
    selectedDay,
    now,
    baby,
    addMilestone,
    removeMilestone,
    updateMilestoneRecord,
    firstMilestones,
  } = useTracker()
  const [milestone, setMilestone] = useState('')
  const [custom, setCustom] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<MilestoneModal | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))
  const dob = baby?.dob ?? ''
  const firsts = firstMilestones()
  const achievedCount = firsts.filter((f) => f.achieved).length

  // Curated milestones that have not been achieved yet. Already-logged ones are
  // removed from the picker so the same milestone can't be logged twice by
  // accident (the custom label is the only escape hatch for repeats).
  const achieved = new Set(firsts.filter((f) => f.achieved).map((f) => f.milestone))
  const availableMilestones = MILESTONES.filter((m) => !achieved.has(m))

  const isCustom = custom.trim().length > 0
  const canAdd = isCustom || milestone.trim().length > 0

  function handleQuickAdd() {
    setError(null)
    try {
      addMilestone(isCustom ? custom.trim() : milestone.trim())
      setCustom('')
      setMilestone('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log milestone')
    }
  }

  function handleSubmit(value: MilestoneBackfillSubmit) {
    setModalError(null)
    try {
      if (modal?.mode === 'edit') {
        updateMilestoneRecord(modal.record.id, {
          milestone: value.milestone,
          notes: value.notes,
          time: value.at,
        })
      } else {
        addMilestone(value.milestone, value.at, value.notes)
      }
      setModal(null)
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Could not save milestone')
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
              <h1>Milestones</h1>
            </div>
          </div>
        ) : (
          <h1>Milestones</h1>
        )}
        <DayNav />
      </header>

      <section className="card quick-add-card" aria-label="Log a milestone">
        <div className="quick-add-head">
          <span className="quick-add-icon quick-add-health" aria-hidden="true">
            <StarIcon size={20} />
          </span>
          <div className="quick-add-head-text">
            <span className="quick-add-title">Log a milestone</span>
            <p className="quick-add-sub">Record a first when it happens.</p>
          </div>
        </div>
        <label className="field field-block">
          <span className="field-label">Milestone</span>
          <select value={milestone} onChange={(e) => setMilestone(e.target.value)} disabled={isCustom}>
            <option value="" disabled>
              {availableMilestones.length > 0 ? 'Choose a milestone…' : 'All common milestones logged'}
            </option>
            {availableMilestones.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="field field-block">
          <span className="field-label">Or custom (optional)</span>
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. Waves goodbye"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {canAdd && (
          <p className="quick-add-preview" role="status">
            Will log <strong>{isCustom ? custom.trim() : milestone}</strong> for today at{' '}
            {formatClock(new Date().toISOString())}.
          </p>
        )}
        {!canAdd && availableMilestones.length === 0 && (
          <p className="quick-add-preview quick-add-preview-muted" role="status">
            All common milestones recorded — use the custom field for anything else.
          </p>
        )}
        <div className="quick-add-actions">
          <button type="button" className="btn btn-primary" onClick={handleQuickAdd} disabled={!canAdd}>
            <StarIcon size={18} />
            Add milestone
          </button>
          <button type="button" className="btn btn-outlined" onClick={() => setModal({ mode: 'add' })}>
            Add past milestone
          </button>
        </div>
      </section>

      <section className="card firsts-card" aria-label="Milestone firsts">
        <div className="quick-add-head">
          <span className="quick-add-icon quick-add-health" aria-hidden="true">
            <StarIcon size={18} />
          </span>
          <div className="quick-add-head-text">
            <span className="quick-add-title">Firsts</span>
            <p className="quick-add-sub">
              {achievedCount} of {MILESTONES.length} common milestones reached
            </p>
          </div>
        </div>
        <ul className="firsts-list">
          {firsts.map((f) => (
            <li key={f.milestone} className={`firsts-row${f.achieved ? ' firsts-achieved' : ''}`}>
              <span className="firsts-name">
                {f.achieved && (
                  <span className="firsts-check" aria-hidden="true">
                    <CheckIcon size={16} />
                  </span>
                )}
                {f.milestone}
              </span>
              <span className="firsts-value">
                {f.achieved && f.time ? (
                  <>
                    <span className="firsts-time">{formatClock(f.time)}</span>
                    <span className="firsts-age">{describeAge(dob, new Date(f.time))} old</span>
                  </>
                ) : (
                  'Not yet'
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.milestones.length === 0 ? (
          <div className="empty">
            <p>No milestones recorded for this day.</p>
          </div>
        ) : (
          <ul className="event-list">
            {day.milestones.map((m) => (
              <SwipeableRow
                key={m.id}
                id={`milestone-${m.id}`}
                deleteLabel={`Delete milestone ${formatClock(m.time)}`}
                onDelete={() => removeMilestone(m.id)}
                secondaryAction={{
                  label: `Duplicate milestone ${formatClock(m.time)}`,
                  icon: <CopyIcon />,
                  onActivate: () => setModal({ mode: 'duplicate', record: m }),
                }}
              >
                <span className="event-icon event-health">
                  <StarIcon size={18} />
                </span>
                <span className="event-body">
                  <span className="event-title">{m.milestone}</span>
                  <span className="event-meta">
                    {formatClock(m.time)}
                    {dob ? ` · ${describeAge(dob, new Date(m.time))} old` : ''}
                    {m.notes ? ` · ${m.notes}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit milestone ${formatClock(m.time)}`}
                  onClick={() => setModal({ mode: 'edit', record: m })}
                >
                  <EditIcon />
                </button>
              </SwipeableRow>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={modal !== null}
        title={modal?.mode === 'edit' ? 'Edit milestone' : 'Add past milestone'}
        onClose={() => setModal(null)}
      >
        {modal && (
          <>
            <MilestoneBackfillForm
              submitLabel={modal.mode === 'edit' ? 'Save changes' : 'Save milestone'}
              options={
                modal.mode === 'edit'
                  ? [...availableMilestones, modal.record.milestone]
                  : availableMilestones
              }
              initial={
                modal.mode === 'edit'
                  ? { at: new Date(modal.record.time), milestone: modal.record.milestone, notes: modal.record.notes }
                  : modal.mode === 'duplicate'
                    ? { at: new Date(), milestone: modal.record.milestone, notes: modal.record.notes }
                    : undefined
              }
              onSubmit={handleSubmit}
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
