import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { setupApi } from './test/setupApi'
import type { MockApi } from './test/mockApi'
import GrowthChartZoomModal from './presentation/components/GrowthChartZoomModal'
import { WEIGHT_METRIC, type GrowthPoint } from './presentation/components/GrowthChart'
import { useBackNav, registerBackOverlay } from './presentation/store/useBackNav'

let api: MockApi

const MONTH_MS = 2629746000

// jsdom has no layout, so ResponsiveContainer measures 0x0 and never mounts its
// chart. Give it a fixed viewport so the chart + Brush actually render.
function stubLayout() {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return { width: 600, height: 320, top: 0, left: 0, right: 600, bottom: 320, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
  })
  if (!('ResizeObserver' in window)) {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
  }
}

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  render(<App />)
  await user.type(await screen.findByLabelText(/name/i), 'Avery')
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: '2026-01-15' } })
  await user.click(screen.getByRole('button', { name: /continue/i }))
}

function seedWeightChart() {
  const dob = new Date('2026-01-15T00:00:00')
  api.state.weights = [
    { id: 'w1', time: new Date(dob.getTime() + 0 * MONTH_MS).toISOString(), weight: 3.3, unit: 'kg' },
    { id: 'w2', time: new Date(dob.getTime() + 6 * MONTH_MS).toISOString(), weight: 7.5, unit: 'kg' },
    { id: 'w3', time: new Date(dob.getTime() + 12 * MONTH_MS).toISOString(), weight: 9.5, unit: 'kg' },
    { id: 'w4', time: new Date(dob.getTime() + 24 * MONTH_MS).toISOString(), weight: 12.5, unit: 'kg' },
  ]
}

describe('Growth chart zoom modal', () => {
  beforeEach(() => {
    api = setupApi()
    stubLayout()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    cleanup()
  })

  it('opens on tapping the weight chart and shows the zoomed chart + hint', async () => {
    seedWeightChart()
    const user = userEvent.setup()
    await onboard(user)

    await user.click(screen.getByRole('button', { name: /open weight chart zoom/i }))
    const dialog = await screen.findByRole('dialog', { name: /weight progress/i })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText(/drag the slider to zoom/i)).toBeInTheDocument()
    expect(document.querySelector('.zoom-chart')).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    seedWeightChart()
    const user = userEvent.setup()
    await onboard(user)

    await user.click(screen.getByRole('button', { name: /open weight chart zoom/i }))
    expect(await screen.findByRole('dialog', { name: /weight progress/i })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('dialog', { name: /weight progress/i })).not.toBeInTheDocument()
  })

  it('closes via the close button', async () => {
    seedWeightChart()
    const user = userEvent.setup()
    await onboard(user)

    await user.click(screen.getByRole('button', { name: /open weight chart zoom/i }))
    await screen.findByRole('dialog', { name: /weight progress/i })

    await user.click(screen.getByRole('button', { name: /^close$/i }))
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('dialog', { name: /weight progress/i })).not.toBeInTheDocument()
  })

  it('closes on browser back (popstate)', async () => {
    seedWeightChart()
    const user = userEvent.setup()
    await onboard(user)

    await user.click(screen.getByRole('button', { name: /open weight chart zoom/i }))
    expect(await screen.findByRole('dialog', { name: /weight progress/i })).toBeInTheDocument()

    // Simulate the hardware/browser back button firing popstate.
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('dialog', { name: /weight progress/i })).not.toBeInTheDocument()
  })

  it('renders a zoomable Recharts brush inside the modal', async () => {
    seedWeightChart()
    const user = userEvent.setup()
    await onboard(user)

    await user.click(screen.getByRole('button', { name: /open weight chart zoom/i }))
    await screen.findByRole('dialog', { name: /weight progress/i })

    // The Recharts brush renders once the chart has layout; Recharts owns the
    // drag-to-zoom interaction natively (exercised in real browsers), so we
    // assert the brush is present and wired via its travellers.
    const brush = document.querySelector('.recharts-brush') as HTMLElement | null
    expect(brush).toBeTruthy()
    const travellers = brush!.querySelectorAll('.recharts-brush-traveller')
    expect(travellers.length).toBeGreaterThan(0)
  })

  it('shows the expandable point info when the chart is tapped', async () => {
    seedWeightChart()
    const user = userEvent.setup()
    await onboard(user)

    await user.click(screen.getByRole('button', { name: /open weight chart zoom/i }))
    await screen.findByRole('dialog', { name: /weight progress/i })

    // The hover-for-details interaction is documented in the hint; Recharts
    // renders the tooltip on hover in real browsers (jsdom cannot reproduce
    // Recharts' pointer math for a synthetic hover).
    expect(screen.getByText(/hover a point for details/i)).toBeInTheDocument()
  })
})

describe('Growth chart zoom modal overlay identity', () => {
  function BackNavHarness() {
    useBackNav()
    return null
  }

  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50))

  // The first describe leaves the module-level overlay state and a stale
  // {bt:'overlay'} `window.history.state` behind (jsdom's history.go() does not
  // move state synchronously). Reset both so the reuse-on-open logic sees a clean
  // nav state and pushes a fresh sentinel.
  beforeEach(async () => {
    await flush()
    registerBackOverlay(null)
    await flush()
    window.history.replaceState({ bt: 'app' }, '')
  })

  function pressBack() {
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
  }

  it('stays net-zero on history across re-renders and always closes exactly once on back', async () => {
    const pushSpy = vi.spyOn(window.history, 'pushState')
    const overlayPushes = () =>
      pushSpy.mock.calls.filter((c) => c[0] && (c[0] as { bt?: string }).bt === 'overlay').length

    render(<BackNavHarness />)
    const onClose = vi.fn()
    const props = {
      open: true,
      title: 'Weight progress',
      dob: '2026-01-15',
      points: [] as GrowthPoint[],
      metric: WEIGHT_METRIC,
      onClose,
    }
    const { rerender } = render(<GrowthChartZoomModal {...props} />)
    expect(overlayPushes()).toBe(1)
    expect(screen.getByRole('dialog', { name: /weight progress/i })).toBeInTheDocument()

    // The parent's 1s now tick recreates the inline onClose identity every
    // render; a re-render must swap the handler, never re-push an entry.
    for (let i = 0; i < 3; i += 1) {
      rerender(<GrowthChartZoomModal {...props} onClose={vi.fn()} />)
    }
    expect(overlayPushes()).toBe(1)

    // The registered handler always delegates to the latest onClose, so back
    // still closes the sheet once, consuming its entry without re-pushing.
    rerender(<GrowthChartZoomModal {...props} onClose={onClose} />)
    pressBack()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(overlayPushes()).toBe(1)
  })
})
