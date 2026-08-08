import { useTracker } from '../store/TrackerProvider'
import { formatDayLabel, isSameDay, startOfDay } from '../utils/time'

export default function DayNav() {
  const { selectedDay, prevDay, nextDay, goToToday, now } = useTracker()
  const today = startOfDay(now)
  const isToday = isSameDay(selectedDay, today)

  return (
    <div className="daynav" aria-label="Day navigation">
      <button type="button" className="daynav-btn" aria-label="Previous day" onClick={prevDay}>
        ‹
      </button>
      <button type="button" className="daynav-label" onClick={goToToday}>
        {formatDayLabel(selectedDay, today)}
      </button>
      <button
        type="button"
        className="daynav-btn"
        aria-label="Next day"
        disabled={isToday}
        onClick={nextDay}
      >
        ›
      </button>
    </div>
  )
}
