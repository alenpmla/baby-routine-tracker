import { useTracker } from '../store/TrackerProvider'
import { formatDuration } from '../utils/time'
import { MoonIcon, SmileIcon } from './icons'

function formatWakings(value: number): string {
  return `${Math.round(value * 10) / 10}`
}

export default function TeethingSleepCard() {
  const { teethingSleepCorrelation: c, settings } = useTracker()
  if (!c) {
    return null
  }
  const windowDays = settings.averagesDays ?? 30
  const diff = c.diffMs
  const diffLabel = formatDuration(Math.abs(diff))
  return (
    <section className="card teething-sleep-card" aria-label="Teething & sleep">
      <div className="teething-sleep-head">
        <span className="quick-add-icon quick-add-health" aria-hidden="true">
          <SmileIcon size={18} />
        </span>
        <h2 className="teething-sleep-title">Teething &amp; sleep · last {windowDays} days</h2>
      </div>
      <p className="teething-sleep-line">
        {diff === 0
          ? `Same average sleep on teething days and other days (${formatDuration(c.teethingDaysAvgMs)} each).`
          : diff < 0
            ? `${diffLabel} less average sleep on teething days (${formatDuration(c.teethingDaysAvgMs)} vs ${formatDuration(c.nonTeethingDaysAvgMs)}).`
            : `${diffLabel} more average sleep on teething days (${formatDuration(c.teethingDaysAvgMs)} vs ${formatDuration(c.nonTeethingDaysAvgMs)}).`}
      </p>
      <p className="teething-sleep-line">
        Night wakings: {formatWakings(c.teethingNightWakingsAvg)} per teething day vs{' '}
        {formatWakings(c.nonTeethingNightWakingsAvg)} on other days
        <span className="teething-sleep-meta">
          {' '}
          · {c.teethingDayCount} teething day{c.teethingDayCount === 1 ? '' : 's'} / {c.nonTeethingDayCount} other day
          {c.nonTeethingDayCount === 1 ? '' : 's'} with sleep
        </span>
      </p>
      <span className="teething-sleep-icon" aria-hidden="true">
        <MoonIcon size={18} />
      </span>
    </section>
  )
}
