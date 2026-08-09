import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'

let api: MockApi

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  const result = render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
  return result
}

describe('Food suggestions', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.removeItem('bt.theme')
    window.localStorage.removeItem('bt.snapshotUnits')
    window.localStorage.removeItem('bt.reportUnits')
    document.documentElement.removeAttribute('data-theme')
  })

  it('switches the theme between system, light and dark', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))

    expect(screen.getByRole('group', { name: /theme/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dark' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem('bt.theme')).toBe('dark')

    await user.click(screen.getByRole('button', { name: 'Light' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    await user.click(screen.getByRole('button', { name: 'System' }))
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(window.localStorage.getItem('bt.theme')).toBe('system')
  })

  it('lets you choose the snapshot preferred units for bottle and solids', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /units/i }))

    const card = screen.getByText(/snapshot units/i).closest('.card') as HTMLElement
    fireEvent.change(within(card).getByLabelText(/bottle amount/i), { target: { value: 'oz' } })
    fireEvent.change(within(card).getByLabelText(/solids amount/i), { target: { value: 'oz' } })

    expect(window.localStorage.getItem('bt.snapshotUnits')).toContain('"bottle":"oz"')
    expect(window.localStorage.getItem('bt.snapshotUnits')).toContain('"solids":"oz"')
  })

  it('lets you choose the PDF report preferred units (separate from snapshots)', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /units/i }))

    const card = screen.getByText(/report units/i).closest('.card') as HTMLElement
    fireEvent.change(within(card).getByLabelText(/bottle amount/i), { target: { value: 'oz' } })
    fireEvent.change(within(card).getByLabelText(/solids amount/i), { target: { value: 'g' } })

    expect(window.localStorage.getItem('bt.reportUnits')).toContain('"bottle":"oz"')
    expect(window.localStorage.getItem('bt.reportUnits')).toContain('"solids":"g"')
  })

  it('exports a backup file from Settings', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))

    const createURL = vi.fn<(obj: Blob | MediaSource) => string>(() => 'blob:mock')
    const revokeURL = vi.fn<(url: string) => void>()
    vi.stubGlobal('URL', { ...URL, createObjectURL: createURL, revokeObjectURL: revokeURL })

    await user.click(screen.getByRole('button', { name: /export data/i }))
    expect(screen.getByText('Backup downloaded')).toBeInTheDocument()
    expect(createURL).toHaveBeenCalledTimes(1)
    expect(createURL.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(revokeURL).toHaveBeenCalled()
  })

  it('imports a backup file, replacing the data', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))

    const backup = {
      version: 1,
      exportedAt: 'x',
      baby: { id: 'new', name: 'Imported', dob: '2021-01-01', notes: '' },
      sleeps: [],
      feedings: [],
      diapers: [{ id: 'n1', time: new Date().toISOString(), type: 'dirty' }],
      settings: { foodSuggestions: ['carrot'] },
    }
    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByTestId('snackbar')).toHaveTextContent('Data imported')
    expect(api.state.baby?.name).toBe('Imported')
    expect(api.state.diapers).toHaveLength(1)
    expect(api.state.diapers[0].id).toBe('n1')
  })

  it('rejects an invalid backup file', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))

    const file = new File([JSON.stringify({ nope: true })], 'bad.json', { type: 'application/json' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByTestId('snackbar')).toHaveTextContent(/not a valid baby tracker backup/i)
    expect(screen.getAllByText('Not a valid Baby Tracker backup file').length).toBeGreaterThan(0)
  })

  it('shows an error snackbar for a file that is not valid JSON', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))

    const file = new File(['{ this is not json'], 'broken.json', { type: 'application/json' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('That file is not valid JSON')
    expect(snackbar).toHaveAttribute('role', 'alert')
  })

  it('shows an error snackbar for an invalid backup and resets the file input so the same file can be re-imported', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))

    const file = new File([JSON.stringify({ nope: true })], 'bad.json', { type: 'application/json' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })
    expect((await screen.findByTestId('snackbar'))).toHaveTextContent(/not a valid baby tracker backup/i)
    expect(input.value).toBe('')

    fireEvent.change(input, { target: { files: [file] } })
    expect((await screen.findByTestId('snackbar'))).toHaveTextContent(/not a valid baby tracker backup/i)
  })

  it('shows a success snackbar after importing a valid backup', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /data & reports/i }))

    const backup = {
      version: 1,
      exportedAt: 'x',
      baby: null,
      sleeps: [],
      feedings: [],
      diapers: [],
      settings: { foodSuggestions: [] },
    }
    const file = new File([JSON.stringify(backup)], 'ok.json', { type: 'application/json' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    const snackbar = await screen.findByTestId('snackbar')
    expect(snackbar).toHaveTextContent('Data imported')
    expect(snackbar).toHaveAttribute('role', 'status')
  })

  it('lets you choose the daily averages window in Settings', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))

    const group = screen.getByRole('group', { name: /averages window/i })
    await user.click(within(group).getByRole('button', { name: '7 days' }))
    expect(window.localStorage.getItem('bt.averagesDays')).toBe('7')

    await user.click(within(group).getByRole('button', { name: '60 days' }))
    expect(window.localStorage.getItem('bt.averagesDays')).toBe('60')
  })

  it('shows seeded suggestions in the Food suggestions sub-screen, lets you add/remove, and suggests in the Food field', async () => {
    const user = userEvent.setup()
    await onboard(user)

    // Open Settings -> Food suggestions sub-screen
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /food suggestions/i }))
    expect(screen.getByRole('heading', { name: 'Food suggestions' })).toBeInTheDocument()
    expect(screen.getByText('porridge (with pears)')).toBeInTheDocument()
    expect(screen.getByText('salmon')).toBeInTheDocument()

    // Add a suggestion
    await user.type(screen.getByLabelText(/new food suggestion/i), 'sweet potato')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('sweet potato')).toBeInTheDocument()

    // Remove one
    await user.click(screen.getByRole('button', { name: /remove salmon/i }))
    expect(screen.queryByText('salmon')).not.toBeInTheDocument()

    // Back to Settings, then Done closes it
    await user.click(screen.getByRole('button', { name: /back/i }))
    await user.click(screen.getByRole('button', { name: /done/i }))

    // Food field suggests, filters, and lets you tick a suggestion
    await user.click(screen.getByRole('button', { name: 'Feeding' }))
    await user.click(screen.getByRole('button', { name: 'Solids' }))
    const food = screen.getByRole('textbox', { name: /food/i })
    await user.click(food)

    expect(screen.getByRole('checkbox', { name: 'sweet potato' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'salmon' })).not.toBeInTheDocument()

    await user.type(food, 'po')
    expect(screen.getByRole('checkbox', { name: 'sweet potato' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'porridge (with pears)' })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'sweet potato' }))
    expect(food).toHaveValue('')
    expect(screen.getByRole('button', { name: /remove sweet potato/i })).toBeInTheDocument()

    // Completing the solid feed works
    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { target: { value: '2' } })
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), { target: { value: 'oz' } })
    await user.click(screen.getByRole('button', { name: /save solid food/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('lets you edit the profile from Settings', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /edit profile/i }))

    expect(screen.getByRole('heading', { name: 'Edit profile' })).toBeInTheDocument()
    const nameInput = screen.getByLabelText(/name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'New Name')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(api.state.baby?.name).toBe('New Name')
  })

  it('rejects an empty suggestion in Settings', async () => {
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /food suggestions/i }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/empty/i)
  })
})
