import { describe, it, expect } from 'vitest'
import {
  ageInMonthsAt,
  deleteMilestone,
  firstMilestones,
  listMilestonesForDay,
  recordMilestone,
  updateMilestone,
} from '../milestone'
import { MemoryMilestoneRepo } from '../../../test/memoryRepos'

const HOUR = 3600 * 1000

describe('milestone use cases', () => {
  it('records a milestone with an optional note', () => {
    const repo = new MemoryMilestoneRepo()
    const entry = recordMilestone(repo, 'Crawl', new Date(Date.now() - 60000), 'took first steps')
    expect(entry.milestone).toBe('Crawl')
    expect(entry.notes).toBe('took first steps')
    expect(repo.getAll()).toHaveLength(1)
  })

  it('allows a custom milestone label', () => {
    const repo = new MemoryMilestoneRepo()
    const entry = recordMilestone(repo, 'Waves goodbye')
    expect(entry.milestone).toBe('Waves goodbye')
  })

  it('rejects an empty milestone and future timestamps', () => {
    const repo = new MemoryMilestoneRepo()
    expect(() => recordMilestone(repo, '  ')).toThrow(/name/i)
    expect(() => recordMilestone(repo, 'Crawl', new Date(Date.now() + HOUR))).toThrow(/future/i)
  })

  it('lists milestones for the day, newest first', () => {
    const repo = new MemoryMilestoneRepo()
    const dayEnd = new Date()
    const dayStart = new Date(dayEnd.getTime() - 24 * HOUR)
    const older = recordMilestone(repo, 'Roll over', new Date(Date.now() - 2 * HOUR))
    const newer = recordMilestone(repo, 'Sit up', new Date(Date.now() - HOUR))
    recordMilestone(repo, 'Lift head', new Date(Date.now() - 30 * HOUR))

    const listed = listMilestonesForDay(repo, dayStart, dayEnd)
    expect(listed.map((m) => m.id)).toEqual([newer.id, older.id])
  })

  it('updates and deletes a milestone', () => {
    const repo = new MemoryMilestoneRepo()
    const entry = recordMilestone(repo, 'Crawl')
    const updated = updateMilestone(repo, entry.id, { milestone: 'Crawling', notes: 'fast now' })
    expect(updated.milestone).toBe('Crawling')
    expect(updated.notes).toBe('fast now')
    expect(updated.id).toBe(entry.id)
    deleteMilestone(repo, entry.id)
    expect(repo.getAll()).toHaveLength(0)
  })

  it('update throws for an unknown id', () => {
    const repo = new MemoryMilestoneRepo()
    expect(() => updateMilestone(repo, 'missing', {})).toThrow(/not found/i)
  })
})

describe('firstMilestones', () => {
  it('returns earliest record per curated milestone with age at achievement', () => {
    const repo = new MemoryMilestoneRepo()
    const dob = '2025-11-15'
    // Roll over twice — first at 3 months, later at 5 months
    recordMilestone(repo, 'Roll over', new Date('2026-02-15T10:00:00Z'))
    recordMilestone(repo, 'Roll over', new Date('2026-04-15T10:00:00Z'))
    recordMilestone(repo, 'Sit up', new Date('2026-05-01T10:00:00Z'))
    recordMilestone(repo, 'Waves goodbye', new Date('2026-05-02T10:00:00Z')) // custom: ignored by firsts

    const firsts = firstMilestones(repo, dob)
    const roll = firsts.find((f) => f.milestone === 'Roll over')
    const sit = firsts.find((f) => f.milestone === 'Sit up')
    const walk = firsts.find((f) => f.milestone === 'Walk')

    expect(roll?.achieved).toBe(true)
    expect(roll?.time).toBe(new Date('2026-02-15T10:00:00Z').toISOString())
    expect(roll?.ageMonths).toBe(ageInMonthsAt(dob, new Date('2026-02-15T10:00:00Z')))
    expect(sit?.achieved).toBe(true)
    expect(walk?.achieved).toBe(false)
  })

  it('matches curated milestones case-insensitively', () => {
    const repo = new MemoryMilestoneRepo()
    recordMilestone(repo, 'crawl', new Date('2026-06-01T00:00:00Z'))
    const firsts = firstMilestones(repo, '2025-11-15')
    const crawl = firsts.find((f) => f.milestone === 'Crawl')
    expect(crawl?.achieved).toBe(true)
  })

  it('returns all curated milestones unachieved when none recorded', () => {
    const repo = new MemoryMilestoneRepo()
    const firsts = firstMilestones(repo, '2025-11-15')
    expect(firsts).toHaveLength(8)
    expect(firsts.every((f) => !f.achieved)).toBe(true)
  })
})
