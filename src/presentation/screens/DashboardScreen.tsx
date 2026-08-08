import { useTracker } from '../store/TrackerProvider'
import { describeAge, formatClock, formatDayLabel, formatDuration, isSameDay, startOfDay } from '../utils/time'
import { describeFeedingMeta, describeFeedingTitle } from '../utils/feeding'
import { BottleIcon, DiaperIcon, MoonIcon, SettingsIcon } from '../components/icons'
import GrowthChart from '../components/GrowthChart'
import DayNav from '../components/DayNav'
import type { Tab } from '../navigation'

const KIND_TAB: Record<string, Tab> = { sleep: 'sleep', feeding: 'feeding', diaper: 'diaper' }

export default function DashboardScreen({
  onOpenSettings,
  onNavigate,
}: {
  onOpenSettings?: () => void
  onNavigate?: (tab: Tab) => void
}) {
  const { baby, day, dayCounts, activeSleep, selectedDay, now, allWeights } = useTracker()
  const name = baby?.name.split(' ')[0] ?? 'there'
  const viewingToday = isSameDay(selectedDay, startOfDay(now))
  const dayLabel = formatDayLabel(selectedDay, startOfDay(now))
  const weights = allWeights()

  const cards = [
    { label: 'Sleep today', value: dayCounts.sleeps, Icon: MoonIcon, accent: 'accent-sleep', tab: 'sleep' as Tab },
    { label: 'Feeds today', value: dayCounts.feeds, Icon: BottleIcon, accent: 'accent-feed', tab: 'feeding' as Tab },
    { label: 'Diapers today', value: dayCounts.diapers, Icon: DiaperIcon, accent: 'accent-diaper', tab: 'diaper' as Tab },
  ]

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
      </header>

      <div className="summary-grid">
        {cards.map(({ label, value, Icon, accent, tab }) => (
          <button
            key={label}
            type="button"
            className={`card summary ${accent}`}
            onClick={() => onNavigate?.(tab)}
          >
            <Icon size={26} />
            <span className="summary-value">{value}</span>
            <span className="summary-label">{label}</span>
          </button>
        ))}
      </div>

      {weights.length > 0 && baby?.dob && (
        <section className="growth">
          <h2 className="growth-title">Weight progress</h2>
          <div className="card growth-card">
            <GrowthChart dob={baby.dob} weights={weights} />
          </div>
        </section>
      )}

      <section className="timeline">
        <h2>{dayLabel}</h2>
        {day.events.length === 0 ? (
          <div className="empty">
            <p>Nothing recorded for this day.</p>
            <p className="empty-hint">Use the tabs below to add a sleep, feeding, or diaper change.</p>
          </div>
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
                    {event.kind === 'diaper' && <DiaperIcon size={18} />}
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
    </div>
  )
}
