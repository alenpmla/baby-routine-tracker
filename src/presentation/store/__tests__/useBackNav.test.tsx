import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { useBackNav, registerBackOverlay } from '../useBackNav'

function Harness() {
  const { current, navigate } = useBackNav()
  return (
    <div>
      <span data-testid="current">{current.tab}</span>
      <button type="button" onClick={() => navigate({ tab: 'sleep', settings: false })}>
        go-sleep
      </button>
      <button type="button" onClick={() => navigate({ tab: 'feeding', settings: false })}>
        go-feeding
      </button>
    </div>
  )
}

function pressBack(state?: unknown) {
  act(() => {
    const init = state === undefined ? {} : { state }
    window.dispatchEvent(new PopStateEvent('popstate', init))
  })
}

// jsdom's window.history.length only reflects real pushState/replaceState calls:
// a manually dispatched PopStateEvent or a self-initiated history.go() does not
// move it (and go() fires its popstate asynchronously). The per-overlay lifecycle
// is therefore asserted via a pushState spy — the call count and the bt tag of
// each pushed state — never via window.history.length.
let pushSpy: ReturnType<typeof vi.spyOn>

function overlayPushes() {
  return pushSpy.mock.calls.filter((c) => c[0] && (c[0] as { bt?: string }).bt === 'overlay').length
}

function appPushes() {
  return pushSpy.mock.calls.filter((c) => c[0] && (c[0] as { bt?: string }).bt === 'app').length
}

function totalPushes() {
  return pushSpy.mock.calls.length
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50))

async function resetModule() {
  // Drain any self-initiated consume popstate still in flight, then unregister
  // any open overlay (guarded history.go when a listener is attached) and drain
  // that popstate too, so the module-level pendingOverlayBacks guard is back at
  // zero before the next test.
  await flush()
  registerBackOverlay(null)
  await flush()
}

describe('useBackNav per-overlay history lifecycle', () => {
  beforeEach(async () => {
    window.sessionStorage.clear()
    await resetModule()
    pushSpy = vi.spyOn(window.history, 'pushState')
  })

  afterEach(async () => {
    await resetModule()
    pushSpy.mockRestore()
    cleanup()
  })

  it('pushes one entry when an overlay opens and none when the same instance re-registers', async () => {
    render(<Harness />)
    registerBackOverlay(vi.fn(), 'sheet')
    expect(overlayPushes()).toBe(1)

    // Re-render with a new onClose for the same still-open overlay: swap only.
    const onClose = vi.fn()
    registerBackOverlay(onClose, 'sheet')
    expect(overlayPushes()).toBe(1)

    pressBack({ bt: 'overlay' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(overlayPushes()).toBe(1)
    expect(totalPushes()).toBe(1)
  })

  it('back on an overlay open at the root closes it, stays on the same screen, and consumes its entry without re-pushing', async () => {
    render(<Harness />)
    const onClose = vi.fn()
    registerBackOverlay(onClose, 'sheet')
    expect(overlayPushes()).toBe(1)

    pressBack({ bt: 'overlay' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('current').textContent).toBe('home')
    // The old handler re-pushed {bt:'app'} on back — the reload trap. Nothing
    // may be re-pushed: the only pushState so far is the overlay open itself.
    expect(totalPushes()).toBe(1)
  })

  it('back with a state-less popstate (existing test shape) also closes the overlay', async () => {
    render(<Harness />)
    const onClose = vi.fn()
    registerBackOverlay(onClose, 'sheet')
    pressBack()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(totalPushes()).toBe(1)
  })

  it('a non-back close consumes the entry idempotently and a later back navigates exactly once', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'go-sleep' }))
    fireEvent.click(screen.getByRole('button', { name: 'go-feeding' }))
    expect(screen.getByTestId('current').textContent).toBe('feeding')
    expect(appPushes()).toBe(2)

    const onClose = vi.fn()
    registerBackOverlay(onClose, 'sheet')
    expect(overlayPushes()).toBe(1)

    // X/close-button/backdrop/Escape path: unregister consumes via guarded go().
    registerBackOverlay(null)
    registerBackOverlay(null) // idempotent — must not double-consume
    expect(onClose).not.toHaveBeenCalled()
    expect(overlayPushes()).toBe(1) // consume uses go(), not pushState
    await flush() // let the self-initiated popstate fire and be swallowed

    // One real back navigates feeding -> sleep exactly once (no swallowed back,
    // no double pop from the consume's popstate).
    pressBack()
    expect(screen.getByTestId('current').textContent).toBe('sleep')
    expect(onClose).not.toHaveBeenCalled()
    expect(appPushes()).toBe(2) // nav-pop on back does not push either
  })

  it('nested handoff never double-pushes and back closes the picker then the sheet', async () => {
    render(<Harness />)
    const closeSheet = vi.fn()
    const closePicker = vi.fn()

    registerBackOverlay(closeSheet, 'sheet')
    expect(overlayPushes()).toBe(1)

    // A nested overlay shares the single sentinel: opening it must NOT push a
    // second entry (one sentinel shields the document while any overlay is open).
    registerBackOverlay(closePicker, 'picker')
    expect(overlayPushes()).toBe(1)

    // Back #1 closes the picker and re-arms a fresh sentinel for the sheet.
    pressBack({ bt: 'overlay' })
    expect(closePicker).toHaveBeenCalledTimes(1)
    expect(closeSheet).not.toHaveBeenCalled()
    expect(overlayPushes()).toBe(2)

    // The sheet beneath resumes via syncBackOverlay — a handler swap, no push.
    registerBackOverlay(closeSheet, 'sheet')
    expect(overlayPushes()).toBe(2)

    // Back #2 closes the sheet and consumes the re-armed sentinel.
    pressBack({ bt: 'overlay' })
    expect(closeSheet).toHaveBeenCalledTimes(1)
    expect(overlayPushes()).toBe(2)
  })

  it('re-render unregister/re-register churn is net-zero on history', async () => {
    render(<Harness />)
    const onClose = vi.fn()
    registerBackOverlay(onClose, 'sheet')
    expect(overlayPushes()).toBe(1)

    // React effect cleanup + re-run in the same commit (new onClose identity).
    registerBackOverlay(null) // cleanup schedules a deferred consume
    registerBackOverlay(onClose, 'sheet') // re-open re-uses the sentinel, no push
    await flush() // the deferred consume is cancelled by the re-open; nothing pops

    // Net effect: the single sentinel was reused across the cleanup + re-open
    // (the StrictMode dev double-effect), so exactly one push total — no drift.
    expect(overlayPushes()).toBe(1)
    expect(totalPushes()).toBe(1)

    // The overlay is still open and back still closes it without re-pushing.
    pressBack({ bt: 'overlay' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(totalPushes()).toBe(1)
  })

  it('a dangling overlay entry with no active overlay is ignored (nav stack untouched)', async () => {
    render(<Harness />)
    const onClose = vi.fn()
    registerBackOverlay(onClose, 'sheet')
    pressBack({ bt: 'overlay' }) // closes the sheet; stack now empty
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'go-sleep' }))
    expect(screen.getByTestId('current').textContent).toBe('sleep')

    // A stale {bt:'overlay'} popstate with no overlay open must not pop the nav stack.
    pressBack({ bt: 'overlay' })
    expect(screen.getByTestId('current').textContent).toBe('sleep')
  })

  it('with no overlay open, a state-less back still pops the nav stack', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'go-sleep' }))
    expect(screen.getByTestId('current').textContent).toBe('sleep')

    pressBack()
    expect(screen.getByTestId('current').textContent).toBe('home')
  })
})
