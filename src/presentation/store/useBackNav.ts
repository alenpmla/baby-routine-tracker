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

/**
 * Optional handler registered by an open overlay/modal: when set, the browser
 * back button calls it (to close the modal) instead of popping the nav stack.
 */
let activeOverlay: (() => void) | null = null

export function registerBackOverlay(fn: (() => void) | null): void {
  activeOverlay = fn
}

/**
 * App navigation + back-button handling.
 *
 * The nav stack lives purely in memory; browser history is only used as a
 * "back trap" (a single sentinel entry we re-push after each back) so the
 * hardware/browser back button always fires popstate. This makes behaviour
 * predictable and keeps reloads deterministic (we always start at Home, so a
 * pull-to-refresh never jumps to a random tab).
 *
 * Back semantics:
 *  - an open overlay/modal → closes it (does not navigate),
 *  - deeper sub-screens (settings/health views) → previous screen,
 *  - any tab → Home tab,
 *  - Home → exit the app.
 */
export function useBackNav() {
  const stackRef = useRef<NavState[]>([HOME])
  const [current, setCurrent] = useState<NavState>(HOME)

  useEffect(() => {
    // Trap the back button: a sentinel entry so the first back press pops.
    window.history.pushState({ bt: 'root' }, '')

    const onPop = () => {
      if (activeOverlay) {
        activeOverlay()
        window.history.pushState({ bt: 'root' }, '')
        return
      }
      const s = stackRef.current
      if (s.length <= 1) {
        // At the root: do not re-push, so the next back exits the app.
        return
      }
      stackRef.current = s.slice(0, -1)
      setCurrent(stackRef.current[stackRef.current.length - 1])
      // Re-arm so the next back press fires popstate again.
      window.history.pushState({ bt: 'root' }, '')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((next: NavState, replace = false) => {
    const s = stackRef.current
    if (replace) {
      stackRef.current = [...s.slice(0, -1), next]
    } else {
      stackRef.current = [...s, next]
    }
    setCurrent(next)
  }, [])

  const goToTab = useCallback((tab: Tab) => {
    if (tab === 'home') {
      stackRef.current = [HOME]
      setCurrent(HOME)
      return
    }
    const next: NavState = { tab, settings: false }
    const s = stackRef.current
    if (s.length === 1) {
      stackRef.current = [...s, next]
    } else {
      // Tab hops replace the previous tab so back from any tab returns to Home.
      stackRef.current = [...s.slice(0, -1), next]
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
  }, [])

  return { current, navigate, goToTab, goBack }
}
