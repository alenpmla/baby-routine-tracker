import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'

let api: MockApi

const DAY_MS = 24 * 3600 * 1000

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2025-11-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
}

async function goMilestones(user: ReturnType<typeof userEvent.setup>) {
  const nav = () => within(screen.getByRole('navigation', { name: /primary/i }))
  await user.click(nav().getByRole('button', { name: 'Health' }))
  await user.click(screen.getByRole('button', { name: /^milestones/i }))
}

function timelineList(dayHeading: RegExp): ReturnType<typeof within> {
  return within(screen.getByRole('heading', { name: dayHeading }).closest('section') as HTMLElement)
}

describe('Milestones tracking', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('logs a curated milestone via quick-add and shows it in the list', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMilestones(user)

    fireEvent.change(screen.getByLabelText(/^milestone$/i), { target: { value: 'Crawl' } })
    await user.click(screen.getByRole('button', { name: /add milestone/i }))

    expect(api.state.milestones).toHaveLength(1)
    expect(api.state.milestones[0].milestone).toBe('Crawl')
    expect(timelineList(/today/i).getByText('Crawl')).toBeInTheDocument()
  })

  it('keeps the Add button disabled until a milestone is selected', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMilestones(user)

    expect(screen.getByRole('button', { name: /add milestone/i })).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/^milestone$/i), { target: { value: 'Crawl' } })
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeEnabled()
    expect(api.state.milestones).toHaveLength(0)
  })

  it('removes an already-logged curated milestone from the picker (no accidental duplicates)', async () => {
    const dayStart = startOfLocalDay(new Date())
    api.state.milestones = [
      { id: 'm1', time: new Date(dayStart.getTime() - 90 * DAY_MS).toISOString(), milestone: 'Crawl' },
    ]
    const user = userEvent.setup()
    await onboard(user)
    await goMilestones(user)

    const picker = screen.getByLabelText(/^milestone$/i) as HTMLSelectElement
    const options = Array.from(picker.options).map((o) => o.value)
    expect(options).not.toContain('Crawl')
    expect(options).toContain('Walk')
  })

  it('excludes already-logged milestones from the Add-past modal', async () => {
    const dayStart = startOfLocalDay(new Date())
    api.state.milestones = [
      { id: 'm1', time: new Date(dayStart.getTime() + 3600 * 1000).toISOString(), milestone: 'Crawl' },
    ]
    const user = userEvent.setup()
    await onboard(user)
    await goMilestones(user)

    await user.click(screen.getByRole('button', { name: /add past milestone/i }))
    const addDialog = screen.getByRole('dialog')
    const addPicker = within(addDialog).getByLabelText(/^milestone$/i) as HTMLSelectElement
    const addOptions = Array.from(addPicker.options).map((o) => o.value)
    expect(addOptions).not.toContain('Crawl')
  })

  it('keeps the record milestone visible in the Edit modal', async () => {
    const dayStart = startOfLocalDay(new Date())
    api.state.milestones = [
      { id: 'm1', time: new Date(dayStart.getTime() + 3600 * 1000).toISOString(), milestone: 'Crawl' },
    ]
    const user = userEvent.setup()
    await onboard(user)
    await goMilestones(user)

    await user.click(screen.getByRole('button', { name: /edit milestone/i }))
    const editDialog = screen.getByRole('dialog')
    const editPicker = within(editDialog).getByLabelText(/^milestone$/i) as HTMLSelectElement
    const editOptions = Array.from(editPicker.options).map((o) => o.value)
    expect(editOptions).toContain('Crawl')
  })

  it('logs a custom milestone label via quick-add', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMilestones(user)

    fireEvent.change(screen.getByLabelText(/or custom/i), { target: { value: 'Waves goodbye' } })
    await user.click(screen.getByRole('button', { name: /add milestone/i }))

    expect(api.state.milestones).toHaveLength(1)
    expect(api.state.milestones[0].milestone).toBe('Waves goodbye')
    expect(timelineList(/today/i).getByText('Waves goodbye')).toBeInTheDocument()
  })

  it('shows the Firsts summary with achieved milestones and ages', async () => {
    const dayStart = startOfLocalDay(new Date())
    api.state.milestones = [
      { id: 'm1', time: new Date(dayStart.getTime() - 90 * DAY_MS).toISOString(), milestone: 'Roll over' },
      { id: 'm2', time: new Date(dayStart.getTime() - 30 * DAY_MS).toISOString(), milestone: 'Sit up' },
    ]
    const user = userEvent.setup()
    await onboard(user)
    await goMilestones(user)

    const firsts = screen.getByRole('region', { name: 'Milestone firsts' })
    expect(firsts).toBeInTheDocument()
    expect(firsts).toHaveTextContent('Roll over')
    expect(firsts).toHaveTextContent('Sit up')
    expect(firsts).toHaveTextContent('Crawl')
    expect(firsts).toHaveTextContent('Walk')
    expect(firsts).toHaveTextContent('Not yet')
    expect(firsts).toHaveTextContent(/old/)
  })

  it('adds a past milestone via the modal and edits it', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMilestones(user)

    await user.click(screen.getByRole('button', { name: /add past milestone/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/or custom/i), { target: { value: 'First smile' } })
    await user.click(within(dialog).getByRole('button', { name: /save milestone/i }))

    expect(api.state.milestones).toHaveLength(1)
    expect(api.state.milestones[0].milestone).toBe('First smile')

    await user.click(screen.getByRole('button', { name: /edit milestone/i }))
    const editDialog = screen.getByRole('dialog')
    fireEvent.change(within(editDialog).getByLabelText(/or custom/i), { target: { value: 'Giggle' } })
    await user.click(within(editDialog).getByRole('button', { name: /save changes/i }))

    expect(api.state.milestones[0].milestone).toBe('Giggle')
  })

  it('deletes a milestone via swipe-reveal', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await goMilestones(user)

    fireEvent.change(screen.getByLabelText(/^milestone$/i), { target: { value: 'Crawl' } })
    await user.click(screen.getByRole('button', { name: /add milestone/i }))
    expect(api.state.milestones).toHaveLength(1)

    const list = timelineList(/today/i)
    await user.click(list.getByRole('button', { name: /delete milestone/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }))
    expect(api.state.milestones).toHaveLength(0)
  })
})

function startOfLocalDay(at: Date): Date {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate())
}
