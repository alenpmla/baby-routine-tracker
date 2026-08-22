import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'

let api: MockApi

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
}

// Yesterday's dose at the same LOCAL clock hour, TZ-robust.
function yesterdayAt(hour: number, minute = 0): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - 1)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

describe('Medication reminders on Home', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.localStorage.clear()
  })

  it('shows a reminder card as the FIRST section above the summary grid', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const now = new Date()
    now.setHours(8, 30, 0, 0)
    vi.setSystemTime(now)
    api.state.medications.push({ id: 'm1', time: yesterdayAt(8, 30), name: 'Antibiotic', amount: 5, unit: 'ml' })

    const user = userEvent.setup()
    await onboard(user)

    const reminder = await screen.findByRole('button', { name: /yes, log it/i })
    const card = reminder.closest('.med-reminder') as HTMLElement
    expect(card).toHaveTextContent(/give antibiotic/i)
    expect(card).toHaveTextContent(/5 ml · at 08:30 am/i)
    expect(card).toHaveTextContent(/reminder/i)

    const summaryGrid = document.querySelector('.summary-grid') as HTMLElement
    const section = reminder.closest('section') as HTMLElement
    expect(summaryGrid.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
  })

  it('stacks multiple reminders as independent cards ordered by clock time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const now = new Date()
    now.setHours(20, 50, 0, 0)
    vi.setSystemTime(now)
    api.state.medications.push(
      { id: 'm1', time: yesterdayAt(8, 30), name: 'Antibiotic', amount: 5, unit: 'ml' },
      { id: 'm2', time: yesterdayAt(20, 30), name: 'Antibiotic', amount: 5, unit: 'ml' },
      { id: 'm3', time: yesterdayAt(20, 30), name: 'Vitamin D', amount: 1, unit: 'drops' },
    )

    const user = userEvent.setup()
    await onboard(user)

    // Morning + evening antibiotic and evening Vitamin D are all still showable.
    const buttons = await screen.findAllByRole('button', { name: /yes, log it/i })
    expect(buttons).toHaveLength(3)
    const cards = buttons.map((b) => b.closest('.med-reminder') as HTMLElement)
    expect(cards[0]).toHaveTextContent('Antibiotic')
    expect(cards[1]).toHaveTextContent('Antibiotic')
    expect(cards[2]).toHaveTextContent('Vitamin D')
    expect(cards[0].compareDocumentPosition(cards[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(cards[1].compareDocumentPosition(cards[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('logs the dose at today\'s reference clock time when confirmed, then hides the card', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const now = new Date()
    now.setHours(8, 40, 0, 0)
    vi.setSystemTime(now)
    api.state.medications.push({ id: 'm1', time: yesterdayAt(8, 30), name: 'Antibiotic', amount: 5, unit: 'ml', notes: 'after food' })

    const user = userEvent.setup()
    await onboard(user)

    await user.click(await screen.findByRole('button', { name: /yes, log it/i }))

    expect(api.state.medications).toHaveLength(2)
    const added = api.state.medications[1]
    expect(added.name).toBe('Antibiotic')
    expect(added.amount).toBe(5)
    expect(added.unit).toBe('ml')
    expect(added.notes).toBe('after food')
    const addedDate = new Date(added.time)
    expect(addedDate.getHours()).toBe(8)
    expect(addedDate.getMinutes()).toBe(30)
    expect(addedDate.getFullYear()).toBe(now.getFullYear())

    expect(screen.queryByRole('button', { name: /yes, log it/i })).not.toBeInTheDocument()
  })

  it('does not show a card when the dose was already logged today within the window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const now = new Date()
    now.setHours(20, 0, 0, 0) // after the 8:30 scheduled time
    vi.setSystemTime(now)
    const loggedToday = new Date(now)
    loggedToday.setHours(8, 30, 0, 0) // already logged at the scheduled time
    api.state.medications.push(
      { id: 'm1', time: yesterdayAt(8, 30), name: 'Antibiotic', amount: 5, unit: 'ml' },
      { id: 'm2', time: loggedToday.toISOString(), name: 'Antibiotic', amount: 5, unit: 'ml' },
    )

    const user = userEvent.setup()
    await onboard(user)

    expect(screen.queryByRole('button', { name: /yes, log it/i })).not.toBeInTheDocument()
  })

  it('keeps the card visible all day until confirmed or dismissed (no auto-clear)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const now = new Date()
    now.setHours(20, 0, 0, 0) // many hours after the 8:30 scheduled dose
    vi.setSystemTime(now)
    api.state.medications.push({ id: 'm1', time: yesterdayAt(8, 30), name: 'Antibiotic', amount: 5, unit: 'ml' })

    const user = userEvent.setup()
    await onboard(user)

    expect(await screen.findByRole('button', { name: /yes, log it/i })).toBeInTheDocument()
  })

  it('"Hide reminders" asks for confirmation, persists across reload, and a manual re-add re-arms', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const now = new Date()
    now.setHours(9, 0, 0, 0)
    vi.setSystemTime(now)
    api.state.medications.push({ id: 'm1', time: yesterdayAt(8, 30), name: 'Antibiotic', amount: 5, unit: 'ml' })

    const user = userEvent.setup()
    await onboard(user)

    // Swipe-revealed action asks for confirmation before hiding.
    await user.click(await screen.findByRole('button', { name: /hide reminders for antibiotic/i }))
    expect(screen.getByRole('heading', { name: 'Hide reminders?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide reminders' }))

    expect(screen.queryByRole('button', { name: /yes, log it/i })).not.toBeInTheDocument()
    const dismissed = JSON.parse(window.localStorage.getItem('bt.medReminderDismissed') ?? '{}')
    expect(dismissed.Antibiotic).toBeTruthy()
  })

  it('re-arms and asks again the next day after a manual re-add that is newer than the dismissal', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const today = new Date()
    today.setHours(9, 0, 0, 0)
    vi.setSystemTime(today)
    api.state.medications.push({ id: 'm1', time: yesterdayAt(8, 30), name: 'Antibiotic', amount: 5, unit: 'ml' })

    const user = userEvent.setup()
    await onboard(user)
    await user.click(await screen.findByRole('button', { name: /hide reminders for antibiotic/i }))
    await user.click(screen.getByRole('button', { name: 'Hide reminders' }))
    expect(screen.queryByRole('button', { name: /yes, log it/i })).not.toBeInTheDocument()

    // User manually re-adds the medication later today (newer than the dismissal) via Health.
    const reAddAt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0, 0, 0)
    vi.setSystemTime(reAddAt)
    const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
    await user.click(nav().getByRole('button', { name: 'Health' }))
    await user.click(screen.getByRole('button', { name: /medication & fever/i }))
    fireEvent.change(screen.getByLabelText(/^medication$/i), { target: { value: 'Antibiotic' } })
    await user.click(screen.getByRole('button', { name: /add medication/i }))
    expect(api.state.medications).toHaveLength(2)

    // Next day at the re-added dose's clock time, the reminder asks again.
    await user.click(nav().getByRole('button', { name: 'Home' }))
    const nextDay = new Date(reAddAt)
    nextDay.setDate(nextDay.getDate() + 1)
    nextDay.setHours(19, 0, 0, 0)
    vi.setSystemTime(nextDay)
    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    await user.click(screen.getByRole('button', { name: 'Next day' }))

    expect(await screen.findByRole('button', { name: /yes, log it/i })).toBeInTheDocument()
  })
})