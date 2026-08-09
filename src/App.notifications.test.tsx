import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'

let api: MockApi

const HOUR = 60 * 60 * 1000

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * HOUR).toISOString()
}

describe('Wake window notification', () => {
  beforeEach(() => {
    api = setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.removeAttribute('data-theme')
    window.localStorage.clear()
  })

  it('fires the reminder snackbar when the wake window is overdue', async () => {
    window.localStorage.setItem('bt.wakeWindowEnabled', 'true')
    window.localStorage.setItem('bt.wakeWindowMinutes', '180')
    api.state.sleeps.push({ id: 's1', startTime: hoursAgo(6), endTime: hoursAgo(4) })

    const user = userEvent.setup()
    await onboard(user)

    const snack = await screen.findByTestId('snackbar')
    expect(snack).toHaveTextContent(/awake for 3h/i)
    expect(window.localStorage.getItem('bt.wakeNotifiedForEnd')).toBeTruthy()
  })

  it('does not fire the reminder when the wake window has not elapsed', async () => {
    window.localStorage.setItem('bt.wakeWindowEnabled', 'true')
    api.state.sleeps.push({ id: 's1', startTime: hoursAgo(2), endTime: hoursAgo(1) })

    const user = userEvent.setup()
    await onboard(user)
    await new Promise((r) => setTimeout(r, 200))

    expect(screen.queryByTestId('snackbar')).not.toBeInTheDocument()
  })

  it('configures the reminder from Settings > Notifications', async () => {
    window.localStorage.setItem('bt.wakeWindowEnabled', 'true')
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /notifications/i }))

    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
    expect(screen.getByText('3h')).toBeInTheDocument()

    const toggle = screen.getByRole('switch')
    expect(toggle).toBeChecked()
    fireEvent.click(toggle)
    expect(window.localStorage.getItem('bt.wakeWindowEnabled')).toBe('false')
    fireEvent.click(toggle)
    expect(window.localStorage.getItem('bt.wakeWindowEnabled')).toBe('true')

    await user.click(screen.getByRole('button', { name: /wake window/i }))
    const dialog = await screen.findByRole('dialog', { name: /wake window/i })
    fireEvent.change(within(dialog).getByLabelText('Hours'), { target: { value: '2' } })
    fireEvent.change(within(dialog).getByLabelText('Minutes'), { target: { value: '30' } })
    await user.click(within(dialog).getByRole('button', { name: /save/i }))

    expect(window.localStorage.getItem('bt.wakeWindowMinutes')).toBe('150')
    expect(screen.getByText('2h 30m')).toBeInTheDocument()
  })

  it('sends a test notification when permission is granted', async () => {
    const sent: { title: string; opts: unknown }[] = []
    class FakeNotification {
      static permission = 'granted'
      static requestPermission = vi.fn(async () => 'granted')
      constructor(title: string, opts: unknown) {
        sent.push({ title, opts })
      }
    }
    vi.stubGlobal('Notification', FakeNotification)

    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /notifications/i }))

    await user.click(screen.getByRole('button', { name: /send test notification/i }))

    expect(sent).toHaveLength(1)
    expect(sent[0].title).toBe('Baby Tracker')
    expect(await screen.findByTestId('snackbar')).toHaveTextContent(/test notification sent/i)
  })

  it('migrates the legacy hours setting to minutes', async () => {
    window.localStorage.setItem('bt.wakeWindowEnabled', 'true')
    window.localStorage.setItem('bt.wakeWindowHours', '4')
    const user = userEvent.setup()
    await onboard(user)
    await user.click(screen.getByRole('button', { name: /settings/i }))
    await user.click(screen.getByRole('button', { name: /notifications/i }))

    expect(screen.getByText('4h')).toBeInTheDocument()
    expect(window.localStorage.getItem('bt.wakeWindowMinutes')).toBe('240')
  })

})
