import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  const result = render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
  return result
}

function seedAllSections(api: MockApi) {
  const at = '2026-08-05T10:00:00.000Z'
  api.state.sleeps.push({ id: 's1', startTime: at, endTime: '2026-08-05T12:00:00.000Z' })
  api.state.feedings.push({ id: 'f1', time: at, type: 'bottle', amount: 120, unit: 'ml' })
  api.state.diapers.push({ id: 'd1', time: at, type: 'wet' })
  api.state.medications.push({ id: 'm1', time: at, name: 'Paracetamol', amount: 200, unit: 'mg' })
  api.state.temperatures.push({ id: 't1', time: at, temp: 38.2, unit: 'c' })
  api.state.weights.push({ id: 'w1', time: at, weight: 8.4, unit: 'kg' })
  api.state.headCircumferences.push({ id: 'h1', time: at, value: 42.5, unit: 'cm' })
  api.state.teeth.push({ id: 'tooth1', time: at, tooth: 'Lower central incisor' })
  api.state.teethingDays.push({ id: 'td1', day: '2026-08-05', symptoms: ['Drooling'] })
  api.state.milestones.push({ id: 'ms1', time: at, milestone: 'Roll over' })
}

async function openReportDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /settings/i }))
  await user.click(screen.getByRole('button', { name: /data & reports/i }))
  fireEvent.change(screen.getByLabelText(/^from$/i), { target: { value: '2026-08-01' } })
  fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: '2026-08-08' } })
  const createURL = vi.fn<() => string>(() => 'blob:mock')
  const revokeURL = vi.fn<() => void>()
  vi.stubGlobal('URL', { ...URL, createObjectURL: createURL, revokeObjectURL: revokeURL })
  await user.click(screen.getByRole('button', { name: /download pdf report/i }))
  return { createURL }
}

async function openDataReports(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /settings/i }))
  await user.click(screen.getByRole('button', { name: /data & reports/i }))
}

const SECTION_NAMES = [
  'Summary',
  'Daily totals',
  'Sleep',
  'Feeding',
  'Diaper',
  'Medication',
  'Temperature',
  'Weight',
  'Head circumference',
  'Teeth',
  'Teething days',
  'Milestones',
]

describe('PDF report section selection', () => {
  let api: MockApi
  beforeEach(() => {
    api = setupApi()
    seedAllSections(api)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.removeItem('bt.reportSections')
  })

  it('opens a "Report sections" dialog with all twelve checkboxes instead of downloading immediately', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openReportDialog(user)

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(SECTION_NAMES.length)
    for (const name of SECTION_NAMES) {
      expect(within(dialog).getByRole('checkbox', { name })).toBeChecked()
    }
  })

  it('disables Download when every section is deselected and re-enables it when one is re-checked', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openReportDialog(user)

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    for (const name of SECTION_NAMES) {
      await user.click(within(dialog).getByRole('checkbox', { name }))
    }
    expect(within(dialog).getByRole('button', { name: 'Download' })).toBeDisabled()

    await user.click(within(dialog).getByRole('checkbox', { name: 'Feeding' }))
    expect(within(dialog).getByRole('button', { name: 'Download' })).toBeEnabled()
  })

  it('downloads with the chosen subset, persists the selection, and closes the dialog', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const { createURL } = await openReportDialog(user)

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    await user.click(within(dialog).getByRole('checkbox', { name: 'Daily totals' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Diaper' }))
    await user.click(within(dialog).getByRole('button', { name: 'Download' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /report sections/i })).not.toBeInTheDocument())
    expect(screen.getByText('Report downloaded')).toBeInTheDocument()
    expect(createURL).toHaveBeenCalledTimes(1)

    const stored = JSON.parse(window.localStorage.getItem('bt.reportSections') ?? '{}')
    expect(stored).toMatchObject({ summary: true, dailyTotals: false, sleep: true, feeding: true, diaper: false })
    expect(stored.medication).toBe(true)
    expect(stored.temperature).toBe(true)
    expect(stored.weight).toBe(true)
    expect(stored.headCircumference).toBe(true)
    expect(stored.teeth).toBe(true)
    expect(stored.teething).toBe(true)
    expect(stored.milestones).toBe(true)
  })

  it('merges a previously stored 5-key selection with the new keys defaulting on', async () => {
    window.localStorage.setItem(
      'bt.reportSections',
      JSON.stringify({ summary: true, dailyTotals: false, sleep: true, feeding: true, diaper: false }),
    )
    const user = userEvent.setup()
    await onboard(user)
    await openReportDialog(user)

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    expect(within(dialog).getByRole('checkbox', { name: 'Daily totals' })).not.toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Medication' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Milestones' })).toBeChecked()
  })

  it('cancel closes the dialog without downloading', async () => {
    const user = userEvent.setup()
    await onboard(user)
    const { createURL } = await openReportDialog(user)

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /report sections/i })).not.toBeInTheDocument())
    expect(screen.queryByText('Report downloaded')).not.toBeInTheDocument()
    expect(createURL).not.toHaveBeenCalled()
  })

  it('disables sections with no records in the period and leaves them unchecked', async () => {
    api.state.sleeps = []
    api.state.diapers = []
    api.state.medications = []
    const user = userEvent.setup()
    await onboard(user)
    await openReportDialog(user)

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    expect(within(dialog).getByRole('checkbox', { name: 'Sleep' })).toBeDisabled()
    expect(within(dialog).getByRole('checkbox', { name: 'Sleep' })).not.toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Diaper' })).toBeDisabled()
    expect(within(dialog).getByRole('checkbox', { name: 'Diaper' })).not.toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Medication' })).toBeDisabled()
    expect(within(dialog).getByRole('checkbox', { name: 'Feeding' })).toBeEnabled()
    expect(within(dialog).getByRole('checkbox', { name: 'Feeding' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Summary' })).toBeEnabled()
    expect(within(dialog).getByRole('checkbox', { name: 'Daily totals' })).toBeEnabled()
  })

  it('disables the aggregate Summary and Daily totals when no core sleep/feeding/diaper data exists', async () => {
    api.state.sleeps = []
    api.state.feedings = []
    api.state.diapers = []
    const user = userEvent.setup()
    await onboard(user)
    await openReportDialog(user)

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    expect(within(dialog).getByRole('checkbox', { name: 'Summary' })).toBeDisabled()
    expect(within(dialog).getByRole('checkbox', { name: 'Daily totals' })).toBeDisabled()
    expect(within(dialog).getByRole('checkbox', { name: 'Weight' })).toBeEnabled()
    expect(within(dialog).getByRole('checkbox', { name: 'Weight' })).toBeChecked()
  })

  it('excludes disabled (empty) sections from the downloaded PDF selection', async () => {
    api.state.medications = []
    api.state.milestones = []
    const user = userEvent.setup()
    await onboard(user)
    const { createURL } = await openReportDialog(user)

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    await user.click(within(dialog).getByRole('button', { name: 'Download' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: /report sections/i })).not.toBeInTheDocument())
    expect(screen.getByText('Report downloaded')).toBeInTheDocument()
    expect(createURL).toHaveBeenCalledTimes(1)

    const stored = JSON.parse(window.localStorage.getItem('bt.reportSections') ?? '{}')
    expect(stored.medication).toBe(false)
    expect(stored.milestones).toBe(false)
    expect(stored.summary).toBe(true)
    expect(stored.feeding).toBe(true)
  })

  it('keeps Download disabled when no section with data is checked', async () => {
    api.state.feedings = []
    api.state.diapers = []
    api.state.sleeps = []
    api.state.medications = []
    api.state.temperatures = []
    api.state.weights = []
    api.state.headCircumferences = []
    api.state.teeth = []
    api.state.teethingDays = []
    api.state.milestones = []
    const user = userEvent.setup()
    await onboard(user)
    await openReportDialog(user)

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    expect(within(dialog).getByRole('button', { name: 'Download' })).toBeDisabled()
  })
})

describe('PDF report date-range presets', () => {
  let api: MockApi
  beforeEach(() => {
    api = setupApi()
    seedAllSections(api)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-08-14T12:00:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    window.localStorage.removeItem('bt.reportSections')
  })

  function clickPreset(user: ReturnType<typeof userEvent.setup>, label: string) {
    return user.click(screen.getByRole('button', { name: label }))
  }

  function fromValue(): string {
    return (screen.getByLabelText(/^from$/i) as HTMLInputElement).value
  }

  function toValue(): string {
    return (screen.getByLabelText(/^to$/i) as HTMLInputElement).value
  }

  it('fills From and To with 2026-08-01..2026-08-31 when This month is tapped', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openDataReports(user)

    await clickPreset(user, 'This month')

    expect(fromValue()).toBe('2026-08-01')
    expect(toValue()).toBe('2026-08-31')
  })

  it('fills From and To with 2026-07-01..2026-07-31 when Last month is tapped', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openDataReports(user)

    await clickPreset(user, 'Last month')

    expect(fromValue()).toBe('2026-07-01')
    expect(toValue()).toBe('2026-07-31')
  })

  it('fills From and To with 2026-05-14..2026-08-14 when Past 3 months is tapped', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openDataReports(user)

    await clickPreset(user, 'Past 3 months')

    expect(fromValue()).toBe('2026-05-14')
    expect(toValue()).toBe('2026-08-14')
  })

  it('clears a prior report error when a preset is tapped', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openDataReports(user)

    await user.click(screen.getByRole('button', { name: /download pdf report/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a start and end date')

    await clickPreset(user, 'This month')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fromValue()).toBe('2026-08-01')
  })

  it('opens the section dialog with every section available after a This month preset', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openDataReports(user)

    await clickPreset(user, 'This month')
    await user.click(screen.getByRole('button', { name: /download pdf report/i }))

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    for (const name of SECTION_NAMES) {
      expect(within(dialog).getByRole('checkbox', { name })).toBeEnabled()
    }
    expect(within(dialog).getByRole('button', { name: 'Download' })).toBeEnabled()
  })

  it('opens the section dialog with all sections disabled after a Last month preset', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openDataReports(user)

    await clickPreset(user, 'Last month')
    await user.click(screen.getByRole('button', { name: /download pdf report/i }))

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    for (const name of SECTION_NAMES) {
      expect(within(dialog).getByRole('checkbox', { name })).toBeDisabled()
    }
    expect(within(dialog).getByRole('button', { name: 'Download' })).toBeDisabled()
  })
})
