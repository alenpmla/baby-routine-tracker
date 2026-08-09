import type {
  DiaperRepository,
  FeedingRepository,
  SleepRepository,
} from '../repository/repositories'

export interface DailyAverages {
  days: number
  avgSleepMs: number
  avgSolidsGram: number
  avgDiapers: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const OZ_TO_GRAM = 28.3495

export function getDailyAverages(
  sleepRepo: SleepRepository,
  feedingRepo: FeedingRepository,
  diaperRepo: DiaperRepository,
  days = 30,
  now = new Date(),
): DailyAverages {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const windowStart = todayStart - (days - 1) * DAY_MS
  const windowEnd = todayStart + DAY_MS

  const inWindow = (iso: string): boolean => {
    const t = new Date(iso).getTime()
    return t >= windowStart && t < windowEnd
  }

  const diapers = diaperRepo.getAll().filter((d) => inWindow(d.time)).length

  let solidsGram = 0
  for (const f of feedingRepo.getAll()) {
    if (!inWindow(f.time) || f.type !== 'solids' || f.amount === undefined || !f.unit) {
      continue
    }
    solidsGram += f.unit === 'gram' ? f.amount : f.amount * OZ_TO_GRAM
  }

  let sleepMs = 0
  for (const s of sleepRepo.getAll()) {
    if (!s.endTime || !inWindow(s.startTime)) {
      continue
    }
    sleepMs += new Date(s.endTime).getTime() - new Date(s.startTime).getTime()
  }

  return {
    days,
    avgSleepMs: sleepMs / days,
    avgSolidsGram: solidsGram / days,
    avgDiapers: diapers / days,
  }
}
