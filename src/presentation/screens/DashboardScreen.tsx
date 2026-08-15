import { useState } from 'react'
import { useTracker } from '../store/TrackerProvider'
import { useWakeStatus } from '../store/useWakeStatus'
import { describeAge, formatClock, formatDayLabel, formatDuration, isSameDay, shiftDays, startOfDay } from '../utils/time'
import { describeFeedingMeta, describeFeedingTitle } from '../utils/feeding'
import { timelineAccent, timelineTab, timelineWording } from '../utils/timeline'
import { BottleIcon, DiaperIcon, DirtyDiaperIcon, MoonIcon, SettingsIcon } from '../components/icons'
import GrowthChart, { HEAD_CIRCUMFERENCE_METRIC, WEIGHT_METRIC } from '../components/GrowthChart'
import GrowthChartZoomModal from '../components/GrowthChartZoomModal'
import InsightsSection from '../components/InsightsSection'
import DayNav from '../components/DayNav'
import type { Tab } from '../navigation'
import type { TimelineEvent } from '../../domain/usecase/timeline'
import type { GrowthMetric, GrowthPoint } from '../components/GrowthChart'

const KIND_TAB: Record<string, Tab> = { sleep: 'sleep', feeding: 'feeding', diaper: 'diaper' }

export default function DashboardScreen({
  onOpenSettings,
  onNavigate,
}: {
  onOpenSettings?: () => void
  onNavigate?: (tab: Tab) => void
}) {
  const { baby, day, dayCounts, activeSleep, selectedDay, now, allWeights, allHeadCircumferences, settings, getPeriodRecords } =
    useTracker()
  const wake = useWakeStatus()
  const name = baby?.name.split(' ')[0] ?? 'there'
  const viewingToday = isSameDay(selectedDay, startOfDay(now))
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))
  const weights = allWeights()
  const headCircumferences = allHeadCircumferences()
  const timelineMode = settings.homeLogView === 'timeline'

  // Timeline-only: a night sleep that began in this day but ends after midnight
  // is attributed to the *next* day by `day.events` (end-based). Add a start-side
  // event here so the day's story closes with "Started night sleep at …".
  // Running sleeps are already attributed to this day by start, so only completed
  // sleeps that span past midnight are added (no duplicates).
  const dayStart = startOfDay(selectedDay)
  const dayEnd = startOfDay(shiftDays(selectedDay, 1))
  const startedSleeps = timelineMode
    ? getPeriodRecords(dayStart, dayEnd).sleeps.filter(
        (s) => s.endTime && new Date(s.endTime).getTime() >= dayEnd.getTime(),
      )
    : []
  const timelineEvents: TimelineEvent[] = [
    ...day.events,
    ...startedSleeps.map<TimelineEvent>((s) => ({ kind: 'sleep', id: s.id, time: s.startTime, data: s, mode: 'start' })),
  ]

  const cards = [
    { label: 'Sleep today', value: dayCounts.sleeps, Icon: MoonIcon, accent: 'accent-sleep', tab: 'sleep' as Tab },
    { label: 'Feeds today', value: dayCounts.feeds, Icon: BottleIcon, accent: 'accent-feed', tab: 'feeding' as Tab },
    { label: 'Diapers today', value: dayCounts.diapers, Icon: DiaperIcon, accent: 'accent-diaper', tab: 'diaper' as Tab },
  ]

  const [zoomModal, setZoomModal] = useState<{
    title: string
    metric: GrowthMetric
    points: GrowthPoint[]
    birthValue?: number
  } | null>(null)

  return (
    <div className="screen-content">
      <header className="screen-header">
        <div className="header-row">
          <div>
            <h1>Hi, {name}</h1>
            {baby && <p className="sub">{describeAge(baby.dob)}</p>}
          </div>
          <div className="header-actions">
            {onOpenSettings && (
              <button
                type="button"
                className="icon-btn settings-btn"
                aria-label="Settings"
                onClick={onOpenSettings}
              >
                <SettingsIcon />
              </button>
            )}
          </div>
        </div>
        <DayNav />
        {viewingToday && activeSleep && (
          <button
            type="button"
            className="pill pill-active"
            onClick={() => onNavigate?.('sleep')}
          >
            Sleeping now — {formatDuration(new Date().getTime() - new Date(activeSleep.startTime).getTime())}
          </button>
        )}
        {viewingToday && !wake.asleep && wake.remainingMs !== null && (
          <button type="button" className="pill pill-wake" onClick={() => onNavigate?.('sleep')}>
            {wake.overdue
              ? `Time for a nap! ${formatDuration(Math.abs(wake.remainingMs))} overdue`
              : `Nap time in ${formatDuration(wake.remainingMs)}`}
          </button>
        )}
      </header>

      <div className="summary-grid">
        {cards.map(({ label, value, Icon, accent, tab }) => (
          <button
            key={label}
            type="button"
            className={`card summary ${accent}`}
            onClick={() => onNavigate?.(tab)}
          >
            <span className="summary-icon">
              <Icon size={20} />
            </span>
            <span className="summary-value">{value}</span>
            <span className="summary-label">{label}</span>
          </button>
        ))}
      </div>

      {viewingToday && <InsightsSection />}

      {(weights.length > 0 || baby?.birthWeightKg != null) && baby?.dob && (
        <section className="growth">
          <h2 className="growth-title">Weight progress</h2>
          <button
            type="button"
            className="card growth-card growth-open"
            aria-label="Open weight chart zoom"
            onClick={() =>
              setZoomModal({ title: 'Weight progress', metric: WEIGHT_METRIC, points: weights, birthValue: baby.birthWeightKg })
            }
          >
            <GrowthChart dob={baby.dob} points={weights} metric={WEIGHT_METRIC} sex={baby.sex} birthValue={baby.birthWeightKg} />
            <span className="growth-open-hint" aria-hidden="true">Tap to zoom</span>
          </button>
        </section>
      )}

      {headCircumferences.length > 0 && baby?.dob && (
        <section className="growth">
          <h2 className="growth-title">Head circumference progress</h2>
          <button
            type="button"
            className="card growth-card growth-open"
            aria-label="Open head circumference chart zoom"
            onClick={() =>
              setZoomModal({ title: 'Head circumference progress', metric: HEAD_CIRCUMFERENCE_METRIC, points: headCircumferences })
            }
          >
            <GrowthChart dob={baby.dob} points={headCircumferences} metric={HEAD_CIRCUMFERENCE_METRIC} sex={baby.sex} />
            <span className="growth-open-hint" aria-hidden="true">Tap to zoom</span>
          </button>
        </section>
      )}

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.events.length === 0 ? (
          <div className="empty">
            <p>Nothing recorded for this day.</p>
            <p className="empty-hint">Use the tabs below to add a sleep, feeding, or diaper change.</p>
          </div>
        ) : timelineMode ? (
          <ol className="tl">
            {timelineEvents
              .map((event) => ({ event, wording: timelineWording(event) }))
              .sort((a, b) => new Date(a.wording.time).getTime() - new Date(b.wording.time).getTime())
              .map(({ event, wording }) => (
                <li key={`${event.kind}-${event.id}${event.kind === 'sleep' && event.mode === 'start' ? '-start' : ''}`} className="tl-item">
                  <span className="tl-time">{formatClock(wording.time)}</span>
                  <span className={`tl-node tl-node-${event.kind}`} aria-hidden="true" />
                  <button
                    type="button"
                    className={`tl-body tl-${timelineAccent(event)}`}
                    onClick={() => onNavigate?.(timelineTab(event))}
                  >
                    <span className="tl-icon" aria-hidden="true">
                      {event.kind === 'sleep' && <MoonIcon size={16} />}
                      {event.kind === 'feeding' && <BottleIcon size={16} />}
                      {event.kind === 'diaper' &&
                        (event.data.type === 'dirty' || event.data.type === 'both' ? (
                          <DirtyDiaperIcon size={16} />
                        ) : (
                          <DiaperIcon size={16} />
                        ))}
                    </span>
                    <span className="tl-text">
                      <span className="tl-word">{wording.headline}</span>
                      {wording.meta && <span className="tl-meta">{wording.meta}</span>}
                    </span>
                  </button>
                </li>
              ))}
          </ol>
        ) : (
          <ul className="event-list">
            {day.events.map((event) => (
              <li key={`${event.kind}-${event.id}`}>
                <button
                  type="button"
                  className="card event event-link"
                  onClick={() => onNavigate?.(KIND_TAB[event.kind])}
                >
                  <span className={`event-icon event-${event.kind}`}>
                    {event.kind === 'sleep' && <MoonIcon size={18} />}
                    {event.kind === 'feeding' && <BottleIcon size={18} />}
                    {event.kind === 'diaper' &&
                      (event.data.type === 'dirty' || event.data.type === 'both' ? (
                        <DirtyDiaperIcon size={18} />
                      ) : (
                        <DiaperIcon size={18} />
                      ))}
                  </span>
                  <span className="event-body">
                    <span className="event-title">
                      {event.kind === 'sleep' && (event.data.endTime ? 'Slept' : 'Sleeping')}
                      {event.kind === 'feeding' && describeFeedingTitle(event.data)}
                      {event.kind === 'diaper' && `Diaper (${event.data.type})`}
                    </span>
                    <span className="event-meta">
                      {formatClock(event.time)}
                      {event.kind === 'feeding' && describeFeedingMeta(event.data)
                        ? ` · ${describeFeedingMeta(event.data)}`
                        : ''}
                      {event.kind === 'sleep' && event.data.endTime
                        ? ` · ${formatDuration(new Date(event.data.endTime).getTime() - new Date(event.data.startTime).getTime())}`
                        : event.kind === 'sleep'
                          ? ' · ongoing'
                          : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {zoomModal && baby?.dob && (
        <GrowthChartZoomModal
          open
          title={zoomModal.title}
          dob={baby.dob}
          points={zoomModal.points}
          metric={zoomModal.metric}
          sex={baby.sex}
          birthValue={zoomModal.birthValue}
          onClose={() => setZoomModal(null)}
        />
      )}
    </div>
  )
}
