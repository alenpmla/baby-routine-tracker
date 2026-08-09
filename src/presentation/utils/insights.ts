import type { Insight } from '../../domain/usecase/insights'
import { formatClock, formatDuration } from './time'

export interface DisplayInsight {
  title: string
  detail: string
}

/** Formats a domain insight into display strings using existing time helpers. */
export function describeInsight(insight: Insight, now: Date = new Date()): DisplayInsight {
  switch (insight.id) {
    case 'next_feed':
      if (insight.overdue) {
        const elapsedMs = now.getTime() - new Date(insight.lastFeedAt).getTime()
        return {
          title: 'Feed time?',
          detail: `${formatDuration(elapsedMs)} since last feed · typical gap ${formatDuration(insight.medianGapMs)}`,
        }
      }
      return {
        title: 'Next feed likely',
        detail: `Around ${formatClock(insight.nextAt ?? insight.lastFeedAt)} · typical gap ${formatDuration(insight.medianGapMs)}`,
      }
    case 'longest_stretch':
      return {
        title: 'Longest stretch between feeds',
        detail: `${formatDuration(insight.durationMs)} · ${formatClock(insight.startAt)} → ${formatClock(insight.endAt)}`,
      }
    case 'sleep_total':
      return {
        title: 'Slept today',
        detail: `${formatDuration(insight.todayMs)} so far · ~${formatDuration(insight.avgDayMs)}/day`,
      }
  }
}
