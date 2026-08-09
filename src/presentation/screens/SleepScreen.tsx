import { useState } from 'react'
import type { SleepSession } from '../../domain/model/SleepSession'
import { useTracker } from '../store/TrackerProvider'
import { useWakeStatus } from '../store/useWakeStatus'
import { formatClock, formatDayLabel, formatDuration, startOfDay } from '../utils/time'
import { EditIcon, MoonIcon, TrashIcon } from '../components/icons'
import DayNav from '../components/DayNav'
import Modal from '../components/Modal'
import StatTile from '../components/StatTile'
import { SleepBackfillForm, type SleepBackfillSubmit } from '../components/BackfillForms'

type SleepModal = { mode: 'add' } | { mode: 'edit'; record: SleepSession }

export default function SleepScreen() {
  const {
    activeSleep,
    day,
    selectedDay,
    now,
    stopSleepTimer,
    startSleepTimer,
    removeSleep,
    logPastSleep,
    updateSleepRecord,
    dailyAverages,
  } = useTracker()
  const wake = useWakeStatus()
  const [error, setError] = useState<string | null>(null)
  const [sleepModal, setSleepModal] = useState<SleepModal | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))

  const totalSlept = day.sleeps.reduce((acc, s) => {
    if (!s.endTime) {
      return acc
    }
    return acc + new Date(s.endTime).getTime() - new Date(s.startTime).getTime()
  }, 0)

  // Night sleep = a completed sleep that starts during the night window
  // (7pm–9am local); everything else is a nap.
  const isNightSleep = (s: SleepSession): boolean => {
    if (!s.endTime) {
      return false
    }
    const hour = new Date(s.startTime).getHours()
    return hour >= 19 || hour < 9
  }
  const totalNapsMs = day.sleeps.reduce((acc, s) => {
    if (!s.endTime || isNightSleep(s)) {
      return acc
    }
    return acc + new Date(s.endTime).getTime() - new Date(s.startTime).getTime()
  }, 0)

  function handleStop() {
    try {
      stopSleepTimer()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stop the timer')
    }
  }

  function handleStart() {
    try {
      startSleepTimer()
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the timer')
    }
  }

  function handleBackfill(value: SleepBackfillSubmit) {
    setBackfillError(null)
    try {
      if (sleepModal?.mode === 'edit') {
        updateSleepRecord(sleepModal.record.id, value.start, value.kind === 'ongoing' ? null : value.end)
      } else if (value.kind === 'ongoing') {
        startSleepTimer(value.start)
      } else {
        logPastSleep(value.start, value.end)
      }
      setSleepModal(null)
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Could not save sleep')
    }
  }

  return (
    <div className="screen-content">
      <header className="screen-header">
        <h1>Sleep</h1>
        <DayNav />
      </header>

      <div className="stat-row">
        <StatTile accent="sleep" Icon={MoonIcon} label="Total slept" value={formatDuration(totalSlept)} />
        {totalNapsMs > 0 && (
          <StatTile accent="sleep" Icon={MoonIcon} label="Total naps" value={formatDuration(totalNapsMs)} />
        )}
        {dailyAverages.avgSleepMs > 0 && (
          <StatTile
            accent="sleep"
            Icon={MoonIcon}
            label="Avg/day"
            value={formatDuration(Math.round(dailyAverages.avgSleepMs))}
          />
        )}
      </div>

      <div className="card sleep-card">
        {activeSleep ? (
          <>
            <p className="sleep-label">Sleeping now</p>
            <p className="sleep-clock">{formatDuration(new Date().getTime() - new Date(activeSleep.startTime).getTime())}</p>
            <p className="sleep-started">Started at {formatClock(activeSleep.startTime)}</p>
            <button type="button" className="btn btn-primary btn-block" onClick={handleStop}>
              Stop sleep
            </button>
          </>
        ) : (
          <>
            <MoonIcon size={40} />
            <p className="sleep-hint">Tap below to start tracking a nap.</p>
            {wake.remainingMs !== null && (
              <p className="sleep-countdown" role="status">
                {wake.overdue
                  ? `Time for a nap! ${formatDuration(Math.abs(wake.remainingMs))} overdue`
                  : `Time left to sleep: ${formatDuration(wake.remainingMs)}`}
              </p>
            )}
            <button type="button" className="btn btn-primary btn-block" onClick={handleStart}>
              Start sleep timer
            </button>
          </>
        )}
        <button type="button" className="btn btn-secondary btn-block" onClick={() => setSleepModal({ mode: 'add' })}>
          Add past sleep
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.sleeps.length === 0 ? (
          <div className="empty">
            <p>No sleeps recorded for this day.</p>
          </div>
        ) : (
          <ul className="event-list">
            {day.sleeps.map((s) => (
              <li key={s.id} className="card event">
                <span className="event-icon event-sleep">
                  <MoonIcon size={18} />
                </span>
                <span className="event-body">
                  <span className="event-title">{s.endTime ? 'Sleep' : 'Sleeping'}</span>
                  <span className="event-meta">
                    {formatClock(s.startTime)}
                    {s.endTime
                      ? ` → ${formatClock(s.endTime)} · ${formatDuration(
                          new Date(s.endTime).getTime() - new Date(s.startTime).getTime(),
                        )}`
                      : ' → ongoing'}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit sleep ${formatClock(s.startTime)}`}
                  onClick={() => setSleepModal({ mode: 'edit', record: s })}
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Delete sleep ${formatClock(s.startTime)}`}
                  onClick={() => removeSleep(s.id)}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sleepModal && (
        <Modal
          title={sleepModal.mode === 'edit' ? 'Edit sleep' : 'Add past sleep'}
          onClose={() => setSleepModal(null)}
        >
          <SleepBackfillForm
            submitLabel={sleepModal.mode === 'edit' ? 'Save changes' : 'Save sleep'}
            initial={
              sleepModal.mode === 'edit'
                ? {
                    start: new Date(sleepModal.record.startTime),
                    end: sleepModal.record.endTime ? new Date(sleepModal.record.endTime) : null,
                  }
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
