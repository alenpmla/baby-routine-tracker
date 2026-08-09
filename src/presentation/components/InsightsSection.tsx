import { useTracker } from '../store/TrackerProvider'
import { describeInsight } from '../utils/insights'

export default function InsightsSection() {
  const { insights, now } = useTracker()
  if (insights.length === 0) {
    return null
  }
  return (
    <section className="insights">
      <h2 className="insights-title">Trends &amp; insights</h2>
      <div className="insight-row">
        {insights.map((insight) => {
          const { title, detail } = describeInsight(insight, now)
          return (
            <div key={insight.id} className="card insight-card">
              <span className="insight-title">{title}</span>
              <span className="insight-detail">{detail}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
