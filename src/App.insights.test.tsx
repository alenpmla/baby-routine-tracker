import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'
import { setupApi } from './test/setupApi'
import type { Baby } from './domain/model/Baby'

const HOUR = 60 * 60 * 1000

function baby(): Baby {
  return { id: 'b1', name: 'Avery', dob: '2026-01-15', notes: '', birthWeightKg: 3.2 }
}

describe('Dashboard trends & insights', () => {
  beforeEach(() => {
    setupApi()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the insights section when there is feeding + sleep data', async () => {
    const api = setupApi()
    const now = new Date()
    api.state.baby = baby()
    api.state.feedings = [
      { id: 'f1', time: new Date(now.getTime() - 8 * HOUR).toISOString(), type: 'bottle', amount: 120, unit: 'ml' },
      { id: 'f2', time: new Date(now.getTime() - 5 * HOUR).toISOString(), type: 'breast' },
      { id: 'f3', time: new Date(now.getTime() - 2 * HOUR).toISOString(), type: 'bottle', amount: 120, unit: 'ml' },
    ]
    api.state.sleeps = [
      { id: 's1', startTime: new Date(now.getTime() - 3 * HOUR).toISOString(), endTime: new Date(now.getTime() - 2 * HOUR).toISOString() },
    ]

    render(<App />)
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /trends & insights/i })).toBeInTheDocument()
    expect(screen.getByText(/next feed likely/i)).toBeInTheDocument()
    expect(screen.getByText(/slept today/i)).toBeInTheDocument()
  })

  it('omits the section when there is not enough data', async () => {
    const api = setupApi()
    api.state.baby = baby()

    render(<App />)
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()

    expect(screen.queryByRole('heading', { name: /trends & insights/i })).not.toBeInTheDocument()
  })

  it('hides the section when viewing a past day', async () => {
    const api = setupApi()
    const now = new Date()
    api.state.baby = baby()
    api.state.feedings = [
      { id: 'f1', time: new Date(now.getTime() - 8 * HOUR).toISOString(), type: 'bottle' },
      { id: 'f2', time: new Date(now.getTime() - 5 * HOUR).toISOString(), type: 'bottle' },
      { id: 'f3', time: new Date(now.getTime() - 2 * HOUR).toISOString(), type: 'bottle' },
    ]

    render(<App />)
    expect(await screen.findByRole('heading', { name: /hi, avery/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /trends & insights/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /previous day/i }))
    expect(screen.queryByRole('heading', { name: /trends & insights/i })).not.toBeInTheDocument()
  })
})
