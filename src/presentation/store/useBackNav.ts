import { useCallback, useEffect, useRef, useState } from 'react'
import type { Tab } from '../navigation'

export type SettingsView = 'main' | 'profile' | 'suggestions' | 'units' | 'data' | 'notifications' | 'whatsnew'

export type HealthView = 'weight' | 'headcircumference' | 'teethmenu' | 'teeth' | 'teething' | 'medication' | 'milestones'

export interface NavState {
  tab: Tab
  settings: boolean
  settingsView?: Exclude<SettingsView, 'main'>
  healthView?: HealthView
}

const HOME: NavState = { tab: 'home', settings: false }

function isNavState(v: unknown): v is NavState {
  return !!v && typeof v === 'object' && typeof (v as NavState).tab === 'string'
}

const SENTINEL_STATE = { bt: 'overlay' } as const

function isOverlayState(v: unknown): boolean {
  return !!v && typeof v === 'object' && (v as { bt?: string }).bt === 'overlay'
}

/**
 * Optional handler registered by an open overlay/modal: when set, the browser
 * back button calls it (to close the modal) instead of popping the nav stack.
 *
 * Structural model (not state-matching — a browser popstate's `state` is the
 * entry you land ON, not the one popped):
 *
 * - While at least one overlay is open, exactly ONE extra same-URL history entry
 *   (the "sentinel", {bt:'overlay'}) sits on top of the app's nav entries.
 *   Because its URL equals the current document's, back always pops it WITHOUT
 *   committing a real navigation — no reload, no stats reset.
 * - When the user presses back, that popstate fires while `overlayStack` is
 *   non-empty, which by construction can only mean the sentinel was popped: the
 *   topmost overlay is closed by calling its own onClose (the exact handler the
 *   X / backdrop / Escape / drag paths use). If deeper overlays remain, a fresh
 *   sentinel is re-armed so the next back still pops a same-URL entry.
 * - A non-back close (X / Escape / backdrop / drag / parent-driven onClose)
 *   consumes the sentinel with a real history.go(-1) so the NEXT back presses a
 *   genuine nav entry. The pop that go() induces is matched by the `sentinelOpen`
 *   flag set immediately before it and cleared by the first popstate — but the
 *   go() itself is deferred one macrotask and re-checked, so a React StrictMode
 *   cleanup→remount within the same commit cancels it instead of popping the
 *   sentinel the remount just re-used. That (plus reusing an already-on-top
 *   sentinel on a 0→1 open) is what keeps StrictMode dev double-effects from
 *   pushing two entries.
 *
 * Invariant: browser-history depth == stackRef.length + (1 if any overlay is
 * open else 0). Back-driven close consumes the popped entry implicitly (the
 * browser already removed it); non-back close removes it via the guarded go().
 * Overlays are never persisted, so a reload restores only the nav stack.
 */
let overlayStack: Array<{ id: unknown; onClose: () => void }> = []
// True while our sentinel entry is the current history entry. Guards both the
// deferred consume's own go() and a user back that lands inside that window.
let sentinelOpen = false
let consumeTimer: ReturnType<typeof setTimeout> | null = null
// One-shot flag set immediately before our own sentinel-consuming go(-1) and
// cleared by the first popstate, so that self-initiated pop is never mistaken
// for a user back (which must still pop the nav stack).
let selfConsumePop = false

function topState(): unknown {
  return typeof window !== 'undefined' ? window.history.state : null
}

/**
 * Remove the sentinel with a real history.go(-1), deferred one macrotask and
 * re-checked so a StrictMode cleanup→remount in the same commit cancels it. The
 * pop that go() eventually fires is consumed by the `selfConsumePop` flag that is
 * set before the call and cleared by the first subsequent popstate.
 */
function scheduleSentinelConsume() {
  if (consumeTimer) {
    clearTimeout(consumeTimer)
  }
  consumeTimer = setTimeout(() => {
    consumeTimer = null
    // A re-open in the same tick already re-armed the sentinel; nothing to pop.
    if (overlayStack.length > 0 || !sentinelOpen) {
      return
    }
    // Consume OUR sentinel. The resulting popstate belongs to this go(); arm the
    // flag before the call so the handler treats it as self-initiated.
    sentinelOpen = false
    selfConsumePop = true
    window.history.go(-1)
  }, 0)
}

/**
 * Register (or unregister) the back handler for the currently-open overlay.
 *
 * `fn` non-null registers a handler; the optional `id` is the overlay instance's
 * stable identity. On the first open of a session/instance it pushes the single
 * same-URL sentinel (or re-uses one a StrictMode cleanup left on top instead of
 * pushing a duplicate); re-registering an already-tracked instance (re-render,
 * or a nested overlay handing back to the sheet beneath) only drops any stale
 * higher entries and swaps the latest handler. `fn` null unregisters every open
 * overlay and schedules the sentinel's consumption — idempotent against a
 * double-unregister.
 */
export function registerBackOverlay(fn: (() => void) | null, id?: unknown): void {
  if (fn) {
    const idx = overlayStack.findIndex((e) => e.id === id)
    if (idx >= 0) {
      // Same live instance (re-render / handoff): drop stale overlays above it
      // (their handlers have already been released) and swap the latest handler.
      overlayStack = overlayStack.slice(0, idx + 1)
      overlayStack[idx] = { id, onClose: fn }
      return
    }
    if (overlayStack.length === 0) {
      if (consumeTimer) {
        clearTimeout(consumeTimer)
        consumeTimer = null
      }
      if (!sentinelOpen) {
        // If a StrictMode cleanup previously scheduled the consume and it
        // already fired, the sentinel is gone; otherwise a leftover overlay entry
        // from the prior (un-consumed) open is still on top — re-use it rather
        // than pushing a duplicate.
        sentinelOpen = true
        const reuse = isOverlayState(topState())
        if (!reuse) {
          // First overlay of the session: push the single same-URL sentinel so a
          // back press closes the overlay instead of navigating/reloading.
          window.history.pushState(SENTINEL_STATE, '')
        }
      }
    }
    overlayStack = [...overlayStack, { id, onClose: fn }]
    return
  }
  overlayStack = []
  scheduleSentinelConsume()
}

function closeTopOverlay() {
  if (overlayStack.length === 0) {
    return
  }
  const { onClose } = overlayStack[overlayStack.length - 1]
  overlayStack = overlayStack.slice(0, -1)
  // The browser already popped this overlay's sentinel — consume the bookkeeping
  // and do NOT push anything here. The sheet's own onClose is invoked; this is
  // the exact same handler the X / backdrop / Escape / drag paths call.
  onClose()
}

// sessionStorage key for the nav stack. Survives a reload (pull-to-refresh /
// refresh) so you land back where you were, but is per-browser — never synced
// to the server, so another device's tabs cannot affect this one.
const STORAGE_KEY = 'bt-nav'

function readSavedStack(): NavState[] | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const arr = JSON.parse(raw) as unknown
    if (Array.isArray(arr) && arr.length >= 1 && arr.every(isNavState)) {
      return arr as NavState[]
    }
    return null
  } catch {
    return null
  }
}

/**
 * App navigation + back-button handling.
 *
 * Every in-app forward navigation pushes one browser-history entry and one
 * in-memory stack entry, so the two always mirror each other. The browser back
 * button pops one stack level; at the root (Home) it exits the app natively.
 * The stack is persisted to sessionStorage so a reload restores the current
 * page (and its back depth).
 *
 * Back semantics:
 *  - an open overlay/modal → closes it (does not navigate),
 *  - deeper sub-screens (settings/health views) → previous screen,
 *  - any tab → Home tab,
 *  - Home → exit the app.
 */
export function useBackNav() {
  const stackRef = useRef<NavState[]>([])
  if (stackRef.current.length === 0) {
    stackRef.current = [HOME]
  }
  const [current, setCurrent] = useState<NavState>(HOME)
  // Counter of back() calls we initiated ourselves so the popstate handler
  // does not double-pop when an on-screen back arrow calls history.back().
  const pendingBacks = useRef(0)

  // Restore a persisted stack once (after a reload).
  const restoredRef = useRef(false)

  useEffect(() => {
    // Restore a persisted stack once. This guard is deliberately scoped to the
    // restore only: React StrictMode re-runs the effect (setup → cleanup → setup)
    // in dev, so returning early here before registering the popstate listener
    // would leave the app with no listener after the simulated remount.
    if (!restoredRef.current) {
      restoredRef.current = true
      const saved = readSavedStack()
      if (saved && saved.length > 0) {
        stackRef.current = saved
        setCurrent(saved[saved.length - 1])
        // Mirror the restored depth in browser history so back works after reload.
        const depth = saved.length - 1
        for (let i = 0; i < depth; i += 1) {
          window.history.pushState({ bt: 'app' }, '')
        }
      }
    }

    const onPop = (e: PopStateEvent) => {
      if (pendingBacks.current > 0) {
        pendingBacks.current -= 1
        return
      }
      if (overlayStack.length > 0) {
        // By construction the top browser entry is our single same-URL sentinel
        // while any overlay is open, so this pop consumed it — close the topmost
        // overlay via its own onClose (identical to the X / backdrop / Escape /
        // drag path). If deeper overlays remain, re-arm a fresh sentinel so the
        // next back still pops a same-URL entry instead of navigating/reloading.
        closeTopOverlay()
        if (overlayStack.length > 0) {
          sentinelOpen = true
          window.history.pushState(SENTINEL_STATE, '')
        } else {
          sentinelOpen = false
        }
        return
      }
      if (selfConsumePop) {
        // The pop belongs to our own deferred sentinel-consuming go() (or a user
        // back that landed inside that window — either way the sentinel is gone):
        // consume the flag, never the nav stack.
        selfConsumePop = false
        return
      }
      if (isOverlayState(e.state)) {
        // A stale/dangling overlay sentinel was popped with no overlay open (e.g.
        // a leftover StrictMode entry or a consume that raced a close). It must
        // not be mistaken for a nav pop — leave the nav stack untouched.
        return
      }
      const s = stackRef.current
      if (s.length <= 1) {
        // At the root: let the browser exit on the next back press.
        return
      }
      stackRef.current = s.slice(0, -1)
      setCurrent(stackRef.current[stackRef.current.length - 1])
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  // Persist the stack so a reload restores the current page + depth.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stackRef.current))
    } catch {
      /* ignore quota/private-mode errors */
    }
  }, [current])

  const navigate = useCallback((next: NavState, replace = false) => {
    if (replace) {
      stackRef.current = [...stackRef.current.slice(0, -1), next]
      window.history.replaceState({ bt: 'app' }, '')
    } else {
      stackRef.current = [...stackRef.current, next]
      window.history.pushState({ bt: 'app' }, '')
    }
    setCurrent(next)
  }, [])

  const goToTab = useCallback((tab: Tab) => {
    if (tab === 'home') {
      const depth = stackRef.current.length - 1
      stackRef.current = [HOME]
      setCurrent(HOME)
      if (depth > 0) {
        window.history.go(-depth)
      }
      return
    }
    const next: NavState = { tab, settings: false }
    const s = stackRef.current
    if (s.length === 1) {
      stackRef.current = [...s, next]
      window.history.pushState({ bt: 'app' }, '')
    } else {
      stackRef.current = [...s.slice(0, -1), next]
      window.history.replaceState({ bt: 'app' }, '')
    }
    setCurrent(next)
  }, [])

  const goBack = useCallback(() => {
    const s = stackRef.current
    if (s.length <= 1) {
      stackRef.current = [HOME]
      setCurrent(HOME)
      return
    }
    stackRef.current = s.slice(0, -1)
    setCurrent(stackRef.current[stackRef.current.length - 1])
    pendingBacks.current += 1
    window.history.back()
  }, [])

  return { current, navigate, goToTab, goBack }
}
