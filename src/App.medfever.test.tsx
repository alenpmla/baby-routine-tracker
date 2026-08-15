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

async function goMedicationFever(user: ReturnType<typeof userEvent.setup>) {
  const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
  await user.click(nav().getByRole('button', { name: 'Health' }))
  await user.click(screen.getByRole('button', { name: /medication & fever/i }))
}

function timelineList(dayHeading: RegExp): ReturnType<typeof within> {
  return within(screen.getByRole('heading', { name: dayHeading }).closest('section') as HTMLElement)
}

describe('Medication & fever tracking', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('logs a medication dose via quick-add and shows it in the list', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    fireEvent.change(screen.getByLabelText(/^medication$/i), { target: { value: 'Paracetamol' } })
    await user.click(screen.getByRole('button', { name: /add medication/i }))

    expect(api.state.medications).toHaveLength(1)
    expect(api.state.medications[0].name).toBe('Paracetamol')
    expect(timelineList(/today/i).getByText('Paracetamol')).toBeInTheDocument()
  })

  it('rejects an empty medication name', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    await user.click(screen.getByRole('button', { name: /add medication/i }))

    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(api.state.medications).toHaveLength(0)
  })

  it('logs a medication with an amount and unit chosen via chips', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    fireEvent.change(screen.getByLabelText(/^medication$/i), { target: { value: 'Ibuprofen' } })
    fireEvent.change(screen.getByLabelText(/^amount$/i), { target: { value: '200' } })
    await user.click(screen.getByRole('button', { name: 'mg' }))
    await user.click(screen.getByRole('button', { name: /add medication/i }))

    expect(api.state.medications).toHaveLength(1)
    expect(api.state.medications[0].name).toBe('Ibuprofen')
    expect(api.state.medications[0].amount).toBe(200)
    expect(api.state.medications[0].unit).toBe('mg')
  })

  it('rejects an amount without a unit chosen', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    fireEvent.change(screen.getByLabelText(/^medication$/i), { target: { value: 'Ibuprofen' } })
    fireEvent.change(screen.getByLabelText(/^amount$/i), { target: { value: '200' } })
    await user.click(screen.getByRole('button', { name: /add medication/i }))

    expect(screen.getByText(/choose a unit/i)).toBeInTheDocument()
    expect(api.state.medications).toHaveLength(0)
  })

  it('logs a temperature in Fahrenheit via the segmented toggle', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    await user.click(screen.getByRole('button', { name: '°F' }))
    fireEvent.change(screen.getByLabelText(/^temperature$/i), { target: { value: '99.3' } })
    await user.click(screen.getByRole('button', { name: /add temperature/i }))

    expect(api.state.temperatures).toHaveLength(1)
    expect(api.state.temperatures[0].temp).toBe(99.3)
    expect(api.state.temperatures[0].unit).toBe('f')
    expect(screen.getAllByText('99.3 °F').length).toBeGreaterThan(0)
  })

  it('rejects an out-of-range Fahrenheit temperature', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    await user.click(screen.getByRole('button', { name: '°F' }))
    fireEvent.change(screen.getByLabelText(/^temperature$/i), { target: { value: '120' } })
    await user.click(screen.getByRole('button', { name: /add temperature/i }))

    expect(screen.getByText(/between 30–45°C \/ 86–113°F/i)).toBeInTheDocument()
    expect(api.state.temperatures).toHaveLength(0)
  })

  it('logs a temperature with a location chosen via chips', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    fireEvent.change(screen.getByLabelText(/^temperature$/i), { target: { value: '38.2' } })
    await user.click(screen.getByRole('button', { name: 'ear' }))
    await user.click(screen.getByRole('button', { name: /add temperature/i }))

    expect(api.state.temperatures).toHaveLength(1)
    expect(api.state.temperatures[0].location).toBe('ear')
    expect(screen.getAllByText('38.2 °C').length).toBeGreaterThan(0)
  })

  it('logs a temperature and shows it as the latest-reading tile', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    fireEvent.change(screen.getByLabelText(/^temperature$/i), { target: { value: '37.4' } })
    await user.click(screen.getByRole('button', { name: /add temperature/i }))

    expect(api.state.temperatures).toHaveLength(1)
    expect(api.state.temperatures[0].temp).toBe(37.4)
    expect(api.state.temperatures[0].unit).toBe('c')
    expect(screen.getAllByText('37.4 °C').length).toBeGreaterThan(0)
    expect(timelineList(/today/i).getByText(/37.4 °C/)).toBeInTheDocument()
  })

  it('rejects an out-of-range temperature', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    fireEvent.change(screen.getByLabelText(/^temperature$/i), { target: { value: '50' } })
    await user.click(screen.getByRole('button', { name: /add temperature/i }))

    expect(screen.getByText(/between 30–45/i)).toBeInTheDocument()
    expect(api.state.temperatures).toHaveLength(0)
  })

  it('adds a past medication with amount/unit via the modal and edits it', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    await user.click(screen.getByRole('button', { name: /add past dose/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/medication/i), { target: { value: 'Ibuprofen' } })
    fireEvent.change(within(dialog).getByLabelText(/amount/i), { target: { value: '200' } })
    fireEvent.change(within(dialog).getByLabelText(/^unit$/i), { target: { value: 'mg' } })
    await user.click(within(dialog).getByRole('button', { name: /save medication/i }))

    expect(api.state.medications).toHaveLength(1)
    expect(api.state.medications[0].amount).toBe(200)
    expect(api.state.medications[0].unit).toBe('mg')

    await user.click(screen.getByRole('button', { name: /edit medication/i }))
    const editDialog = screen.getByRole('dialog')
    fireEvent.change(within(editDialog).getByLabelText(/medication/i), { target: { value: 'Paracetamol' } })
    await user.click(within(editDialog).getByRole('button', { name: /save changes/i }))

    expect(api.state.medications[0].name).toBe('Paracetamol')
  })

  it('adds a past temperature with unit/location via the modal', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    await user.click(screen.getByRole('button', { name: /add past temperature/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/temperature/i), { target: { value: '38.2' } })
    fireEvent.change(within(dialog).getByLabelText(/location/i), { target: { value: 'ear' } })
    await user.click(within(dialog).getByRole('button', { name: /save temperature/i }))

    expect(api.state.temperatures).toHaveLength(1)
    expect(api.state.temperatures[0].temp).toBe(38.2)
    expect(api.state.temperatures[0].location).toBe('ear')
  })

  it('deletes a medication and a temperature via swipe-reveal', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMedicationFever(user)

    fireEvent.change(screen.getByLabelText(/^medication$/i), { target: { value: 'Paracetamol' } })
    await user.click(screen.getByRole('button', { name: /add medication/i }))
    fireEvent.change(screen.getByLabelText(/^temperature$/i), { target: { value: '37.4' } })
    await user.click(screen.getByRole('button', { name: /add temperature/i }))
    expect(api.state.medications).toHaveLength(1)
    expect(api.state.temperatures).toHaveLength(1)

    const medList = timelineList(/today/i)
    await user.click(medList.getByRole('button', { name: /delete medication/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(api.state.medications).toHaveLength(0)

    await user.click(medList.getByRole('button', { name: /delete temperature/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(api.state.temperatures).toHaveLength(0)
  })
})
