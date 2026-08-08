import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'

describe('App onboarding gate', () => {
  beforeEach(() => {
    setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows profile setup on first launch', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Welcome to Baby Tracker' })).toBeInTheDocument()
  })

  it('requires a name and date of birth before proceeding', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /continue/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/name/i)
  })

  it('proceeds to the dashboard after saving a profile', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByLabelText(/name/i), 'Avery')
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument()
  })
})
