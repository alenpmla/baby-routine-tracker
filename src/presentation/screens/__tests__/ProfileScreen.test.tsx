import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Baby } from '../../../domain/model/Baby'
import type { SaveBabyInput } from '../../../domain/usecase/baby'
import ProfileScreen from '../ProfileScreen'

function fillBasics(user: ReturnType<typeof userEvent.setup>) {
  return user.type(screen.getByLabelText(/name/i), 'Avery')
}

describe('ProfileScreen sex selector', () => {
  it('defaults to Not set and saves a profile without sex', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ProfileScreen onSubmit={onSubmit} />)

    expect(screen.getByRole('button', { name: 'Not set' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Male' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Female' })).toHaveAttribute('aria-pressed', 'false')

    await fillBasics(user)
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
    await user.click(screen.getByRole('button', { name: /continue/i }))

    const input = onSubmit.mock.calls[0][0] as SaveBabyInput
    expect(input.sex).toBeUndefined()
  })

  it('saves a selected sex with the profile', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ProfileScreen onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Female' }))
    expect(screen.getByRole('button', { name: 'Female' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Not set' })).toHaveAttribute('aria-pressed', 'false')

    await fillBasics(user)
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
    await user.click(screen.getByRole('button', { name: /continue/i }))

    const input = onSubmit.mock.calls[0][0] as SaveBabyInput
    expect(input.sex).toBe('female')
  })

  it('pre-selects an existing sex when editing', () => {
    const existing: Baby = { id: 'b1', name: 'Avery', dob: '2026-01-15', notes: '', sex: 'male' }
    render(<ProfileScreen existing={existing} onSubmit={() => {}} />)

    expect(screen.getByRole('button', { name: 'Male' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Female' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Not set' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('pre-selects Not set when the existing profile has no sex', () => {
    const existing: Baby = { id: 'b1', name: 'Avery', dob: '2026-01-15', notes: '' }
    render(<ProfileScreen existing={existing} onSubmit={() => {}} />)

    expect(screen.getByRole('button', { name: 'Not set' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clears the sex back to Not set when editing', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const existing: Baby = { id: 'b1', name: 'Avery', dob: '2026-01-15', notes: '', sex: 'female' }
    render(<ProfileScreen existing={existing} onSubmit={onSubmit} />)

    expect(screen.getByRole('button', { name: 'Female' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Not set' }))
    expect(screen.getByRole('button', { name: 'Not set' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /save changes/i }))
    const input = onSubmit.mock.calls[0][0] as SaveBabyInput
    expect(input.sex).toBeUndefined()
  })

  it('switches between male and female', async () => {
    const user = userEvent.setup()
    render(<ProfileScreen onSubmit={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Male' }))
    expect(screen.getByRole('button', { name: 'Male' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Female' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Female' }))
    expect(screen.getByRole('button', { name: 'Female' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Male' })).toHaveAttribute('aria-pressed', 'false')
  })
})
