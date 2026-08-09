import { useState } from 'react'
import type { FeedingSession, FeedingType } from '../../domain/model/FeedingSession'
import { foodsOf } from '../../domain/model/FeedingSession'
import type { FeedingDetails, SolidsFieldErrors } from '../../domain/usecase/feeding'
import { validateSolidsDetails } from '../../domain/usecase/feeding'
import { useTracker } from '../store/TrackerProvider'
import { formatClock, formatDayLabel, startOfDay } from '../utils/time'
import { describeBottleTotal, describeFeedingMeta, describeFeedingTitle, describeSolidsAverage, describeSolidsTotal } from '../utils/feeding'
import { useSnapshotPrefs } from '../store/SnapshotPrefsProvider'
import { BottleIcon, BowlIcon, EditIcon, TrashIcon } from '../components/icons'
import DayNav from '../components/DayNav'
import Modal from '../components/Modal'
import SolidsFields from '../components/SolidsFields'
import StatTile from '../components/StatTile'
import { FeedDiaperBackfillForm } from '../components/BackfillForms'

const TYPES: { id: FeedingType; label: string }[] = [
  { id: 'bottle', label: 'Bottle' },
  { id: 'breast', label: 'Breast' },
  { id: 'solids', label: 'Solids' },
]

const TYPE_LABEL: Record<FeedingType, string> = {
  bottle: 'Bottle',
  breast: 'Breast',
  solids: 'Solids',
}

type FeedModal = { mode: 'add'; preset?: FeedingType } | { mode: 'edit'; record: FeedingSession }

export default function FeedingScreen() {
  const {
    addFeeding,
    updateFeedingRecord,
    day,
    removeFeeding,
    selectedDay,
    now,
    foodSuggestions,
    dailyAverages,
  } = useTracker()
  const [feedModal, setFeedModal] = useState<FeedModal | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const [showSolids, setShowSolids] = useState(false)
  const [solidsDetails, setSolidsDetails] = useState<FeedingDetails>({})
  const [solidsErrors, setSolidsErrors] = useState<SolidsFieldErrors>({})
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))
  const { units } = useSnapshotPrefs()
  const bottleTotal = describeBottleTotal(day.feedings, units.bottle)
  const solidsTotal = describeSolidsTotal(day.feedings, units.solids)

  function handleChip(type: FeedingType) {
    if (type === 'solids') {
      setSolidsDetails({})
      setSolidsErrors({})
      setShowSolids(true)
      return
    }
    setFeedModal({ mode: 'add', preset: type })
  }

  function handleAddSolids() {
    const errors = validateSolidsDetails(solidsDetails)
    if (Object.keys(errors).length > 0) {
      setSolidsErrors(errors)
      return
    }
    setSolidsErrors({})
    addFeeding('solids', undefined, solidsDetails)
    setShowSolids(false)
  }

  function handleBackfill(type: string, at: Date, details?: FeedingDetails) {
    setBackfillError(null)
    try {
      if (feedModal?.mode === 'edit') {
        updateFeedingRecord(feedModal.record.id, type as FeedingType, at, details)
      } else {
        addFeeding(type as FeedingType, at, details)
      }
      setFeedModal(null)
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Could not record feed')
    }
  }

  return (
    <div className="screen-content">
      <header className="screen-header">
        <h1>Feeding</h1>
        <DayNav />
      </header>

      <div className="stat-row">
        <StatTile accent="feed" Icon={BottleIcon} label="Feeds" value={String(day.feedings.length)} />
        {bottleTotal && <StatTile accent="feed" Icon={BottleIcon} label="Bottle" value={bottleTotal} />}
        {solidsTotal && <StatTile accent="feed" Icon={BowlIcon} label="Solids" value={solidsTotal} />}
        {dailyAverages.avgSolidsGram > 0 && (
          <StatTile
            accent="feed"
            Icon={BowlIcon}
            label="Avg/day"
            value={describeSolidsAverage(dailyAverages.avgSolidsGram, units.solids)}
          />
        )}
      </div>

      <div className="card feed-card">
        <BottleIcon size={32} />
        <p className="sleep-hint">Tap a type to record a feed now.</p>
        <div className="chip-row">
          {TYPES.map(({ id, label }) => (
            <button key={id} type="button" className="chip" onClick={() => handleChip(id)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setFeedModal({ mode: 'add' })}>
          Add past feed
        </button>
      </div>

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.feedings.length === 0 ? (
          <div className="empty">
            <p>No feeds recorded for this day.</p>
          </div>
        ) : (
          <ul className="event-list">
            {day.feedings.map((f) => (
              <li key={f.id} className="card event">
                <span className="event-icon event-feeding">
                  <BottleIcon size={18} />
                </span>
                <span className="event-body">
                  <span className="event-title">{describeFeedingTitle(f)}</span>
                  <span className="event-meta">
                    {formatClock(f.time)}
                    {describeFeedingMeta(f) ? ` · ${describeFeedingMeta(f)}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit ${TYPE_LABEL[f.type]} feed`}
                  onClick={() => setFeedModal({ mode: 'edit', record: f })}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Delete ${TYPE_LABEL[f.type]} feed`}
                  onClick={() => removeFeeding(f.id)}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showSolids && (
        <Modal title="Add solid food" onClose={() => setShowSolids(false)}>
          <div className="form">
            <SolidsFields
              value={solidsDetails}
              errors={solidsErrors}
              suggestions={foodSuggestions}
              onChange={setSolidsDetails}
            />
            <button type="button" className="btn btn-primary btn-block" onClick={handleAddSolids}>
              Save solid food
            </button>
          </div>
        </Modal>
      )}

      {feedModal && (
        <Modal
          title={feedModal.mode === 'edit' ? 'Edit feed' : 'Add feed'}
          onClose={() => setFeedModal(null)}
        >
          <FeedDiaperBackfillForm
            options={TYPES}
            submitLabel={feedModal.mode === 'edit' ? 'Save changes' : 'Save feed'}
            showSolidsDetails
            showBreastTiming
            showBottleDetails
            suggestions={foodSuggestions}
            initial={
              feedModal.mode === 'edit'
                ? {
                    type: feedModal.record.type,
                    at: new Date(feedModal.record.time),
                    details:
                      feedModal.record.type === 'solids'
                        ? {
                            foods: foodsOf(feedModal.record),
                            amount: feedModal.record.amount,
                            unit: feedModal.record.unit,
                          }
                        : (feedModal.record.type === 'bottle' && feedModal.record.amount !== undefined) ||
                          (feedModal.record.type === 'breast' && feedModal.record.startTime)
                          ? {
                              amount: feedModal.record.amount,
                              unit: feedModal.record.unit,
                              startTime: feedModal.record.startTime
                                ? new Date(feedModal.record.startTime)
                                : undefined,
                              endTime: feedModal.record.endTime
                                ? new Date(feedModal.record.endTime)
                                : undefined,
                            }
                          : undefined,
                  }
                : feedModal.preset
                  ? { type: feedModal.preset, at: new Date() }
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
