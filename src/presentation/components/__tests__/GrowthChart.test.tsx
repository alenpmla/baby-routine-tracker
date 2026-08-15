import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GrowthChart, { HEAD_CIRCUMFERENCE_METRIC } from '../GrowthChart'

const DOB = '2026-01-01'
const MONTH_MS = 2629746000 // average month (~30.44 days)
const atMonth = (months: number) =>
  new Date(new Date(`${DOB}T00:00:00`).getTime() + months * MONTH_MS).toISOString()

function pathDs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('svg path')).map((el) => el.getAttribute('d') ?? '')
}

function circleCys(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll('svg circle')).map((el) => Number(el.getAttribute('cy')))
}

describe('GrowthChart weight metric (default)', () => {
  it('renders the weight chart with the default metric, legend and note', () => {
    render(<GrowthChart dob={DOB} points={[{ time: atMonth(6), weight: 7.9 }]} />)
    expect(screen.getByRole('img', { name: 'Weight growth chart' })).toBeInTheDocument()
    expect(screen.getByText('kg')).toBeInTheDocument()
    expect(screen.getByText('Typical range (P3–P97)')).toBeInTheDocument()
    expect(screen.getByText('Median (P50)')).toBeInTheDocument()
    expect(screen.getByText('Baby')).toBeInTheDocument()
    expect(screen.getByText(/weight-for-age/)).toBeInTheDocument()
  })

  it('plots legacy weight points and a birth weight at month 0', () => {
    const { container } = render(<GrowthChart dob={DOB} points={[{ time: atMonth(12), weight: 9.5 }]} birthValue={3.3} />)
    expect(screen.getByRole('img', { name: 'Weight growth chart' })).toBeInTheDocument()
    expect(container.querySelectorAll('svg circle')).toHaveLength(2)
  })
})

describe('GrowthChart head circumference metric', () => {
  it('renders the HC chart with its own aria-label, unit, legend and note', () => {
    render(
      <GrowthChart
        dob={DOB}
        metric={HEAD_CIRCUMFERENCE_METRIC}
        points={[{ time: atMonth(6), value: 43.3, unit: 'cm' }]}
      />,
    )
    expect(screen.getByRole('img', { name: 'Head circumference growth chart' })).toBeInTheDocument()
    expect(screen.getByText('cm')).toBeInTheDocument()
    expect(screen.getByText('Typical range (P3–P97)')).toBeInTheDocument()
    expect(screen.getByText('Median (P50)')).toBeInTheDocument()
    expect(screen.getByText('Baby')).toBeInTheDocument()
    expect(screen.getByText(/head circumference-for-age/)).toBeInTheDocument()
  })

  it('converts in records to cm before plotting (same cy as the cm equivalent)', () => {
    const time = atMonth(6)
    const { container: cm } = render(
      <GrowthChart dob={DOB} metric={HEAD_CIRCUMFERENCE_METRIC} points={[{ time, value: 43.18, unit: 'cm' }]} />,
    )
    const { container: inch } = render(
      <GrowthChart dob={DOB} metric={HEAD_CIRCUMFERENCE_METRIC} points={[{ time, value: 17, unit: 'in' }]} />,
    )
    expect(Math.abs(circleCys(cm)[0] - circleCys(inch)[0])).toBeLessThan(0.001)
  })

  it('labels the x-axis with month ticks 0m through 24m', () => {
    render(
      <GrowthChart
        dob={DOB}
        metric={HEAD_CIRCUMFERENCE_METRIC}
        points={[{ time: atMonth(6), value: 43.3, unit: 'cm' }]}
      />,
    )
    for (const m of ['0m', '6m', '12m', '18m', '24m']) {
      expect(screen.getByText(m)).toBeInTheDocument()
    }
  })

  it('renders a baby line and one circle per HC measurement', () => {
    const { container } = render(
      <GrowthChart
        dob={DOB}
        metric={HEAD_CIRCUMFERENCE_METRIC}
        points={[
          { time: atMonth(0), value: 34, unit: 'cm' },
          { time: atMonth(6), value: 43.3, unit: 'cm' },
        ]}
      />,
    )
    expect(container.querySelectorAll('svg circle')).toHaveLength(2)
    expect(container.querySelector('svg path[stroke="var(--accent-weight-fg)"]')).toBeTruthy()
  })
})

describe('GrowthChart sex-aware percentiles', () => {
  const points = [{ time: atMonth(12), value: 46, unit: 'cm' }]

  it('renders different bands for male vs female babies', () => {
    const { container: male } = render(
      <GrowthChart dob={DOB} metric={HEAD_CIRCUMFERENCE_METRIC} points={points} sex="male" />,
    )
    const { container: female } = render(
      <GrowthChart dob={DOB} metric={HEAD_CIRCUMFERENCE_METRIC} points={points} sex="female" />,
    )
    expect(pathDs(male)).not.toEqual(pathDs(female))
  })

  it('falls back to the combined curve when sex is unset', () => {
    const { container: unset } = render(<GrowthChart dob={DOB} metric={HEAD_CIRCUMFERENCE_METRIC} points={points} />)
    const { container: combined } = render(
      <GrowthChart dob={DOB} metric={HEAD_CIRCUMFERENCE_METRIC} points={points} sex="combined" />,
    )
    expect(pathDs(unset)).toEqual(pathDs(combined))

    const { container: male } = render(
      <GrowthChart dob={DOB} metric={HEAD_CIRCUMFERENCE_METRIC} points={points} sex="male" />,
    )
    expect(pathDs(unset)).not.toEqual(pathDs(male))
  })
})
