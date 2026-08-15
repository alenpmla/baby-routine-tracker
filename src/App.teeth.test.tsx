import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'
import { toInputDate } from './presentation/utils/time'

let api: MockApi

const DAY_MS = 24 * 3600 * 1000

function startOfLocalDay(at: Date): Date {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate())
}

function localDateKey(at: Date): string {
  const year = at.getFullYear()
  const month = String(at.getMonth() + 1).padStart(2, '0')
  const date = String(at.getDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
}

async function openTeethMenu(user: ReturnType<typeof userEvent.setup>) {
  const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
  await user.click(nav().getByRole('button', { name: 'Health' }))
  await user.click(screen.getByRole('button', { name: /teeth & teething/i }))
}

async function goTeeth(user: ReturnType<typeof userEvent.setup>) {
  await openTeethMenu(user)
  await user.click(screen.getByRole('button', { name: /teeth erupted teeth/i }))
}

async function goTeething(user: ReturnType<typeof userEvent.setup>) {
  await openTeethMenu(user)
  await user.click(screen.getByRole('button', { name: /teething day-by-day/i }))
}

function timelineList(dayHeading: RegExp): ReturnType<typeof within> {
  return within(screen.getByRole('heading', { name: dayHeading }).closest('section') as HTMLElement)
}

function swipeOpen(rowTextElement: HTMLElement, dx = 60) {
  const row = rowTextElement.closest('.swipeable-row-content') as HTMLElement
  const li = rowTextElement.closest('.swipeable-row') as HTMLElement
  fireEvent.pointerDown(row, { pointerId: 1, clientX: 200, button: 0, pointerType: 'touch' })
  fireEvent.pointerMove(row, { pointerId: 1, clientX: 200 - dx, button: 0 })
  fireEvent.pointerUp(row, { pointerId: 1, clientX: 200 - dx, button: 0 })
  expect(li.classList.contains('swipeable-row-open')).toBe(true)
  return li
}

function backTo(state: { tab: string; settings: boolean; healthView?: string }) {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state }))
  })
}

describe('Teeth screen', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('logs a tooth via quick-add and shows it in the list and chart', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTeeth(user)

    fireEvent.change(screen.getByLabelText(/^tooth$/i), { target: { value: 'Upper central incisor' } })
    await user.click(screen.getByRole('button', { name: /add tooth/i }))

    expect(api.state.teeth).toHaveLength(1)
    expect(api.state.teeth[0].tooth).toBe('Upper central incisor')
    const list = timelineList(/today/i)
    expect(list.getByText('Upper central incisor')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Upper central incisor erupted' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Lower central incisor not erupted' })).toBeInTheDocument()
  })

  it('rejects a future eruption via the backfill modal', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTeeth(user)

    await user.click(screen.getByRole('button', { name: /add past tooth/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/date/i), {
      target: { value: toInputDate(new Date(Date.now() + DAY_MS)) },
    })
    await user.click(within(dialog).getByRole('button', { name: /save tooth/i }))

    expect(screen.getByText(/in the future/i)).toBeInTheDocument()
    expect(api.state.teeth).toHaveLength(0)
  })

  it('adds a past tooth and edits it with a tooth change', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTeeth(user)

    await user.click(screen.getByRole('button', { name: /add past tooth/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/^tooth$/i), { target: { value: 'Lower central incisor' } })
    await user.click(within(dialog).getByRole('button', { name: /save tooth/i }))
    expect(api.state.teeth).toHaveLength(1)
    expect(api.state.teeth[0].tooth).toBe('Lower central incisor')

    await user.click(screen.getByRole('button', { name: /edit tooth/i }))
    const edit = screen.getByRole('dialog')
    fireEvent.change(within(edit).getByLabelText(/^tooth$/i), { target: { value: 'Upper central incisor' } })
    await user.click(within(edit).getByRole('button', { name: /save changes/i }))

    expect(api.state.teeth).toHaveLength(1)
    expect(api.state.teeth[0].tooth).toBe('Upper central incisor')
    const list = timelineList(/today/i)
    expect(list.getByText('Upper central incisor')).toBeInTheDocument()
  })

  it('deletes a tooth via swipe-to-reveal', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTeeth(user)

    fireEvent.change(screen.getByLabelText(/^tooth$/i), { target: { value: 'Lower central incisor' } })
    await user.click(screen.getByRole('button', { name: /add tooth/i }))
    expect(api.state.teeth).toHaveLength(1)

    const list = timelineList(/today/i)
    swipeOpen(list.getByText('Lower central incisor'))
    await user.click(screen.getByRole('button', { name: /delete tooth/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(api.state.teeth).toHaveLength(0)
    expect(list.queryByText('Lower central incisor')).not.toBeInTheDocument()
  })

  it('duplicates a tooth via the swipe-reveal action', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTeeth(user)

    fireEvent.change(screen.getByLabelText(/^tooth$/i), { target: { value: 'Upper central incisor' } })
    await user.click(screen.getByRole('button', { name: /add tooth/i }))
    expect(api.state.teeth).toHaveLength(1)

    const list = timelineList(/today/i)
    swipeOpen(list.getByText('Upper central incisor'), 120)
    await user.click(screen.getByRole('button', { name: /duplicate tooth/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(/^tooth$/i)).toHaveValue('Upper central incisor')

    await user.click(within(dialog).getByRole('button', { name: /save tooth/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.state.teeth).toHaveLength(2)
    expect(api.state.teeth[1].tooth).toBe('Upper central incisor')
    expect(api.state.teeth[0].id).not.toBe(api.state.teeth[1].id)
  })

  it('marks multiple erupted teeth in the chart in canonical order', async () => {
    const now = new Date()
    api.state.teeth = [
      { id: 't1', time: new Date(now.getTime() - DAY_MS).toISOString(), tooth: 'Upper lateral incisor' },
      { id: 't2', time: new Date(now.getTime() - 2 * DAY_MS).toISOString(), tooth: 'Lower central incisor' },
    ]
    const user = userEvent.setup()
    await onboard(user)
    await goTeeth(user)

    expect(screen.getByRole('img', { name: 'Lower central incisor erupted' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Upper lateral incisor erupted' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Upper central incisor not erupted' })).toBeInTheDocument()
    expect(screen.getByText(/2 of 10 teeth erupted/)).toBeInTheDocument()
  })
})

describe('Teething screen', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('logs a teething day with symptom checkboxes and shows it in the list', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTeething(user)

    await user.click(screen.getByRole('button', { name: 'Drooling' }))
    await user.click(screen.getByRole('button', { name: 'Poor sleep' }))
    await user.click(screen.getByRole('button', { name: /add teething day/i }))

    expect(api.state.teethingDays).toHaveLength(1)
    expect(api.state.teethingDays[0].symptoms).toEqual(['Drooling', 'Poor sleep'])
    const list = timelineList(/today/i)
    expect(list.getByText('Drooling · Poor sleep')).toBeInTheDocument()
  })

  it('requires at least one symptom', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTeething(user)

    await user.click(screen.getByRole('button', { name: /add teething day/i }))

    expect(screen.getByText('Choose at least one symptom')).toBeInTheDocument()
    expect(api.state.teethingDays).toHaveLength(0)
  })

  it('rejects a future teething day', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTeething(user)

    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: toInputDate(new Date(Date.now() + DAY_MS)) },
    })
    await user.click(screen.getByRole('button', { name: 'Drooling' }))
    await user.click(screen.getByRole('button', { name: /add teething day/i }))

    expect(screen.getByText(/cannot log a teething day in the future/i)).toBeInTheDocument()
    expect(api.state.teethingDays).toHaveLength(0)
  })

  it('backfills a teething day for a past date and shows it under that day', async () => {
    const yesterday = toInputDate(new Date(Date.now() - DAY_MS))
    const user = userEvent.setup()
    await onboard(user)
    await goTeething(user)

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: yesterday } })
    await user.click(screen.getByRole('button', { name: 'Drooling' }))
    await user.click(screen.getByRole('button', { name: /add teething day/i }))

    expect(api.state.teethingDays).toHaveLength(1)
    expect(api.state.teethingDays[0].day).toBe(yesterday)
    expect(timelineList(/today/i).getByText(/no teething day recorded/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /previous day/i }))
    const yList = timelineList(/yesterday/i)
    expect(yList.getByText('Drooling')).toBeInTheDocument()
  })

  it('surfaces the one-per-day duplicate error inline on the form', async () => {
    api.state.teethingDays = [{ id: 'td1', day: toInputDate(new Date()), symptoms: ['Drooling'] }]
    const user = userEvent.setup()
    await onboard(user)
    await goTeething(user)

    await user.click(screen.getByRole('button', { name: 'Fussy' }))
    await user.click(screen.getByRole('button', { name: /add teething day/i }))

    expect(screen.getByText(/already exists for this date/i)).toBeInTheDocument()
    expect(api.state.teethingDays).toHaveLength(1)
  })

  it('surfaces the one-per-day duplicate error when editing onto an occupied date', async () => {
    const yesterday = toInputDate(new Date(Date.now() - DAY_MS))
    api.state.teethingDays = [
      { id: 'td1', day: toInputDate(new Date()), symptoms: ['Drooling'] },
      { id: 'td2', day: yesterday, symptoms: ['Fussy'] },
    ]
    const user = userEvent.setup()
    await onboard(user)
    await goTeething(user)

    await user.click(screen.getByRole('button', { name: /edit teething day/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/date/i), { target: { value: yesterday } })
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }))

    expect(within(dialog).getByText(/already exists for this date/i)).toBeInTheDocument()
    expect(api.state.teethingDays).toHaveLength(2)
  })

  it('edits a teething day, changing its symptoms', async () => {
    api.state.teethingDays = [{ id: 'td1', day: toInputDate(new Date()), symptoms: ['Drooling'] }]
    const user = userEvent.setup()
    await onboard(user)
    await goTeething(user)

    await user.click(screen.getByRole('button', { name: /edit teething day/i }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Fussy' }))
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }))

    expect(api.state.teethingDays).toHaveLength(1)
    expect(api.state.teethingDays[0].symptoms).toEqual(['Drooling', 'Fussy'])
    expect(timelineList(/today/i).getByText('Drooling · Fussy')).toBeInTheDocument()
  })

  it('deletes a teething day via swipe-to-reveal', async () => {
    api.state.teethingDays = [{ id: 'td1', day: toInputDate(new Date()), symptoms: ['Drooling'] }]
    const user = userEvent.setup()
    await onboard(user)
    await goTeething(user)

    const list = timelineList(/today/i)
    swipeOpen(list.getByText('Drooling'))
    await user.click(screen.getByRole('button', { name: /delete teething day/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))

    expect(api.state.teethingDays).toHaveLength(0)
    expect(list.queryByText('Drooling')).not.toBeInTheDocument()
  })

  it('renders the Teething & sleep card comparing teething vs non-teething days', async () => {
    const today = startOfLocalDay(new Date())
    const iso = (h: number) => new Date(today.getTime() + h * 3600 * 1000).toISOString()
    // 2 teething days with short sleep + 2 non-teething days with long sleep
    api.state.teethingDays = [
      { id: 'td1', day: localDateKey(today), symptoms: ['Drooling'] },
      { id: 'td2', day: localDateKey(new Date(today.getTime() - DAY_MS)), symptoms: ['Fussy'] },
    ]
    api.state.sleeps = [
      { id: 's1', startTime: iso(1), endTime: iso(4) }, // today, teething: 3h
      { id: 's2', startTime: iso(20), endTime: iso(0 + 24) }, // tonight (19-9 = night), teething
      { id: 's3', startTime: iso(1 - 24), endTime: iso(5 - 24) }, // yesterday, teething: 4h
      { id: 's4', startTime: iso(1 - 2 * 24), endTime: iso(12 - 2 * 24) }, // 2 days ago, non-teething: 11h
      { id: 's5', startTime: iso(1 - 3 * 24), endTime: iso(12 - 3 * 24) }, // 3 days ago, non-teething: 11h
    ]
    const user = userEvent.setup()
    await onboard(user)
    await goTeething(user)

    const card = screen.getByRole('region', { name: 'Teething & sleep' })
    expect(card).toBeInTheDocument()
    expect(card).toHaveTextContent(/less average sleep on teething days/i)
    expect(card).toHaveTextContent(/night wakings/i)
  })

  it('hides the Teething & sleep card when there is no non-teething day with sleep in the window', async () => {
    const today = startOfLocalDay(new Date())
    api.state.teethingDays = [{ id: 'td1', day: localDateKey(today), symptoms: ['Drooling'] }]
    api.state.sleeps = [
      { id: 's1', startTime: new Date(today.getTime() + 3600 * 1000).toISOString(), endTime: new Date(today.getTime() + 4 * 3600 * 1000).toISOString() },
    ]
    const user = userEvent.setup()
    await onboard(user)
    await goTeething(user)

    expect(screen.queryByRole('region', { name: 'Teething & sleep' })).not.toBeInTheDocument()
  })
})

describe('Health tab teeth/teething mount', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens the Teeth screen from the sub-menu and backs out to the menu', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openTeethMenu(user)
    expect(screen.getByRole('heading', { name: 'Teeth & teething' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /teeth erupted teeth/i }))
    expect(screen.getByRole('heading', { name: 'Teeth' })).toBeInTheDocument()
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add tooth/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(await screen.findByRole('heading', { name: 'Teeth & teething' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(await screen.findByRole('heading', { name: 'Health' })).toBeInTheDocument()
  })

  it('opens the Teething screen from the sub-menu and backs out to the menu', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openTeethMenu(user)

    await user.click(screen.getByRole('button', { name: /teething day-by-day/i }))
    expect(screen.getByRole('heading', { name: 'Teething' })).toBeInTheDocument()
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add teething day/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(await screen.findByRole('heading', { name: 'Teeth & teething' })).toBeInTheDocument()
  })

  it('physical back from the Teeth screen returns to the sub-menu, then the Health menu', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goTeeth(user)
    expect(screen.getByRole('heading', { name: 'Teeth' })).toBeInTheDocument()

    backTo({ tab: 'health', settings: false, healthView: 'teethmenu' })
    expect(await screen.findByRole('heading', { name: 'Teeth & teething' })).toBeInTheDocument()

    backTo({ tab: 'health', settings: false })
    expect(await screen.findByRole('heading', { name: 'Health' })).toBeInTheDocument()
  })
})
