import { useState } from 'react'
import type { SleepSession } from '../../domain/model/SleepSession'
import { sleepKind } from '../../domain/model/SleepSession'
import { useTracker } from '../store/TrackerProvider'
import { useWakeStatus } from '../store/useWakeStatus'
import {
  formatClock,
  formatDayLabel,
  formatDuration,
  isSameDay,
  shiftDays,
  startOfDay,
} from '../utils/time'
import { EditIcon, MoonIcon } from '../components/icons'
import DayNav from '../components/DayNav'
import Modal from '../components/Modal'
import StatTile from '../components/StatTile'
import { SleepBackfillForm, type SleepBackfillSubmit } from '../components/BackfillForms'
import SwipeableRow from '../components/SwipeableRow'
import WakeWindowLine from '../components/WakeWindowLine'

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
    getPeriodRecords,
  } = useTracker()
  const wake = useWakeStatus()
  const [error, setError] = useState<string | null>(null)
  const [sleepModal, setSleepModal] = useState<SleepModal | null>(null)
  const [backfillError, setBackfillError] = useState<string | null>(null)
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))

  const dayEnd = startOfDay(shiftDays(selectedDay, 1))
  const boundarySleeps = getPeriodRecords(selectedDay, dayEnd).sleeps.filter(
    (s) =>
      s.endTime !== null &&
      new Date(s.startTime).getTime() < dayEnd.getTime() &&
      new Date(s.endTime).getTime() > dayEnd.getTime(),
  )
  const isToday = isSameDay(selectedDay, startOfDay(now))

  const { nightMs, napMs, nightCount, napCount } = day.sleepTotals

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
        updateSleepRecord(sleepModal.record.id, value.start, value.kind === 'ongoing' ? null : value.end, value.sleepKind)
      } else if (value.kind === 'ongoing') {
        startSleepTimer(value.start, value.sleepKind)
      } else {
        logPastSleep(value.start, value.end, value.sleepKind)
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
        <StatTile accent="sleep" Icon={MoonIcon} label="Total slept" value={formatDuration(day.sleepTotals.totalMs)} />
        {nightCount > 0 && (
          <StatTile
            accent="sleep"
            Icon={MoonIcon}
            label="Night sleep"
            value={formatDuration(nightMs)}
            detail={`${nightCount} ${nightCount === 1 ? 'session' : 'sessions'}`}
          />
        )}
        {napCount > 0 && (
          <StatTile
            accent="sleep"
            Icon={MoonIcon}
            label="Naps"
            value={formatDuration(napMs)}
            detail={`${napCount} ${napCount === 1 ? 'nap' : 'naps'}`}
          />
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

      <WakeWindowLine
        sleeps={day.sleeps}
        boundarySleeps={boundarySleeps}
        nowMs={Date.now()}
        live={isToday && activeSleep === null}
      />

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.sleeps.length === 0 ? (
          <div className="empty">
            <p>No sleeps recorded for this day.</p>
          </div>
        ) : (
          <ul className="event-list">
            {day.sleeps.map((s) => (
              <SwipeableRow
                key={s.id}
                id={s.id}
                deleteLabel={`Delete sleep ${formatClock(s.startTime)}`}
                onDelete={() => removeSleep(s.id)}
              >
                <span className="event-icon event-sleep">
                  <MoonIcon size={18} />
                </span>
                <span className="event-body">
                  <span className="event-title sleep-title">
                    {s.endTime ? 'Sleep' : 'Sleeping'}
                    <span className={`sleep-kind sleep-kind-${sleepKind(s)}`}>{sleepKind(s) === 'night' ? 'Night' : 'Nap'}</span>
                  </span>
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
              </SwipeableRow>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={sleepModal !== null}
        title={sleepModal?.mode === 'edit' ? 'Edit sleep' : 'Add past sleep'}
        onClose={() => setSleepModal(null)}
      >
        {sleepModal && (
          <>
            <SleepBackfillForm
              submitLabel={sleepModal.mode === 'edit' ? 'Save changes' : 'Save sleep'}
              initial={
                sleepModal.mode === 'edit'
                  ? {
                      start: new Date(sleepModal.record.startTime),
                      end: sleepModal.record.endTime ? new Date(sleepModal.record.endTime) : null,
                      kind: sleepKind(sleepModal.record),
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
          </>
        )}
      </Modal>
    </div>
  )
}
