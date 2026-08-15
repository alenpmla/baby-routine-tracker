import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  FeedDiaperBackfillForm,
  HeadCircumferenceBackfillForm,
  SleepBackfillForm,
} from '../BackfillForms'

afterEach(() => {
  vi.useRealTimers()
})

function setSystemTime() {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 8, 8, 0, 0))
}

describe('FeedDiaperBackfillForm', () => {
  it('rejects a future time', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(
      <FeedDiaperBackfillForm
        options={[{ id: 'bottle', label: 'Bottle' }]}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    )
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: '09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/future/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits a past date and time', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(
      <FeedDiaperBackfillForm
        options={[{ id: 'breast', label: 'Breast' }]}
        submitLabel="Save"
        onSubmit={onSubmit}
      />,
    )
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-08-07' } })
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: '14:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const [type, at] = onSubmit.mock.calls[0]
    expect(type).toBe('breast')
    expect(at.getFullYear()).toBe(2026)
    expect(at.getMonth()).toBe(7)
    expect(at.getDate()).toBe(7)
    expect(at.getHours()).toBe(14)
  })
})

describe('FeedDiaperBackfillForm bottle quantity', () => {
  it('requires amount and unit; submits bottle details', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(
      <FeedDiaperBackfillForm
        options={[
          { id: 'bottle', label: 'Bottle' },
          { id: 'breast', label: 'Breast' },
        ]}
        submitLabel="Save"
        showBottleDetails
        onSubmit={onSubmit}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Amount is required')).toBeInTheDocument()
    expect(screen.getByText('Please choose a unit')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('spinbutton', { name: /amount/i }), { target: { value: '150' } })
    fireEvent.change(screen.getByRole('combobox', { name: /unit/i }), { target: { value: 'ml' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const [type, , details] = onSubmit.mock.calls[0]
    expect(type).toBe('bottle')
    expect(details.amount).toBe(150)
    expect(details.unit).toBe('ml')
  })
})

describe('FeedDiaperBackfillForm breast timing', () => {
  it('requires start and end; rejects end before start', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(
      <FeedDiaperBackfillForm
        options={[
          { id: 'breast', label: 'Breast' },
          { id: 'bottle', label: 'Bottle' },
        ]}
        submitLabel="Save"
        showBreastTiming
        onSubmit={onSubmit}
      />,
    )
    const times = screen.getAllByLabelText(/time/i)
    expect(times).toHaveLength(2) // start + end
    fireEvent.change(times[0], { target: { value: '07:00' } })
    fireEvent.change(times[1], { target: { value: '06:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/end time must be after/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits breast start/end as details', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(
      <FeedDiaperBackfillForm
        options={[
          { id: 'breast', label: 'Breast' },
          { id: 'bottle', label: 'Bottle' },
        ]}
        submitLabel="Save"
        showBreastTiming
        onSubmit={onSubmit}
      />,
    )
    const times = screen.getAllByLabelText(/time/i)
    fireEvent.change(times[0], { target: { value: '07:00' } })
    fireEvent.change(times[1], { target: { value: '07:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const [type, , details] = onSubmit.mock.calls[0]
    expect(type).toBe('breast')
    expect(details.startTime).toBeInstanceOf(Date)
    expect(details.startTime.getHours()).toBe(7)
    expect(details.endTime.getHours()).toBe(7)
  })
})

describe('HeadCircumferenceBackfillForm', () => {
  it('rejects a future date and time', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(<HeadCircumferenceBackfillForm submitLabel="Save" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/head circumference/i), { target: { value: '42.5' } })
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: '09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/future/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('SleepBackfillForm', () => {
  it('ongoing mode requires only a start and submits an ongoing value', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(<SleepBackfillForm submitLabel="Save" onSubmit={onSubmit} />)
    expect(screen.getAllByLabelText(/date/i)).toHaveLength(1)
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-08-07' } })
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: '09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const value = onSubmit.mock.calls[0][0]
    expect(value.kind).toBe('ongoing')
    expect(value.start.getDate()).toBe(7)
  })

  it('rejects a future start in ongoing mode', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(<SleepBackfillForm submitLabel="Save" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: '09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/future/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('completed mode rejects an end before the start', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(<SleepBackfillForm submitLabel="Save" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))
    const dates = screen.getAllByLabelText(/date/i)
    const times = screen.getAllByLabelText(/time/i)
    fireEvent.change(dates[0], { target: { value: '2026-08-07' } })
    fireEvent.change(times[0], { target: { value: '10:00' } })
    fireEvent.change(dates[1], { target: { value: '2026-08-07' } })
    fireEvent.change(times[1], { target: { value: '09:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/end time must be after/i)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('completed mode submits start and end', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(<SleepBackfillForm submitLabel="Save" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))
    const dates = screen.getAllByLabelText(/date/i)
    const times = screen.getAllByLabelText(/time/i)
    fireEvent.change(dates[0], { target: { value: '2026-08-07' } })
    fireEvent.change(times[0], { target: { value: '09:00' } })
    fireEvent.change(dates[1], { target: { value: '2026-08-07' } })
    fireEvent.change(times[1], { target: { value: '10:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const value = onSubmit.mock.calls[0][0]
    expect(value.kind).toBe('completed')
    expect(value.start.getHours()).toBe(9)
    expect(value.end.getHours()).toBe(10)
    expect(value.sleepKind).toBe('nap')
  })

  it('defaults an ongoing sleep to Nap even when started at night', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(<SleepBackfillForm submitLabel="Save" onSubmit={onSubmit} />)
    expect(screen.getByRole('button', { name: 'Nap' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-08-07' } })
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: '22:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].sleepKind).toBe('nap')
  })

  it('infers Night for a completed sleep that starts at 22:00', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(<SleepBackfillForm submitLabel="Save" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))
    const dates = screen.getAllByLabelText(/date/i)
    const times = screen.getAllByLabelText(/time/i)
    fireEvent.change(dates[0], { target: { value: '2026-08-07' } })
    fireEvent.change(times[0], { target: { value: '22:00' } })
    fireEvent.change(dates[1], { target: { value: '2026-08-07' } })
    fireEvent.change(times[1], { target: { value: '23:00' } })
    expect(screen.getByRole('button', { name: 'Night' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0][0].sleepKind).toBe('night')
  })

  it('submits a manually chosen sleep kind even when the start time would infer otherwise', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(<SleepBackfillForm submitLabel="Save" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: 'Night' }))
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))
    const dates = screen.getAllByLabelText(/date/i)
    const times = screen.getAllByLabelText(/time/i)
    fireEvent.change(dates[0], { target: { value: '2026-08-07' } })
    fireEvent.change(times[0], { target: { value: '10:00' } })
    fireEvent.change(dates[1], { target: { value: '2026-08-07' } })
    fireEvent.change(times[1], { target: { value: '11:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit.mock.calls[0][0].sleepKind).toBe('night')
  })

  it('pre-selects the explicit kind when editing and preserves it on submit', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(
      <SleepBackfillForm
        submitLabel="Save"
        initial={{ start: new Date(2026, 7, 7, 22, 0), end: new Date(2026, 7, 8, 6, 0), kind: 'night' }}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByRole('button', { name: 'Night' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].sleepKind).toBe('night')
  })

  it('pre-selects the inferred kind when editing a legacy record without an explicit kind', () => {
    setSystemTime()
    const onSubmit = vi.fn()
    render(
      <SleepBackfillForm
        submitLabel="Save"
        initial={{ start: new Date(2026, 7, 7, 22, 0), end: new Date(2026, 7, 8, 6, 0) }}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByRole('button', { name: 'Night' })).toHaveAttribute('aria-pressed', 'true')
  })
})
