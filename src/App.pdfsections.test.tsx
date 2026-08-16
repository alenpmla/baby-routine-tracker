import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  const result = render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
  return result
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

describe('PDF report section selection', () => {
  beforeEach(() => {
    setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.removeItem('bt.reportSections')
  })

  it('opens a "Report sections" dialog with five checkboxes instead of downloading immediately', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openReportDialog(user)

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    expect(dialog).toBeInTheDocument()
    for (const name of ['Summary', 'Daily totals', 'Sleep', 'Feeding', 'Diaper']) {
      expect(within(dialog).getByRole('checkbox', { name })).toBeChecked()
    }
  })

  it('disables Download when every section is deselected and re-enables it when one is re-checked', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await openReportDialog(user)

    const dialog = screen.getByRole('dialog', { name: /report sections/i })
    for (const name of ['Summary', 'Daily totals', 'Sleep', 'Feeding', 'Diaper']) {
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
})
